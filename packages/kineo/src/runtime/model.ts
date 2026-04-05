import type { AsyncRuntimeAdapter, RuntimeAdapter } from "@/adapter";
import type {
  InferModel,
  ModelBuilder,
  ModelProps,
  ModelRelations,
  ParsedModel,
  ParsedSchema,
} from "@/schema";

type Scalar =
  | string
  | number
  | boolean
  | Date
  | ArrayBuffer
  | bigint
  | null
  | undefined;

type MaybeArray<T, Many extends boolean> = Many extends true ? T[] : T;

type Merge<T> = { [K in keyof T]: T[K] } & Record<string, never>;

type SelectValue<T> =
  T extends Array<infer U>
    ? boolean | { select?: Select<U>; include?: Include<U> }
    : T extends Scalar
      ? boolean
      : T extends object
        ? boolean | { select?: Select<T>; include?: Include<T> }
        : boolean;

type Select<T> = { [K in keyof T]?: SelectValue<T[K]> };
type Include<T> = { [K in keyof T]?: SelectValue<T[K]> };

type SelectResult<T, S> = Merge<{
  [K in keyof S & keyof T]: S[K] extends true
    ? T[K]
    : S[K] extends { select: infer SS }
      ? T[K] extends Array<infer U>
        ? Array<SelectResult<U, SS>>
        : SelectResult<T[K], SS>
      : S[K] extends { include: infer II }
        ? T[K] extends Array<infer U>
          ? Array<IncludeResult<U, II>>
          : IncludeResult<T[K], II>
        : never;
}>;

type IncludeResult<T, I> = Merge<{
  [K in keyof I & keyof T]: I[K] extends true
    ? T[K]
    : I[K] extends { select: infer SS }
      ? T[K] extends Array<infer U>
        ? Array<SelectResult<U, SS>>
        : SelectResult<T[K], SS>
      : I[K] extends { include: infer II }
        ? T[K] extends Array<infer U>
          ? Array<IncludeResult<U, II>>
          : IncludeResult<T[K], II>
        : never;
}>;

type SelectOrInclude<T> =
  | { select: Select<T>; include?: never }
  | { include: Include<T>; select?: never }
  | { select?: undefined; include?: undefined };

type MaybeSelectOrInclude<T, O> = O extends { select: infer S }
  ? SelectResult<T, S>
  : O extends { include: infer I }
    ? IncludeResult<T, I>
    : T;

type OrderByInput<T> = Partial<{
  [K in keyof T]: T[K] extends Array<infer U>
    ? SortOrder | OrderByInput<U>
    : T[K] extends object
      ? SortOrder | OrderByInput<T[K]>
      : SortOrder;
}>;

type SortOrder = "asc" | "desc";

type StringFilter = {
  equals?: string;
  in?: string[];
  not?: string | StringFilter;
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
};

type ComparableFilter<T> = {
  equals?: T;
  in?: T[];
  not?: T | ComparableFilter<T>;
  lt?: T;
  lte?: T;
  gt?: T;
  gte?: T;
};

type BooleanFilter = {
  equals?: boolean;
  not?: boolean | BooleanFilter;
};

type ArrayFilter<T> = {
  every?: WhereInput<T>;
  some?: WhereInput<T>;
  none?: WhereInput<T>;
};

type WhereInput<T> =
  T extends Array<infer U>
    ? ArrayFilter<U>
    : T extends string
      ? StringFilter | T
      : T extends number | bigint | Date
        ? ComparableFilter<T> | T
        : T extends boolean
          ? BooleanFilter | T
          : T extends object
            ? { [K in keyof T]?: WhereInput<T[K]> } & {
                AND?: WhereInput<T> | Array<WhereInput<T>>;
                OR?: Array<WhereInput<T>>;
                NOT?: WhereInput<T> | Array<WhereInput<T>>;
              }
            : T;

type CreateInput<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<CreateInput<U>>
    : T[K] extends object
      ? CreateInput<T[K]>
      : T[K];
};

type UpdateInput<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<UpdateInput<U>>
    : T[K] extends object
      ? UpdateInput<T[K]>
      : T[K];
};

