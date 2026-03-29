import type { ModelBuilder, ModelContext } from ".";

export type Kind =
  | "string"
  | "int"
  | "bigint"
  | "float"
  | "decimal"
  | "boolean"
  | "datetime"
  | "json"
  | "bytes";

export class FieldBuilder {
  constructor(
    public readonly $kind: Kind,
    public $name?: string,
  ) {}

  // TODO
}

export interface RelationOpts {
  fields: string[];
  refs: string[];
}

export class RelationBuilder {
  constructor(
    public readonly $to: ModelBuilder,
    public $opts?: RelationOpts,
    public $name?: string,
  ) {}

  // TODO
}

export const s: ModelContext = {
  string: (name) => new FieldBuilder("string", name),
  int: (name) => new FieldBuilder("int", name),
  bigint: (name) => new FieldBuilder("bigint", name),
  float: (name) => new FieldBuilder("float", name),
  // TODO decimal: (name) => new FieldBuilder("decimal", name),
  boolean: (name) => new FieldBuilder("boolean", name),
  bytes: (name) => new FieldBuilder("bytes", name),
  datetime: (name) => new FieldBuilder("datetime", name),
  json: (name) => new FieldBuilder("json", name),
  relation: (
    to: ModelBuilder,
    optsOrName?: RelationOpts | string,
    name?: string,
  ) =>
    new RelationBuilder(
      to,
      typeof optsOrName === "string" ? undefined : optsOrName,
      name ?? (optsOrName as string),
    ),
};
