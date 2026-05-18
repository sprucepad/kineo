import { describe, it, expect } from "vitest";
import sqlEmitter, { type SQLDialect } from "@/emitter/sql";

describe("SQL emitter", () => {
  const dialect: SQLDialect = {
    quoteIdentifier: (name) => `"${name.replace(/"/g, '""')}"`,
    placeholder: (index) => `$${index}`,
  };

  it("renders a basic SELECT query with parameters", async () => {
    const result = sqlEmitter(
      [
        {
          type: "query",
          select: [
            {
              type: "expression",
              expression: { type: "column", table: "u", name: "id" },
              alias: "id",
            },
            {
              type: "expression",
              expression: { type: "column", table: "u", name: "name" },
              alias: "name",
            },
          ],
          from: [{ type: "table", name: "users", alias: "u" }],
          where: {
            type: "binary",
            operator: "=",
            left: { type: "column", table: "u", name: "active" },
            right: { type: "literal", value: true },
          },
          orderBy: [
            {
              expression: { type: "column", table: "u", name: "createdAt" },
              direction: "desc",
            },
          ],
          limit: 10,
          offset: 5,
        },
      ],
      dialect,
    );

    expect(result.statements[0]?.command).toBe(
      'SELECT "u"."id" AS "id", "u"."name" AS "name" FROM "users" AS "u" WHERE "u"."active" = $1 ORDER BY "u"."createdAt" DESC LIMIT 10 OFFSET 5',
    );
    expect(result.statements[0]?.params).toEqual([true]);
  });

  it("renders INSERT with RETURNING and ON CONFLICT", async () => {
    const result = sqlEmitter(
      [
        {
          type: "insert",
          into: { type: "table", name: "users" },
          columns: ["name", "email"],
          values: [
            [
              { type: "literal", value: "Alice" },
              { type: "literal", value: "alice@example.com" },
            ],
          ],
          returning: [
            {
              type: "expression",
              expression: { type: "column", name: "id" },
              alias: "id",
            },
          ],
          onConflict: {
            target: ["email"],
            action: { type: "doNothing" },
          },
        },
      ],
      dialect,
    );

    expect(result.statements[0]?.command).toBe(
      'INSERT INTO "users" ("name", "email") VALUES ($1, $2) ON CONFLICT ("email") DO NOTHING RETURNING "id" AS "id"',
    );
    expect(result.statements[0]?.params).toEqual([
      "Alice",
      "alice@example.com",
    ]);
  });

  it("renders UPDATE with FROM and RETURNING", async () => {
    const result = sqlEmitter(
      [
        {
          type: "update",
          table: { type: "table", name: "users" },
          set: {
            name: { type: "literal", value: "Bob" },
          },
          from: [{ type: "table", name: "accounts", alias: "a" }],
          where: {
            type: "binary",
            operator: "=",
            left: { type: "column", name: "id" },
            right: { type: "literal", value: 42 },
          },
          returning: [
            {
              type: "expression",
              expression: { type: "column", name: "id" },
              alias: "id",
            },
          ],
        },
      ],
      dialect,
    );

    expect(result.statements[0]?.command).toBe(
      'UPDATE "users" SET "name" = $1 FROM "accounts" AS "a" WHERE "id" = $2 RETURNING "id" AS "id"',
    );
    expect(result.statements[0]?.params).toEqual(["Bob", 42]);
  });

  it("renders DELETE with WHERE and RETURNING", async () => {
    const result = sqlEmitter(
      [
        {
          type: "delete",
          from: { type: "table", name: "users" },
          where: {
            type: "binary",
            operator: "=",
            left: { type: "column", name: "id" },
            right: { type: "literal", value: 3 },
          },
          returning: [
            {
              type: "expression",
              expression: { type: "column", name: "id" },
              alias: "id",
            },
          ],
        },
      ],
      dialect,
    );

    expect(result.statements[0]?.command).toBe(
      'DELETE FROM "users" WHERE "id" = $1 RETURNING "id" AS "id"',
    );
    expect(result.statements[0]?.params).toEqual([3]);
  });
});
