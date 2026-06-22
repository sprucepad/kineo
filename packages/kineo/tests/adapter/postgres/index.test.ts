import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

import postgres, { type PostgresAdapter } from "@/adapter/postgres";
import { isRawSchema } from "@/schema";

describe("PostgreSQL adapter", () => {
  let adapter: PostgresAdapter;
  let container: StartedPostgreSqlContainer;

  // connect to database
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:18").start();
    adapter = postgres({ url: container.getConnectionUri(), max: 1 });
  }, 300_000); // 5 minutes

  // close and destroy container
  afterAll(async () => {
    await adapter.close();
    await container.stop();
  });

  // start transaction and rollback between tests
  beforeEach(async () => {
    await adapter.sql`START TRANSACTION;`;
  });

  afterEach(async () => {
    await adapter.sql`ROLLBACK;`;
    vi.restoreAllMocks();
  });

  describe("pull()", () => {
    it("pulls tables, fields, and primary keys", async () => {
      await adapter.sql`
        create table users (
          id serial primary key,
          name text not null,
          age integer
        );
      `;

      const schema = await adapter.pull!();
      if (isRawSchema(schema)) throw schema;

      const users = schema.models.get("users");

      expect(users).toBeDefined();
      expect(users?.fields.get("id")).toEqual({
        kind: "int",
        name: "id",
        key: "id",
        required: true,
        many: false,
        id: true,
      });

      expect(users?.fields.get("name")).toEqual({
        kind: "string",
        name: "name",
        key: "name",
        required: true,
        many: false,
        id: false,
      });

      expect(users?.fields.get("age")).toEqual({
        kind: "int",
        name: "age",
        key: "age",
        required: false,
        many: false,
        id: false,
      });
    });

    it("pulls foreign key relations and reverse virtual relations", async () => {
      await adapter.sql`
        create table users (
          id serial primary key
        );
      `;

      await adapter.sql`
        create table posts (
          id serial primary key,
          user_id integer not null references users(id)
        );
      `;

      const schema = await adapter.pull!();
      if (isRawSchema(schema)) throw schema;

      const posts = schema.models.get("posts");
      const users = schema.models.get("users");

      expect(posts?.relations.get("user")).toEqual({
        name: "user",
        key: "user",
        from: "posts",
        to: "users",
        many: false,
        virtual: false,
        fields: ["user_id"],
        refs: ["id"],
      });

      expect(users?.relations.get("postses")).toEqual({
        name: "postses",
        key: "postses",
        from: "users",
        to: "posts",
        many: true,
        virtual: true,
      });
    });

    it("pulls indexes", async () => {
      await adapter.sql`
        create table users (
          id serial primary key,
          email text not null,
          age integer not null
        );
      `;

      await adapter.sql`
        create unique index users_email_idx
          on users(email);
      `;

      await adapter.sql`
        create index users_age_idx
          on users(age desc);
      `;

      const schema = await adapter.pull!();
      if (isRawSchema(schema)) throw schema;

      const users = schema.models.get("users");

      expect(users?.indexes.get("users_email_idx")).toEqual({
        name: "users_email_idx",
        unique: true,
        fulltext: false,
        type: "btree",
        fields: new Map([
          [
            "email",
            {
              name: "email",
              sort: "asc",
            },
          ],
        ]),
      });

      expect(users?.indexes.get("users_age_idx")).toEqual({
        name: "users_age_idx",
        unique: false,
        fulltext: false,
        type: "btree",
        fields: new Map([
          [
            "age",
            {
              name: "age",
              sort: "desc",
            },
          ],
        ]),
      });
    });

    it("pulls gin indexes as fulltext indexes", async () => {
      await adapter.sql`
        create table documents (
          id serial primary key,
          content tsvector
        );
      `;

      await adapter.sql`
        create index documents_content_idx
          on documents
          using gin(content);
      `;

      const schema = await adapter.pull!();
      if (isRawSchema(schema)) throw schema;

      const documents = schema.models.get("documents");

      expect(documents?.indexes.get("documents_content_idx")).toEqual({
        name: "documents_content_idx",
        unique: false,
        fulltext: true,
        type: "gin",
        fields: new Map([
          [
            "content",
            {
              name: "content",
              sort: "asc",
            },
          ],
        ]),
      });
    });

    it("maps postgres types correctly", async () => {
      await adapter.sql`
        create table types_test (
          int_col int4,
          bigint_col int8,
          float_col float8,
          decimal_col numeric,
          string_col text,
          bool_col bool,
          datetime_col timestamptz,
          json_col jsonb
        );
      `;

      const schema = await adapter.pull!();
      if (isRawSchema(schema)) throw schema;

      const fields = schema.models.get("types_test")?.fields;

      expect(fields?.get("int_col")?.kind).toBe("int");
      expect(fields?.get("bigint_col")?.kind).toBe("bigint");
      expect(fields?.get("float_col")?.kind).toBe("float");
      expect(fields?.get("decimal_col")?.kind).toBe("decimal");
      expect(fields?.get("string_col")?.kind).toBe("string");
      expect(fields?.get("bool_col")?.kind).toBe("boolean");
      expect(fields?.get("datetime_col")?.kind).toBe("datetime");
      expect(fields?.get("json_col")?.kind).toBe("json");
    });
  });

  describe("deploy()", () => {
    it("deploys a migration and updates entry", async () => {
      const hash = Buffer.from("abc123");
      const migration = `
        create table users (
          id serial primary key
        );
      `;
      await adapter.afterGenerate!(hash, migration);

      await adapter.deploy!(hash, migration);

      const result = await adapter.sql`
        select m_hash, m_deployed_at
        from __kineo_migrations__;
      `;

      expect(result).toHaveLength(1);
      expect(result[0]?.m_hash).toEqual(hash);
      expect(result[0]?.m_deployed_at).not.toBeNull();
    });

    it("throws if migration already exists", async () => {
      const hash = Buffer.from("duplicate");
      const migration = `
        create table posts (
          id serial primary key
        );
      `;
      await adapter.afterGenerate!(hash, migration);

      await adapter.deploy!(hash, migration);

      await expect(adapter.deploy!(hash, migration)).rejects.toThrow(
        "Migration already deployed",
      );
    });
  });

  describe("status()", () => {
    it("returns pending status", async () => {
      const hash = Buffer.from("pending");
      const migration = `
        create table users (
          id serial primary key
        );
      `;
      await adapter.afterGenerate!(hash, migration);

      const result = await adapter.status!(hash, migration);

      expect(result.status).toBe("pending");
      expect(result.meta.hash).toEqual(hash);
    });

    it("throws if migration does not exist", async () => {
      await expect(
        adapter.status!(Buffer.from("missing"), "..."),
      ).rejects.toThrow("Migration not found");
    });
  });

  describe("push()", () => {
    it("executes generated migration SQL", async () => {
      const spy = vi.spyOn(adapter.sql, "unsafe");

      await adapter.push!(
        {
          models: new Map(),
        },
        {
          models: new Map([
            [
              "users",
              {
                name: "users",
                key: "users",
                fields: new Map([
                  [
                    "id",
                    {
                      kind: "int",
                      name: "id",
                      key: "id",
                      required: true,
                      many: false,
                      id: true,
                    },
                  ],
                ]),
                relations: new Map(),
                indexes: new Map(),
              },
            ],
          ]),
        },
      );

      expect(spy).toHaveBeenCalled();
    });
  });

  describe("generate()", () => {
    it("returns SQL migration statements", async () => {
      const result = await adapter.generate!(
        {
          models: new Map(),
        },
        {
          models: new Map([
            [
              "users",
              {
                name: "users",
                key: "users",
                fields: new Map([
                  [
                    "id",
                    {
                      kind: "int",
                      name: "id",
                      key: "id",
                      required: true,
                      many: false,
                      id: true,
                    },
                  ],
                ]),
                relations: new Map(),
                indexes: new Map(),
              },
            ],
          ]),
        },
      );

      expect(result.statements.length).toBeGreaterThan(0);
    });
  });
});
