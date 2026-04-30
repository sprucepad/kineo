// ============================================================================
// Utility Types
// ============================================================================

import type { Scalar } from "@/schema";

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type MaybeNull<V, T> = null extends V ? T | null : T;

type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

export type RelationCountMap<T> = {
  [K in keyof T as T[K] extends readonly (infer U)[]
    ? U extends object
      ? K
      : never
    : never]: number;
};

export type ScalarListFilter<T> =
  | T[]
  | {
      equals?: T[] | null;
      has?: T;
      hasEvery?: T[];
      hasSome?: T[];
      isEmpty?: boolean;
    };

export type ListRelationFilter<T> = {
  every?: WhereInput<T>;
  some?: WhereInput<T>;
  none?: WhereInput<T>;
};

export type SingularRelationFilter<T> = {
  is?: WhereInput<T> | null;
  isNot?: WhereInput<T> | null;
};

type RelationSelectionValue<V> = V extends readonly (infer U)[]
  ? U extends object
    ? true | NestedListQueryOptions<U, U, U, U>
    : true
  : NonNullable<V> extends object
    ?
        | true
        | NestedSingleQueryOptions<
            NonNullable<V>,
            NonNullable<V>,
            NonNullable<V>,
            NonNullable<V>
          >
    : true;

type RelationInclusionValue<V> = V extends readonly (infer U)[]
  ? U extends object
    ? true | NestedListQueryOptions<U, U, U, U>
    : never
  : NonNullable<V> extends object
    ?
        | true
        | NestedSingleQueryOptions<
            NonNullable<V>,
            NonNullable<V>,
            NonNullable<V>,
            NonNullable<V>
          >
    : never;

/**
 * Field selection - supports scalar fields and nested relation selections
 */
export type FieldSelection<Props, Rels = never> = Prettify<
  Partial<{
    [K in keyof Props]: K extends keyof Rels
      ? RelationSelectionValue<Rels[K]>
      : true;
  }>
>;

/**
 * Relation inclusion - allows including related models
 * Each relation's nested options should accept the full combined model type
 */
export type RelationInclusion<Rels> = Prettify<
  Partial<
    {
      [K in keyof Rels]: RelationInclusionValue<Rels[K]>;
    } & {
      _count?:
        | true
        | {
            select?: Partial<{
              [K in keyof Rels as Rels[K] extends any[] ? K : never]: true;
            }>;
          };
    }
  >
>;

export type NestedListQueryOptions<Props, PropsOpt, Rels, RelsOpt> = {
  where?: WhereInput<PropsOpt & RelsOpt>;
  orderBy?:
    | OrderByInput<PropsOpt & RelsOpt>
    | OrderByInput<PropsOpt & RelsOpt>[];
  take?: number;
  skip?: number;
  cursor?: CursorInput<PropsOpt>;
  include?: RelationInclusion<Rels>;
  select?: FieldSelection<Props, Rels>;
};

export type NestedSingleQueryOptions<Props, PropsOpt, Rels, RelsOpt> = {
  include?: RelationInclusion<Rels>;
  select?: FieldSelection<Props, Rels>;
};

/**
 * Options for nested queries (where, orderBy, take, skip, etc.)
 */

export type NestedQueryOptions<Props, PropsOpt, Rels, RelsOpt> =
  | NestedListQueryOptions<Props, PropsOpt, Rels, RelsOpt>
  | NestedSingleQueryOptions<Props, PropsOpt, Rels, RelsOpt>;

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
  [K in keyof T]?: T[K] extends readonly (infer U)[]
    ? U extends object
      ? RelationUpdateMany<U>
      : FieldUpdate<T[K]>
    : T[K] extends Date
      ? FieldUpdate<T[K]>
      : T[K] extends object
        ? RelationUpdate<T[K]>
        : FieldUpdate<T[K]>;
}>;

/**
 * Type-safe creation data for a model - makes 'id' optional generically
 */