type SelectIncludeArgs<T> = SelectOrInclude<T>;

type FindOpts<I, IO> = SelectIncludeArgs<I> & {
  where?: WhereInput<IO>;
  orderBy?: OrderByInput<IO>;
  cursor?: Partial<IO>;
  take?: number;
  skip?: number;
  distinct?: Array<keyof IO>;
};

type CreateOpts<I, IO, Many extends boolean = false> = SelectIncludeArgs<I> & {
  data: Many extends true ? Array<CreateInput<IO>> : CreateInput<IO>;
};

type CreateReturnOpts<I> = SelectIncludeArgs<I>;

type CreateReturnReturn<I, O, Many extends boolean = false> = MaybeArray<
  MaybeSelectOrInclude<I, O>,
  Many
>;

type UpdateOpts<I, IO, Many extends boolean = false> = SelectIncludeArgs<I> & {
  where?: WhereInput<IO>;
  data: Many extends true ? Array<UpdateInput<IO>> : UpdateInput<IO>;
};

type UpdateReturnOpts<I> = SelectIncludeArgs<I>;

type UpsertOpts<I, IO> = SelectIncludeArgs<I> & {
  where: WhereInput<IO>;
  create: CreateInput<IO>;
  update: UpdateInput<IO>;
};

type DeleteOpts<I, IO> = SelectIncludeArgs<I> & {
  where?: WhereInput<IO>;
};

type CountOpts<IO> = {
  where?: WhereInput<IO>;
  orderBy?: OrderByInput<IO>;
  cursor?: Partial<IO>;
  take?: number;
  skip?: number;
  distinct?: Array<keyof IO>;
};

type AggregateOpts<I, IO> = {
  where?: WhereInput<IO>;
  orderBy?: OrderByInput<IO>;
  cursor?: Partial<IO>;
  take?: number;
  skip?: number;
  distinct?: Array<keyof IO>;
  count?: boolean;
  avg?: Select<I>;
  sum?: Select<I>;
  min?: Select<I>;
  max?: Select<I>;
};

type GroupByOpts<I, IO> = {
  by: Array<keyof IO>;
  where?: WhereInput<IO>;
  orderBy?: OrderByInput<IO>;
  having?: WhereInput<IO>;
  take?: number;
  skip?: number;
  _count?: boolean | Select<I>;
  _min?: Select<I>;
  _max?: Select<I>;
};

type AggregateReturn<I, O> = Merge<
  (O extends { count: true } ? { count: number } : Record<string, never>) &
    (O extends { avg: infer A }
      ? { avg: A extends Select<I> ? SelectResult<I, A> : never }
      : Record<string, never>) &
    (O extends { sum: infer S }
      ? { sum: S extends Select<I> ? SelectResult<I, S> : never }
      : Record<string, never>) &
    (O extends { min: infer M }
      ? { min: M extends Select<I> ? SelectResult<I, M> : never }
      : Record<string, never>) &
    (O extends { max: infer X }
      ? { max: X extends Select<I> ? SelectResult<I, X> : never }
      : Record<string, never>)
>;

type GroupByAggregates<I, O> = Merge<
  (O extends { _count: true } ? { _count: number } : Record<string, never>) &
    (O extends { _min: infer M }
      ? { _min: M extends Select<I> ? SelectResult<I, M> : never }
      : Record<string, never>) &
    (O extends { _max: infer M }
      ? { _max: M extends Select<I> ? SelectResult<I, M> : never }
      : Record<string, never>)
>;

type GroupByReturn<I, IO, O> = O extends { by: Array<infer B> }
  ? Array<Pick<IO, Extract<B, keyof IO>> & GroupByAggregates<I, O>>
  : Array<IO>;

type FindReturn<I, O, Many extends boolean = false> = Many extends true
  ? MaybeArray<MaybeSelectOrInclude<I, O>, true>
  : MaybeSelectOrInclude<I, O> | null;

type CreateReturn<I, O, Many extends boolean = false> = MaybeArray<
  MaybeSelectOrInclude<I, O>,
  Many
