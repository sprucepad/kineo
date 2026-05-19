import { describe, it, expect } from "vitest";
import type { RuntimeAdapter, ExecResult } from "@/adapter";
import { kineo, templateToParams } from "./client";
import { Model } from "./model";
import { model } from "@/schema";

// Mock adapter for testing
class MockAdapter implements RuntimeAdapter {
  execResults: ExecResult[] = [];
  closeCalled = false;

  async exec() {
    return this.execResults.shift() || { rows: [], rowCount: 0 };
  }

  async close() {
    this.closeCalled = true;
  }

  async emit() {
    return { statements: [{ command: "SELECT 1", params: [] }] };
  }
}

// Mock schemas for testing
const createMockSchemas = () => {
  const User = model("User", (s) => ({
    id: s.int().id(),
    name: s.string(),
    email: s.string(),
    age: s.int().optional(),
    createdAt: s.datetime().default(new Date()),
  }));

  const Post = model("Post", (s) => ({
    id: s.int().id(),
    title: s.string(),
    content: s.string().optional(),
    published: s.boolean().default(false),
    authorId: s.int(),
  })).relate((s) => ({
    author: s.relation(User).fields("authorId").refs("id"),
  }));

  const Comment = model("Comment", (s) => ({
    id: s.int().id(),
    text: s.string(),
    postId: s.int(),
    userId: s.int(),
  })).relate((s) => ({
    post: s.relation(Post).fields("postId").refs("id"),
    user: s.relation(User).fields("userId").refs("id"),
  }));

  return { User, Post, Comment };
};

describe("kineo client", () => {
  it("creates a client with models from schema", () => {
    const { User, Post, Comment } = createMockSchemas();
    const schema = { User, Post, Comment };
    const adapter = new MockAdapter();

    const client = kineo(adapter, schema);

    expect(client.User).toBeInstanceOf(Model);
    expect(client.Post).toBeInstanceOf(Model);
    expect(client.Comment).toBeInstanceOf(Model);
    expect(client.$adapter).toBe(adapter);
  });

  it("executes raw SQL queries", async () => {
    const { User } = createMockSchemas();
    const schema = { User };
    const adapter = new MockAdapter();
    adapter.execResults = [{ rows: [{ id: 1, name: "John" }], rowCount: 1 }];

    const client = kineo(adapter, schema);

    const result = await client.$exec`SELECT * FROM users WHERE id = ${1}`;

    expect(result.rows).toEqual([{ id: 1, name: "John" }]);
    expect(result.rowCount).toBe(1);
  });

  it("closes the adapter connection", async () => {
    const { User } = createMockSchemas();
    const schema = { User };
    const adapter = new MockAdapter();

    const client = kineo(adapter, schema);

    await client.$close();

    expect(adapter.closeCalled).toBe(true);
  });

  it("handles async adapters", async () => {
    const { User } = createMockSchemas();
    const schema = { User };
    const adapter = Promise.resolve(new MockAdapter());

    const client = kineo(adapter, schema);

    expect(client.User).toBeInstanceOf(Model);
    expect(client.$adapter).toBeInstanceOf(Promise);
  });

  it("has correct schema and name properties", () => {
    const { User, Post } = createMockSchemas();
    const schema = { User, Post };
    const adapter = new MockAdapter();
    const client = kineo(adapter, schema);

    expect(client.User.$name).toBe("User");
    expect(client.Post.$name).toBe("Post");
    expect(client.User.$schema).toBeDefined();
    expect(client.User.$adapter).toBe(adapter);
  });
});

describe("templateToParams", () => {
  it("converts template literals to SQL parameters", () => {
    const result = templateToParams`SELECT * FROM users WHERE id = ${1} AND name = ${"John"}`;

    expect(result.statements[0]?.command).toBe(
      "SELECT * FROM users WHERE id = $1 AND name = $2",
    );
    expect(result.statements[0]?.params).toEqual({ "0": 1, "1": "John" });
  });

  it("handles empty arrays in IN clauses", () => {
    const result = templateToParams`SELECT * FROM users WHERE id IN (${[]})`;

    expect(result.statements[0]?.command).toBe(
      "SELECT * FROM users WHERE id IN ((NULL))",
    );
    expect(result.statements[0]?.params).toEqual({});
  });

  it("handles arrays in IN clauses", () => {
    const result = templateToParams`SELECT * FROM users WHERE id IN (${[1, 2, 3]})`;

    expect(result.statements[0]?.command).toContain(
      "SELECT * FROM users WHERE id IN ($1,$2,$3)",
    );
    expect(result.statements[0]?.params).toEqual({ "0": 1, "1": 2, "2": 3 });
  });

  it("handles multiple arrays", () => {
    const result = templateToParams`SELECT * FROM users WHERE id IN (${[1, 2]}) AND status IN (${["active", "pending"]})`;

    expect(result.statements[0]?.command).toContain(
      "SELECT * FROM users WHERE id IN ($1,$2) AND status IN ($3,$4)",
    );
    expect(result.statements[0]?.params).toEqual({
      "0": 1,
      "1": 2,
      "2": "active",
      "3": "pending",
    });
  });
});
