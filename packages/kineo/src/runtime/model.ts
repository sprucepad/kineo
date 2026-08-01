import type {
  AsyncRuntimeAdapter,
  ExecResult,
  RuntimeAdapter,
} from "@/adapter";
import type {
  InferProps,
  InferRelations,
  ModelBuilder,
  ModelRelationsFn,
  ParsedModel,
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
  public find: <O extends FindOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<FindReturn<I, IO, R, RO, O>>;
  public findMany: <O extends FindOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<FindReturn<I, IO, R, RO, O, true>>;
  public create: <O extends CreateOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<CreateReturn<I, IO, R, RO, O>>;
  public createMany: <O extends CreateOpts<I, IO, R, RO, true>>(
    opts?: O,
  ) => Promise<CreateReturn<I, IO, R, RO, O, true>>;
  public createReturn: <O extends CreateReturnOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<CreateReturnReturn<I, IO, R, RO, O>>;
  public createManyReturn: <O extends CreateReturnOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<CreateReturnReturn<I, IO, R, RO, O, true>>;
  public update: <O extends UpdateOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<UpdateReturn<I, IO, R, RO, O>>;
  public updateMany: <O extends UpdateOpts<I, IO, R, RO, true>>(
    opts?: O,
  ) => Promise<UpdateReturn<I, IO, R, RO, O, true>>;
  public updateReturn: <O extends UpdateReturnOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<UpdateReturnReturn<I, IO, R, RO, O>>;
  public updateManyReturn: <O extends UpdateReturnOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<UpdateReturnReturn<I, IO, R, RO, O, true>>;
  public upsert: <O extends UpsertOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<UpsertReturn<I, IO, R, RO, O>>;
  public upsertMany: <O extends UpsertOpts<I, IO, R, RO, true>>(
    opts?: O,
  ) => Promise<UpsertReturn<I, IO, R, RO, O, true>>;
  public delete: <O extends DeleteOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<DeleteReturn<I, IO, R, RO, O>>;
  public deleteMany: <O extends DeleteOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<DeleteReturn<I, IO, R, RO, O, true>>;
  public count: <O extends CountOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<CountReturn>;
  public aggregate: <O extends AggregateOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<AggregateReturn<I, IO, R, RO, O>>;
  public groupBy: <O extends GroupByOpts<I, IO, R, RO>>(
    opts?: O,
  ) => Promise<GroupByReturn<I, IO, R, RO, O>>;

  constructor(
    public $shape: ParsedModel,
    public $adapter: RuntimeAdapter | AsyncRuntimeAdapter,
  ) {
    this.find = createOperation($adapter, $shape, parseFindStatement, "row");
    this.findMany = createOperation(
      $adapter,
      $shape,
      parseFindStatement,
      "rows",
    );
    this.create = createOperation(
      $adapter,
      $shape,
      parseInsertStatement,
      "row",
    );
    this.createMany = createOperation(
      $adapter,
      $shape,
      parseInsertStatement,
      "rows",
    );
    this.createReturn = createOperation(
      $adapter,
      $shape,
      parseInsertStatement,
      "row",
    );
    this.createManyReturn = createOperation(
      $adapter,
      $shape,
      parseInsertStatement,
      "rows",
    );
    this.update = createOperation(
      $adapter,
      $shape,
      parseUpdateStatement,
      "row",
    );
    this.updateMany = createOperation(
      $adapter,
      $shape,
      parseUpdateStatement,
      "rows",
    );
    this.updateReturn = createOperation(
      $adapter,
      $shape,
      parseUpdateStatement,
      "row",
    );
    this.updateManyReturn = createOperation(
      $adapter,
      $shape,
      parseUpdateStatement,
      "rows",
    );
    this.upsert = createOperation(
      $adapter,
      $shape,
      parseUpsertStatement,
      "row",
    );
    this.upsertMany = createOperation(
      $adapter,
      $shape,
      parseUpsertStatement,
      "rows",
    );
    this.delete = createOperation(
      $adapter,
      $shape,
      parseDeleteStatement,
      "row",
    );
    this.deleteMany = createOperation(
      $adapter,
      $shape,
      parseDeleteStatement,
      "rows",
    );
    this.count = createOperation(
      $adapter,
      $shape,
      parseCountStatement,
      "rowCount",
    );
    this.aggregate = createOperation(
      $adapter,
      $shape,
      parseAggregateStatement,
      "row",
    );
    this.groupBy = createOperation(
      $adapter,
      $shape,
      parseGroupByStatement,
      "rows",
    );
  }
}

export function createOperation(
  $adapter: RuntimeAdapter | AsyncRuntimeAdapter,
  shape: ParsedModel,
  op: (name: string, opts?: any) => Statement,
  fetch: "row" | "rows" | keyof ExecResult,
): (opts?: any) => Promise<any> {
  return async (opts) => {
    const ir = op(shape.name, opts);
    const adapter = await $adapter;
    const emitResult = await adapter.emit([ir]);
    const result = await adapter.exec(emitResult);

    // TODO apply defaults

    return fetch === "rows"
      ? ((result.rows as any[]) ?? [])
      : fetch === "row"
        ? ((result.rows?.[0] as any) ?? null)
        : (result[fetch] as any);
  };
}
