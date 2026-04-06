import type { AsyncRuntimeAdapter, RuntimeAdapter } from "@/adapter";
import type {
  InferModel,
  ModelBuilder,
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

export class Model<
  Builder extends ModelBuilder<any, any>,
  I = InferModel<Builder>,
  IO = InferModel<Builder, true>,
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
    throw new Error("Not implemented", { cause: opts });
  }

  public async findMany<O extends FindOpts<I, IO>>(
    opts?: O,
  ): Promise<FindReturn<I, O, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async create<O extends CreateOpts<I, IO>>(
    opts?: O,
  ): Promise<CreateReturn<I, O>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async createMany<O extends CreateOpts<I, IO, true>>(
    opts?: O,
  ): Promise<CreateReturn<I, O, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async createReturn<O extends CreateReturnOpts<I>>(
    opts?: O,
  ): Promise<CreateReturnReturn<I>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async createManyReturn<O extends CreateReturnOpts<I>>(
    opts?: O,
  ): Promise<CreateReturnReturn<I, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async update<O extends UpdateOpts<I, IO>>(
    opts?: O,
  ): Promise<UpdateReturn<I, O>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async updateMany<O extends UpdateOpts<I, IO, true>>(
    opts?: O,
  ): Promise<UpdateReturn<I, O, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async updateReturn<O extends UpdateReturnOpts<I>>(
    opts?: O,
  ): Promise<UpdateReturnReturn<I>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async updateManyReturn<O extends UpdateReturnOpts<I>>(
    opts?: O,
  ): Promise<UpdateReturnReturn<I, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async upsert<O extends UpsertOpts<I, IO>>(
    opts?: O,
  ): Promise<UpsertReturn<I, O>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async upsertMany<O extends UpsertOpts<I, IO>>(
    opts?: O,
  ): Promise<UpsertReturn<I, O, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async delete<O extends DeleteOpts<I, IO>>(
    opts?: O,
  ): Promise<DeleteReturn<I, O>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async deleteMany<O extends DeleteOpts<I, IO>>(
    opts?: O,
  ): Promise<DeleteReturn<I, O, true>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async count<O extends CountOpts<IO>>(opts?: O): Promise<CountReturn> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async aggregate<O extends AggregateOpts<I, IO>>(
    opts?: O,
  ): Promise<AggregateReturn<I, O>> {
    throw new Error("Not implemented", { cause: opts });
  }

  public async groupBy<O extends GroupByOpts<I, IO>>(
    opts?: O,
  ): Promise<GroupByReturn<I, IO, O>> {
    throw new Error("Not implemented", { cause: opts });
  }
}