>;

type UpdateReturn<I, O, Many extends boolean = false> = MaybeArray<
  MaybeSelectOrInclude<I, O>,
  Many
>;

type UpdateReturnReturn<I, O, Many extends boolean = false> = MaybeArray<
  MaybeSelectOrInclude<I, O>,
  Many
>;

type UpsertReturn<I, O, Many extends boolean = false> = MaybeArray<
  MaybeSelectOrInclude<I, O>,
  Many
>;

type DeleteReturn<I, O, Many extends boolean = false> = MaybeArray<
  MaybeSelectOrInclude<I, O>,
  Many
>;

type CountReturn = number;

export class Model<
  Props extends ModelProps,
  Relations extends ModelRelations,
  I = InferModel<ModelBuilder<Props, () => Relations>>,
  IO = InferModel<ModelBuilder<Props, () => Relations>, true>,
> {
  constructor(
    public $schema: ParsedSchema,
    public $shape: ParsedModel,
    public $name: string,
    public $adapter: RuntimeAdapter | AsyncRuntimeAdapter,
  ) {}

  public async find<O extends FindOpts<I, IO>>(
    opts?: O,
  ): Promise<FindReturn<I, O>> {
    return undefined as any;
  }

  public async findMany<O extends FindOpts<I, IO>>(
    opts?: O,
  ): Promise<FindReturn<I, O, true>> {
    return undefined as any;
  }

  public async create<O extends CreateOpts<I, IO>>(
    opts?: O,
  ): Promise<CreateReturn<I, O>> {
    return undefined as any;
  }

  public async createMany<O extends CreateOpts<I, IO, true>>(
    opts?: O,
  ): Promise<CreateReturn<I, O, true>> {
    return undefined as any;
  }

  public async createReturn<O extends CreateReturnOpts<I>>(
    opts?: O,
  ): Promise<CreateReturnReturn<I, O>> {
    return undefined as any;
  }

  public async createManyReturn<O extends CreateReturnOpts<I>>(
    opts?: O,
  ): Promise<CreateReturnReturn<I, O, true>> {
    return undefined as any;
  }

  public async update<O extends UpdateOpts<I, IO>>(
    opts?: O,
  ): Promise<UpdateReturn<I, O>> {
    return undefined as any;
  }

  public async updateMany<O extends UpdateOpts<I, IO, true>>(
    opts?: O,
  ): Promise<UpdateReturn<I, O, true>> {
    return undefined as any;
  }

  public async updateReturn<O extends UpdateReturnOpts<I>>(
    opts?: O,
  ): Promise<UpdateReturnReturn<I, O>> {
    return undefined as any;
  }

  public async updateManyReturn<O extends UpdateReturnOpts<I>>(
    opts?: O,
  ): Promise<UpdateReturnReturn<I, O, true>> {
    return undefined as any;
  }

  public async upsert<O extends UpsertOpts<I, IO>>(
    opts?: O,
  ): Promise<UpsertReturn<I, O>> {
    return undefined as any;
  }

  public async upsertMany<O extends UpsertOpts<I, IO>>(
    opts?: O,
  ): Promise<UpsertReturn<I, O, true>> {
    return undefined as any;
  }

  public async delete<O extends DeleteOpts<I, IO>>(
    opts?: O,
  ): Promise<DeleteReturn<I, O>> {
    return undefined as any;
  }

  public async deleteMany<O extends DeleteOpts<I, IO>>(
    opts?: O,
  ): Promise<DeleteReturn<I, O, true>> {
    return undefined as any;
  }

  public async count<O extends CountOpts<IO>>(opts?: O): Promise<CountReturn> {
    return undefined as any;
  }

  public async aggregate<O extends AggregateOpts<I, IO>>(
    opts?: O,
  ): Promise<AggregateReturn<I, O>> {
    return undefined as any;
  }

  public async groupBy<O extends GroupByOpts<I, IO>>(
    opts?: O,
  ): Promise<GroupByReturn<I, IO, O>> {
    return undefined as any;
  }
}
