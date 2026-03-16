import { beforeAll, describe, expect, test } from "vitest";
import { neo4jKit, type Neo4jKit } from "@/adapters/neo4j";
import { defineSchema, field, model } from "kineo/schema";
import { Neo4jContainer } from "@testcontainers/neo4j";

describe("neo4jAdapterKit (integration)", () => {
  let adapter: Neo4jKit;
  beforeAll(async () => {
    const container = await new Neo4jContainer("neo4j:latest").start();
    adapter = neo4jKit({
      url: container.getBoltUri(),
      auth: {
        type: "basic",
        username: container.getUsername(),
        password: container.getPassword(),
      },
    });

    // Clean database before testing
    await adapter.session.run("MATCH (n) DETACH DELETE n");
  }, 180_000); // 3 min

  // ---------------------------------------------------------------------------
  // pull()
  // ---------------------------------------------------------------------------

  test("pull() extracts labels, properties, and relationships", async () => {
    await adapter.session.run(`
      CREATE (u:User {name: "Alice", age: 25})
      CREATE (p:Post {title: "Hello"})
      CREATE (u)-[:WROTE]->(p)
    `);

    const pulled = await adapter.pull!();

    expect(pulled).toBeDefined();
    expect(pulled.schema.User).toBeDefined();
    expect(pulled.schema.Post).toBeDefined();

    // Sampled properties
    expect(pulled.schema.User?.$shape.name).toBeDefined();
    expect(pulled.schema.User?.$shape.age).toBeDefined();

    // Sampled relationships
    expect(pulled.schema.User?.$shape.WROTE).toBeDefined();
    expect(pulled.schema.Post?.$shape.WROTE).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // generate()
  // ---------------------------------------------------------------------------

  test("generate() detects added fields and produces migration entries", async () => {
    const prev = defineSchema({
      User: model("User", {}),
    });

    const cur = defineSchema({
      User: model("User", {
        age: field.int().default(0),
      }),
    });

    const migrations = await adapter.generate!(prev, cur);

    expect(migrations.length).toBeGreaterThan(0);
    expect(
      migrations.some((m) => m.type === "command" && m.command.includes("SET")),
    ).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // deploy() + status()
  // ---------------------------------------------------------------------------

  test("deploy() stores migration metadata and status() returns completed", async () => {
    const hash = "test-hash-123";
    const migration = "CREATE (:MetaTest {x: 1})";

    await adapter.deploy!(migration, hash);

    const state = await adapter.status!(migration, hash);

    expect(state).toBe("completed");
  });

  test("status() returns pending if migration hash not found", async () => {
    const state = await adapter.status!("", "non-existing-hash");
    expect(state).toBe("pending");
  });
});
