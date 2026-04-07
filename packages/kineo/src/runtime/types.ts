// ============================================================================
// Utility Types
// ============================================================================

import type { Scalar } from "@/schema";

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type DeepRequired<T> = T extends object
  ? {
      [P in keyof T]-?: DeepRequired<T[P]>;
    }
  : T;

export type SelectionWithInclude<T> =
  | {
      select: FieldSelection<T>;
      include?: never;
    }
  | {
      select?: never;
      include: RelationInclusion<T>;
    }
  | {
      select?: never;
      include?: never;
    };

/**
 * DeepDive type - allows selecting specific fields
 */
export type FieldSelection<T> = Partial<{
  [K in keyof T as T[K] extends object ? never : K]: true;
}>;

/**
 * Relation inclusion - allows including related models
 */
export type RelationInclusion<T> = Prettify<
  Partial<
    {
      [K in keyof T as T[K] extends (infer U)[]
        ? U extends object
          ? K
          : never
        : T[K] extends object
          ? K
          : never]: T[K] extends (infer U)[]
        ? U extends object
          ? NestedQueryOptions<U> | true
          : never
        : T[K] extends object
          ? NestedQueryOptions<T[K]> | true
          : never;
    } & {
      _count?: {
        select?: Partial<{
          [K in keyof T as T[K] extends any[] ? K : never]: true;
        }>;
      };
    }
  >
>;

/**
 * Options for nested queries (where, orderBy, take, skip, etc.)
 */
export type NestedQueryOptions<T> = {
  where?: WhereInput<T>;
  orderBy?: OrderByInput<T> | OrderByInput<T>[];
  take?: number;
  skip?: number;
  cursor?: CursorInput<T>;
  include?: RelationInclusion<T>;
  select?: FieldSelection<T>;
};

/**
 * Field-level atomic operations (increment, decrement, multiply, divide, set)
 */
export type FieldUpdate<T> =
  | T
  | {
      set?: T;
      increment?: T extends number ? number : never;
      decrement?: T extends number ? number : never;
      multiply?: T extends number ? number : never;
      divide?: T extends number ? number : never;
      append?: T extends any[] ? T : never;
      prepend?: T extends any[] ? T : never;
    };

/**
 * Type-safe update data for a model
 */
export type UpdateData<T> = Prettify<{
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U extends object
      ? RelationUpdateMany<U>
      : FieldUpdate<T[K]>
    : T[K] extends object
      ? RelationUpdate<T[K]>
      : FieldUpdate<T[K]>;
}>;

/**
 * Type-safe creation data for a model - makes 'id' optional generically
 */
export type CreateData<T> = Prettify<
  {
    [K in keyof T]?: T[K] extends object
      ? never
      : T[K] extends any[]
        ? never
        : T[K];
  } & {
    [K in keyof T as T[K] extends object
      ? T[K] extends (infer U)[]
        ? U extends object
          ? K
          : never
        : T[K] extends object | null | undefined
          ? K
          : never
      : never]?: T[K] extends (infer U)[]
      ? U extends object
        ? RelationCreateMany<U>
        : never
      : T[K] extends object
        ? RelationCreate<T[K]>
        : never;
  }
>;

/**
 * Where input for filtering - supports nested filtering, logical operators
 */
export type WhereInput<T> = Prettify<
  Partial<
    {
      [K in keyof T]: T[K] extends any[]
        ? ArrayFilterCondition<T[K]>
        : T[K] extends string | (string | undefined)
          ? StringFilterCondition
          : T[K] extends number | (number | undefined)
            ? NumberFilterCondition
            : T[K] extends boolean | (boolean | undefined)
              ? BooleanFilterCondition
              : T[K] extends Date | (Date | undefined)
                ? DateFilterCondition
                : T[K] extends object
                  ? WhereInput<T[K]>
                  : FilterCondition<T[K]>;
    } & {
      AND?: WhereInput<T> | WhereInput<T>[];
      OR?: WhereInput<T> | WhereInput<T>[];
      NOT?: WhereInput<T> | WhereInput<T>[];
    }
  >
>;

/**
 * Filter conditions for different types
 */
export type FilterCondition<T> = T | { equals?: T; not?: T };

export type StringFilterCondition =
  | string
  | {
      equals?: string;
      not?: string;
      in?: string[];
      notIn?: string[];
      lt?: string;
      lte?: string;
      gt?: string;
      gte?: string;
      contains?: string;
      startsWith?: string;
      endsWith?: string;
      mode?: "insensitive";
    };

