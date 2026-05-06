import { describe, it, expect } from "vitest";
import { model, parseSchema } from ".";

describe("parseSchema", () => {
  it("parses models and fields correctly", () => {
    const user = model((s) => ({
      id: s.int().id(),
      age: s.int().optional(),
    }));

    const schema = { user };

    const parsed = parseSchema(schema);

    expect(parsed.models.size).toBe(1);

    const parsedUser = parsed.models.get("user");
    expect(parsedUser).toBeDefined();

    expect(parsedUser?.fields.has("id")).toBe(true);
    expect(parsedUser?.fields.has("age")).toBe(true);

    const idField = parsedUser?.fields.get("id");
    expect(idField?.required).toBe(true);

    const ageField = parsedUser?.fields.get("age");
    expect(ageField?.required).toBe(false);
  });

  it("parses relations correctly", () => {
    const user = model((s) => ({
      id: s.int().id(),
    }));

    const post = model((s) => ({
      id: s.int().id(),
      authorId: s.int(),
    })).relate((s) => ({
      author: s.relation(user).fields("authorId").refs("id"),
    }));

    const schema = { user, post };
    const parsed = parseSchema(schema);

    const parsedPost = parsed.models.get("post");
    const relation = parsedPost?.relations.get("author");

    expect(relation).toBeDefined();
    expect(relation?.from).toBe("post");
    expect(relation?.to).toBe("user");
    expect(relation?.virtual).toBe(false);
    expect(relation?.fields).toEqual(["authorId"]);
    expect(relation?.refs).toEqual(["id"]);
  });

  it("parses reverse/many relations", () => {
    const post = model((s) => ({
      id: s.int().id(),
    }));

    const user = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      posts: s.relation(post).many(),
    }));

    const schema = { user, post };
    const parsed = parseSchema(schema);

    const parsedUser = parsed.models.get("user");
    const relation = parsedUser?.relations.get("posts");

    expect(relation).toBeDefined();
    expect(relation?.from).toBe("user");
    expect(relation?.to).toBe("post");
    expect(relation?.virtual).toBe(true);
  });

  it("creates implicit indexes for unique/id fields", () => {
    const user = model((s) => ({
      id: s.int().id(),
    }));

    const schema = { user };
    const parsed = parseSchema(schema);

    const parsedUser = parsed.models.get("user");

    const indexes = parsedUser?.indexes;
    expect(indexes?.size).toBeGreaterThan(0);

    const index = Array.from(indexes!.values())[0];
    expect(index?.unique).toBe(true);
    expect(index?.fields.has("id")).toBe(true);
  });

  it("parses explicit indexes", () => {
    const post = model((s) => ({
      id: s.int().id(),
      authorId: s.int(),
    })).index("authorId");

    const schema = { post };
    const parsed = parseSchema(schema);

    const parsedPost = parsed.models.get("post");
    const indexes = parsedPost?.indexes;

    expect(indexes?.size).toBeGreaterThan(0);

    const index = Array.from(indexes!.values()).find((i) =>
      i.fields.has("authorId"),
    );

    expect(index).toBeDefined();
    expect(index?.unique).toBe(false);
    expect(index?.type).toBe("B-tree");
  });

  it("supports custom index definitions", () => {
    const post = model((s) => ({
      id: s.int().id(),
      title: s.int(),
    })).index({
      name: "custom_idx",
      fields: [{ name: "title", sort: "desc" }],
      unique: true,
      type: "GIN",
    });

    const schema = { post };
    const parsed = parseSchema(schema);

    const parsedPost = parsed.models.get("post");
    const index = parsedPost?.indexes.get("custom_idx");

    expect(index).toBeDefined();
    expect(index?.unique).toBe(true);
    expect(index?.type).toBe("GIN");

    const field = index?.fields.get("title");
    expect(field?.sort).toBe("desc");
  });

  it("uses custom model names when provided", () => {
    const user = model((s) => ({
      id: s.int().id(),
    }));

    // simulate $name override
    (user as any).$name = "UserModel";

    const schema = { user };
    const parsed = parseSchema(schema);

    expect(parsed.models.has("UserModel")).toBe(true);
  });

  it("ignores non-model entries in schema", () => {
    const schema = {
      foo: {},
      bar: 123,
    };

    const parsed = parseSchema(schema as any);

    expect(parsed.models.size).toBe(0);
  });

  it("creates a join model for implicit many-to-many relations", () => {
    const post = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      categories: s.relation(category).many(),
    }));

    const category = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      posts: s.relation(post).many(),
    }));

    const schema = { post, category };

    const parsed = parseSchema(schema);

    // join model name is deterministic: alphabetical or insertion-based
    const joinModel = parsed.models.get("post_category");

    expect(joinModel).toBeDefined();
    expect(joinModel?.fields.has("postId")).toBe(true);
    expect(joinModel?.fields.has("categoryId")).toBe(true);
  });

  it("adds relations from join model back to both sides", () => {
    const post = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      categories: s.relation(category).many(),
    }));

    const category = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      posts: s.relation(post).many(),
    }));

    const parsed = parseSchema({ post, category });

    const joinModel = parsed.models.get("post_category")!;

    const rels = joinModel.relations;

    expect(rels.get("post")).toMatchObject({
      to: "post",
      fields: ["postId"],
    });

    expect(rels.get("category")).toMatchObject({
      to: "category",
      fields: ["categoryId"],
    });
  });

  it("creates a composite unique index on join table", () => {
    const post = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      categories: s.relation(category).many(),
    }));

    const category = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      posts: s.relation(post).many(),
    }));

    const parsed = parseSchema({ post, category });

    const joinModel = parsed.models.get("post_category")!;

    const indexes = [...joinModel.indexes.values()];
    expect(indexes.length).toBe(1);

    const index = indexes[0];
    expect(index?.unique).toBe(true);

    const fieldNames = [...index!.fields.keys()];
    expect(fieldNames).toEqual(
      expect.arrayContaining(["postId", "categoryId"]),
    );
  });

  it("does not create join model for one-to-many relations", () => {
    const user = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      posts: s.relation(post).many(),
    }));

    const post = model((s) => ({
      id: s.int().id(),
      authorId: s.int(),
    })).relate((s) => ({
      author: s.relation(user).fields("authorId").refs("id"),
    }));

    const parsed = parseSchema({ user, post });

    expect(parsed.models.has("user_post")).toBe(false);
  });

  it("does not duplicate join models", () => {
    const post = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      categories: s.relation(category).many(),
    }));

    const category = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      posts: s.relation(post).many(),
    }));

    const parsed = parseSchema({ post, category });

    const joinModels = [...parsed.models.keys()].filter(
      (name) => name.includes("post") && name.includes("category"),
    );

    expect(joinModels.length).toBe(1);
  });

  it("throws if either side of m-n lacks an id field", () => {
    const post = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      categories: s.relation(category).many(),
    }));

    const category = model((s) => ({
      name: s.string(), // no id
    })).relate((s) => ({
      posts: s.relation(post).many(),
    }));

    expect(() => parseSchema({ post, category })).toThrow();
  });
});
