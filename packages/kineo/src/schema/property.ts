import Decimal from "decimal.js";
import type {
  IndexProps,
  ModelBuilder,
  ModelContext,
  ModelProps,
  ModelRelationsFn,
} from "./model";
import type { StandardSchemaV1 } from "./standard";

export { default as Decimal } from "decimal.js";

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

export class FieldBuilder<
  T extends Kind,
  TId extends boolean = false,
  TRequired extends boolean = true,
  TMany extends boolean = false,
  TDefault extends TypeOf<T> | undefined = undefined,
> {
  constructor(
    public readonly $kind: T,
    public $name?: string,
  ) {}
  public $id: TId = false as any;
  public $required: TRequired = true as any;
  public $many: TMany = false as any;
  public $unique = false;
  public $index: InlineIndexProps | boolean = false;
  public $default: TDefault = undefined as any;
  public $validator?: StandardSchemaV1<TypeOf<T>>;

  public id(): FieldBuilder<T, true, true, TMany, TDefault> {
    this.$id = true as any;
    this.$required = true as any;
    this.$unique = true as any;
    return this as any;
  }

  public required(): FieldBuilder<T, TId, true, TMany, TDefault> {
    this.$required = true as any;
    return this as any;
  }

  public optional(): FieldBuilder<T, TId, false, TMany, TDefault> {
    this.$required = false as any;
    return this as any;
  }

  public many(): FieldBuilder<T, TId, TRequired, true, TDefault> {
    this.$many = true as any;
    return this as any;
  }

  public single(): FieldBuilder<T, TId, TRequired, false, TDefault> {
    this.$many = false as any;
    return this as any;
  }

  public unique(): this {
    this.$unique = true;
    return this;
  }

  public common(): this {
    this.$unique = false;
    return this;
  }

  public default(
    def: TMany extends true ? TypeOf<T>[] : TypeOf<T>,
  ): FieldBuilder<T, TId, true, TMany, TypeOf<T>> {
    this.$default = def as any;
    this.$required = true as any;
    return this as any;
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
    : T extends "decimal"
      ? Decimal
      : T extends "boolean"
        ? boolean
        : T extends "datetime"
          ? Date
          : T extends "json"
            ? any
            : T extends "bytes"
              ? ArrayBuffer
              : never;

export type Scalar = TypeOf<Kind>;

export class RelationBuilder<
  TP extends ModelProps,
  TR extends ModelRelationsFn<any, any> | undefined,
  TSelf extends ModelProps,
  TRequired extends boolean = true,
  TMany extends boolean = false,
> {
  constructor(
    public readonly $to: ModelBuilder<TP, TR>,
    public $name?: string,
  ) {}
  public $required: TRequired = true as any;
  public $many: TMany = false as any;
  public $fields?: (keyof TSelf)[];
  public $refs?: (keyof TP)[];

  public refs(
    ...fields: (keyof TP)[]
  ): RelationBuilder<TP, TR, TSelf, TRequired, TMany> {
    this.$refs = fields as any;
    return this as any;
  }

  public fields(
    ...fields: (keyof TSelf)[]
  ): RelationBuilder<TP, TR, TSelf, TRequired, TMany> {
    this.$fields = fields as any;
    return this as any;
  }

  public required(): RelationBuilder<TP, TR, TSelf, true, TMany> {
    this.$required = true as any;
    return this as any;
  }

  public optional(): RelationBuilder<TP, TR, TSelf, false, TMany> {
    this.$required = false as any;
    return this as any;
  }

  public many(): RelationBuilder<TP, TR, TSelf, TRequired, true> {
    this.$many = true as any;
    return this as any;
  }

  public single(): RelationBuilder<TP, TR, TSelf, TRequired, false> {
    this.$many = false as any;
    return this as any;
  }
}

export const s: ModelContext<any> = {
  string: (name) => new FieldBuilder("string", name),
  int: (name) => new FieldBuilder("int", name),
  bigint: (name) => new FieldBuilder("bigint", name),
  float: (name) => new FieldBuilder("float", name),
  decimal: (name) => new FieldBuilder("decimal", name),
  boolean: (name) => new FieldBuilder("boolean", name),
  bytes: (name) => new FieldBuilder("bytes", name),
  datetime: (name) => new FieldBuilder("datetime", name),
  json: (name) => new FieldBuilder("json", name),
  relation: (to: ModelBuilder<any, any>, name?: string) =>
    new RelationBuilder(to, name),
};