export type NumberFilterCondition =
  | number
  | {
      equals?: number;
      not?: number;
      in?: number[];
      notIn?: number[];
      lt?: number;
      lte?: number;
      gt?: number;
      gte?: number;
    };

export type BooleanFilterCondition =
  | boolean
  | {
      equals?: boolean;
      not?: boolean;
    };

export type DateFilterCondition =
  | Date
  | {
      equals?: Date;
      not?: Date;
      in?: Date[];
      notIn?: Date[];
      lt?: Date;
      lte?: Date;
      gt?: Date;
      gte?: Date;
    };

export type ArrayFilterCondition<T extends any[]> =
  | {
      every?: WhereInput<T[number]>;
    }
  | {
      some?: WhereInput<T[number]>;
    }
  | {
      none?: WhereInput<T[number]>;
    }
  | {
      is?: WhereInput<T[number]>;
    }
  | {
      isNot?: WhereInput<T[number]>;
    };

/**
 * Order by input - can order by fields or nested relations
 */
export type OrderByInput<T> = Prettify<
  Partial<
    {
      [K in keyof T]: T[K] extends (infer U)[]
        ? U extends Scalar
          ? "asc" | "desc"
          : OrderByRelation<U>
        : NonNullable<T[K]> extends Scalar
          ? "asc" | "desc"
          : OrderByRelation<NonNullable<T[K]>>;
    } & {
      _relevance?: {
        fields: (keyof T)[];
        search: string;
        sort: "asc" | "desc";
      };
      _count?: "asc" | "desc";
    }
  >
>;

export type OrderByRelation<T> = {
  _count?: "asc" | "desc";
} & Partial<{
  [K in keyof T]: T[K] extends object ? never : "asc" | "desc";
}>;

/**
 * Cursor-based pagination
 */
export type CursorInput<T> = Partial<T>;

/**
 * Relation operations for updates (connect, disconnect, create, update, upsert, set, etc.)
 */
export type RelationUpdate<T> =
  | {
      connect?: CursorInput<T>;
    }
  | {
      disconnect?: CursorInput<T>;
    }
  | {
      create?: CreateData<T>;
    }
  | {
      update?: UpdateData<T>;
    }
  | {
      upsert?: {
        where: CursorInput<T>;
        create: CreateData<T>;
        update: UpdateData<T>;
      };
    };

export type RelationUpdateMany<T> =
  | {
      connect?: CursorInput<T>[];
    }
  | {
      disconnect?: CursorInput<T>[];
    }
  | {
      create?: CreateData<T>[];
    }
  | {
      update?: {
        where: CursorInput<T>;
        data: UpdateData<T>;
      }[];
    }
  | {
      updateMany?: {
        where: WhereInput<T>;
        data: UpdateData<T>;
      };
    }
  | {
      upsert?: {
        where: CursorInput<T>;
        create: CreateData<T>;
        update: UpdateData<T>;
      }[];
    }
  | {
      set?: CursorInput<T>[];
    }
  | {
      connectOrCreate?: {
        where: CursorInput<T>;
        create: CreateData<T>;
      }[];
    }
  | {
      deleteMany?: WhereInput<T>;
    }
  | {
      delete?: CursorInput<T>[];
    };

export type RelationCreate<T> =
  | {
      connect: CursorInput<T>;
    }
  | {
      connectOrCreate?: {
        where: CursorInput<T>;
        create: CreateData<T>;
      };
    }
  | {
      create: CreateData<T>;
    };

export type RelationCreateMany<T> =
  | {
      connect?: CursorInput<T>[];
    }
  | {
      connectOrCreate?:
        | {
            where: CursorInput<T>;
            create: CreateData<T>;
          }
        | {
            where: CursorInput<T>;
            create: CreateData<T>;
          }[];
    }
  | {
      create?: CreateData<T>[];
    }
  | {
      set?: CursorInput<T>[];
    };

// ============================================================================
// Method Options Types
// ============================================================================

/**
 * Options for find (single result) - matching Prisma's findUnique/findFirst structure
 */
export type FindOpts<T, IO = T> = {
  where?: WhereInput<IO>;
  select?: FieldSelection<T>;
  include?: RelationInclusion<T>;
  orderBy?: OrderByInput<IO> | OrderByInput<IO>[];
  take?: number;
  skip?: number;
  cursor?: CursorInput<IO>;
  distinct?: (keyof T)[];
  rejectOnNotFound?: boolean;
};

