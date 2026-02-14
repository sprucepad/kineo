import { describe, beforeAll, afterAll, beforeEach, it, expect } from "vitest";
import { neo4jAdapter, type Neo4jAdapter } from "@/adapters/neo4j";
import { kineo, type Kineo } from "@/client";
import { defineSchema, field, model } from "@/schema";

// ----------------------------------------------------------------------------
// Schema
// ----------------------------------------------------------------------------

const user = model("User", {
  id: field.string().id(),
  name: field.string().required(),
  age: field.int().required(),
});

const post = model("Post", {
  id: field.string().id(),
  title: field.string(),
});

const schema = defineSchema({
  user,
  post,
});

// ----------------------------------------------------------------------------
// Integration Suite
// ----------------------------------------------------------------------------

describe("Kineo + Neo4j Integration", () => {
  let client: Kineo<typeof schema, Neo4jAdapter>;

  beforeAll(async () => {
    const adapter = neo4jAdapter({
      url: "bolt://localhost:7687",
      auth: {
        type: "basic",
        username: "neo4j",
        password: "password",
      },
    });

    client = kineo(adapter, schema);
  });

  beforeEach(async () => {
    await client.$adapter.session.run("MATCH (n) DETACH DELETE n");
  });

  afterAll(async () => {
    await client.$adapter.close();
  });

  // --------------------------------------------------------------------------
  // CREATE
  // --------------------------------------------------------------------------

  it("creates a user", async () => {
    const user = await client.user.create({
      data: {
        id: "u1",
        name: "Alice",
        age: 30,
      },
    });

    expect(user).toMatchObject({
      id: "u1",
      name: "Alice",
      age: 30,
    });
  });

  // --------------------------------------------------------------------------
  // FIND FIRST
  // --------------------------------------------------------------------------

  it("finds a user with where filter", async () => {
    await client.user.create({
      data: { id: "u1", name: "Alice", age: 30 },
    });

    const user = await client.user.findFirst({
      where: { name: "Alice" },
    });

    expect(user?.id).toBe("u1");
  });

  // --------------------------------------------------------------------------
  // FIND MANY + ORDER
  // --------------------------------------------------------------------------

  it("finds multiple users ordered", async () => {
    await client.user.create({ data: { id: "1", name: "A", age: 20 } });
    await client.user.create({ data: { id: "2", name: "B", age: 40 } });
    await client.user.create({ data: { id: "3", name: "C", age: 30 } });

    const users = await client.user.findMany({
      orderBy: [{ age: "asc" }],
    });

    expect(users.map((u) => u.age)).toEqual([20, 30, 40]);
  });

  // --------------------------------------------------------------------------
  // COUNT
  // --------------------------------------------------------------------------

  it("counts users", async () => {
    await client.user.create({ data: { id: "1", name: "A", age: 20 } });
    await client.user.create({ data: { id: "2", name: "B", age: 40 } });

    const count = await client.user.count({
      where: {},
    });

    expect(count).toBe(2);
  });

  // --------------------------------------------------------------------------
  // UPDATE
  // --------------------------------------------------------------------------

  it("updates a user", async () => {
    await client.user.create({
      data: { id: "u1", name: "Alice", age: 30 },
    });

    const updated = await client.user.update({
      where: { id: "u1" },
      data: { age: 31 },
    });

    expect(updated.age).toBe(31);
  });

  // --------------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------------

  it("deletes a user", async () => {
    await client.user.create({
      data: { id: "u1", name: "Alice", age: 30 },
    });

    await client.user.delete({
      where: { id: "u1" },
    });

    const count = await client.user.count({ where: {} });
    expect(count).toBe(0);
  });

  // --------------------------------------------------------------------------
  // UPSERT
  // --------------------------------------------------------------------------

  it("upserts a user (create)", async () => {
    const user = await client.user.upsert({
      where: { id: "u1" },
      create: { id: "u1", name: "Alice", age: 30 },
      update: { age: 50 },
    });

    expect(user.age).toBe(30);
  });

  it("upserts a user (update)", async () => {
    await client.user.create({
      data: { id: "u1", name: "Alice", age: 30 },
    });

    const user = await client.user.upsert({
      where: { id: "u1" },
      create: { id: "u1", name: "Alice", age: 30 },
      update: { age: 50 },
    });

    expect(user.age).toBe(50);
  });

  // --------------------------------------------------------------------------
  // GRAPH CONNECT
  // --------------------------------------------------------------------------

  it("connects two users", async () => {
    await client.user.create({ data: { id: "1", name: "A", age: 20 } });
    await client.user.create({ data: { id: "2", name: "B", age: 25 } });

    const result = await client.user.connect({
      from: { where: { id: "1" } },
      to: { where: { id: "2" } },
      relation: "FOLLOWS",
      properties: { since: 2024 },
    });

    expect(result.success).toBe(true);
  });

  // --------------------------------------------------------------------------
  // FIND PATH
  // --------------------------------------------------------------------------

  it("finds path between users", async () => {
    await client.user.create({ data: { id: "1", name: "A", age: 20 } });
    await client.user.create({ data: { id: "2", name: "B", age: 25 } });
    await client.user.create({ data: { id: "3", name: "C", age: 30 } });

    await client.user.connect({
      from: { where: { id: "1" } },
      to: { where: { id: "2" } },
      relation: "FOLLOWS",
    });

    await client.user.connect({
      from: { where: { id: "2" } },
      to: { where: { id: "3" } },
      relation: "FOLLOWS",
    });

    const path = await client.user.findPath({
      from: { where: { id: "1" } },
      to: { where: { id: "3" } },
      maxDepth: 3,
    });

    expect(path.nodes.length).toBeGreaterThanOrEqual(2);
    expect(path.edges.length).toBe(2);
  });

  // --------------------------------------------------------------------------
  // TRAVERSE
  // --------------------------------------------------------------------------

  it("traverses graph", async () => {
    await client.user.create({ data: { id: "1", name: "A", age: 20 } });
    await client.user.create({ data: { id: "2", name: "B", age: 25 } });

    await client.user.connect({
      from: { where: { id: "1" } },
      to: { where: { id: "2" } },
      relation: "FOLLOWS",
    });

    const traversal = await client.user.traverse({
      start: { where: { id: "1" } },
      depth: 1,
    });

    expect(traversal.path.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // DISCONNECT
  // --------------------------------------------------------------------------

  it("disconnects users", async () => {
    await client.user.create({ data: { id: "1", name: "A", age: 20 } });
    await client.user.create({ data: { id: "2", name: "B", age: 25 } });

    await client.user.connect({
      from: { where: { id: "1" } },
      to: { where: { id: "2" } },
      relation: "FOLLOWS",
    });

    await client.user.disconnect({
      from: { where: { id: "1" } },
      to: { where: { id: "2" } },
      relation: "FOLLOWS",
    });

    const path = await client.user.findPath({
      from: { where: { id: "1" } },
      to: { where: { id: "2" } },
      maxDepth: 1,
    });

    expect(path.edges.length).toBe(0);
  });
});
