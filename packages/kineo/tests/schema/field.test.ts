import { describe, it, expect } from "vitest";
import { FieldDef, RelationDef, field, relation } from "@/schema/field";

// Mock StandardSchemaV1
type MockSchema = {
  parse: (value: unknown) => unknown;
};

const mockSchema: MockSchema = {
  parse: (value) => value,
};

describe("FieldDef", () => {
  it("creates with correct initial kind and name", () => {
    const f = new FieldDef("string", "title");

    expect(f.$kind).toBe("string");
    expect(f.$name).toBe("title");
    expect(f.$required).toBe(false);
    expect(f.$array).toBe(false);
    expect(f.$unique).toBe(false);
  });

  it("changes type via .type()", () => {
    const f = new FieldDef("string").type("int");

    expect(f.$kind).toBe("int");
  });

  it("sets name", () => {
    const f = new FieldDef("string").name("email");

    expect(f.$name).toBe("email");
  });

  it("sets id() and implies required true (type-level) and runtime flag", () => {
    const f = new FieldDef("string").id();

    expect(f.$id).toBe(true);
  });

  it("sets required and optional correctly", () => {
    const f = new FieldDef("string").required();
    expect(f.$required).toBe(true);

    f.optional();
    expect(f.$required).toBe(false);
  });

  it("sets array and single correctly", () => {
    const f = new FieldDef("string").array();
    expect(f.$array).toBe(true);

    f.single();
    expect(f.$array).toBe(false);
  });

  it("sets default value", () => {
    const f = new FieldDef("int").default(42);

    expect(f.$default).toBe(42);
  });

  it("sets index and uniqueness", () => {
    const f = new FieldDef("string").index("idx_name").unique();

    expect(f.$indexName).toBe("idx_name");
    expect(f.$unique).toBe(true);

    f.common();
    expect(f.$unique).toBe(false);
  });

  it("attaches validation schema", () => {
    const f = new FieldDef("string").validate(mockSchema as any);

    expect(f.$schema).toBe(mockSchema);
  });

  it("supports fluent chaining", () => {
    const f = field
      .string("email")
      .required()
      .unique()
      .index("email_idx")
      .default("test@example.com")
      .array()
      .validate(mockSchema as any);

    expect(f.$kind).toBe("string");
    expect(f.$name).toBe("email");
    expect(f.$required).toBe(true);
    expect(f.$unique).toBe(true);
    expect(f.$indexName).toBe("email_idx");
    expect(f.$default).toBe("test@example.com");
    expect(f.$array).toBe(true);
    expect(f.$schema).toBe(mockSchema);
  });
});

describe("Field factory helpers", () => {
  it("creates correct kinds", () => {
    expect(field.string().$kind).toBe("string");
    expect(field.int().$kind).toBe("int");
    expect(field.boolean().$kind).toBe("bool");
  });
});

describe("RelationDef", () => {
  it("creates with correct target and name", () => {
    const r = new RelationDef("User", "author");

    expect(r.$to).toBe("User");
    expect(r.$name).toBe("author");
    expect(r.$required).toBe(false);
    expect(r.$array).toBe(false);
  });

  it("changes target via .to()", () => {
    const r = new RelationDef("User").to("Post");

    expect(r.$to).toBe("Post");
  });

  it("sets name and label", () => {
    const r = new RelationDef("User").name("author").label("WROTE");

    expect(r.$name).toBe("author");
    expect(r.$label).toBe("WROTE");
  });

  it("sets direction explicitly", () => {
    const r = new RelationDef("User").direction("incoming");

    expect(r.$direction).toBe("incoming");
  });

  it("sets outgoing/incoming/both helpers with label", () => {
    const r1 = new RelationDef("User").outgoing("WROTE");
    expect(r1.$direction).toBe("outgoing");
    expect(r1.$label).toBe("WROTE");

    const r2 = new RelationDef("User").incoming("LIKED");
    expect(r2.$direction).toBe("incoming");
    expect(r2.$label).toBe("LIKED");

    const r3 = new RelationDef("User").both("RELATED");
    expect(r3.$direction).toBe("both");
    expect(r3.$label).toBe("RELATED");
  });

  it("sets required and optional correctly", () => {
    const r = new RelationDef("User").required();
    expect(r.$required).toBe(true);

    r.optional();
    expect(r.$required).toBe(false);
  });

  it("sets array and single correctly", () => {
    const r = new RelationDef("User").array();
    expect(r.$array).toBe(true);

    r.single();
    expect(r.$array).toBe(false);
  });

  it("sets default value", () => {
    const r = new RelationDef("User").default("guest");

    expect(r.$default).toBe("guest");
  });

  it("sets index and uniqueness", () => {
    const r = new RelationDef("User").index("rel_idx").unique();

    expect(r.$indexName).toBe("rel_idx");
    expect(r.$unique).toBe(true);

    r.common();
    expect(r.$unique).toBe(false);
  });

  it("attaches validation schema", () => {
    const r = new RelationDef("User").validate(mockSchema as any);

    expect(r.$schema).toBe(mockSchema);
  });

  it("supports fluent chaining", () => {
    const r = relation
      .to("User", "author")
      .outgoing("WROTE")
      .required()
      .unique()
      .index("author_idx")
      .default("none")
      .array()
      .validate(mockSchema as any);

    expect(r.$to).toBe("User");
    expect(r.$name).toBe("author");
    expect(r.$direction).toBe("outgoing");
    expect(r.$label).toBe("WROTE");
    expect(r.$required).toBe(true);
    expect(r.$unique).toBe(true);
    expect(r.$indexName).toBe("author_idx");
    expect(r.$default).toBe("none");
    expect(r.$array).toBe(true);
    expect(r.$schema).toBe(mockSchema);
  });
});