/**
 * Return type for find
 */
export type FindReturn<
  T,
  O extends FindOpts<T, any>,
  Many extends boolean = false,
> = Many extends true
  ? T[]
  : O extends { include: any } | { select: any }
    ? ApplySelection<T, O>
    : T;

/**
 * Apply include/select to result type
 */
export type ApplySelection<
  T,
  O extends { include?: any; select?: any },
> = O extends { include: infer I }
  ? T & ApplyInclusion<T, I>
  : O extends { select: infer S }
    ? ApplySelectiveFields<T, S>
    : T;

export type ApplyInclusion<T, I> = Prettify<
  I extends { [K in string]: true }
    ? {
        [K in keyof I & keyof T as I[K] extends true ? K : never]: T[K];
      }
    : I extends { [K in string]: any }
      ? {
          [K in keyof I & keyof T]: T[K] extends (infer U)[]
            ? U extends object
              ? (ApplySelection<U, I[K]> & {
                  _count?: { [key: string]: number };
                })[]
              : T[K]
            : T[K] extends object
              ? ApplySelection<T[K], I[K]>
              : T[K];
        }
      : object
>;

export type ApplySelectiveFields<T, S> = Prettify<{
  [K in keyof S & keyof T as S[K] extends true ? K : never]: T[K];
}>;

/**
 * Options for create (single)
 */
export type CreateOpts<
  T,
  IO = T,
  Many extends boolean = false,
> = Many extends true
  ? {
      data: CreateData<IO>[];
      include?: RelationInclusion<T>;
      select?: FieldSelection<T>;
    }
  : {
      data: CreateData<IO>;
      include?: RelationInclusion<T>;
      select?: FieldSelection<T>;
    };

/**
 * Return type for create
 */
export type CreateReturn<
  T,
  O extends CreateOpts<T, any, any>,
  Many extends boolean = false,
> = Many extends true
  ? T[]
  : O extends { include: any } | { select: any }
    ? ApplySelection<T, O>
    : T;

/**
 * Options for createReturn (returning specific fields)
 */
export type CreateReturnOpts<T> = {
  data: CreateData<T>[] | CreateData<T>;
  select?: FieldSelection<T>;
};

/**
 * Return type for createReturn
 */
export type CreateReturnReturn<
  T,
  Many extends boolean = false,
> = Many extends true ? T[] : T;

/**
 * Options for update
 */
export type UpdateOpts<
  T,
  IO = T,
  Many extends boolean = false,
> = Many extends true
  ? {
      where: WhereInput<IO>;
      data: UpdateData<IO>;
      include?: RelationInclusion<T>;
      select?: FieldSelection<T>;
    }
  : {
      where: WhereInput<IO>;
      data: UpdateData<IO>;
      include?: RelationInclusion<T>;
      select?: FieldSelection<T>;
    };

/**
 * Return type for update
 */
export type UpdateReturn<
  T,
  O extends UpdateOpts<T, any, any>,
  Many extends boolean = false,
> = Many extends true
  ? T[]
  : O extends { include: any } | { select: any }
    ? ApplySelection<T, O>
    : T;

/**
 * Options for updateReturn
 */
export type UpdateReturnOpts<T, IO = T> = {
  where: WhereInput<IO>;
  data: UpdateData<T>;
  select?: FieldSelection<T>;
};

/**
 * Return type for updateReturn
 */
export type UpdateReturnReturn<
  T,
  Many extends boolean = false,
> = Many extends true ? T[] : T;

/**
 * Options for upsert
 */
export type UpsertOpts<
  T,
  IO = T,
  Many extends boolean = false,
> = Many extends true
  ? {
      where: WhereInput<IO>[];
      create: CreateData<IO>[];
      update: UpdateData<IO>;
      include?: RelationInclusion<T>;
      select?: FieldSelection<T>;
    }
  : {
      where: WhereInput<IO>;
      create: CreateData<IO>;
      update: UpdateData<IO>;
      include?: RelationInclusion<T>;
      select?: FieldSelection<T>;
    };

/**
 * Return type for upsert
 */
export type UpsertReturn<
  T,
  O extends UpsertOpts<T, any, any>,
  Many extends boolean = false,
> = Many extends true
  ? T[]
  : O extends { include: any } | { select: any }
    ? ApplySelection<T, O>
    : T;

