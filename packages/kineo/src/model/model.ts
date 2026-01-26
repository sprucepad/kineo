import type { Adapter } from "@/adapter";
import type { InferModelShape, ModelDef, ModelShape, Schema } from "@/schema";
import * as ir from "@/ir";

// ---------- Generic Utility Types ---------- //

/**
 * Filter interface for primitive types.
 */
export type PrimitiveFilter<T> = T extends string
  ? {
      equals?: T;
      in?: T[];
      notIn?: T[];
      contains?: T;
      startsWith?: T;
      endsWith?: T;
      mode?: "default" | "insensitive";
      not?: PrimitiveFilter<T> | T;
    }
  : T extends number
    ? {
        equals?: T;
        in?: T[];
        notIn?: T[];
        lt?: T;
        lte?: T;
        gt?: T;
        gte?: T;
        not?: PrimitiveFilter<T> | T;
      }
    : T extends boolean
      ? { equals?: T; not?: T }
      : T extends Date
        ? {
            equals?: T | string;
            before?: T | string;
            after?: T | string;
            between?: [T | string, T | string];
            not?: T | string;
          }
        : never;

/**
 * Filter for a field.
 */
export type FieldFilter<T> = T | PrimitiveFilter<T>;

/**
 * Extracts ID from a model.
 */
export type IdOf<M> = {
  [K in keyof M]: M[K] extends infer V
    ? K extends string
      ? V extends string | number
        ? K
        : never
      : never
    : never;
}[keyof M];

// ---------- CRUD Options ---------- //

/**
 * Query options (`findFirst`, `findMany`, etc.)
 */
export interface QueryOpts<
  S extends Schema,
  M extends ModelShape,
  MType = InferModelShape<M, S>,
> {
  where?: {
    [K in keyof MType]?: FieldFilter<MType[K]>;
  };
  select?: {
    [K in keyof MType]?: boolean | QueryOpts<S, any>; // nested select
  };
  include?: {
    [K in keyof MType]?: boolean | QueryOpts<S, any>; // nested include
  };
  orderBy?: {
    [K in keyof MType]?: "asc" | "desc";
  }[];
  distinct?: (keyof MType)[];
  skip?: number;
  take?: number;
}

/**
 * Create options (`create`).
 */
export interface CreateOpts<
  S extends Schema,
  M extends ModelShape,
  MType = InferModelShape<M, S>,
> {
  data: {
    [K in keyof MType]?: MType[K];
  };
  select?: QueryOpts<S, M>["select"];
  include?: QueryOpts<S, M>["include"];
}

/**
 * Update options (`update`, `updateMany`).
 */
export interface UpdateOpts<
  S extends Schema,
  M extends ModelShape,
  MType = InferModelShape<M, S>,
> {
  where: {
    [K in keyof MType]?: FieldFilter<MType[K]>;
  };
  data: Partial<MType>;
  select?: QueryOpts<S, M>["select"];
  include?: QueryOpts<S, M>["include"];
}

/**
 * Delete options (`delete`, `deleteMany`).
 */
export interface DeleteOpts<
  S extends Schema,
  M extends ModelShape,
  MType = InferModelShape<M, S>,
> {
  where: {
    [K in keyof MType]?: FieldFilter<MType[K]>;
  };
  select?: QueryOpts<S, M>["select"];
  include?: QueryOpts<S, M>["include"];
}

/**
 * Upsert options (`upsert`, `upsertMany`).
 */
export interface UpsertOpts<
  S extends Schema,
  M extends ModelShape,
  MType = InferModelShape<M, S>,
> {
  where: {
    [K in keyof MType]?: FieldFilter<MType[K]>;
  };
  create: CreateOpts<S, M>["data"];
  update: UpdateOpts<S, M>["data"];
  select?: QueryOpts<S, M>["select"];
  include?: QueryOpts<S, M>["include"];
}

// ---------- Result Type Helpers ---------- //

/**
 * If select/include specified, infer shape, otherwise return full model.
 */
export type ResultPayload<
  S extends Schema,
  M extends ModelShape,
  O extends QueryOpts<S, M> | undefined,
  MType = InferModelShape<M, S>,
> = O extends { select: any }
  ? SelectedFields<S, M, NonNullable<O["select"]>, MType>
  : O extends { include: any }
    ? IncludedFields<S, M, NonNullable<O["include"]>, MType>
    : MType;

/** Handle select: pick subset */
/**
 * Picks a subset of the fields, based on the `select` option.
 */
export type SelectedFields<
  S extends Schema,
  M extends ModelShape,
  Sel extends Record<string, any>,
  MType = InferModelShape<M, S>,
> = {
  [K in keyof Sel & keyof MType]: Sel[K] extends true
    ? MType[K]
    : Sel[K] extends QueryOpts<S, any>
      ? // nested select: dive into schema
        MType[K] // you could refine further if MType[K] is relational
      : never;
};

/**
 * Adds nested relations.
 */
export type IncludedFields<
  S extends Schema,
  M extends ModelShape,
  Inc extends Record<string, any>,
  MType = InferModelShape<M, S>,
> = MType & {
  [K in keyof Inc & keyof MType]: Inc[K] extends true
    ? MType[K]
    : Inc[K] extends QueryOpts<S, any>
      ? MType[K] // refine further if you want deep type inference
      : never;
};

// ---------- Return Types for CRUD ---------- //

/**
 * The return type for `findFirst`.
 */
export type FindFirstReturn<
  S extends Schema,
  M extends ModelShape,
  O extends QueryOpts<S, M> | undefined,
> = Promise<ResultPayload<S, M, O> | null>;

/**
 * The return type for `findMany`.
 */
