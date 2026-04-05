import type { AsyncRuntimeAdapter, RuntimeAdapter } from "@/adapter";
import type {
  InferModel,
  ModelBuilder,
  ModelProps,
  ModelRelations,
  ParsedModel,
  ParsedSchema,
} from "@/schema";

// TODO types
// TODO runtime behavior
// TODO custom promise constructor so you can modify the query before `await`ing it

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
  ): Promise<FindReturn<I, IO, O>> {
    // TODO
  }

  public async findMany<O extends FindOpts<I, IO, true>>(
    opts?: O,
  ): Promise<FindReturn<I, IO, O, true>> {
    // TODO
  }

  public async create<O extends CreateOpts<I, IO>>(
    opts?: O,
  ): Promise<CreateReturn<I, IO, O>> {
    // TODO
  }

  public async createMany<O extends CreateOpts<I, IO, true>>(
    opts?: O,
  ): Promise<CreateReturn<I, IO, O, true>> {
    // TODO
  }

  public async createReturn<O extends CreateReturnOpts<I, IO>>(
    opts?: 0,
  ): Promise<CreateReturnReturn<I, IO, O>> {
    // TODO
  }

  public async createManyReturn<O extends CreateReturnOpts<I, IO>>(
    opts?: 0,
  ): Promise<CreateReturnReturn<I, IO, O, true>> {
    // TODO
  }

  public async update<O extends UpdateOpts<I, IO>>(
    opts?: O,
  ): Promise<UpdateReturn<I, IO, O>> {
    // TODO
  }

  public async updateMany<O extends UpdateOpts<I, IO, true>>(
    opts?: O,
  ): Promise<UpdateReturn<I, IO, O, true>> {
    // TODO
  }

  public async updateReturn<O extends UpdateReturnOpts<I, IO>>(
    opts?: O,
  ): Promise<UpdateReturnReturn<I, IO, O>> {
    // TODO
  }

  public async updateManyReturn<O extends UpdateReturnOpts<I, IO, true>>(
    opts?: O,
  ): Promise<UpdateReturnReturn<I, IO, O, true>> {
    // TODO
  }

  public async upsert<O extends UpsertOpts<I, IO>>(
    opts?: O,
  ): Promise<UpsertReturn<I, IO, O>> {
    // TODO
  }

  public async upsertMany<O extends UpsertOpts<I, IO, true>>(
    opts?: O,
  ): Promise<UpsertReturn<I, IO, O, true>> {
    // TODO
  }

  public async delete<O extends DeleteOpts<I, IO>>(
    opts?: O,
  ): Promise<DeleteReturn<I, IO, O>> {
    // TODO
  }

  public async deleteMany<O extends DeleteOpts<I, IO, true>>(
    opts?: O,
  ): Promise<DeleteReturn<I, IO, O, true>> {
    // TODO
  }

  public async count<O extends CountOpts<I, IO>>(
    opts?: O,
  ): Promise<CountReturn<I, IO, O>> {
    // TODO
  }

  public async aggregate<O extends AggregateOpts<I, IO>>(
    opts?: O,
  ): Promise<AggregateReturn<I, IO, O>> {
    // TODO
  }

  public async groupBy<O extends GroupByOpts<I, IO>>(
    opts?: O,
  ): Promise<GroupByReturn<I, IO, O>> {
    // TODO
  }
}
