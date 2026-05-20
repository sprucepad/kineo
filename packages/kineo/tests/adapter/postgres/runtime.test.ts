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
import * as emitter from "@/emitter/sql";

import postgresRuntime, {
  postgresDialect,
  type PostgresRuntimeAdapter,
} from "@/adapter/postgres/runtime";

describe("PostgreSQL runtime adapter", () => {
  let adapter: PostgresRuntimeAdapter;
  let container: StartedPostgreSqlContainer;

  // connect to database
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:18").start();
    adapter = postgresRuntime({ url: container.getConnectionUri(), max: 1 });
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

  describe("constructor options", () => {
    it("accepts a connection string", async () => {
      const runtime = postgresRuntime(container.getConnectionUri());

      const result = await runtime.sql`SELECT 1 as value`;

      expect(result[0]?.value).toBe(1);

      await runtime.close();
    });

    it("accepts an existing sql instance", async () => {
      const runtime = postgresRuntime({
        sql: adapter.sql,
      });

      const result = await runtime.sql`SELECT 1 as value`;

      expect(result[0]?.value).toBe(1);
      expect(runtime.sql).toBe(adapter.sql);
    });

    it("accepts postgres options with url", async () => {
      const runtime = postgresRuntime({
        url: container.getConnectionUri(),
        max: 1,
      });

      const result = await runtime.sql`SELECT 1 as value`;

      expect(result[0]?.value).toBe(1);

      await runtime.close();
    });
  });

  describe("close", () => {
    it("calls sql.end()", async () => {
      const endSpy = vi.spyOn(adapter.sql, "end");

      await adapter.close();

      expect(endSpy).toHaveBeenCalledTimes(1);

      // reconnect adapter for remaining tests
      adapter = postgresRuntime({
        url: container.getConnectionUri(),
        max: 1,
      });
    });
  });

  describe("emit", () => {
    it("delegates to sqlEmitter with postgresDialect", async () => {
      const ir = [
        {
          type: "select",
        },
      ] as any;

      const emitterSpy = vi.spyOn(emitter, "default");

      await adapter.emit(ir);

      expect(emitterSpy).toHaveBeenCalledWith(ir, postgresDialect);
    });
  });

  describe("exec", () => {
    beforeEach(async () => {
      await adapter.sql`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          age INTEGER NOT NULL
        );
      `;
    });

    it("executes statements without parameters", async () => {
      const result = await adapter.exec({
        statements: [
          {
            command: `
              INSERT INTO users (name, age)
              VALUES ('john', 30)
              RETURNING *
            `,
            params: [],
          },
        ],
      });

      expect(result.rowCount).toBe(1);
      expect(result.rows).toHaveLength(1);

      expect(result.rows?.[0]).toMatchObject({
        name: "john",
        age: 30,
      });
    });

    it("executes statements with positional parameters", async () => {
      const result = await adapter.exec({
        statements: [
          {
            command: `
              INSERT INTO users (name, age)
              VALUES ($1, $2)
              RETURNING *
            `,
            params: ["jane", 25],
          },
        ],
      });

      expect(result.rowCount).toBe(1);

      expect(result.rows?.[0]).toMatchObject({
        name: "jane",
        age: 25,
      });
    });

    it("supports repeated parameter references", async () => {
      const result = await adapter.exec({
        statements: [
          {
            command: `
              SELECT $1::text as first, $1::text as second
            `,
            params: ["same"],
          },
        ],
      });

      expect(result.rows?.[0]).toEqual({
        first: "same",
        second: "same",
      });
    });

    it("executes multiple statements and flattens rows", async () => {
      const result = await adapter.exec({
        statements: [
          {
            command: `
              INSERT INTO users (name, age)
              VALUES ($1, $2)
              RETURNING name
            `,
            params: ["alice", 20],
          },
          {
            command: `
              INSERT INTO users (name, age)
              VALUES ($1, $2)
              RETURNING name
            `,
            params: ["bob", 40],
          },
        ],
      });

      expect(result.rowCount).toBe(2);

      expect(result.rows).toEqual([{ name: "alice" }, { name: "bob" }]);
    });

    it("returns rowCount from rows.length by default", async () => {
      const result = await adapter.exec({
        statements: [
          {
            command: `
              SELECT * FROM generate_series(1, 3)
            `,
            params: [],
          },
        ],
      });

      expect(result.rowCount).toBe(3);
      expect(result.rows).toHaveLength(3);
    });

    it("returns rowCount from count field when present", async () => {
      const result = await adapter.exec({
        statements: [
          {
            command: `
              SELECT 42 as count
            `,
            params: [],
          },
        ],
      });

      expect(result.rowCount).toBe(42);
    });

    it("returns zero rowCount for empty results", async () => {
      const result = await adapter.exec({
        statements: [
          {
            command: `
              SELECT * FROM users WHERE id = -1
            `,
            params: [],
          },
        ],
      });

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it("handles parameters out of order", async () => {
      const result = await adapter.exec({
        statements: [
          {
            command: `
              SELECT $2::text as second, $1::text as first
            `,
            params: ["first", "second"],
          },
        ],
      });

      expect(result.rows?.[0]).toEqual({
        first: "first",
        second: "second",
      });
    });
  });
});
