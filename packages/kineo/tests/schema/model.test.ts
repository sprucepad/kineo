import { describe, it, expect, expectTypeOf } from "vitest";
import { model, s } from ".";

describe("ModelBuilder", () => {
  it("creates a model with props", () => {
    const User = model("User", (s) => ({
      id: s.int().id(),
      name: s.string(),
    }));

    expect(User.$name).toBe("User");
    expect(User.$props(s).id).toBeDefined();
    expect(User.$props(s).name).toBeDefined();
  });

  it("supports indexes", () => {
    const User = model((s) => ({
      id: s.int().id(),
      email: s.string(),
    })).index(["email"]);

    expect(User.$indexes.length).toBe(1);
  });

  it("supports relation builder attachment", () => {
    const User = model((s) => ({
      id: s.int().id(),
    }));

    const Post = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      user: s.relation(User),
    }));

    expect(Post.$relationFn).toBeTypeOf("function");
  });

  it("infers model props types", () => {
    const User = model((s) => ({
      id: s.int().id(),
      name: s.string(),
    }));

    expectTypeOf(User.$props(s).id).toExtend<{
      $kind: "int";
    }>();

    expectTypeOf(User.$props(s).name).toExtend<{
      $kind: "string";
    }>();
  });
});