export type FindManyReturn<
  S extends Schema,
  M extends ModelShape,
  O extends QueryOpts<S, M> | undefined,
> = Promise<ResultPayload<S, M, O>[]>;

/**
 * The return type for `count`.
 */
export type CountReturn = Promise<number>;

/**
 * The return type for `create`.
 */
export type CreateReturn<
  S extends Schema,
  M extends ModelShape,
  O extends CreateOpts<S, M>,
> = Promise<ResultPayload<S, M, O>>;

/**
 * The return  type for `update`.
 */
export type UpdateReturn<
  S extends Schema,
  M extends ModelShape,
  O extends UpdateOpts<S, M>,
> = Promise<ResultPayload<S, M, O>>;

/**
 * The return type for `updateMany`.
 */
// Make this return the whole record if you want
export type UpdateManyReturn = Promise<{ count: number }>;

/**
 * The return type for `delete`.
 */
export type DeleteReturn<
  S extends Schema,
  M extends ModelShape,
  O extends DeleteOpts<S, M>,
> = Promise<ResultPayload<S, M, O>>;

/**
 * The return type for `deleteMany`.
 */
// Make this return the whole record if you want
export type DeleteManyReturn = Promise<{ count: number }>;

/**
 * The return type for `upsert`.
 */
export type UpsertReturn<
  S extends Schema,
  M extends ModelShape,
  O extends UpsertOpts<S, M>,
> = Promise<ResultPayload<S, M, O>>;

/**
 * The return type for `upsertMany`.
 */
export type UpsertManyReturn<
  S extends Schema,
  M extends ModelShape,
  O extends UpsertOpts<S, M>,
> = Promise<ResultPayload<S, M, O>[]>;

/**
 * A model. This is different from a model definition; the definition is just the schema, the class provides the functionality.
 */
export class Model<S extends Schema, M extends ModelShape> {
  /**
   * Creates a new model. This is usually done by Kineo -- it is not recommended to create a model manually like this.
   * @param name The name of the model.
   * @param adapter The adapter.
   */
  constructor(
    protected $def: ModelDef<M>,
    protected $name: string,
    protected $adapter: Adapter<any, any>,
  ) {}

  protected async $exec(opts: any, op: string) {
    const tree = ir.emitToIR(this.$name, op, opts);
    const emitted = await this.$adapter.emit(tree);
    const result = await this.$adapter.exec(emitted);

    return result;
  }

  /**
   * Finds the first element matching a filter.
   * @param opts Query options.
   * @returns The first element that matches the filter, or `null` if not found.
   */
  async findFirst<O extends QueryOpts<S, M>>(
    opts: O,
  ): FindFirstReturn<S, M, O> {
    const { entries } = await this.$exec(opts, "findFirst");
    return (entries[0] ?? null) as any;
  }

  /**
   * Finds a list of elements matching a filter.
   * @param opts Query options.
   * @returns The elements that match the filter.
   */
  async findMany<O extends QueryOpts<S, M>>(opts: O): FindManyReturn<S, M, O> {
    const { entries } = await this.$exec(opts, "findMany");
    return entries as any;
  }

  /**
   * Counts the number of elements matching a filter.
   * @param opts Query options.
   * @returns The first element that matches the filter, or `null` if not found.
   */
  async count<O extends QueryOpts<S, M>>(opts: O): CountReturn {
    const { entryCount: rowCount } = await this.$exec(opts, "count");
    return rowCount;
  }

  /**
   * Creates an element.
   * @param opts Create options.
   * @returns The just created element.
   */
  async create<O extends CreateOpts<S, M>>(opts: O): CreateReturn<S, M, O> {
    const { entries } = await this.$exec(opts, "create");
    return (entries[0] ?? null) as any;
  }

  /**
   * Updates an element.
   * @param opts Update options.
   * @returns The element that was updated.
   */
  async update<O extends UpdateOpts<S, M>>(opts: O): UpdateReturn<S, M, O> {
    const { entries } = await this.$exec(opts, "update");
    return (entries[0] ?? null) as any;
  }

  /**
   * Updates multiple elements.
   * @param opts Update options.
   * @returns The amount of elements that were updated.
   */
  async updateMany<O extends UpdateOpts<S, M>>(opts: O): UpdateManyReturn {
    const { entries } = await this.$exec(opts, "updateMany");
    return entries as any;
  }

  /**
   * Deletes an element.
   * @param opts Delete options.
   * @returns The element that was deleted.
   */
  async delete<O extends DeleteOpts<S, M>>(opts: O): DeleteReturn<S, M, O> {
    const { entries } = await this.$exec(opts, "delete");
    return (entries[0] ?? null) as any;
  }

  /**
   * Deletes multiple elements.
   * @param opts Delete options.
   * @returns The amount of elements that were deleted.
   */
  async deleteMany<O extends DeleteOpts<S, M>>(opts: O): DeleteManyReturn {
    const { entries } = await this.$exec(opts, "deleteMany");
    return entries as any;
  }

  /**
   * Upserts (updates if it exists, creates otherwise) an element.
   * @param opts Upsert options.
   * @returns The element that was upserted.
   */
  async upsert<O extends UpsertOpts<S, M>>(opts: O): UpsertReturn<S, M, O> {
    const { entries } = await this.$exec(opts, "upsert");
    return (entries[0] ?? null) as any;
  }

  /**
   * Upserts (updates if it exists, creates otherwise) multiple elements.
   * @param opts Upsert options.
   * @returns The elements that were upserted.
   */
  async upsertMany<O extends UpsertOpts<S, M>>(
    opts: O,
  ): UpsertManyReturn<S, M, O> {
    const { entries } = await this.$exec(opts, "upsertMany");
    return entries as any;
  }
}