/**
 * Options for delete
 */
export type DeleteOpts<
  T,
  IO = T,
  Many extends boolean = false,
> = Many extends true
  ? {
      where: WhereInput<IO>;
      include?: RelationInclusion<T>;
      select?: FieldSelection<T>;
    }
  : {
      where: WhereInput<IO>;
      include?: RelationInclusion<T>;
      select?: FieldSelection<T>;
    };

/**
 * Return type for delete
 */
export type DeleteReturn<
  T,
  O extends DeleteOpts<T, any, any>,
  Many extends boolean = false,
> = Many extends true
  ? T[]
  : O extends { include: any } | { select: any }
    ? ApplySelection<T, O>
    : T;

/**
 * Options for count
 */
export type CountOpts<T, IO = T> = {
  where?: WhereInput<IO>;
  orderBy?: OrderByInput<IO> | OrderByInput<IO>[];
  take?: number;
  skip?: number;
  cursor?: CursorInput<IO>;
  select?: Partial<{
    [K in keyof T as T[K] extends any[] ? K : never]: true;
  }>;
};

/**
 * Return type for count
 */
export type CountReturn = number;

/**
 * Options for aggregate - supports min, max, sum, avg, count
 */
export type AggregateOpts<T, IO = T> = {
  where?: WhereInput<IO>;
  by?: (keyof T)[];
  orderBy?: OrderByInput<IO> | OrderByInput<IO>[];
  take?: number;
  skip?: number;
  cursor?: CursorInput<IO>;
  _count?:
    | boolean
    | {
        select?: Partial<{
          [K in keyof T]: true;
        }>;
      };
  _min?: {
    select?: Partial<{
      [K in keyof T as T[K] extends string | number | Date | null | undefined
        ? string extends T[K]
          ? never
          : K
        : never]: true;
    }>;
  };
  _max?: {
    select?: Partial<{
      [K in keyof T as T[K] extends string | number | Date | null | undefined
        ? string extends T[K]
          ? never
          : K
        : never]: true;
    }>;
  };
  _avg?: {
    select?: Partial<{
      [K in keyof T as T[K] extends number | null | undefined
        ? number extends T[K]
          ? K
          : never
        : never]: true;
    }>;
  };
  _sum?: {
    select?: Partial<{
      [K in keyof T as T[K] extends number | null | undefined
        ? number extends T[K]
          ? K
          : never
        : never]: true;
    }>;
  };
};

/**
 * Return type for aggregate
 */
export type AggregateReturn<T, O extends AggregateOpts<T, any>> = Prettify<{
  _count?: O extends { _count: true }
    ? number
    : O extends { _count: { select: any } }
      ? { [K in keyof O["_count"]["select"]]: number }
      : undefined;
  _min?: O extends { _min: any }
    ? {
        [K in keyof O["_min"]["select"]]: T[K] extends string | number | Date
          ? T[K] | null
          : never;
      }
    : undefined;
  _max?: O extends { _max: any }
    ? {
        [K in keyof O["_max"]["select"]]: T[K] extends string | number | Date
          ? T[K] | null
          : never;
      }
    : undefined;
  _avg?: O extends { _avg: any }
    ? {
        [K in keyof O["_avg"]["select"]]: T[K] extends number
          ? number | null
          : never;
      }
    : undefined;
  _sum?: O extends { _sum: any }
    ? {
        [K in keyof O["_sum"]["select"]]: T[K] extends number ? number : never;
      }
    : undefined;
}>;

/**
 * Options for groupBy
 */
export type GroupByOpts<T, IO = T> = {
  by: (keyof T)[];
  where?: WhereInput<IO>;
  orderBy?: OrderByInput<IO>;
  having?: {
    _count?: number | { gt?: number; gte?: number; lt?: number; lte?: number };
  } & {
    [K in keyof T as NonNullable<T[K]> extends string | number | Date
      ? K
      : never]?:
      | T[K]
      | {
          lt?: T[K];
          lte?: T[K];
          gt?: T[K];
          gte?: T[K];
        };
  };
  take?: number;
  skip?: number;
};

/**
 * Return type for groupBy
 */
export type GroupByReturn<
  T,
  IO = T,
  O extends GroupByOpts<T, IO> = GroupByOpts<T, IO>,
> = Array<
  Prettify<
    {
      [K in O["by"][number]]: T[K];
    } & {
      _count?: number;
    }
  >
>;
