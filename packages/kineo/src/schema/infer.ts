import type {
  ModelBuilder,
  ModelProps,
  ModelRelations,
  ModelRelationsFn,
} from "./model";
import type { FieldBuilder, RelationBuilder, TypeOf } from "./property";

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type NormalizeOptional<T> = Prettify<
  {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
  } & {
    [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<
      T[K],
      undefined
    >;
  }
>;

export type InferField<
  T extends FieldBuilder<any, any, any, any, any>,
  DefaultMeansOptional extends boolean = false,
> =
  T extends FieldBuilder<
    infer Kind,
    any,
    infer Required,
    infer Many,
    infer Default
  >
    ? (Many extends true ? TypeOf<Kind>[] : TypeOf<Kind>) extends infer Type
      ? (
          DefaultMeansOptional extends true
            ? Default extends undefined
              ? Type
              : Type | undefined
            : Type
        ) extends infer DefaultAppliedType
        ? Required extends true
          ? DefaultAppliedType
          : DefaultAppliedType | undefined
        : never
      : never
    : never;

export type InferRelationship<
  T extends RelationBuilder<any, any, any, any, any>,
  DefaultMeansOptional extends boolean = false,
> = Prettify<
  T extends RelationBuilder<
    infer To,
    infer OutsideRelationsFn,
    infer Required,
    infer Many,
    infer Default
  >
    ? (
        OutsideRelationsFn extends ModelRelationsFn<infer Relations, any>
          ? InferRelations<Relations>
          : object
      ) extends infer WithRelations
      ? (
          Many extends true
            ? (WithRelations & InferProps<To, DefaultMeansOptional>)[]
            : WithRelations & InferProps<To, DefaultMeansOptional>
        ) extends infer Type
        ? (
            DefaultMeansOptional extends true
              ? Default extends undefined
                ? Type
                : Type | undefined
              : Type
          ) extends infer DefaultAppliedType
          ? Required extends true
            ? DefaultAppliedType
            : DefaultAppliedType | undefined
          : never
        : never
      : never
    : never
>;

export type InferRelations<
  T extends ModelRelations,
  DefaultMeansOptional extends boolean = false,
> = Prettify<{
  [K in keyof T]: InferRelationship<T[K], DefaultMeansOptional>;
}>;

export type InferProps<
  T extends ModelProps,
  DefaultMeansOptional extends boolean = false,
> = Prettify<{
  [K in keyof T]: InferField<T[K], DefaultMeansOptional>;
}>;

export type InferModel<
  T extends ModelBuilder<any, any>,
  DefaultMeansOptional extends boolean = false,
> = NormalizeOptional<
  T extends ModelBuilder<infer Props, infer RelationsFn>
    ? RelationsFn extends ModelRelationsFn<infer Relations, any>
      ? InferProps<Props, DefaultMeansOptional> &
          InferRelations<Relations, DefaultMeansOptional>
      : InferProps<Props, DefaultMeansOptional>
    : never
>;
