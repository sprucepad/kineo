import { describe, it, expect } from "vitest";
import { diff } from "./diff";
import type {
  ParsedSchema,
  ParsedModel,
  ParsedField,
  ParsedRelation,
  ParsedIndex,
} from "./parser";

/**
 * ------------------------
 * Helpers
 * ------------------------
 */

function schema(models: ParsedModel[]): ParsedSchema {
  return {
    models: new Map(models.map((m) => [m.name, m])),
  };
}

function model(partial: Partial<ParsedModel> & { name: string }): ParsedModel {
  return {
    key: partial.key ?? partial.name,
    name: partial.name,
    fields: partial.fields ?? new Map(),
    relations: partial.relations ?? new Map(),
    indexes: partial.indexes ?? new Map(),
  };
}

function field(partial: Partial<ParsedField> & { name: string }): ParsedField {
  return {
    key: partial.key ?? partial.name,
    name: partial.name,
    type: partial.type ?? "string",
    required: partial.required ?? false,
    many: partial.many ?? false,
    id: partial.id,
    validator: partial.validator,
  };
}

function relation(
  name: string,
  rel: Partial<ParsedRelation>,
): [string, ParsedRelation] {
  return [
    name,
    {
      from: rel.from!,
      to: rel.to!,
      many: rel.many ?? false,
      virtual: rel.virtual ?? false,
      fields: rel.fields,
      refs: rel.refs,
    },
  ];
}

function index(name: string): [string, ParsedIndex] {
  return [
    name,
    {
      name,
      fields: new Map(),
      unique: false,
      fulltext: false,
      type: "B-tree",
    },
  ];
}

/**
 * ------------------------
 * Tests
 * ------------------------
 */

