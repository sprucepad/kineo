import type { AsyncRuntimeAdapter, RuntimeAdapter } from "@/adapter";
import type {
  InferProps,
  InferRelations,
  ModelBuilder,
  ModelRelationsFn,
  ParsedModel,
  ParsedSchema,
} from "@/schema";
import type {
  AggregateOpts,
  AggregateReturn,
  CountOpts,
  CountReturn,
  CreateOpts,
  CreateReturn,
  CreateReturnOpts,
  CreateReturnReturn,
  DeleteOpts,
  DeleteReturn,
  FindOpts,
  FindReturn,
  GroupByOpts,
  GroupByReturn,
  UpdateOpts,
  UpdateReturn,
  UpdateReturnOpts,
  UpdateReturnReturn,
  UpsertOpts,
  UpsertReturn,
} from "./types";

export type BuilderProps<Builder extends ModelBuilder<any, any>> =
  Builder extends ModelBuilder<infer Props, any> ? Props : never;
export type BuilderRelations<Builder extends ModelBuilder<any, any>> =
  Builder extends ModelBuilder<any, infer RelationFn>
    ? RelationFn extends ModelRelationsFn<infer R, any>
      ? R
      : never
    : never;

export class Model<
  Builder extends ModelBuilder<any, any>,
  I = InferProps<BuilderProps<Builder>>,
  IO = InferProps<BuilderProps<Builder>, true>,
  R = InferRelations<BuilderRelations<Builder>>,
  RO = InferRelations<BuilderRelations<Builder>, any>,
> {
  constructor(
    public $schema: ParsedSchema,
    public $shape: ParsedModel,
    public $name: string,
    public $adapter: RuntimeAdapter | AsyncRuntimeAdapter,
  ) {}

  public async find<O extends FindOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<FindReturn<I, O>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async findMany<O extends FindOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<FindReturn<I, O, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async create<O extends CreateOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<CreateReturn<I, O>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async createMany<O extends CreateOpts<I, IO, R, RO, true>>(
    opts?: O,
  ): Promise<CreateReturn<I, O, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async createReturn<O extends CreateReturnOpts<I, R>>(
    opts?: O,
  ): Promise<CreateReturnReturn<I, R>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async createManyReturn<O extends CreateReturnOpts<I, R>>(
    opts?: O,
  ): Promise<CreateReturnReturn<I, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async update<O extends UpdateOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<UpdateReturn<I, O>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async updateMany<O extends UpdateOpts<I, IO, R, RO, true>>(
    opts?: O,
  ): Promise<UpdateReturn<I, O, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async updateReturn<O extends UpdateReturnOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<UpdateReturnReturn<I, R>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async updateManyReturn<O extends UpdateReturnOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<UpdateReturnReturn<I, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async upsert<O extends UpsertOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<UpsertReturn<I, O>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async upsertMany<O extends UpsertOpts<I, IO, R, RO, true>>(
    opts?: O,
  ): Promise<UpsertReturn<I, O, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async delete<O extends DeleteOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<DeleteReturn<I, O>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async deleteMany<O extends DeleteOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<DeleteReturn<I, O, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async count<O extends CountOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<CountReturn> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async aggregate<O extends AggregateOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<AggregateReturn<I, O>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async groupBy<O extends GroupByOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<GroupByReturn<I, IO, R, RO, O>> {
    throw new Error("Not implemented", { cause: opts });
  }
}
