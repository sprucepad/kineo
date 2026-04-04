import type { FieldBuilder, RelationBuilder } from "./property";

export interface ModelContext<S extends ModelProps> {
  string(name?: string): FieldBuilder<"string">;
  int(name?: string): FieldBuilder<"int">;
  bigint(name?: string): FieldBuilder<"bigint">;
  float(name?: string): FieldBuilder<"float">;
  decimal(name?: string): FieldBuilder<"decimal">;
  boolean(name?: string): FieldBuilder<"boolean">;
  datetime(name?: string): FieldBuilder<"datetime">;
  json(name?: string): FieldBuilder<"json">;
  bytes(name?: string): FieldBuilder<"bytes">;

  relation<
    P extends ModelProps,
    R extends ModelRelationsFn<any, any> | undefined,
  >(
    to: ModelBuilder<P, R>,
    name?: string,
  ): RelationBuilder<P, R, S>;
}

export type ModelProps = Record<string, FieldBuilder<any, any, any, any, any>>;
export type ModelPropsFn<T extends ModelProps> = (
  s: Omit<ModelContext<any>, "relation">,
) => T;
export type ModelRelations = Record<
  string,
  RelationBuilder<any, any, any, any, any>
>;
export type ModelRelationsFn<R extends ModelRelations, S extends ModelProps> = (
  s: Pick<ModelContext<S>, "relation">,
) => R;

export class ModelBuilder<
  T extends ModelProps,
  R extends ModelRelationsFn<any, T> | undefined = undefined,
> {
  constructor(
    public readonly $props: ModelPropsFn<T>,
    public $name?: string,
  ) {}
  public $relationFn!: R;
  public $indexes: IndexProps<T>[] = [];

  public index(
    ...props: (IndexProps<T> | (keyof T | FieldProps<T>)[])[]
  ): this {
    this.$indexes.push(
      ...props.map((prop) => {
        if (Array.isArray(prop)) return { fields: prop };
        else return prop;
      }),
    );
    return this;
  }

  public relate<R extends ModelRelationsFn<any, T>>(r: R): ModelBuilder<T, R> {
    this.$relationFn = r as any;
    return this as any;
  }
}

export type IndexProps<T extends ModelProps> = {
  /**
   * The fields this index applies to.
   */
  fields: (keyof T | FieldProps<T>)[];
  /**
   * Custom name for index.
   */
  name?: string;
  /**
   * Unique indexes.
   */
  unique?: boolean;
  /**
   * Full-text indexes, for MySQL and PostgreSQL.
   */
  fulltext?: boolean;
} & (
  | {
      /**
       * The type of index, for PostgreSQL.
       */
      type?: "B-tree" | "Hash" | "GiST" | "SP-GiST" | "GIN" | "BRIN";
    }
  | {
      /**
       * The type of index, for PostgreSQL.
       */
      type: "bloom";
      /**
       * The length of each index entry in bits, rounded up to the nearest multiple of 16, maximum being 4096.
       */
      length: number;
      /**
       * Number of bits generated for each index colums. Can be from 1-32 entries, with bits being u to 4095.
       */
      cols: number[];
    }
);

export interface FieldProps<T extends ModelProps> {
  /**
   * The field name.
   */
  name: keyof T;
  /**
   * Per-field sort order.
   */
  sort?: "asc" | "desc";
  /**
   * Length, for MySQL.
   */
  length?: number;
  /**
   * Operator classes, for PostgreSQL.
   */
  ops?: string[];
}

export function model<T extends ModelProps>(
  name: string,
  fn: ModelPropsFn<T>,
): ModelBuilder<T>;
export function model<T extends ModelProps>(
  fn: ModelPropsFn<T>,
): ModelBuilder<T>;

export function model(
  nameOrFn: string | ModelPropsFn<any>,
  fnOrName?: ModelPropsFn<any> | string,
) {
  if (typeof nameOrFn === "string")
    return new ModelBuilder(fnOrName as ModelPropsFn<any>, nameOrFn);
  return new ModelBuilder(nameOrFn);
}
