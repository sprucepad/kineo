import { describe, expect, it } from "vitest";
import { defineSchema, field, model, type InferSchema } from "@/schema";

describe("defineSchema()", () => {
  it("preserves schema object", () => {
    const schemaObj = {
      user: model("User", {
        id: field.string().id(),
      }),
    };

    const schema = defineSchema(schemaObj);
    expect(schema).toBe(schemaObj);
  });
});

describe("InferSchema (types)", () => {
  // purely type level but we can check runtime shape
  const schema = defineSchema({
    user: model("User", {
      id: field.string().id(),
    }),
    post: model("Post", {
      id: field.string(),
    }),
  });

  type Schema = InferSchema<typeof schema>;

  it("infers keys", () => {
    const keys: (keyof Schema)[] = ["post", "user"];
    for (const key of keys) {
      expect(schema[key]).toBeDefined();
    }

    const userKeys: (keyof Schema["user"])[] = ["id"];
    for (const key of userKeys) {
      expect(schema.user.$shape[key]).toBeDefined();
    }
  });
});
