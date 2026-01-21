import { describe, test, expect, vi } from "vitest";
import { model, defineSchema, field, relation } from "@/schema";
import { kineo, type Kineo, type InferClient } from "@/client";
import { GraphModel, Model } from "@/model";
import type { Adapter } from "@/adapter";

// --- Setup test schema and adapter --- //

const adapter: Adapter<typeof GraphModel, any> = {
  Model: GraphModel,

  close: vi.fn(),
  emit: vi.fn().mockReturnValue({ command: "", params: {} }),
  exec: vi.fn().mockReturnValue([]),
};

const schema = defineSchema({
  users: model("User", {
    name: field.string().id(),
    bio: field.string(),
    posts: relation.to("posts").array().default([]),
  }),
  posts: model("Post", {
    id: field.int().id(),
    created: field.datetime(),
    updated: field.timestamp(),
    author: relation.to("users").required(),
  }),
});
describe("Kineo client", () => {
  const client = kineo(adapter, schema);

  test("creates a client with models matching schema keys", () => {
    // every model key should be a Model instance
    expect(client.users).toBeInstanceOf(Model);
    expect(client.posts).toBeInstanceOf(Model);
    expect(client.$schema).toEqual(schema);
  });

  test("schema property is preserved in client", () => {
    expect(client.$schema).toBe(schema);
  });

  test("different models are independent instances", () => {
    expect(client.users).not.toBe(client.posts);
  });

  test("InferClient type inference works (emit-time)", () => {
    // purely type-level, but we can runtime-check shape loosely
    type ClientType = InferClient<Kineo<typeof schema, typeof adapter>>;

    // runtime check: keys should exist
    const keys: (keyof ClientType)[] = ["users", "posts"];
    for (const k of keys) {
      expect(client).toHaveProperty(k);
    }
  });
});
