import { describe, test, expect, vi, beforeAll, afterAll } from "vitest";
import neo4j from "neo4j-driver";
import { Neo4jContainer } from "@testcontainers/neo4j";
import {
  neo4jAdapter,
  type Neo4jAdapter,
  auth,
  toNative,
  collectEdges,
} from "@/adapters/neo4j";

describe("auth()", () => {
  test("creates basic auth token", () => {
    const spy = vi.spyOn(neo4j.auth, "basic");
    const opts = {
      type: "basic",
      username: "u",
      password: "p",
      realm: "r",
    } as const;
    auth(opts);
    expect(spy).toHaveBeenCalledWith("u", "p", "r");
    spy.mockRestore();
  });

  test("creates bearer auth token", () => {
    const spy = vi.spyOn(neo4j.auth, "bearer");
    auth({ type: "bearer", token: "token123" });
    expect(spy).toHaveBeenCalledWith("token123");
    spy.mockRestore();
  });

  test("creates kerberos auth token", () => {
    const spy = vi.spyOn(neo4j.auth, "kerberos");
    auth({ type: "kerberos", ticket: "ticket123" });
    expect(spy).toHaveBeenCalledWith("ticket123");
    spy.mockRestore();
  });

  test("creates custom auth token", () => {
    const spy = vi.spyOn(neo4j.auth, "custom");
    auth({
      type: "custom",
      principal: "user",
      credentials: "cred",
      realm: "realm",
      scheme: "scheme",
      params: { extra: 1 },
    });
    expect(spy).toHaveBeenCalledWith("user", "cred", "realm", "scheme", {
      extra: 1,
    });
    spy.mockRestore();
  });
});

describe("neo4jAdapter()", () => {
  let adapter: Neo4jAdapter;

  beforeAll(async () => {
    const container = await new Neo4jContainer("neo4j:5").start();
    adapter = neo4jAdapter({
      url: container.getBoltUri(),
      auth: {
        username: container.getUsername(),
        password: container.getPassword(),
      },
    });

    // Clean database before testing
    await adapter.session.run("MATCH (n) DETACH DELETE n");
  }, 180_000); // 3 min

  afterAll(async () => {
    await adapter.close();
  });

  test("connects and runs simple write/read queries", async () => {
    const createRes = await adapter.session.run(
      "CREATE (n:Person {name: $name, age: $age}) RETURN n",
      { name: "Alice", age: 30 },
    );

    expect(createRes.records.length).toBe(1);
    const node = createRes.records[0].get("n");
    expect(node.labels).toContain("Person");

    const result = await adapter.exec({
      command: "MATCH (n:Person) RETURN n",
      params: {},
    });

    expect(result.entries.length).toBe(1);
    const entry = result.entries[0];
    expect(entry.name).toBe("Alice");
    expect(entry.age).toBe(30);
    expect(result.summary).toBeDefined();
    expect((result.raw as any).length).toBeGreaterThan(0);
  });

  test("handles relationships correctly", async () => {
    await adapter.session.run(
      `CREATE (a:Person {name: 'Bob'})-[:KNOWS {since: 2020}]->(b:Person {name: 'Charlie'})`,
    );

    const result = await adapter.exec({
      command: "MATCH p=(a:Person)-[r:KNOWS]->(b:Person) RETURN p",
      params: {},
    });

    expect(result.edgeCount).toBeGreaterThan(0);
    const edge = result.edges![0];
    expect(edge.type).toBe("KNOWS");
    expect(edge.props.since).toBe(2020);
  });
});

describe("toNative()", () => {
  test("converts neo4j Integer to number when safe", () => {
    const int = neo4j.int(42);
    const value = toNative(int);
    expect(value).toBe(42);
  });

  test("converts neo4j Integer to bigint when unsafe", () => {
    const big = neo4j.int("9007199254740993"); // > Number.MAX_SAFE_INTEGER
    const value = toNative(big);
    expect(typeof value).toBe("bigint");
  });

  test("converts Node to plain object with identity and labels", () => {
    const node = new neo4j.types.Node(neo4j.int(1), ["User"], {
      name: "Alice",
      age: neo4j.int(30),
    });

    const value = toNative(node);

    expect(value).toEqual({
      identity: 1,
      labels: ["User"],
      name: "Alice",
      age: 30,
    });
  });

  test("converts Relationship to plain object", () => {
    const rel = new neo4j.types.Relationship(
      neo4j.int(5),
      neo4j.int(1),
      neo4j.int(2),
      "KNOWS",
      { since: neo4j.int(2020) },
    );

    const value = toNative(rel);

    expect(value).toEqual({
      identity: 5,
      start: 1,
      end: 2,
      type: "KNOWS",
      since: 2020,
    });
  });

  test("converts Path to flattened structure", () => {
    const start = new neo4j.types.Node(neo4j.int(1), ["User"], {
      name: "Alice",
    });

    const end = new neo4j.types.Node(neo4j.int(2), ["User"], { name: "Bob" });

    const rel = new neo4j.types.Relationship(
      neo4j.int(3),
      neo4j.int(1),
      neo4j.int(2),
      "KNOWS",
      {},
    );

    const segment = new neo4j.types.PathSegment(start, rel, end);
    const path = new neo4j.types.Path(start, end, [segment]);

    const value = toNative(path);

    expect(value.start.name).toBe("Alice");
    expect(value.end.name).toBe("Bob");
    expect(value.segments).toHaveLength(1);
    expect(value.segments[0].relationship.type).toBe("KNOWS");
  });

  test("recursively converts arrays and objects", () => {
    const input = {
      list: [neo4j.int(1), neo4j.int(2)],
      nested: {
        value: neo4j.int(3),
      },
    };

    const value = toNative(input);

    expect(value).toEqual({
      list: [1, 2],
      nested: { value: 3 },
    });
  });
});

describe("collectEdges()", () => {
  test("collects relationship-like objects", () => {
    const rel = {
      identity: 1,
      type: "KNOWS",
      start: 10,
      end: 20,
      since: 2021,
    };

    const edges: any[] = [];
    collectEdges(rel, edges);

    expect(edges).toEqual([
      {
        id: 1,
        type: "KNOWS",
        start: 10,
        end: 20,
        props: { since: 2021 },
      },
    ]);
  });

  test("collects edges from path-like structure", () => {
    const path = {
      segments: [
        {
          relationship: {
            identity: 2,
            type: "WROTE",
            start: 1,
            end: 3,
            year: 2023,
          },
        },
      ],
    };

    const edges: any[] = [];
    collectEdges(path, edges);

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      id: 2,
      type: "WROTE",
      start: 1,
      end: 3,
      props: { year: 2023 },
    });
  });

  test("recursively collects edges from nested objects and arrays", () => {
    const data = {
      foo: [
        {
          identity: 3,
          type: "LIKES",
          start: 1,
          end: 2,
          strength: 5,
        },
      ],
    };

    const edges: any[] = [];
    collectEdges(data, edges);

    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe("LIKES");
    expect(edges[0].props.strength).toBe(5);
  });

  test("ignores non-relationship values safely", () => {
    const edges: any[] = [];
    collectEdges({ a: 1, b: null, c: "x" }, edges);
    expect(edges).toHaveLength(0);
  });
});
