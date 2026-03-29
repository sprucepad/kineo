import type { IndexProps, ModelBuilder, ModelContext, ModelProps } from ".";
import type { StandardSchemaV1 } from "./standard";

export type InlineIndexProps = Omit<IndexProps<any>, "fields">;

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

export class FieldBuilder<T extends Kind> {
  constructor(
    public readonly $kind: T,
    public $name?: string,
  ) {}
  public $id = false;
  public $required = false;
  public $many = false;
  public $unique = false;
  public $index: InlineIndexProps | boolean = false;
  public $default?: TypeOf<T>;
  public $validator?: StandardSchemaV1<TypeOf<T>>;

  public id(): this {
    this.$id = true;
    this.$required = true;
    this.$unique = true;
    return this;
  }

  public required(): this {
    this.$required = true;
    return this;
  }

  public optional(): this {
    this.$required = false;
    return this;
  }

  public many(): this {
    this.$many = true;
    return this;
  }

  public single(): this {
    this.$many = false;
    return this;
  }

  public unique(): this {
    this.$unique = true;
    return this;
  }

  public common(): this {
    this.$unique = false;
    return this;
  }

  public default(kind: TypeOf<T>): this {
    this.$default = kind;
    return this;
  }

  public index(props?: InlineIndexProps | string): this {
    this.$index = typeof props === "string" ? { name: props } : (props ?? true);
    return this;
  }

  public validator(v: StandardSchemaV1<TypeOf<T>>): this {
    this.$validator = v;
    return this;
  }
}

export type TypeOf<T extends Kind> = T extends "string"
  ? string
  : T extends "int" | "float"
    ? number
    : // TODO T extends "decimal" ? Decimal :
      T extends "boolean"
      ? boolean
      : T extends "datetime"
        ? Date
        : T extends "json"
          ? any
          : T extends "bytes"
            ? ArrayBuffer
            : never;

export interface RelationOpts<T, S> {
  fields: (keyof S)[];
  refs: (keyof T)[];
}

export class RelationBuilder<T extends ModelProps> {
  constructor(
    public readonly $to: ModelBuilder<T>,
    public $opts?: RelationOpts<T, any>,
    public $name?: string,
  ) {}

  // TODO
}

export const s: ModelContext<any> = {
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
    to: ModelBuilder<any, any>,
    optsOrName?: RelationOpts<any, any> | string,
    name?: string,
  ) =>
    new RelationBuilder(
      to,
      typeof optsOrName === "string" ? undefined : optsOrName,
      name ?? (optsOrName as string),
    ),
};
