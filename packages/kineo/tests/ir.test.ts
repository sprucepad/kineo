import { describe, it, expect } from "vitest";
import {
  StatementType,
  emitFindStatement,
  emitCountStatement,
  emitCreateStatement,
  emitUpsertStatement,
  emitDeleteStatement,
  emitConnectQueryStatement,
  emitRelationQueryStatement,
  makeIR,
  emitToIR,
} from "@/ir";

describe("IR emitters", () => {
  const modelName = "User";

  it("emitFindStatement builds correct structure", () => {
    const stmt = emitFindStatement(modelName, {
      where: { id: 1 },
      select: { id: true },
      distinct: ["id"],
      skip: 5,
      take: 10,
    } as any);

    expect(stmt).toEqual({
      type: StatementType.Find,
      model: modelName,
      where: { id: 1 },
      select: { id: true },
      include: undefined,
      orderBy: undefined,
      distinct: ["id"],
      skip: 5,
      take: 10,
    });
  });

  it("emitCountStatement builds correct structure", () => {
    const stmt = emitCountStatement(modelName, {
      where: { active: true },
    } as any);

    expect(stmt).toEqual({
      type: StatementType.Count,
      model: modelName,
      where: { active: true },
    });
  });

  it("emitCreateStatement builds correct structure", () => {
    const stmt = emitCreateStatement(modelName, {
      data: { name: "John" },
    } as any);

    expect(stmt).toEqual({
      type: StatementType.Create,
      model: modelName,
      data: { name: "John" },
      select: undefined,
      include: undefined,
    });
  });

  it("emitUpsertStatement builds correct structure", () => {
    const stmt = emitUpsertStatement(modelName, {
      where: { id: 1 },
      create: { name: "New" },
      update: { name: "Updated" },
    } as any);

    expect(stmt).toEqual({
      type: StatementType.Upsert,
      model: modelName,
      where: { id: 1 },
      data: {
        create: { name: "New" },
        update: { name: "Updated" },
      },
      select: undefined,
      include: undefined,
    });
  });

  it("emitDeleteStatement builds correct structure", () => {
    const stmt = emitDeleteStatement(modelName, {
      where: { id: 1 },
    } as any);

    expect(stmt).toEqual({
      type: StatementType.Delete,
      model: modelName,
      where: { id: 1 },
    });
  });

  it("emitConnectQueryStatement builds correct structure", () => {
    const stmt = emitConnectQueryStatement(modelName, {
      from: { where: { id: 1 } },
      to: { where: { id: 2 } },
      relation: "FRIEND",
      direction: "outgoing",
      properties: { since: 2020 },
    } as any);

    expect(stmt).toEqual({
      type: StatementType.ConnectQuery,
      model: modelName,
      from: { id: 1 },
      to: { id: 2 },
      relation: "FRIEND",
      direction: "outgoing",
      properties: { since: 2020 },
    });
  });

  it("emitRelationQueryStatement builds correct structure", () => {
    const stmt = emitRelationQueryStatement(modelName, {
      from: { where: { id: 1 } },
      to: { where: { id: 2 } },
      maxDepth: 3,
      direction: "incoming",
    } as any);

    expect(stmt).toEqual({
      type: StatementType.RelationQuery,
      model: modelName,
      from: { id: 1 },
      to: { id: 2 },
      maxDepth: 3,
      minDepth: undefined,
      direction: "incoming",
      limit: undefined,
    });
  });

  it("makeIR wraps statements", () => {
    const stmt = emitDeleteStatement(modelName, { where: { id: 1 } } as any);
    const ir = makeIR(stmt);

    expect(ir).toEqual({
      statements: [stmt],
    });
  });

  describe("emitToIR routing", () => {
    it("routes findMany to FindStatement", () => {
      const ir = emitToIR(modelName, "findMany", {});
      expect(ir.statements[0].type).toBe(StatementType.Find);
    });

    it("routes count to CountStatement", () => {
      const ir = emitToIR(modelName, "count", {});
      expect(ir.statements[0].type).toBe(StatementType.Count);
    });

    it("routes create to CreateStatement", () => {
      const ir = emitToIR(modelName, "create", { data: {} });
      expect(ir.statements[0].type).toBe(StatementType.Create);
    });

    it("throws on unknown operation", () => {
      expect(() => emitToIR(modelName, "unknownOp", {})).toThrowError(
        "Unknown operation type: unknownOp",
      );
    });
  });
});
