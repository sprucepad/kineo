/* eslint-disable @typescript-eslint/no-unused-vars -- it's easier to do `s.string` over `typeof FieldBuilder<"string"> */
import { describe, it, expectTypeOf } from "vitest";
import type { InferField, InferModel, InferRelations } from "@/schema";
import { model, s } from "@/schema";

describe("InferField", () => {
  it("infers required field", () => {
    const field = s.string().required();

    type T = InferField<typeof field>;

    expectTypeOf<T>().toEqualTypeOf<string>();
  });

  it("infers optional field", () => {
    const field = s.string();

    type T = InferField<typeof field>;

    expectTypeOf<T>().toEqualTypeOf<string | undefined>();
  });

  it("infers many field", () => {
    const field = s.int().many();

    type T = InferField<typeof field>;

    expectTypeOf<T>().toEqualTypeOf<number[] | undefined>();
  });

  it("default makes required", () => {
    const field = s.int().default(1);

    type T = InferField<typeof field>;

    expectTypeOf<T>().toEqualTypeOf<number>();
  });

  it("defaultMeansOptional flag works", () => {
    const field = s.int().default(1);

    type T = InferField<typeof field, true>;

    expectTypeOf<T>().toEqualTypeOf<number | undefined>();
  });
});

describe("InferModel", () => {
  it("infers simple model", () => {
    const User = model((s) => ({
      id: s.int().id(),
      name: s.string(),
    }));

    type T = InferModel<typeof User>;

    expectTypeOf<T>().toEqualTypeOf<{
      id: number;
      name?: string;
    }>();
  });

  it("infers with required fields", () => {
    const User = model((s) => ({
      id: s.int().id(),
      name: s.string().required(),
    }));

    type T = InferModel<typeof User>;

    expectTypeOf<T>().toEqualTypeOf<{
      id: number;
      name: string;
    }>();
  });

  it("infers relations", () => {
    const User = model((s) => ({
      id: s.int().id(),
    }));

    const Post = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      user: s.relation(User).required(),
    }));

    type T = InferModel<typeof Post>;

    expectTypeOf<T>().toExtend<{
      id: number;
      user: { id: number };
    }>();
  });

  it("infers many relations", () => {
    const User = model((s) => ({
      id: s.int().id(),
    }));

    const Post = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      users: s.relation(User).many(),
    }));

    type T = InferModel<typeof Post>;

    expectTypeOf<T>().toExtend<{
      id: number;
      users?: { id: number }[];
    }>();
  });
});

describe("InferRelations", () => {
  it("infers nested relations", () => {
    const User = model((s) => ({
      id: s.int().id(),
    }));

    const Post = model((s) => ({
      id: s.int().id(),
    })).relate((s) => ({
      user: s.relation(User),
    }));

    type R = InferRelations<ReturnType<typeof Post.$relationFn>>;

    expectTypeOf<R>().toExtend<{
      user?: { id: number };
    }>();
  });
});
