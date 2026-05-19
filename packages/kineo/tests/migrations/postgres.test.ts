import { describe, expect, it } from "vitest";

import { postgresMigrationDialect } from "@/migrations/sql/postgres";

describe("postgresMigrationDialect", () => {
  describe("mapType", () => {
    it("maps scalar kinds correctly", () => {
      expect(
        postgresMigrationDialect.mapType("string", {
          name: "value",
          key: "value",
          kind: "string",
          many: false,
          required: false,
        }),
      ).toBe("TEXT");

      expect(
        postgresMigrationDialect.mapType("float", {
          name: "value",
          key: "value",
          kind: "float",
          many: false,
          required: false,
        }),
      ).toBe("DOUBLE PRECISION");

      expect(
        postgresMigrationDialect.mapType("json", {
          name: "value",
          key: "value",
          kind: "json",
          many: false,
          required: false,
        }),
      ).toBe("JSONB");
    });

    it("maps unknown many fields to JSONB", () => {
      expect(
        postgresMigrationDialect.mapType("custom" as never, {
          name: "tags",
          key: "value",
          kind: "custom" as never,
          many: true,
          required: false,
        }),
      ).toBe("JSONB");
    });

    it("maps unknown singular fields to TEXT", () => {
      expect(
        postgresMigrationDialect.mapType("custom" as never, {
          name: "value",
          key: "value",
          kind: "custom" as never,
          many: false,
          required: false,
        }),
      ).toBe("TEXT");
    });
  });

  describe("renderFieldChange", () => {
    it("renders type changes", () => {
      const sql = postgresMigrationDialect.renderFieldChange?.(
        "users",
        "age",
        {
          kind: "type",
          to: "int",
          from: "bigint",
        },
        {} as never,
      );

      expect(sql).toBe('ALTER TABLE "users" ALTER COLUMN "age" TYPE INTEGER');
    });

    it("renders required=true changes", () => {
      const sql = postgresMigrationDialect.renderFieldChange?.(
        "users",
        "email",
        {
          kind: "required",
          to: true,
          from: false,
        },
        {} as never,
      );

      expect(sql).toBe('ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL');
    });

    it("renders required=false changes", () => {
      const sql = postgresMigrationDialect.renderFieldChange?.(
        "users",
        "email",
        {
          kind: "required",
          to: false,
          from: true,
        },
        {} as never,
      );

      expect(sql).toBe(
        'ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL',
      );
    });

    it("renders id=true changes", () => {
      const sql = postgresMigrationDialect.renderFieldChange?.(
        "users",
        "id",
        {
          kind: "id",
          to: true,
        },
        {} as never,
      );

      expect(sql).toBe('ALTER TABLE "users" ADD PRIMARY KEY ("id")');
    });

    it("renders id=false changes", () => {
      const sql = postgresMigrationDialect.renderFieldChange?.(
        "users",
        "id",
        {
          kind: "id",
          to: false,
        },
        {} as never,
      );

      expect(sql).toBe('ALTER TABLE "users" DROP CONSTRAINT "users_pkey"');
    });

    it("returns null for unsupported field changes", () => {
      expect(
        postgresMigrationDialect.renderFieldChange?.(
          "users",
          "tags",
          {
            kind: "many",
            to: true,
            from: false,
          },
          {} as never,
        ),
      ).toBeNull();
    });
  });

  describe("renderRelation", () => {
    it("renders foreign key constraints", () => {
      const sql = postgresMigrationDialect.renderRelation?.(
        "posts",
        {
          name: "user",
          from: "userId",
          to: "users",
          virtual: false,
          many: false,
          fields: ["user_id"],
          refs: ["id"],
        },
        {} as never,
      );

      expect(sql).toBe(
        'ALTER TABLE "posts" ADD CONSTRAINT "posts_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id")',
      );
    });

    it("returns null for virtual relations", () => {
      const sql = postgresMigrationDialect.renderRelation?.(
        "posts",
        {
          name: "user",
          from: "userId",
          to: "users",
          virtual: true,
          many: false,
          fields: [],
          refs: [],
        },
        {} as never,
      );

      expect(sql).toBeNull();
    });
  });

  describe("renderDropRelation", () => {
    it("renders constraint drops", () => {
      const sql = postgresMigrationDialect.renderDropRelation?.(
        "posts",
        "user",
        {} as never,
      );

      expect(sql).toBe('ALTER TABLE "posts" DROP CONSTRAINT "posts_user_fkey"');
    });
  });

  describe("renderRelationChange", () => {
    it("drops constraints when virtual becomes true", () => {
      const sql = postgresMigrationDialect.renderRelationChange?.(
        "posts",
        "user",
        {
          kind: "virtual",
          to: true,
          from: false,
        },
        {} as never,
      );

      expect(sql).toBe('ALTER TABLE "posts" DROP CONSTRAINT "posts_user_fkey"');
    });

    it("returns null for virtual=false", () => {
      const sql = postgresMigrationDialect.renderRelationChange?.(
        "posts",
        "user",
        {
          kind: "virtual",
          to: false,
          from: false,
        },
        {} as never,
      );

      expect(sql).toBeNull();
    });
  });

  describe("renderIndexType", () => {
    it("renders known postgres index types", () => {
      expect(postgresMigrationDialect.renderIndexType?.("B-tree")).toBe(
        "BTREE",
      );

      expect(postgresMigrationDialect.renderIndexType?.("GiST")).toBe("GIST");

      expect(postgresMigrationDialect.renderIndexType?.("GIN")).toBe("GIN");
    });

    it("uppercases unknown index types", () => {
      expect(
        postgresMigrationDialect.renderIndexType?.("custom" as never),
      ).toBe("CUSTOM");
    });
  });

  describe("renderIndexField", () => {
    it("renders sortable index fields", () => {
      const sql = postgresMigrationDialect.renderIndexField?.({
        name: "email",
        sort: "desc",
      });

      expect(sql).toBe('"email" DESC');
    });

    it("renders fields without sort", () => {
      const sql = postgresMigrationDialect.renderIndexField?.({
        name: "email",
        sort: "asc",
      });

      expect(sql).toBe('"email" ASC');
    });
  });

  describe("renderIndexChange", () => {
    it("renders recreate notices for supported changes", () => {
      const sql = postgresMigrationDialect.renderIndexChange?.(
        "users",
        "users_email_idx",
        {
          kind: "unique",
          to: true,
          from: false,
        },
        {} as never,
      );

      expect(sql).toBe(
        'DROP INDEX IF EXISTS "users_email_idx"; -- recreate index required',
      );
    });
  });

  it("enables postgres-specific capabilities", () => {
    expect(postgresMigrationDialect.supportsIfExists).toBe(true);
    expect(postgresMigrationDialect.supportsCascade).toBe(true);
  });
});
