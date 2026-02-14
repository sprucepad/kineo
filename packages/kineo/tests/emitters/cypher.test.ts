import { describe, it, expect } from "vitest";
import emit from "@/emitters/cypher";
import {
  StatementType,
  makeIR,
  type FindStatement,
  type CountStatement,
  type CreateStatement,
  type DeleteStatement,
  type ConnectStatement,
  type RelationQueryStatement,
  type Statement,
  type UpsertStatement,
} from "@/ir";

describe("Neo4j emitter", () => {
  it("emits a simple FIND query", () => {
    const stmt: FindStatement = {
      type: StatementType.Find,
      model: "User",
      where: { id: 1 },
    };

    const { command, params } = emit(makeIR(stmt));

    expect(command).toContain("MATCH (n:User)");
    expect(command).toContain("WHERE (n.id = $id_1)");
    expect(command).toContain("RETURN properties(n) AS n");

    expect(Object.values(params)).toEqual([1]);
  });

  it("handles WHERE operators", () => {
    const stmt: FindStatement = {
      type: StatementType.Find,
      model: "User",
      where: {
        age: { gt: 18 },
        name: { contains: "john" },
      },
    };

    const { command } = emit(makeIR(stmt));

    expect(command).toContain("n.age >");
    expect(command).toContain("n.name CONTAINS");
  });

  it("handles AND / OR / NOT conditions", () => {
    const stmt: FindStatement = {
      type: StatementType.Find,
      model: "User",
      where: {
        AND: [{ id: 1 }, { id: 2 }],
        NOT: { age: { lt: 10 } },
      },
    };

    const { command } = emit(makeIR(stmt));

    expect(command).toContain("AND");
    expect(command).toContain("NOT");
  });

  it("emits COUNT query", () => {
    const stmt: CountStatement = {
      type: StatementType.Count,
      model: "User",
      where: { active: true },
    };

    const { command } = emit(makeIR(stmt));

    expect(command).toContain("RETURN count(n) AS count");
  });

  it("emits CREATE query with params", () => {
    const stmt: CreateStatement = {
      type: StatementType.Create,
      model: "User",
      data: { name: "Alice", age: 30 },
    };

    const { command, params } = emit(makeIR(stmt));

    expect(command).toContain("CREATE (n:User");
    expect(command).toContain("RETURN properties(n) AS n");

    expect(Object.values(params)).toContain("Alice");
    expect(Object.values(params)).toContain(30);
  });

  it("emits UPSERT with MERGE when where exists", () => {
    const stmt: UpsertStatement = {
      type: StatementType.Upsert,
      model: "User",
      where: { id: 1 },
      data: {
        create: { name: "Alice" },
        update: { name: "Bob" },
      },
    };

    const { command } = emit(makeIR(stmt));

    expect(command).toContain("MERGE (n:User");
    expect(command).toContain("ON CREATE SET");
    expect(command).toContain("ON MATCH SET");
  });

  it("falls back to CREATE when UPSERT has no where", () => {
    const stmt: UpsertStatement = {
      type: StatementType.Upsert,
      model: "User",
      where: {},
      data: {
        create: { name: "Alice" },
      },
    };

    const { command } = emit(makeIR(stmt));

    expect(command).toContain("CREATE (n:User");
    expect(command).not.toContain("MERGE");
  });

  it("emits DELETE query", () => {
    const stmt: DeleteStatement = {
      type: StatementType.Delete,
      model: "User",
      where: { id: 1 },
    };

    const { command } = emit(makeIR(stmt));

    expect(command).toContain("DELETE n");
  });

  it("emits CONNECT query with OUT direction (default)", () => {
    const stmt: ConnectStatement = {
      type: StatementType.Connect,
      model: "User",
      from: { id: 1 },
      to: { id: 2 },
      relation: "friend",
      direction: "OUT",
    };

    const { command } = emit(makeIR(stmt));

    expect(command).toContain("MERGE (a)-[r:FRIEND");
    expect(command).toContain("RETURN properties(r) AS relation");
  });

  it("emits CONNECT query with IN direction", () => {
    const stmt: ConnectStatement = {
      type: StatementType.Connect,
      model: "User",
      from: { id: 1 },
      to: { id: 2 },
      relation: "friend",
      direction: "IN",
    };

    const { command } = emit(makeIR(stmt));

    expect(command).toContain("<-[r:FRIEND");
  });

  it("emits RELATION query with depth and limit", () => {
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

    const { command } = emit(makeIR(stmt));

    expect(command).toContain("MATCH p = (a)-[*1..3]->(b)");
    expect(command).toContain("LIMIT 10");
  });

  it("handles includes recursively", () => {
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

    const { command } = emit(makeIR(stmt));

    expect(command).toContain("OPTIONAL MATCH (n)-[:POSTS]->(n_posts:posts)");
    expect(command).toContain(
      "OPTIONAL MATCH (n_posts)-[:COMMENTS]->(n_posts_comments:comments)",
    );
  });

  it("normalizes Date values into neo4j DateTime", () => {
    const stmt: CreateStatement = {
      type: StatementType.Create,
      model: "User",
      data: { createdAt: new Date() },
    };

    const { params } = emit(makeIR(stmt));

    const value = Object.values(params)[0];

    // neo4j DateTime has .year property
    expect(value).toHaveProperty("year");
  });

  it("joins multiple statements with blank lines", () => {
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

    const { command } = emit(ir);

    expect(command.split("\n\n").length).toBe(2);
  });

  it("throws for unsupported statement type", () => {
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

  it("emits UPDATE query with where, partial patch, select, and include", () => {
    const stmt = {
      type: StatementType.Update,
      model: "User",
      where: { id: 1 },
      data: { name: "Updated", age: 42 },
      select: { name: true },
      include: {
        posts: true,
      },
    } as any;

    const { command, params } = emit(makeIR(stmt));

    // MATCH + WHERE
    expect(command).toContain("MATCH (n:User)");
    expect(command).toContain("WHERE n.id =");

    // Partial update
    expect(command).toContain("SET n +=");

    // Include relationship
    expect(command).toContain("OPTIONAL MATCH (n)-[:POSTS]->(n_posts)");

    // RETURN structure
    expect(command).toContain("RETURN {");
    expect(command).toContain("posts: collect(properties(n_posts))");

    // Params should contain where value
    expect(Object.values(params)).toContain(1);

    // Patch param should contain updated fields
    const patch = Object.values(params).find(
      (v) => typeof v === "object" && v?.name === "Updated",
    );

    expect(patch).toBeDefined();
    expect(patch).toMatchObject({ name: "Updated", age: 42 });
  });

  it("emits TRAVERSE query with relation filter and node+edge output", () => {
    const stmt = {
      type: StatementType.Traverse,
      model: "User",
      start: { id: 1 },
      minDepth: 1,
      maxDepth: 3,
      relationFilter: ["friend", "follows"],
      direction: "OUT",
      includeNodes: true,
      includeEdges: true,
    } as any;

    const { command, params } = emit(makeIR(stmt));

    // Start match
    expect(command).toContain("MATCH (a)");
    expect(command).toContain("WHERE (a.id =");

    // Proper relationship pattern with types + depth
    expect(command).toContain("p = (a)-[r:FRIEND|:FOLLOWS*1..3]->(b)");

    // Return traversal structure
    expect(command).toContain("nodes: [n IN nodes(p)");
    expect(command).toContain("edges: [e IN relationships(p)");

    expect(Object.values(params)).toContain(1);
  });
});
