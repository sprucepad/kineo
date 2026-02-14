import { FieldDef, RelationDef, type Kind } from "./field";
import type { StandardSchemaV1 } from "./standard-schema";
import type { Schema } from ".";

/**
 * The shape of a model.
 */
export interface ModelShape {
  [key: string]:
    | FieldDef<any, any, any, any, any>
    | RelationDef<any, any, any, any>;
}

/**
 * A model definition.
 */
export class ModelDef<S extends ModelShape> {
  /**
   * The indexed fields.
   */
  $indexes = new Map<string, IndexOptions<S>>();
  /**
   * The validators for properties.
   */
  $schemas = new Map<string, StandardSchemaV1>();

  /**
   * Creates a new model definition.
   * @param $shape The model shape.
   * @param $name The internal model name.
   */
  constructor(
    public $shape: S,
    public $name?: string,
  ) {}

  /**
   * Sets the model name.
   * @param name The new model name.
   * @returns `this`
   */
  name(name?: string): this {
    this.$name = name;
    return this;
  }

  // TODO timestamping

  /**
   * Creates an index on fields.
   * @param name The index name.
   * @param opts The index options.
   */
  index(name: string, opts: IndexOptions<S>) {
    this.$indexes.set(name, opts);
  }

  /**
   * Adds validators to properties.
   * @param props The properties to validate.
   */
  validate(props: { [Key in keyof S]: StandardSchemaV1 }) {
    for (const key in props) {
      this.$schemas.set(key, props[key]);
    }
  }

  /**
   * Updates indexes and validators, by adding individual field indexes/schemas to this model's index/schema map respectively.
   */
  update() {
    for (const key in this.$shape) {
      const property = this.$shape[key];
      if (property.$indexName && !this.$indexes.has(property.$indexName)) {
        this.$indexes.set(property.$indexName, { fields: [key] });
      }

      if (property.$schema) {
        this.$schemas.set(key, property.$schema);
      }
    }
  }
}

export interface IndexOptions<S extends ModelShape> {
  fields: (keyof S)[];
  where?: {
    [Key in keyof S]: S[Key] extends FieldDef<any, any, any, any, any>
      ? InferField<S[Key]>
      : S[Key] extends RelationDef<any, any, any, any>
        ? InferRelationship<S[Key], any>
        : never;
  };
}

/**
 * Infers a type from a field definition.
 */
export type InferField<TField extends FieldDef<any, any, any, any, any>> =
  TField extends FieldDef<
    infer Type,
    infer IsId,
    infer IsRequired,
    infer IsArray,
    infer Default
  >
    ? // base value (array or single)
      (IsArray extends true ? TypeOf<Type>[] : TypeOf<Type>) extends infer Base
      ? // if id, required or has a default => definitely Base, otherwise allow undefined
        IsRequired extends true
        ? Base
        : IsId extends true
          ? Base
          : Default extends undefined
            ? Base | undefined
            : Base
      : never
    : never;

/**
 * Converts a `Kind` string into a TypeScript type.
 */
export type TypeOf<K extends Kind> = K extends "string" | "char"
  ? string
  : K extends "bigint"
    ? bigint
    : K extends "int" | "float"
      ? number
      : K extends "date" | "time" | "datetime" | "timestamp"
        ? Date
        : K extends "bool"
          ? boolean
          : K extends "blob"
            ? Blob
            : never;

/**
 * Infer a single model's properties.
 */
export type InferModelShape<
  TDef extends ModelShape,
  TSchema extends Schema = Schema,
> = {
  [P in keyof TDef]: TDef[P] extends FieldDef<any, any, any, any, any>
    ? InferField<TDef[P]>
    : TDef[P] extends RelationDef<any, any, any, any>
      ? InferRelationship<TDef[P], TSchema>
      : never;
};

/**
 * Infers a type from a relationship definition.
 */
export type InferRelationship<
  TRelation extends RelationDef<any, any, any, any>,
  TSchema extends Schema,
> =
  TRelation extends RelationDef<
    infer To,
    infer IsRequired,
    infer IsArray,
    infer Default
  >
    ? TSchema[To] extends ModelDef<infer Shape>
      ? (
          IsArray extends true
            ? InferModelShape<Shape, TSchema>[]
            : InferModelShape<Shape, TSchema>
        ) extends infer Base
        ? IsRequired extends true
          ? Base
          : Default extends undefined
            ? Base | undefined
            : Base
        : never
      : never
    : never;

/**
 * Infers types from a model definition.
 */
export type InferModelDef<T, TSchema extends Schema = Schema> =
  T extends ModelDef<infer Shape> ? InferModelShape<Shape, TSchema> : never;

/**
 * Creates a new model.
 * @param name The model name in the database. This does not change the model name in your schema.
 * @param model The model definition.
 * @returns The created model;
 */
export function model<S extends ModelShape>(
  name: string,
  shape: S,
): ModelDef<S>;
/**
 * Creates a new model.
 * @param model The model definition.
 * @returns The created model.
 */
export function model<S extends ModelShape>(shape: S): ModelDef<S>;

export function model(shapeOrName: ModelShape | string, shape?: ModelShape) {
  if (typeof shapeOrName === "string") return new ModelDef(shape!, shapeOrName);
  return new ModelDef(shapeOrName);
}
