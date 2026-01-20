import { describe, test, expect } from "vitest";
import {
  field,
  relation,
  FieldDef,
  RelationDef,
  defineSchema,
  model,
} from "@/schema";

describe("FieldDef", () => {
  test("initialize with correct kind and optional name", () => {
    const f = new FieldDef("string", "username");
    expect(f.$kind).toBe("string");
    expect(f.$name).toBe("username");
    expect(f.$required).toBe(false);
    expect(f.$array).toBe(false);
    expect(f.$default).toBeUndefined();
  });

  test("chain methods and update properties", () => {
    const f = field.int("age").required().array().default(0);
    expect(f.$kind).toBe("int");
    expect(f.$name).toBe("age");
    expect(f.$required).toBe(true);
    expect(f.$array).toBe(true);
    expect(f.$default).toBe(0);
  });

  test("allow switching between required/optional and array/single", () => {
    const f = field.string("email").required().optional().single();
    expect(f.$required).toBe(false);
    expect(f.$array).toBe(false);
  });
});

describe("RelationDef", () => {
  test("initialize with target and optional name", () => {
    const r = new RelationDef("User", "follows");
    expect(r.$to).toBe("User");
    expect(r.$name).toBe("follows");
    expect(r.$direction).toBeUndefined();
  });

  test("chain methods and update properties", () => {
    const r = relation
      .to("Post", "likes")
      .outgoing("LIKES")
      .required()
      .array()
      .default([]);
    expect(r.$to).toBe("Post");
    expect(r.$name).toBe("likes");
    expect(r.$label).toBe("LIKES");
    expect(r.$direction).toBe("outgoing");
    expect(r.$required).toBe(true);
    expect(r.$array).toBe(true);
    expect(r.$default).toEqual([]);
  });

  test("allow changing direction with labels", () => {
    const r = relation.to("Comment").incoming("HAS_COMMENT");
    expect(r.$direction).toBe("incoming");
    expect(r.$label).toBe("HAS_COMMENT");
  });
});

describe("Schema utilities", () => {
  test("defineSchema return the same schema object", () => {
    const schema = defineSchema({
      users: model("User", {
        id: field.int("id").required(),
        name: field.string("name"),
      }),
    });
    expect(schema.users.$name).toBe("User");
    expect(schema.users.$shape.id.$kind).toBe("int");
    expect(schema.users.$shape.name.$kind).toBe("string");
  });
});
