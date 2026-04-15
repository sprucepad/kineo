import { describe, it, expect, expectTypeOf } from "vitest";
import { s, FieldBuilder } from ".";

describe("FieldBuilder", () => {
  it("sets required and optional correctly", () => {
    const field = s.string().required();

    expect(field.$required).toBe(true);
  });

  it("supports default making field required", () => {
    const field = s.int().default(1);

    expect(field.$required).toBe(true);
    expect(field.$default).toBe(1);
  });

  it("supports many()", () => {
    const field = s.string().many();

    expect(field.$many).toBe(true);
  });

  it("type inference works", () => {
    const field = s.int();

    expectTypeOf(field).toExtend<FieldBuilder<"int">>();
  });

  it("chains correctly", () => {
    const field = s.string().required().many().default(["a"]);

    expect(field.$required).toBe(true);
    expect(field.$many).toBe(true);
  });
});

describe("RelationBuilder", () => {
  it("creates relation", () => {
    const User = { $props: {} } as any;

    const rel = s.relation(User);

    expect(rel.$to).toBe(User);
  });

  it("supports required + many", () => {
    const User = { $props: {} } as any;

    const rel = s.relation(User).required().many();

    expect(rel.$required).toBe(true);
    expect(rel.$many).toBe(true);
  });
});
