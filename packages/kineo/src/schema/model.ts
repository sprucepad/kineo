import { FieldDef, RelationDef, type Kind } from "./field";
import type { Schema } from ".";

export interface ModelShape {
  [key: string]:
    | FieldDef<any, any, any, any, any>
    | RelationDef<any, any, any, any, any>;
}

export class ModelDef<S extends ModelShape> {
  constructor(
    public $shape: S,
    public $name?: string,
  ) {}

  name(name?: string): this {
    this.$name = name;
    return this;
  }
}

export type InferField<TField extends FieldDef<any, any, any, any>> =
  TField extends FieldDef<
    infer K,
    infer TDefault,
    infer TRequired,
    infer TArray
  >
    ? // base value (array or single)
      (TArray extends true ? TypeOf<K>[] : TypeOf<K>) extends infer Base
      ? // if required or has a default => definitely Base, otherwise allow undefined
        TRequired extends true
        ? Base
        : TDefault extends undefined
          ? Base | undefined
          : Base
      : never
    : never;

export type TypeOf<TKind extends Kind> = TKind extends "string" | "char"
  ? string
  : TKind extends "int" | "float"
    ? number
    : TKind extends "date" | "time" | "datetime" | "timestamp"
      ? Date
      : TKind extends "bool"
        ? boolean
        : TKind extends "blob"
          ? Blob
          : never;

export type InferModelShape<
  TDef extends ModelShape,
  TSchema extends Schema = Schema,
> = {
  [P in keyof TDef]: TDef[P] extends FieldDef<any, any, any, any>
    ? InferField<TDef[P]>
    : TDef[P] extends RelationDef<any, any, any, any>
      ? InferRelationship<TDef[P], TSchema>
      : never;
};

export type InferRelationship<
  TRelation extends RelationDef<any, any, any, any>,
  TSchema extends Schema,
> =
  TRelation extends RelationDef<
    infer To,
    infer TDefault,
    infer TRequired,
    infer TArray
  >
    ? TSchema[To] extends ModelDef<infer Shape>
      ? (
          TArray extends true
            ? InferModelShape<Shape>[]
            : InferModelShape<Shape>
        ) extends infer Base
        ? TRequired extends true
          ? Base
          : TDefault extends undefined
            ? Base | undefined
            : Base
        : never
      : never
    : never;

export type InferModelDef<T, TSchema extends Schema> =
  T extends ModelDef<infer Shape> ? InferModelShape<Shape, TSchema> : never;

export function model<S extends ModelShape>(
  name: string,
  shape: S,
): ModelDef<S>;
export function model<S extends ModelShape>(shape: S): ModelDef<S>;

export function model(shapeOrName: ModelShape | string, shape?: ModelShape) {
  if (typeof shapeOrName === "string") return new ModelDef(shape!, shapeOrName);
  return new ModelDef(shape!);
}