export type CreateData<T> = Prettify<
  {
    [K in keyof T]?: T[K] extends readonly (infer U)[]
      ? U extends object
        ? never
        : T[K]
      : T[K] extends Date
        ? T[K]
        : T[K] extends object
          ? never
          : T[K];
  } & {
    [K in keyof T as T[K] extends readonly (infer U)[]
      ? U extends object
        ? K
        : never
      : T[K] extends Date
        ? never
        : T[K] extends object
          ? K
          : never]?: T[K] extends readonly (infer U)[]
      ? U extends object
        ? RelationCreateMany<U>
        : never
      : T[K] extends object
        ? RelationCreate<T[K]>
        : never;
  }
>;

type WhereValue<V> = V extends readonly (infer U)[]
  ? U extends object
    ? ListRelationFilter<U>
    : ScalarListFilter<U>
  : NonNullable<V> extends string
    ? StringFilterCondition
    : NonNullable<V> extends number
      ? NumberFilterCondition
      : NonNullable<V> extends boolean
        ? BooleanFilterCondition
        : NonNullable<V> extends Date
          ? DateFilterCondition
          : NonNullable<V> extends object
            ? SingularRelationFilter<NonNullable<V>>
            : FilterCondition<V>;

/**
 * Where input for filtering - supports nested filtering, logical operators for both properties and relations
 */
