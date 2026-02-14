import { describe, it, expect } from "vitest";
import { expectTypeOf } from "vitest";
import {
  model,
  type InferField,
  type InferModelDef,
  type TypeOf,
} from "@/schema/model";
import { field, relation } from "@/schema/field";
import type { StandardSchemaV1 } from "@/schema/standard-schema";

const mockSchema: StandardSchemaV1 = {
  "~standard": {
    vendor: "example",
    version: 1,
    validate: (value) => ({ value }),
  },
};

describe("model() factory", () => {
  it("creates model with name + shape", () => {
    const m = model("User", {
      name: field.string(),
    });

    expect(m.$name).toBe("User");
    expect(m.$shape.name).toBeDefined();
  });

  it("creates model with shape only", () => {
    const m = model({
      name: field.string(),
    });

    expect(m.$name).toBeUndefined();
    expect(m.$shape.name).toBeDefined();
  });
});

describe("ModelDef runtime behavior", () => {
  it("sets name via .name()", () => {
    const m = model({ name: field.string() });

    m.name("User");

    expect(m.$name).toBe("User");
  });

  it("adds manual indexes", () => {
    const m = model({
      name: field.string(),
      age: field.int(),
    });

    m.index("name_age_idx", { fields: ["name", "age"] });

    expect(m.$indexes.has("name_age_idx")).toBe(true);
    expect(m.$indexes.get("name_age_idx")).toEqual({
      fields: ["name", "age"],
    });
  });

  it("adds property validators via validate()", () => {
    const m = model({
      name: field.string(),
      age: field.int(),
    });

    m.validate({
      name: mockSchema,
      age: mockSchema,
    });

    expect(m.$schemas.get("name")).toBe(mockSchema);
    expect(m.$schemas.get("age")).toBe(mockSchema);
  });

  it("update() pulls field-level index + schema into model maps", () => {
    const m = model({
      name: field
        .string()
        .index("name_idx")
        .validate(mockSchema as any),
      age: field.int(),
    });

    m.update();

    expect(m.$indexes.has("name_idx")).toBe(true);
    expect(m.$indexes.get("name_idx")).toEqual({
      fields: ["name"],
    });

    expect(m.$schemas.get("name")).toBe(mockSchema);
  });

  it("update() does not override existing index", () => {
    const m = model({
      name: field.string().index("name_idx"),
    });

    m.index("name_idx", { fields: ["name"] });
    m.update();

    expect(m.$indexes.get("name_idx")).toEqual({
      fields: ["name"],
    });
  });
});

describe("TypeOf<K>", () => {
  it("maps Kind to correct TypeScript types", () => {
    expectTypeOf<TypeOf<"string">>().toEqualTypeOf<string>();
    expectTypeOf<TypeOf<"int">>().toEqualTypeOf<number>();
    expectTypeOf<TypeOf<"float">>().toEqualTypeOf<number>();
    expectTypeOf<TypeOf<"bigint">>().toEqualTypeOf<bigint>();
    expectTypeOf<TypeOf<"bool">>().toEqualTypeOf<boolean>();
    expectTypeOf<TypeOf<"date">>().toEqualTypeOf<Date>();
  });
});

describe("InferField", () => {
  it("infers required field correctly", () => {
    // eslint-disable-next-line -- there is no other way to do this apart from manually defining FieldDef here
    const f = field.string().required();
    type T = InferField<typeof f>;

    expectTypeOf<T>().toEqualTypeOf<string>();
  });

  it("infers optional field as possibly undefined", () => {
    // eslint-disable-next-line -- there is no other way to do this apart from manually defining FieldDef here
    const f = field.string();
    type T = InferField<typeof f>;

    expectTypeOf<T>().toEqualTypeOf<string | undefined>();
  });

  it("infers id field as required", () => {
    // eslint-disable-next-line -- there is no other way to do this apart from manually defining FieldDef here
    const f = field.string().id();
    type T = InferField<typeof f>;

    expectTypeOf<T>().toEqualTypeOf<string>();
  });

  it("infers defaulted field as required", () => {
    // eslint-disable-next-line -- there is no other way to do this apart from manually defining FieldDef here
    const f = field.string().default("x");
    type T = InferField<typeof f>;

    expectTypeOf<T>().toEqualTypeOf<string>();
  });

  it("infers array field correctly", () => {
    // eslint-disable-next-line -- there is no other way to do this apart from manually defining FieldDef here
    const f = field.int().array().required();
    type T = InferField<typeof f>;

    expectTypeOf<T>().toEqualTypeOf<number[]>();
  });
});

describe("InferModelShape + InferModelDef", () => {
  // eslint-disable-next-line -- there is no other way to do this apart from manually defining ModelDef here
  const user = model("User", {
    id: field.string().id(),
    name: field.string(),
    age: field.int().required(),
  });

  type UserType = InferModelDef<typeof user>;

  it("infers model properties correctly", () => {
    expectTypeOf<UserType>().toEqualTypeOf<{
      id: string;
      name: string | undefined;
      age: number;
    }>();
  });
});

describe("InferRelationship", () => {
  // eslint-disable-next-line -- there is no other way to do this apart from manually defining ModelDef here
  const user = model("User", {
    id: field.string().id(),
    name: field.string().required(),
  });

  // eslint-disable-next-line -- there is no other way to do this apart from manually defining ModelDef here
  const post = model("Post", {
    id: field.string().id(),
    title: field.string().required(),
    author: relation.to("user").required(),
  });

  // eslint-disable-next-line -- there is no other way to do this apart from manually defining ModelDef here
  const comment = model("Comment", {
    post: relation.to("post"),
  });

  type Schema = {
    user: typeof user;
    post: typeof post;
    comment: typeof comment;
  };

  type PostType = InferModelDef<typeof post, Schema>;

  it("infers required single relationship correctly", () => {
    expectTypeOf<PostType["author"]>().toEqualTypeOf<{
      id: string;
      name: string;
    }>();
  });

  it("infers optional relationship correctly", () => {
    type CommentType = InferModelDef<typeof comment, Schema>;

    expectTypeOf<CommentType["post"]>().toEqualTypeOf<
      | {
          id: string;
          title: string;
          author: {
            id: string;
            name: string;
          };
        }
      | undefined
    >();
  });

  it("infers array relationship correctly", () => {
    // eslint-disable-next-line -- there is no other way to do this apart from manually defining ModelDef here
    const blog = model("Blog", {
      posts: relation.to("post").array().required(),
    });

    type BlogType = InferModelDef<typeof blog, Schema>;

    expectTypeOf<BlogType["posts"]>().toEqualTypeOf<
      {
        id: string;
        title: string;
        author: {
          id: string;
          name: string;
        };
      }[]
    >();
  });
});
