import { describe, it, expect } from "vitest";
import sqlEmitter from "@/emitter/sql";
import { postgresDialect } from "@/emitter/sql/postgres";

describe("Postgres SQL dialect", () => {
  it("quotes identifiers and emits numbered placeholders", () => {
    expect(postgresDialect.quoteIdentifier("role")).toBe('"role"');
    expect(postgresDialect.quoteIdentifier('my"table')).toBe('"my""table"');
    expect(postgresDialect.placeholder(1)).toBe("$1");
    expect(postgresDialect.placeholder(42)).toBe("$42");
  });

  it("renders DISTINCT ON with a postgres dialect", async () => {
    const result = await sqlEmitter(
      [
        {
          type: "query",
          distinct: [{ type: "column", name: "email" }],
          select: [{ type: "star" }],
          from: [{ type: "table", name: "users" }],
        },
      ],
      postgresDialect,
    );

    expect(result.command).toBe('SELECT DISTINCT ON ("email") * FROM "users"');
    expect(result.params).toEqual([]);
  });
});
