import { describe, it, expect } from "vitest";
import emit from "@/emitters/cypher";
import {
  StatementType,
  makeIR,
  type FindStatement,
  type CountStatement,
  type CreateStatement,
  type UpdateStatement,
  type DeleteStatement,
  type ConnectQueryStatement,
  type RelationQueryStatement,
  type Statement,
} from "@/ir";

describe("Neo4j emitter", () => {
  it("emits a simple FIND query", async () => {
    const stmt: FindStatement = {
      type: StatementType.Find,
      model: "User",
      where: { id: 1 },
    };

    const { command, params } = await emit(makeIR(stmt));

    expect(command).toContain("MATCH (n:User)");
    expect(command).toContain("WHERE (n.id = $id_1)");
    expect(command).toContain("RETURN properties(n) AS n");

    expect(Object.values(params)).toEqual([1]);
  });

  it("handles WHERE operators", async () => {
    const stmt: FindStatement = {
      type: StatementType.Find,
      model: "User",
      where: {
        age: { gt: 18 },
        name: { contains: "john" },
      },
    };

    const { command } = await emit(makeIR(stmt));

    expect(command).toContain("n.age >");
    expect(command).toContain("n.name CONTAINS");
  });

  it("handles AND / OR / NOT conditions", async () => {
    const stmt: FindStatement = {
      type: StatementType.Find,
      model: "User",
      where: {
        AND: [{ id: 1 }, { id: 2 }],
        NOT: { age: { lt: 10 } },
      },
    };

    const { command } = await emit(makeIR(stmt));

    expect(command).toContain("AND");
    expect(command).toContain("NOT");
  });

  it("emits COUNT query", async () => {
    const stmt: CountStatement = {
      type: StatementType.Count,
      model: "User",
      where: { active: true },
    };

    const { command } = await emit(makeIR(stmt));

    expect(command).toContain("RETURN count(n) AS count");
  });

  it("emits CREATE query with params", async () => {
    const stmt: CreateStatement = {
      type: StatementType.Create,
      model: "User",
      data: { name: "Alice", age: 30 },
    };

    const { command, params } = await emit(makeIR(stmt));

    expect(command).toContain("CREATE (n:User");
    expect(command).toContain("RETURN properties(n) AS n");

    expect(Object.values(params)).toContain("Alice");
    expect(Object.values(params)).toContain(30);
  });

  it("emits UPSERT with MERGE when where exists", async () => {
    const stmt: UpdateStatement = {
      type: StatementType.Upsert,
      model: "User",
      where: { id: 1 },
      data: {
        create: { name: "Alice" },
        update: { name: "Bob" },
      },
    };

    const { command } = await emit(makeIR(stmt));

    expect(command).toContain("MERGE (n:User");
    expect(command).toContain("ON CREATE SET");
    expect(command).toContain("ON MATCH SET");
  });

  it("falls back to CREATE when UPSERT has no where", async () => {
    const stmt: UpdateStatement = {
      type: StatementType.Upsert,
      model: "User",
      where: {},
      data: {
        create: { name: "Alice" },
      },
    };

    const { command } = await emit(makeIR(stmt));

    expect(command).toContain("CREATE (n:User");
    expect(command).not.toContain("MERGE");
  });

  it("emits DELETE query", async () => {
    const stmt: DeleteStatement = {
      type: StatementType.Delete,
      model: "User",
      where: { id: 1 },
    };

    const { command } = await emit(makeIR(stmt));

    expect(command).toContain("DELETE n");
  });

  it("emits CONNECT query with OUT direction (default)", async () => {
    const stmt: ConnectQueryStatement = {
      type: StatementType.ConnectQuery,
      model: "User",
      from: { id: 1 },
      to: { id: 2 },
      relation: "friend",
      direction: "OUT",
    };

    const { command } = await emit(makeIR(stmt));

    expect(command).toContain("MERGE (a)-[r:FRIEND");
    expect(command).toContain("RETURN properties(r) AS relation");
  });

  it("emits CONNECT query with IN direction", async () => {
    const stmt: ConnectQueryStatement = {
      type: StatementType.ConnectQuery,
      model: "User",
      from: { id: 1 },
      to: { id: 2 },
      relation: "friend",
      direction: "IN",
    };

    const { command } = await emit(makeIR(stmt));

    expect(command).toContain("<-[r:FRIEND");
  });

  it("emits RELATION query with depth and limit", async () => {
    const stmt: RelationQueryStatement = {
      type: StatementType.RelationQuery,
      model: "User",
      from: { id: 1 },
      to: { id: 2 },
      minDepth: 1,
      maxDepth: 3,
      direction: "OUT",
      limit: 10,
    };

    const { command } = await emit(makeIR(stmt));

    expect(command).toContain("MATCH p = (a)-[*1..3]->(b)");
    expect(command).toContain("LIMIT 10");
  });

  it("handles includes recursively", async () => {
    const stmt: FindStatement = {
      type: StatementType.Find,
      model: "User",
      include: {
        posts: {
          include: {
            comments: {},
          },
        },
      },
    };

    const { command } = await emit(makeIR(stmt));

    expect(command).toContain("OPTIONAL MATCH (n)-[:POSTS]->(n_posts:posts)");
    expect(command).toContain(
      "OPTIONAL MATCH (n_posts)-[:COMMENTS]->(n_posts_comments:comments)",
    );
  });

  it("normalizes Date values into neo4j DateTime", async () => {
    const stmt: CreateStatement = {
      type: StatementType.Create,
      model: "User",
      data: { createdAt: new Date() },
    };

    const { params } = await emit(makeIR(stmt));

    const value = Object.values(params)[0];

    // neo4j DateTime has .year property
    expect(value).toHaveProperty("year");
  });

  it("joins multiple statements with blank lines", async () => {
    const ir = makeIR(
      {
        type: StatementType.Count,
        model: "User",
        where: {},
      } as Statement,
      {
        type: StatementType.Delete,
        model: "User",
        where: { id: 1 },
      } as Statement,
    );

    const { command } = await emit(ir);

    expect(command.split("\n\n").length).toBe(2);
  });

  it("throws for unsupported statement type", async () => {
    const ir = {
      statements: [
        {
          type: "Unknown" as any,
          model: "User",
        },
      ],
    };

    expect(() => emit(ir as any)).toThrow();
  });
});
