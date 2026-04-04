import Decimal from "decimal.js";
import type {
  IndexProps,
  ModelBuilder,
  ModelContext,
  ModelProps,
  ModelRelationsFn,
} from "./model";
import type { StandardSchemaV1 } from "./standard";
import type { InferProps } from "./infer";

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
  TRequired extends boolean = false,
  TMany extends boolean = false,
  TDefault extends TypeOf<T> | undefined = undefined,
> {
  constructor(
    public readonly $kind: T,
    public $name?: string,
  ) {}
  public $id: TId = false as any;
  public $required: TRequired = false as any;
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

export class RelationBuilder<
  TP extends ModelProps,
  TR extends ModelRelationsFn<any, any> | undefined,
  TSelf extends ModelProps,
  TRefs extends (keyof TP)[] | undefined = undefined,
  TFields extends (keyof TSelf)[] | undefined = undefined,
  TRequired extends boolean = false,
  TMany extends boolean = false,
  TDefault extends InferReferences<TP, TRefs> | undefined = undefined,
> {
  constructor(
    public readonly $to: ModelBuilder<TP, TR>,
    public $name?: string,
  ) {}
  public $required: TRequired = false as any;
  public $many: TMany = false as any;
  public $default: TDefault = undefined as any;
  public $fields: TFields = undefined as any;
  public $refs: TRefs = undefined as any;

  public refs<T extends (keyof TP)[]>(
    ...fields: T
  ): RelationBuilder<TP, TR, TSelf, T, TFields, TRequired, TMany, any> {
    this.$refs = fields as any;
    return this as any;
  }

  public fields<T extends (keyof TSelf)[]>(
    ...fields: T
  ): RelationBuilder<TP, TR, TSelf, TRefs, T, TRequired, TMany, TDefault> {
    this.$fields = fields as any;
    return this as any;
  }

  public required(): RelationBuilder<
    TP,
    TR,
    TSelf,
    TRefs,
    TFields,
    true,
    TMany,
    TDefault
  > {
    this.$required = true as any;
    return this as any;
  }

  public optional(): RelationBuilder<
    TP,
    TR,
    TSelf,
    TRefs,
    TFields,
    false,
    TMany,
    TDefault
  > {
    this.$required = false as any;
    return this as any;
  }

  public many(): RelationBuilder<
    TP,
    TR,
    TSelf,
    TRefs,
    TFields,
    TRequired,
    true,
    TDefault
  > {
    this.$many = true as any;
    return this as any;
  }

  public single(): RelationBuilder<
    TP,
    TR,
    TSelf,
    TRefs,
    TFields,
    TRequired,
    false,
    TDefault
  > {
    this.$many = false as any;
    return this as any;
  }

  public default(
    def: TMany extends true
      ? InferReferences<TP, TRefs>[]
      : InferReferences<TP, TRefs>,
  ): RelationBuilder<
    TP,
    TR,
    TSelf,
    TRefs,
    TFields,
    true,
    TMany,
    InferReferences<TP, TRefs>
  > {
    this.$default = def as any;
    this.$required = true as any;
    return this as any;
  }
}

export type InferReferences<
  Props extends ModelProps,
  R extends (keyof Props)[] | undefined,
> = (R extends undefined ? never : R) extends infer Refs extends
  readonly (keyof Props)[]
  ? Refs extends readonly [
      infer OnlyKey extends keyof TypeOfReferences<Props, Refs>,
    ]
    ? TypeOfReferences<Props, Refs>[OnlyKey]
    : TypeOfReferences<Props, Refs>
  : InferProps<Props>;

export type TypeOfReferences<
  Props extends ModelProps,
  Refs extends readonly (keyof Props)[],
> = {
  [K in Refs[number]]: Props[K] extends FieldBuilder<
    infer K,
    any,
    any,
    any,
    any
  >
    ? TypeOf<K>
    : never;
};

// TODO delete (this might be necessary)
// type FindTypeOfIds<T extends ModelProps> = keyof IdFieldTypes<T> extends infer K
//   ? K extends keyof IdFieldTypes<T>
//     ? [K] extends [never]
//       ? never
//       : IsSingleKey<IdFieldTypes<T>> extends true
//         ? IdFieldTypes<T>[K] // single -> just the type
//         : IdFieldTypes<T> // multiple -> object
//     : never
//   : never;

// type IdFields<T extends ModelProps> = {
//   [K in keyof T as T[K] extends FieldBuilder<any, true, any, any, any>
//     ? K
//     : never]: T[K];
// };

// type IdFieldTypes<T extends ModelProps> = {
//   [K in keyof IdFields<T>]: IdFields<T>[K] extends FieldBuilder<
//     infer KKind,
//     true,
//     any,
//     any,
//     any
//   >
//     ? TypeOf<KKind>
//     : never;
// };

// type IsSingleKey<T> = keyof T extends infer K
//   ? K extends any
//     ? [K] extends [keyof T]
//       ? true
//       : false
//     : never
//   : never;

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
