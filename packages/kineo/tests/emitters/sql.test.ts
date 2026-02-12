import { describe, it, expect, vi } from "vitest";
import emit from "@/emitters/sql";
import * as IR from "@/ir";

// MInimal fake dialect
function createFakeDialect() {
  return {
    identifier: (name: string) => `"${name}"`,
    string: (value: string) => `'${value}'`,
    array: (values: unknown[]) =>
      `(${values.map((v) => JSON.stringify(v)).join(",")})`,
    limitOffset: (limit?: number, offset?: number) => {
      const parts = [];
      if (limit != null) parts.push(`LIMIT ${limit}`);
      if (offset != null) parts.push(`OFFSET ${offset}`);
      return parts.join(" ");
    },
    boolean: (value: boolean) => (value ? "TRUE" : "FALSE"),
    upsert: vi.fn(
      (
        table: string,
        {
          insertColumns,
          insertValues,
          conflictTarget,
          updateAssignments,
          returning,
        },
      ) => {
        return [
          `UPSERT ${table}`,
          `INSERT(${insertColumns.join(",")})`,
          `VALUES(${insertValues.join(",")})`,
          `CONFLICT(${conflictTarget.join(",")})`,
          `UPDATE(${updateAssignments.join(",")})`,
          returning,
        ]
          .filter(Boolean)
          .join(" ");
      },
    ),
    autoIncrement: () => "AUTO_INCREMENT",
    now: () => "NOW()",
    jsonExtract: (column: string, path: string) =>
      `JSON_EXTRACT(${column}, '${path}')`,
    type: (type: string) => type.toUpperCase(),
    returning: (columns?: string[]) =>
      columns?.length ? `RETURNING ${columns.join(", ")}` : "",
  };
}

describe("SQL emitter (with fake dialect)", () => {
  it("emits simple SELECT with where, order, limit/offset", async () => {
    const dialect = createFakeDialect();

    const result = await emit(
      IR.makeIR({
        type: IR.StatementType.Find,
        model: "User",
        select: { id: true, name: true },
        where: { name: "John", age: { gt: 18 } },
        orderBy: [{ age: "desc" }],
        take: 10,
        skip: 5,
      } as any),
      dialect,
    );

    expect(result.command).toBe(
      `SELECT "id", "name" FROM "User" ` +
        `WHERE "name" = 'John' AND "age" > 18 ` +
        `ORDER BY "age" DESC LIMIT 10 OFFSET 5`,
    );
  });

  it("supports AND / OR nesting", async () => {
    const dialect = createFakeDialect();

    const result = await emit(
      IR.makeIR({
        type: IR.StatementType.Find,
        model: "User",
        where: {
          AND: [
            { age: { gte: 18 } },
            {
              OR: [{ name: "Alice" }, { name: "Bob" }],
            },
          ],
        },
      } as any),
      dialect,
    );

    expect(result.command).toContain(
      `WHERE ("age" >= 18) AND (("name" = 'Alice') OR ("name" = 'Bob'))`,
    );
  });

  it("supports JSON column paths via jsonExtract", async () => {
    const dialect = createFakeDialect();

    const result = await emit(
      IR.makeIR({
        type: IR.StatementType.Find,
        model: "User",
        where: {
          "profile.name": "John",
        },
      } as any),
      dialect,
    );

    expect(result.command).toContain(
      `JSON_EXTRACT("profile", '$.name') = 'John'`,
    );
  });

  it("emits INSERT with data + RETURNING", async () => {
    const dialect = createFakeDialect();

    const result = await emit(
      IR.makeIR({
        type: IR.StatementType.Create,
        model: "User",
        data: { name: "Alice", active: true },
        select: { id: true },
      } as any),
      dialect,
    );

    expect(result.command).toBe(
      `INSERT INTO "User" ("name", "active") VALUES ('Alice', TRUE) RETURNING id`,
    );
  });

  it("emits INSERT DEFAULT VALUES when no data provided", async () => {
    const dialect = createFakeDialect();

    const result = await emit(
      IR.makeIR({
        type: IR.StatementType.Create,
        model: "User",
        data: {},
      } as any),
      dialect,
    );

    expect(result.command).toBe(`INSERT INTO "User" DEFAULT VALUES`);
  });

  it("delegates UPSERT generation to dialect", async () => {
    const dialect = createFakeDialect();

    const result = await emit(
      IR.makeIR({
        type: IR.StatementType.Upsert,
        model: "User",
        where: { id: 1 },
        data: {
          create: { id: 1, name: "Alice" },
          update: { name: "Updated" },
        },
        select: { id: true },
      } as any),
      dialect,
    );

    expect(dialect.upsert).toHaveBeenCalledOnce();

    expect(result.command).toContain(`UPSERT "User"`);
    expect(result.command).toContain(`INSERT(id,name)`);
    expect(result.command).toContain(`CONFLICT(id)`);
    expect(result.command).toContain(`UPDATE("name" = 'Updated')`);
    expect(result.command).toContain(`RETURNING id`);
  });

  it("emits DELETE with WHERE", async () => {
    const dialect = createFakeDialect();

    const result = await emit(
      IR.makeIR({
        type: IR.StatementType.Delete,
        model: "User",
        where: { id: 1 },
      } as any),
      dialect,
    );

    expect(result.command).toBe(`DELETE FROM "User" WHERE "id" = 1`);
  });

  it("emits COUNT with WHERE", async () => {
    const dialect = createFakeDialect();

    const result = await emit(
      IR.makeIR({
        type: IR.StatementType.Count,
        model: "User",
        where: { active: true },
      } as any),
      dialect,
    );

    expect(result.command).toBe(
      `SELECT COUNT(*) AS count FROM "User" WHERE "active" = TRUE`,
    );
  });

  it("joins multiple statements with semicolons", async () => {
    const dialect = createFakeDialect();

    const result = await emit(
      IR.makeIR(
        {
          type: IR.StatementType.Delete,
          model: "User",
          where: { id: 1 },
        } as any,
        {
          type: IR.StatementType.Count,
          model: "User",
        } as any,
      ),
      dialect,
    );

    expect(result.command).toBe(
      `DELETE FROM "User" WHERE "id" = 1;SELECT COUNT(*) AS count FROM "User"`,
    );
  });
});
