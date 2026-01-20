import { FieldDef, RelationDef, type Kind } from "./field";
import type { Schema } from ".";

export interface ModelShape {
  [key: string]:
    | FieldDef<any, any, any, any, any>
    | RelationDef<any, any, any, any>;
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

export type TypeOf<K extends Kind> = K extends "string" | "char"
  ? string
  : K extends "int" | "float"
    ? number
    : K extends "date" | "time" | "datetime" | "timestamp"
      ? Date
      : K extends "bool"
        ? boolean
        : K extends "blob"
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
    infer IsRequired,
    infer IsArray,
    infer Default
  >
    ? TSchema[To] extends ModelDef<infer Shape>
      ? (
          IsArray extends true
            ? InferModelShape<Shape>[]
            : InferModelShape<Shape>
        ) extends infer Base
        ? IsRequired extends true
          ? Base
          : Default extends undefined
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
