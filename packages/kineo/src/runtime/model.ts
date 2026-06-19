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
import {
  parseAggregateStatement,
  parseCountStatement,
  parseDeleteStatement,
  parseFindStatement,
  parseGroupByStatement,
  parseInsertStatement,
  parseUpdateStatement,
  parseUpsertStatement,
  type Statement,
} from "@/ir";

export type BuilderProps<Builder extends ModelBuilder<any, any>> =
  Builder extends ModelBuilder<infer Props, any> ? Props : never;
export type BuilderRelations<Builder extends ModelBuilder<any, any>> =
  Builder extends ModelBuilder<any, infer RelationsFn>
    ? RelationsFn extends undefined
      ? // eslint-disable-next-line -- this is always merged, so it's fine
        {}
      : RelationsFn extends ModelRelationsFn<infer R, any>
        ? R
        : never
    : never;

export class Model<
  Builder extends ModelBuilder<any, any>,
  I = InferProps<BuilderProps<Builder>>,
  IO = InferProps<BuilderProps<Builder>, true>,
  R = InferRelations<BuilderRelations<Builder>>,
  RO = InferRelations<BuilderRelations<Builder>, true>,
> {
  constructor(
    public $schema: ParsedSchema,
    public $shape: ParsedModel,
    public $name: string,
    public $adapter: RuntimeAdapter | AsyncRuntimeAdapter,
  ) {}

  public async find<O extends FindOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<FindReturn<I, IO, R, RO, O>> {
    const ir = parseFindStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows?.[0] as any) ?? null;
  }

  public async findMany<O extends FindOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<FindReturn<I, IO, R, RO, O, true>> {
    const ir = parseFindStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows as any) ?? [];
  }

  public async create<O extends CreateOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<CreateReturn<I, IO, R, RO, O>> {
    const ir = parseInsertStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows?.[0] as any) ?? null;
  }

  public async createMany<O extends CreateOpts<I, IO, R, RO, true>>(
    opts?: O,
  ): Promise<CreateReturn<I, IO, R, RO, O, true>> {
    const ir = parseInsertStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows as any) ?? [];
  }

  public async createReturn<O extends CreateReturnOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<CreateReturnReturn<I, IO, R, RO, O>> {
    const ir = parseInsertStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows?.[0] as any) ?? null;
  }

  public async createManyReturn<O extends CreateReturnOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<CreateReturnReturn<I, IO, R, RO, O, true>> {
    const ir = parseInsertStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows as any) ?? [];
  }

  public async update<O extends UpdateOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<UpdateReturn<I, IO, R, RO, O>> {
    const ir = parseUpdateStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows?.[0] as any) ?? null;
  }

  public async updateMany<O extends UpdateOpts<I, IO, R, RO, true>>(
    opts?: O,
  ): Promise<UpdateReturn<I, IO, R, RO, O, true>> {
    const ir = parseUpdateStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows as any) ?? [];
  }

  public async updateReturn<O extends UpdateReturnOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<UpdateReturnReturn<I, IO, R, RO, O>> {
    const ir = parseUpdateStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows?.[0] as any) ?? null;
  }

  public async updateManyReturn<O extends UpdateReturnOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<UpdateReturnReturn<I, IO, R, RO, O, true>> {
    const ir = parseUpdateStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows as any) ?? [];
  }

  public async upsert<O extends UpsertOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<UpsertReturn<I, IO, R, RO, O>> {
    const ir = parseUpsertStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows?.[0] as any) ?? null;
  }

  public async upsertMany<O extends UpsertOpts<I, IO, R, RO, true>>(
    opts?: O,
  ): Promise<UpsertReturn<I, IO, R, RO, O, true>> {
    const ir = parseUpsertStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows as any) ?? [];
  }

  public async delete<O extends DeleteOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<DeleteReturn<I, IO, R, RO, O>> {
    const ir = parseDeleteStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows?.[0] as any) ?? null;
  }

  public async deleteMany<O extends DeleteOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<DeleteReturn<I, IO, R, RO, O, true>> {
    const ir = parseDeleteStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows as any) ?? [];
  }

  public async count<O extends CountOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<CountReturn> {
    const ir = parseCountStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return result.rowCount ?? 0;
  }

  public async aggregate<O extends AggregateOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<AggregateReturn<I, IO, R, RO, O>> {
    const ir = parseAggregateStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows?.[0] as any) ?? null;
  }

  public async groupBy<O extends GroupByOpts<I, IO, R, RO>>(
    opts?: O,
  ): Promise<GroupByReturn<I, IO, R, RO, O>> {
    const ir = parseGroupByStatement(this.$name, opts);
    const result = await exec(this.$adapter, ir);
    return (result.rows as any) ?? [];
  }
}

export async function exec(
  $adapter: RuntimeAdapter | AsyncRuntimeAdapter,
  ir: Statement,
) {
  const adapter = await $adapter;
  const emitResult = await adapter.emit([ir]);
  return await adapter.exec(emitResult);
}
