import { describe, expect, test, vi } from "vitest";
import type { CleanedWhere } from "better-auth/adapters";
import { emit } from "@/emitter";

/**
 * Mock kineo/ir so we can assert how it's called
 */
vi.mock("kineo/ir", () => {
  return {
    makeIR: vi.fn((value) => ({ __ir: value })),
    emitFindStatement: vi.fn((model, args) => ({
      type: "find",
      model,
      args,
    })),
    emitCountStatement: vi.fn((model, args) => ({
      type: "count",
      model,
      args,
    })),
    emitCreateStatement: vi.fn((model, args) => ({
      type: "create",
      model,
      args,
    })),
    emitUpsertStatement: vi.fn((model, args) => ({
      type: "upsert",
      model,
      args,
    })),
    emitDeleteStatement: vi.fn((model, args) => ({
      type: "delete",
      model,
      args,
    })),
  };
});

import * as IR from "kineo/ir";

describe("emit", () => {
  test("emits findMany with select, where, sort, limit, and offset", () => {
    const where: CleanedWhere[] = [
      { field: "email", operator: "eq", value: "a@test.com", connector: "AND" },
    ];

    const result = emit("findMany", {
      model: "User",
      where,
      select: ["id", "email"],
      limit: 10,
      offset: 5,
      sortBy: { field: "email", direction: "asc" },
    });

    expect(IR.emitFindStatement).toHaveBeenCalledWith("User", {
      where: { email: "a@test.com" },
      select: { id: true, email: true },
      include: undefined,
      orderBy: [{ email: "asc" }],
      skip: 5,
      take: 10,
    });

    expect(IR.makeIR).toHaveBeenCalled();
    expect(result).toEqual({
      __ir: expect.objectContaining({ type: "find" }),
    });
  });

  test("emits multiple where clauses using AND", () => {
    const where: CleanedWhere[] = [
      { field: "age", operator: "gte", value: 18, connector: "AND" },
      { field: "age", operator: "lt", value: 65, connector: "AND" },
    ];

    emit("findMany", {
      model: "User",
      where,
    });

    expect(IR.emitFindStatement).toHaveBeenCalledWith("User", {
      where: {
        AND: [{ age: { gte: 18 } }, { age: { lt: 65 } }],
      },
      select: undefined,
      include: undefined,
      orderBy: undefined,
      skip: undefined,
      take: undefined,
    });
  });

  test("emits joins into include", () => {
    emit("findMany", {
      model: "User",
      join: {
        posts: { on: { from: "posts", to: "comments" }, limit: 5 },
        comments: { on: { from: "comments", to: "posts" }, limit: 2 },
      },
    });

    expect(IR.emitFindStatement).toHaveBeenCalledWith("User", {
      where: undefined,
      select: undefined,
      include: {
        posts: { take: 5 },
        comments: { take: 2 },
      },
      orderBy: undefined,
      skip: undefined,
      take: undefined,
    });
  });

  test("emits count", () => {
    emit("count", {
      model: "User",
      where: [
        { field: "active", connector: "AND", operator: "eq", value: true },
      ],
    });

    expect(IR.emitCountStatement).toHaveBeenCalledWith("User", {
      where: { active: true },
    });
  });

  test("emits create", () => {
    emit("create", {
      model: "User",
      data: { email: "a@test.com" },
    });

    expect(IR.emitCreateStatement).toHaveBeenCalledWith("User", {
      data: { email: "a@test.com" },
    });
  });

  test("emits update as upsert", () => {
    emit("update", {
      model: "User",
      where: [{ field: "id", connector: "AND", operator: "eq", value: "1" }],
      data: { email: "b@test.com" },
    });

    expect(IR.emitUpsertStatement).toHaveBeenCalledWith("User", {
      where: { id: "1" },
      create: { email: "b@test.com" },
      update: { email: "b@test.com" },
    });
  });

  test("emits delete", () => {
    emit("delete", {
      model: "User",
      where: [{ field: "id", connector: "AND", operator: "eq", value: "1" }],
    });

    expect(IR.emitDeleteStatement).toHaveBeenCalledWith("User", {
      where: { id: "1" },
    });
  });

  test("throws on unsupported mode", () => {
    expect(() => emit("unknown", { model: "User" })).toThrow(
      "Unsupported adapter mode",
    );
  });

  test("throws on unsupported where operator", () => {
    expect(() =>
      emit("findMany", {
        model: "User",
        where: [
          // @ts-expect-error – intentional invalid operator
          { field: "id", operator: "between", value: [1, 2] },
        ],
      }),
    ).toThrow("Unsupported operator");
  });
});