describe("schema diff", () => {
  it("detects added model", () => {
    const a = schema([]);
    const b = schema([model({ name: "User" })]);

    const result = diff(a, b);

    expect(result.operations).toEqual([
      expect.objectContaining({
        kind: "create_model",
        model: expect.objectContaining({ name: "User" }),
      }),
    ]);
  });

  it("detects removed model", () => {
    const a = schema([model({ name: "User" })]);
    const b = schema([]);

    const result = diff(a, b);

    expect(result.operations).toEqual([
      expect.objectContaining({
        kind: "drop_model",
        modelName: "User",
      }),
    ]);
  });

  it("detects added field", () => {
    const a = schema([model({ name: "User" })]);

    const b = schema([
      model({
        name: "User",
        fields: new Map([["email", field({ name: "email" })]]),
      }),
    ]);

    const result = diff(a, b);

    expect(result.operations).toContainEqual(
      expect.objectContaining({
        kind: "add_field",
        model: "User",
        field: expect.objectContaining({ name: "email" }),
      }),
    );
  });

  it("detects removed field", () => {
    const a = schema([
      model({
        name: "User",
        fields: new Map([["email", field({ name: "email" })]]),
      }),
    ]);

    const b = schema([model({ name: "User" })]);

    const result = diff(a, b);

    expect(result.operations).toContainEqual(
      expect.objectContaining({
        kind: "drop_field",
        model: "User",
        fieldName: "email",
      }),
    );
  });

  it("detects field type change", () => {
    const a = schema([
      model({
        name: "User",
        fields: new Map([["age", field({ name: "age", type: "int" })]]),
      }),
    ]);

    const b = schema([
      model({
        name: "User",
        fields: new Map([["age", field({ name: "age", type: "string" })]]),
      }),
    ]);

    const result = diff(a, b);

    expect(result.operations).toContainEqual(
      expect.objectContaining({
        kind: "alter_field",
        fieldName: "age",
        changes: expect.arrayContaining([
          expect.objectContaining({
            kind: "type",
            from: "int",
            to: "string",
          }),
        ]),
      }),
    );
  });

  it("detects field 'many' change", () => {
    const a = schema([
      model({
        name: "User",
        fields: new Map([["tags", field({ name: "tags", many: false })]]),
      }),
    ]);

    const b = schema([
      model({
        name: "User",
        fields: new Map([["tags", field({ name: "tags", many: true })]]),
      }),
    ]);

    const result = diff(a, b);

    expect(result.operations).toContainEqual(
      expect.objectContaining({
        kind: "alter_field",
        fieldName: "tags",
        changes: expect.arrayContaining([
          expect.objectContaining({
            kind: "many",
            from: false,
            to: true,
          }),
        ]),
      }),
    );
  });

  it("detects added relation", () => {
    const a = schema([model({ name: "User" })]);

    const b = schema([
      model({
        name: "User",
        relations: new Map([
          relation("posts", {
            from: "User",
            to: "Post",
            many: true,
          }),
        ]),
      }),
    ]);

    const result = diff(a, b);

    expect(result.operations).toContainEqual(
      expect.objectContaining({
        kind: "add_relation",
        relation: b.models.get("User")!.relations.get("posts"),
      }),
    );
  });

  it("detects removed relation", () => {
    const a = schema([
      model({
        name: "User",
        relations: new Map([
          relation("posts", {
            from: "User",
            to: "Post",
            many: true,
          }),
        ]),
      }),
    ]);

    const b = schema([model({ name: "User" })]);

    const result = diff(a, b);

    expect(result.operations).toContainEqual(
      expect.objectContaining({
        kind: "drop_relation",
        relationName: "posts",
      }),
    );
  });

  it("detects relation cardinality change", () => {
    const a = schema([
      model({
        name: "User",
        relations: new Map([
          relation("posts", {
            from: "User",
            to: "Post",
            many: false,
          }),
        ]),
      }),
    ]);

    const b = schema([
      model({
        name: "User",
        relations: new Map([
          relation("posts", {
            from: "User",
            to: "Post",
            many: true,
          }),
        ]),
      }),
    ]);

    const result = diff(a, b);

    expect(result.operations).toContainEqual(
      expect.objectContaining({
        kind: "alter_relation",
        relationName: "posts",
        changes: expect.arrayContaining([
          expect.objectContaining({
            kind: "cardinality",
            from: false,
            to: true,
          }),
        ]),
      }),
    );
  });

  it("detects relation target change", () => {
    const a = schema([
      model({
        name: "User",
        relations: new Map([
          relation("owner", {
            from: "User",
            to: "Org",
          }),
        ]),
      }),
    ]);

    const b = schema([
      model({
        name: "User",
        relations: new Map([
          relation("owner", {
            from: "User",
            to: "Team",
          }),
        ]),
      }),
    ]);

    const result = diff(a, b);

    expect(result.operations).toContainEqual(
      expect.objectContaining({
        kind: "alter_relation",
        relationName: "owner",
        changes: expect.arrayContaining([
          expect.objectContaining({
            kind: "target",
            from: "Org",
            to: "Team",
          }),
        ]),
      }),
    );
  });

  it("detects added index", () => {
    const a = schema([model({ name: "User" })]);

    const b = schema([
      model({
        name: "User",
        indexes: new Map([index("user_email_idx")]),
      }),
    ]);

    const result = diff(a, b);

    expect(result.operations).toContainEqual(
      expect.objectContaining({
        kind: "add_index",
        index: expect.objectContaining({ name: "user_email_idx" }),
      }),
    );
  });

  it("detects removed index", () => {
    const a = schema([
      model({
        name: "User",
        indexes: new Map([index("user_email_idx")]),
      }),
    ]);

    const b = schema([model({ name: "User" })]);

    const result = diff(a, b);

    expect(result.operations).toContainEqual(
      expect.objectContaining({
        kind: "drop_index",
        indexName: "user_email_idx",
      }),
    );
  });

  it("produces no ops for identical schemas", () => {
    const s = schema([
      model({
        name: "User",
        fields: new Map([["id", field({ name: "id", id: true })]]),
      }),
    ]);

    const result = diff(s, s);

    expect(result.operations.length).toBe(0);
  });
});
