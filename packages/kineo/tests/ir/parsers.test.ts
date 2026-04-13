import { describe, it, expect } from "vitest";
import {
  parseAggregateStatement,
  parseCountStatement,
  parseDeleteStatement,
  parseFindStatement,
  parseGroupByStatement,
  parseInsertStatement,
  parseUpdateStatement,
  parseUpsertStatement,
} from "./parsers";

describe("IR parsers", () => {
  it("parses find options into a query statement", () => {
    const statement = parseFindStatement("User", {
      where: { id: { equals: 1 }, name: { contains: "John" } },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      skip: 5,
      distinct: ["email"],
    });

    expect(statement).toEqual({
      type: "query",
      select: [
        {
          type: "expression",
          expression: { type: "column", name: "id" },
          alias: "id",
        },
        {
          type: "expression",
          expression: { type: "column", name: "name" },
          alias: "name",
        },
      ],
      from: [{ type: "table", name: "User" }],
      where: {
        type: "binary",
        operator: "and",
        left: {
          type: "binary",
          operator: "=",
          left: { type: "column", name: "id" },
          right: { type: "literal", value: 1 },
        },
        right: {
          type: "binary",
          operator: "like",
          left: { type: "column", name: "name" },
          right: { type: "literal", value: "%John%" },
        },
      },
      orderBy: [
        {
          expression: { type: "column", name: "createdAt" },
          direction: "desc",
        },
      ],
      limit: 10,
      offset: 5,
      distinct: [{ type: "column", name: "email" }],
    });
  });

  it("parses insert options into an insert statement", () => {
    const statement = parseInsertStatement("User", {
      data: { name: "Alice", email: "alice@example.com" },
      select: { id: true },
    });

    expect(statement).toEqual({
      type: "insert",
      into: { type: "table", name: "User" },
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
    });
  });

  it("parses update options into an update statement", () => {
    const statement = parseUpdateStatement("User", {
      where: { id: 1 },
      data: { age: { increment: 1 }, name: { set: "Alice" } },
      select: { age: true },
    });

    expect(statement).toEqual({
      type: "update",
      table: { type: "table", name: "User" },
      set: {
        age: {
          type: "binary",
          operator: "+",
          left: { type: "column", name: "age" },
          right: { type: "literal", value: 1 },
        },
        name: {
          type: "literal",
          value: "Alice",
        },
      },
      where: {
        type: "binary",
        operator: "=",
        left: { type: "column", name: "id" },
        right: { type: "literal", value: 1 },
      },
      returning: [
        {
          type: "expression",
          expression: { type: "column", name: "age" },
          alias: "age",
        },
      ],
    });
  });

  it("parses delete options into a delete statement", () => {
    const statement = parseDeleteStatement("User", {
      where: { id: 1 },
      select: { id: true },
    });

    expect(statement).toEqual({
      type: "delete",
      from: { type: "table", name: "User" },
      where: {
        type: "binary",
        operator: "=",
        left: { type: "column", name: "id" },
        right: { type: "literal", value: 1 },
      },
      returning: [
        {
          type: "expression",
          expression: { type: "column", name: "id" },
          alias: "id",
        },
      ],
    });
  });

  it("parses upsert options into an insert statement with conflict handling", () => {
    const statement = parseUpsertStatement("User", {
      where: { email: "alice@example.com" },
      create: { name: "Alice", email: "alice@example.com" },
      update: { name: { set: "Alice Updated" } },
      select: { id: true },
    });

    expect(statement).toEqual({
      type: "insert",
      into: { type: "table", name: "User" },
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
        where: {
          type: "binary",
          operator: "=",
          left: { type: "column", name: "email" },
          right: { type: "literal", value: "alice@example.com" },
        },
        action: {
          type: "doUpdate",
          set: {
            name: { type: "literal", value: "Alice Updated" },
          },
        },
      },
    });
  });

  it("parses count options into a count query", () => {
    const statement = parseCountStatement("User", {
      where: { active: true },
    });

    expect(statement).toEqual({
      type: "query",
      select: [
        {
          type: "expression",
          expression: {
            type: "function",
            name: "count",
            args: [{ type: "literal", value: "*" }],
          },
          alias: "_count",
        },
      ],
      from: [{ type: "table", name: "User" }],
      where: {
        type: "binary",
        operator: "=",
        left: { type: "column", name: "active" },
        right: { type: "literal", value: true },
      },
    });
  });

  it("parses aggregate options into an aggregate query", () => {
    const statement = parseAggregateStatement("User", {
      where: { active: true },
      _count: true,
      _max: { select: { age: true } },
      _min: { select: { age: true } },
      by: ["country"],
      orderBy: { country: "asc" },
    });

    expect(statement).toEqual({
      type: "query",
      select: [
        {
          type: "expression",
          expression: { type: "column", name: "country" },
          alias: "country",
        },
        {
          type: "expression",
          expression: {
            type: "function",
            name: "count",
            args: [{ type: "literal", value: "*" }],
          },
          alias: "_count",
        },
        {
          type: "expression",
          expression: {
            type: "function",
            name: "min",
            args: [{ type: "column", name: "age" }],
          },
          alias: "_min_age",
        },
        {
          type: "expression",
          expression: {
            type: "function",
            name: "max",
            args: [{ type: "column", name: "age" }],
          },
          alias: "_max_age",
        },
      ],
      from: [{ type: "table", name: "User" }],
      where: {
        type: "binary",
        operator: "=",
        left: { type: "column", name: "active" },
        right: { type: "literal", value: true },
      },
      groupBy: [{ type: "column", name: "country" }],
      orderBy: [
        { expression: { type: "column", name: "country" }, direction: "asc" },
      ],
    });
  });

  it("parses groupBy options into a group by query with having", () => {
    const statement = parseGroupByStatement("User", {
      by: ["country"],
      where: { active: true },
      having: { _count: { gt: 10 } },
      orderBy: { country: "asc" },
      take: 20,
      skip: 5,
    });

    expect(statement).toEqual({
      type: "query",
      select: [
        {
          type: "expression",
          expression: { type: "column", name: "country" },
          alias: "country",
        },
        {
          type: "expression",
          expression: {
            type: "function",
            name: "count",
            args: [{ type: "literal", value: "*" }],
          },
          alias: "_count",
        },
      ],
      from: [{ type: "table", name: "User" }],
      where: {
        type: "binary",
        operator: "=",
        left: { type: "column", name: "active" },
        right: { type: "literal", value: true },
      },
      groupBy: [{ type: "column", name: "country" }],
      having: {
        type: "binary",
        operator: ">",
        left: {
          type: "function",
          name: "count",
          args: [{ type: "literal", value: "*" }],
        },
        right: { type: "literal", value: 10 },
      },
      orderBy: [
        { expression: { type: "column", name: "country" }, direction: "asc" },
      ],
      limit: 20,
      offset: 5,
    });
  });
});
