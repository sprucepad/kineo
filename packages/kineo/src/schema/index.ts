import type { FieldBuilder, RelationBuilder, RelationOpts } from "./property";

export type Schema = Record<string, ModelBuilder>;
export type ModelShape = Record<string, FieldBuilder | RelationBuilder>;
export type ModelFn = (ctx: ModelContext) => ModelShape;

export interface ModelContext {
  string(name?: string): FieldBuilder;
  int(name?: string): FieldBuilder;
  bigint(name?: string): FieldBuilder;
  float(name?: string): FieldBuilder;
  // TODO exact precision decimal(name?: string): FieldBuilder;
  boolean(name?: string): FieldBuilder;
  datetime(name?: string): FieldBuilder;
  json(name?: string): FieldBuilder;
  bytes(name?: string): FieldBuilder;

  relation(to: ModelBuilder, name?: string): RelationBuilder;
  relation(
    to: ModelBuilder,
    opts: RelationOpts,
    name?: string,
  ): RelationBuilder;
}

export class ModelBuilder {
  constructor(
    public readonly $fn: ModelFn,
    public $name?: string,
  ) {}
}

export function model(nameOrFn: string | ModelFn, fnOrName?: ModelFn | string) {
  if (typeof nameOrFn === "string")
    return new ModelBuilder(fnOrName as ModelFn, nameOrFn);
  return new ModelBuilder(nameOrFn);
}

export * from "./property";