export type WhereInput<T> = Prettify<
  Partial<
    {
      [K in keyof T]: WhereValue<T[K]>;
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
export type FilterCondition<T> =
  | T
  | { equals?: T; not?: T | FilterCondition<T> };

export type StringFilterCondition =
  | string
  | {
      equals?: string;
      not?: StringFilterCondition;
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
      not?: NumberFilterCondition;
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
      not?: BooleanFilterCondition;
    };

export type DateFilterCondition =
  | Date
  | {
      equals?: Date;
      not?: DateFilterCondition;
      in?: Date[];
      notIn?: Date[];
      lt?: Date;
      lte?: Date;
      gt?: Date;
      gte?: Date;
    };

export type ArrayFilterCondition<T extends any[]> = T[number] extends object
  ? ListRelationFilter<T[number]>
  : ScalarListFilter<T[number]>;

type OrderByValue<V> = V extends readonly (infer U)[]
  ? U extends object
    ? OrderByRelation<U> | { _count?: "asc" | "desc" }
    : "asc" | "desc"
  : NonNullable<V> extends object
    ? OrderByRelation<NonNullable<V>>
    : "asc" | "desc";

/**
 * Order by input - can order by fields or nested relations
 */
export type OrderByInput<T> = Prettify<
  Partial<
    {
      [K in keyof T]: OrderByValue<T[K]>;
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

export type OrderByRelation<T> = Prettify<
  Partial<
    {
      [K in keyof T]: OrderByValue<T[K]>;
    } & {
      _count?: "asc" | "desc";
    }
  >
>;

/**
 * Cursor-based pagination
 */
export type CursorInput<T> = Partial<T>;

/**
 * Applies nested select/include logic recursively
 */
export type ApplySelection<
  T,
  O extends { include?: any; select?: any },
> = Prettify<
  (O extends { select: infer S } ? ApplySelectiveFields<T, S> : T) &
    (O extends { include: infer I } ? ApplyInclusion<T, I> : {})
>;

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
export type FindOpts<Props, PropsOpt, Rels, RelsOpt> = {
  where?: WhereInput<PropsOpt & RelsOpt>;
  select?: FieldSelection<Props & Rels, Rels>;
  include?: RelationInclusion<Rels>;
  orderBy?:
    | OrderByInput<PropsOpt & RelsOpt>
    | OrderByInput<PropsOpt & RelsOpt>[];
  take?: number;
  skip?: number;
  cursor?: CursorInput<PropsOpt>;
  distinct?: (keyof Props)[];
  rejectOnNotFound?: boolean;
};

/**
 * Return type for find
 */
export type FindReturn<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends FindOpts<Props, PropsOpt, Rels, RelsOpt>,
  Many extends boolean = false,
> = Many extends true
  ? FindReturnSingle<Props, PropsOpt, Rels, RelsOpt, O>[]
  : FindReturnSingle<Props, PropsOpt, Rels, RelsOpt, O>;

export type FindReturnSingle<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends FindOpts<Props, PropsOpt, Rels, RelsOpt>,
> = ApplySelection<Props & Rels, O>;

/**
 * Apply inclusion to result type
 */
export type ApplyInclusion<T, I> = Prettify<
  I extends object
    ? {
        [K in keyof I & keyof T as K extends "_count"
          ? never
          : K]: I[K] extends true
          ? T[K]
          : I[K] extends { include?: any; select?: any }
            ? T[K] extends readonly (infer U)[]
              ? U extends object
                ? ApplySelection<U, I[K]>[]
                : T[K]
              : T[K] extends object
                ? MaybeNull<T[K], ApplySelection<NonNullable<T[K]>, I[K]>>
                : T[K]
            : T[K];
      } & (I extends { _count: infer C }
        ? {
            _count: C extends true
              ? {
                  [K in keyof T as T[K] extends readonly (infer U)[]
                    ? U extends object
                      ? K
                      : never
                    : never]: number;
                }
              : C extends { select: infer S }
                ? {
                    [K in keyof S & keyof T as T[K] extends readonly (infer U)[]
                      ? U extends object
                        ? K
                        : never
                      : never]: number;
                  }
                : never;
          }
        : {})
    : {}
>;

export type DefaultSelection<Props> = Props;

/**
 * Applies select recursively, including relation selects
 */

export type ApplySelectiveFields<Props, S> = Prettify<{
  [K in keyof S & keyof Props as S[K] extends true | object
    ? K
    : never]: S[K] extends true
    ? Props[K]
    : S[K] extends { include?: any; select?: any }
      ? Props[K] extends readonly (infer U)[]
        ? U extends object
          ? ApplySelection<U, S[K]>[]
          : Props[K]
        : Props[K] extends object
          ? MaybeNull<Props[K], ApplySelection<NonNullable<Props[K]>, S[K]>>
          : Props[K]
      : Props[K];
}>;

/**
 * Options for create (single)
 */
export type CreateOpts<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  Many extends boolean = false,
> = Many extends true
  ? {
      data: CreateData<PropsOpt & RelsOpt>[];
      include?: RelationInclusion<Rels>;
      select?: FieldSelection<Props & Rels, Rels>;
    }
  : {
      data: CreateData<PropsOpt & RelsOpt>;
      include?: RelationInclusion<Rels>;
      select?: FieldSelection<Props & Rels, Rels>;
    };

/**
 * Return type for create
 */
export type CreateReturn<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends CreateOpts<Props, PropsOpt, Rels, RelsOpt, any>,
  Many extends boolean = false,
> = Many extends true
  ? CreateReturnSingle<Props, PropsOpt, Rels, RelsOpt, O>[]
  : CreateReturnSingle<Props, PropsOpt, Rels, RelsOpt, O>;

export type CreateReturnSingle<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends CreateOpts<Props, PropsOpt, Rels, RelsOpt, any>,
> = ApplySelection<Props & Rels, O>;

/**
 * Options for createReturn (returning specific fields)
 */
export type CreateReturnOpts<Props, PropsOpt, Rels, RelsOpt> = {
  data: CreateData<PropsOpt & RelsOpt>[] | CreateData<PropsOpt & RelsOpt>;
  select?: FieldSelection<Props & Rels, Rels>;
  include?: RelationInclusion<Rels>;
};

/**
 * Return type for createReturn
 */
export type CreateReturnReturn<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends CreateReturnOpts<Props, PropsOpt, Rels, RelsOpt>,
  Many extends boolean = false,
> = Many extends true
  ? ApplySelection<Props & Rels, O>[]
  : ApplySelection<Props & Rels, O>;

/**
 * Options for update
 */
export type UpdateOpts<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  Many extends boolean = false,
> = Many extends true
  ? {
      where: WhereInput<PropsOpt & RelsOpt>;
      data: UpdateData<PropsOpt & RelsOpt>;
      include?: RelationInclusion<Rels>;
      select?: FieldSelection<Props & Rels, Rels>;
    }
  : {
      where: WhereInput<PropsOpt & RelsOpt>;
      data: UpdateData<PropsOpt & RelsOpt>;
      include?: RelationInclusion<Rels>;
      select?: FieldSelection<Props & Rels, Rels>;
    };

/**
 * Return type for update
 */
export type UpdateReturn<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends UpdateOpts<Props, PropsOpt, Rels, RelsOpt, any>,
  Many extends boolean = false,
> = Many extends true
  ? UpdateReturnSingle<Props, PropsOpt, Rels, RelsOpt, O>[]
  : UpdateReturnSingle<Props, PropsOpt, Rels, RelsOpt, O>;

export type UpdateReturnSingle<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends UpdateOpts<Props, PropsOpt, Rels, RelsOpt, any>,
> = ApplySelection<Props & Rels, O>;

/**
 * Options for updateReturn
 */
export type UpdateReturnOpts<Props, PropsOpt, Rels, RelsOpt> = {
  where: WhereInput<PropsOpt & RelsOpt>;
  data: UpdateData<PropsOpt & RelsOpt>;
  select?: FieldSelection<Props & Rels, Rels>;
  include?: RelationInclusion<Rels>;
};

/**
 * Return type for updateReturn
 */
export type UpdateReturnReturn<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends UpdateReturnOpts<Props, PropsOpt, Rels, RelsOpt>,
  Many extends boolean = false,
> = Many extends true
  ? ApplySelection<Props & Rels, O>[]
  : ApplySelection<Props & Rels, O>;

/**
 * Options for upsert
 */
export type UpsertOpts<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  Many extends boolean = false,
> = Many extends true
  ? {
      where: WhereInput<PropsOpt & RelsOpt>[];
      create: CreateData<PropsOpt & RelsOpt>[];
      update: UpdateData<PropsOpt & RelsOpt>;
      include?: RelationInclusion<Rels>;
      select?: FieldSelection<Props & Rels, Rels>;
    }
  : {
      where: WhereInput<PropsOpt & RelsOpt>;
      create: CreateData<PropsOpt & RelsOpt>;
      update: UpdateData<PropsOpt & RelsOpt>;
      include?: RelationInclusion<Rels>;
      select?: FieldSelection<Props & Rels, Rels>;
    };

/**
 * Return type for upsert
 */
export type UpsertReturn<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends UpsertOpts<Props, PropsOpt, Rels, RelsOpt, any>,
  Many extends boolean = false,
> = Many extends true
  ? UpsertReturnSingle<Props, PropsOpt, Rels, RelsOpt, O>[]
  : UpsertReturnSingle<Props, PropsOpt, Rels, RelsOpt, O>;

export type UpsertReturnSingle<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends UpsertOpts<Props, PropsOpt, Rels, RelsOpt, any>,
> = ApplySelection<Props & Rels, O>;

/**
 * Options for delete
 */

export type DeleteOpts<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  Many extends boolean = false,
> = Many extends true
  ? {
      where: WhereInput<PropsOpt & RelsOpt>;
      include?: RelationInclusion<Rels>;
      select?: FieldSelection<Props & Rels, Rels>;
    }
  : {
      where: WhereInput<PropsOpt & RelsOpt>;
      include?: RelationInclusion<Rels>;
      select?: FieldSelection<Props & Rels, Rels>;
    };

/**
 * Return type for delete
 */
export type DeleteReturn<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends DeleteOpts<Props, PropsOpt, Rels, RelsOpt, any>,
  Many extends boolean = false,
> = Many extends true
  ? DeleteReturnSingle<Props, PropsOpt, Rels, RelsOpt, O>[]
  : DeleteReturnSingle<Props, PropsOpt, Rels, RelsOpt, O>;

export type DeleteReturnSingle<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends DeleteOpts<Props, PropsOpt, Rels, RelsOpt, any>,
> = ApplySelection<Props & Rels, O>;

/**
 * Options for count
 */
export type CountOpts<Props, PropsOpt, Rels, RelsOpt> = {
  where?: WhereInput<PropsOpt & RelsOpt>;
  orderBy?:
    | OrderByInput<PropsOpt & RelsOpt>
    | OrderByInput<PropsOpt & RelsOpt>[];
  take?: number;
  skip?: number;
  cursor?: CursorInput<PropsOpt>;
  select?: Partial<{
    [K in keyof Rels as Rels[K] extends any[] ? K : never]: true;
  }>;
};

/**
 * Return type for count
 */
export type CountReturn = number;

/**
 * Options for aggregate - supports min, max, sum, avg, count
 */
export type AggregateOpts<Props, PropsOpt, Rels, RelsOpt> = {
  where?: WhereInput<PropsOpt & RelsOpt>;
  by?: (keyof Props)[];
  orderBy?:
    | OrderByInput<PropsOpt & RelsOpt>
    | OrderByInput<PropsOpt & RelsOpt>[];
  take?: number;
  skip?: number;
  cursor?: CursorInput<PropsOpt>;
  _count?:
    | boolean
    | {
        select?: Partial<{
          [K in keyof Props | keyof Rels]: true;
        }>;
      };
  _min?: {
    select?: Partial<{
      [K in keyof Props as Props[K] extends
        | string
        | number
        | Date
        | null
        | undefined
        ? string extends Props[K]
          ? never
          : K
        : never]: true;
    }>;
  };
  _max?: {
    select?: Partial<{
      [K in keyof Props as Props[K] extends
        | string
        | number
        | Date
        | null
        | undefined
        ? string extends Props[K]
          ? never
          : K
        : never]: true;
    }>;
  };
  _avg?: {
    select?: Partial<{
      [K in keyof Props as Props[K] extends number | null | undefined
        ? number extends Props[K]
          ? K
          : never
        : never]: true;
    }>;
  };
  _sum?: {
    select?: Partial<{
      [K in keyof Props as Props[K] extends number | null | undefined
        ? number extends Props[K]
          ? K
          : never
        : never]: true;
    }>;
  };
};

/**
 * Return type for aggregate
 */
export type AggregateReturn<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends AggregateOpts<Props, PropsOpt, Rels, RelsOpt>,
> = Prettify<{
  _count?: O extends { _count: true }
    ? number
    : O extends { _count: { select: any } }
      ? { [K in keyof O["_count"]["select"]]: number }
      : undefined;
  _min?: O extends { _min: any }
    ? {
        [K in keyof O["_min"]["select"]]: Props[K] extends
          | string
          | number
          | Date
          ? Props[K] | null
          : never;
      }
    : undefined;
  _max?: O extends { _max: any }
    ? {
        [K in keyof O["_max"]["select"]]: Props[K] extends
          | string
          | number
          | Date
          ? Props[K] | null
          : never;
      }
    : undefined;
  _avg?: O extends { _avg: any }
    ? {
        [K in keyof O["_avg"]["select"]]: Props[K] extends number
          ? number | null
          : never;
      }
    : undefined;
  _sum?: O extends { _sum: any }
    ? {
        [K in keyof O["_sum"]["select"]]: Props[K] extends number
          ? number
          : never;
      }
    : undefined;
}>;

/**
 * Options for groupBy
 */
export type GroupByOpts<Props, PropsOpt, Rels, RelsOpt> = {
  by: (keyof Props)[];
  where?: WhereInput<PropsOpt & RelsOpt>;
  orderBy?: OrderByInput<PropsOpt & RelsOpt>;
  having?: {
    _count?: number | { gt?: number; gte?: number; lt?: number; lte?: number };
  } & {
    [K in keyof Props as NonNullable<Props[K]> extends string | number | Date
      ? K
      : never]?:
      | Props[K]
      | {
          lt?: Props[K];
          lte?: Props[K];
          gt?: Props[K];
          gte?: Props[K];
        };
  };
  take?: number;
  skip?: number;
};

/**
 * Return type for groupBy
 */
export type GroupByReturn<
  Props,
  PropsOpt,
  Rels,
  RelsOpt,
  O extends GroupByOpts<Props, PropsOpt, Rels, RelsOpt> = GroupByOpts<
    Props,
    PropsOpt,
    Rels,
    RelsOpt
  >,
> = Array<
  Prettify<
    {
      [K in O["by"][number]]: Props[K];
    } & {
      _count?: number;
    }
  >
>;
