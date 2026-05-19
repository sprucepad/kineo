import { describe, expect, it, vi } from "vitest";

import sqlMigrationEmitter, {
  type SQLMigrationDialect,
} from "@/migrations/sql";
import type { MigrationCommand } from "@/adapter";

function createDialect(
  overrides: Partial<SQLMigrationDialect> = {},
): SQLMigrationDialect {
  return {
    quoteIdentifier: vi.fn((value: string) => `"${value}"`),
    mapType: vi.fn((kind) => {
      switch (kind) {
        case "string":
          return "TEXT";
        case "int":
          return "INTEGER";
        case "boolean":
          return "BOOLEAN";
        default:
          return "TEXT";
      }
    }),
    supportsIfExists: false,
    supportsCascade: false,
    ...overrides,
  } as SQLMigrationDialect;
}

describe("sql migration emitter", () => {
  it("renders create_model operations", () => {
    const dialect = createDialect();

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "create_model",
            model: {
              name: "users",
              key: "users",
              fields: new Map([
                [
                  "id",
                  {
                    key: "id",
                    name: "id",
                    kind: "int",
                    required: true,
                    id: true,
                    many: false,
                  },
                ],
                [
                  "email",
                  {
                    key: "email",
                    name: "email",
                    kind: "string",
                    required: true,
                    many: false,
                  },
                ],
              ]),
              relations: new Map(),
              indexes: new Map(),
            },
          },
        ],
      },
      dialect,
    );

    expect(result.statements).toEqual([
      {
        type: "command",
        command: `CREATE TABLE "users" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL
)`,
        description: "Create table users",
      },
    ]);
  });

  it("renders drop_model with IF EXISTS and CASCADE", () => {
    const dialect = createDialect({
      supportsIfExists: true,
      supportsCascade: true,
    });

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "drop_model",
            modelName: "users",
          },
        ],
      },
      dialect,
    );

    expect(result.statements).toEqual([
      {
        type: "command",
        command: 'DROP TABLE IF EXISTS "users" CASCADE',
        description: "Drop table users",
      },
    ]);
  });

  it("renders add_field operations", () => {
    const dialect = createDialect();

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "add_field",
            model: "users",
            field: {
              key: "age",
              name: "age",
              kind: "int",
              required: false,
              many: false,
            },
          },
        ],
      },
      dialect,
    );

    expect(result.statements).toEqual([
      {
        type: "command",
        command: 'ALTER TABLE "users" ADD COLUMN "age" INTEGER',
        description: "Add column age to users",
      },
    ]);
  });

  it("renders drop_field operations", () => {
    const dialect = createDialect();

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "drop_field",
            model: "users",
            fieldName: "age",
          },
        ],
      },
      dialect,
    );

    expect(result.statements).toEqual([
      {
        type: "command",
        command: 'ALTER TABLE "users" DROP COLUMN "age"',
        description: "Drop column age on users",
      },
    ]);
  });

  it("renders default alter_field operations", () => {
    const dialect = createDialect();

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "alter_field",
            model: "users",
            fieldName: "email",
            changes: [
              {
                kind: "required",
                from: false,
                to: true,
              },
            ],
          },
        ],
      },
      dialect,
    );

    expect(result.statements).toEqual([
      {
        type: "command",
        command: 'ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL',
        description: "Alter field email (changes: required)",
      },
    ]);
  });

  it("uses custom renderFieldChange when provided", () => {
    const dialect = createDialect({
      renderFieldChange: vi.fn(() => "CUSTOM FIELD CHANGE"),
    });

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "alter_field",
            model: "users",
            fieldName: "email",
            changes: [
              {
                kind: "required",
                from: false,
                to: false,
              },
            ],
          },
        ],
      },
      dialect,
    );

    expect(result.statements).toEqual([
      {
        type: "command",
        command: "CUSTOM FIELD CHANGE",
        description: "Alter field email (changes: required)",
      },
    ]);
  });

  it("renders relation operations", () => {
    const dialect = createDialect({
      renderRelation: vi.fn(() => "ADD RELATION"),
    });

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "add_relation",
            model: "posts",
            relation: {
              name: "user",
              from: "userId",
              to: "users",
              fields: ["userId"],
              refs: ["id"],
              virtual: false,
              many: false,
            },
          },
        ],
      },
      dialect,
    );

    expect(result.statements).toEqual([
      {
        type: "command",
        command: "ADD RELATION",
        description: "Add relationship userId -> users",
      },
    ]);
  });

  it("renders drop_relation operations", () => {
    const dialect = createDialect({
      renderDropRelation: vi.fn(() => "DROP RELATION"),
    });

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "drop_relation",
            model: "posts",
            relationName: "user",
          },
        ],
      },
      dialect,
    );

    expect(result.statements).toEqual([
      {
        type: "command",
        command: "DROP RELATION",
        description: "Drop relationship user",
      },
    ]);
  });

  it("renders add_index operations", () => {
    const dialect = createDialect({
      renderIndexType: vi.fn(() => "BTREE"),
      renderIndexField: vi.fn((field) => `"${field.name}" DESC`),
    });

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "add_index",
            model: "users",
            index: {
              name: "users_email_idx",
              unique: true,
              type: "B-tree",
              fulltext: false,
              fields: new Map([
                [
                  "email",
                  {
                    name: "email",
                    sort: "desc",
                  },
                ],
              ]),
            },
          },
        ],
      },
      dialect,
    );

    expect(result.statements).toEqual([
      {
        type: "command",
        command:
          'CREATE UNIQUE INDEX "users_email_idx" ON "users" USING BTREE ("email" DESC)',
        description: "Create unique index users_email_idx",
      },
    ]);
  });

  it("renders drop_index operations", () => {
    const dialect = createDialect({
      supportsIfExists: true,
    });

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "drop_index",
            indexName: "users_email_idx",
            model: "users",
          },
        ],
      },
      dialect,
    );

    expect(result.statements).toEqual([
      {
        type: "command",
        command: 'DROP INDEX IF EXISTS "users_email_idx"',
        description: "Drop index users_email_idx",
      },
    ]);
  });

  it("renders alter_index operations and filters null entries", () => {
    const dialect = createDialect({
      renderIndexChange: vi
        .fn()
        .mockReturnValueOnce("ALTER INDEX 1")
        .mockReturnValueOnce(null)
        .mockReturnValueOnce("ALTER INDEX 2"),
    });

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "alter_index",
            model: "users",
            indexName: "users_email_idx",
            changes: [
              { kind: "unique", to: true, from: false },
              { kind: "type", to: "Hash", from: "B-tree" },
              { kind: "fields", to: [], from: [{ name: "id", sort: "desc" }] },
            ],
          },
        ],
      },
      dialect,
    );

    expect(result.statements).toEqual([
      {
        type: "command",
        command: "ALTER INDEX 1",
        description: "Alter index users_email_idx",
      },
      {
        type: "command",
        command: "ALTER INDEX 2",
        description: "Alter index users_email_idx",
      },
    ]);
  });

  it("supports formatIdentifier override", () => {
    const dialect = createDialect({
      formatIdentifier: vi.fn((value: string) => `public.${value}`),
    });

    const result = sqlMigrationEmitter(
      {
        operations: [
          {
            kind: "drop_model",
            modelName: "users",
          },
        ],
      },
      dialect,
    );

    expect(result.statements[0]?.type).toBe("command");
    expect((result.statements[0] as MigrationCommand).command).toBe(
      "DROP TABLE public.users",
    );
  });
});
