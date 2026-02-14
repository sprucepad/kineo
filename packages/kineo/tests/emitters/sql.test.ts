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
  // -----------------------
  // UPDATE TESTS
  // -----------------------

  it("emits UPDATE with WHERE", () => {
    const dialect = createFakeDialect();

    const result = emit(
      IR.makeIR({
        type: IR.StatementType.Update,
        model: "User",
        data: { name: "Alice", age: 30 },
        where: { id: 1 },
      } as any),
      dialect,
    );

    expect(result.command).toBe(
      `UPDATE "User" SET "name" = 'Alice', "age" = 30 WHERE "id" = 1`,
    );
  });

  it("emits UPDATE with RETURNING", () => {
    const dialect = createFakeDialect();

    const result = emit(
      IR.makeIR({
        type: IR.StatementType.Update,
        model: "User",
        data: { active: true },
        where: { id: 5 },
        select: { id: true, active: true },
      } as any),
      dialect,
    );

    expect(result.command).toBe(
      `UPDATE "User" SET "active" = TRUE WHERE "id" = 5 RETURNING id, active`,
    );
  });

  it("emits UPDATE with JSON path field", () => {
    const dialect = createFakeDialect();

    const result = emit(
      IR.makeIR({
        type: IR.StatementType.Update,
        model: "User",
        data: { "profile.name": "Bob" },
        where: { id: 2 },
      } as any),
      dialect,
    );

    expect(result.command).toBe(
      `UPDATE "User" SET JSON_EXTRACT("profile", '$.name') = 'Bob' WHERE "id" = 2`,
    );
  });

  it("supports complex WHERE in UPDATE", () => {
    const dialect = createFakeDialect();

    const result = emit(
      IR.makeIR({
        type: IR.StatementType.Update,
        model: "User",
        data: { age: 40 },
        where: {
          AND: [
            { active: true },
            { OR: [{ age: { lt: 50 } }, { name: "Charlie" }] },
          ],
        },
      } as any),
      dialect,
    );

    expect(result.command).toContain(
      `WHERE ("active" = TRUE) AND (("age" < 50) OR ("name" = 'Charlie'))`,
    );
  });

  it("throws if UPDATE has no data", () => {
    const dialect = createFakeDialect();

    expect(() =>
      emit(
        IR.makeIR({
          type: IR.StatementType.Update,
          model: "User",
          data: {},
          where: { id: 1 },
        } as any),
        dialect,
      ),
    ).toThrow(/requires at least one field/i);
  });

  // -----------------------
  // Existing tests below
  // -----------------------

  it("emits simple SELECT with where, order, limit/offset", () => {
    const dialect = createFakeDialect();

    const result = emit(
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
  it("emits simple SELECT with where, order, limit/offset", () => {
    const dialect = createFakeDialect();

    const result = emit(
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

  it("supports AND / OR nesting", () => {
    const dialect = createFakeDialect();

    const result = emit(
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

  it("supports JSON column paths via jsonExtract", () => {
    const dialect = createFakeDialect();

    const result = emit(
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

  it("emits INSERT with data + RETURNING", () => {
    const dialect = createFakeDialect();

    const result = emit(
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

  it("emits INSERT DEFAULT VALUES when no data provided", () => {
    const dialect = createFakeDialect();

    const result = emit(
      IR.makeIR({
        type: IR.StatementType.Create,
        model: "User",
        data: {},
      } as any),
      dialect,
    );

    expect(result.command).toBe(`INSERT INTO "User" DEFAULT VALUES`);
  });

  it("delegates UPSERT generation to dialect", () => {
    const dialect = createFakeDialect();

    const result = emit(
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

  it("emits DELETE with WHERE", () => {
    const dialect = createFakeDialect();

    const result = emit(
      IR.makeIR({
        type: IR.StatementType.Delete,
        model: "User",
        where: { id: 1 },
      } as any),
      dialect,
    );

    expect(result.command).toBe(`DELETE FROM "User" WHERE "id" = 1`);
  });

  it("emits COUNT with WHERE", () => {
    const dialect = createFakeDialect();

    const result = emit(
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

  it("joins multiple statements with semicolons", () => {
    const dialect = createFakeDialect();

    const result = emit(
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
