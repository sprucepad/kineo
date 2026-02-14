import * as model from "./model";

/**
 * A type of statement.
 */
export const enum StatementType {
  Find = "Find",
  Count = "Count",
  Create = "Create",
  Update = "Update",
  Upsert = "Upsert",
  Delete = "Delete",
  Connect = "Connect",
  Disconnect = "Disconnect",
  RelationQuery = "RelationQuery",
  Traverse = "Traverse",
}

/**
 * Common base statement
 */
export interface Statement {
  type: StatementType;
  model: string; // model name
  label?: string; // optional label for the statement (for debugging)
  alias?: string; // alias for the result
}

/**
 * IR root — represents a emitted set of model operations
 */
export interface IR {
  statements: Statement[];
}

// ---------- Specialized IR Statement Definitions ---------- //

/**
 * A `findFirst`/`findMany` statement.
 */
export interface FindStatement extends Statement {
  type: StatementType.Find;
  where?: Record<string, any>;
  select?: Record<string, any>;
  include?: Record<string, any>;
  orderBy?: Record<string, "asc" | "desc">[];
  distinct?: string[];
  skip?: number;
  take?: number;
}

/**
 * A `count` statement.
 */
export interface CountStatement extends Statement {
  type: StatementType.Count;
  where?: Record<string, any>;
}

/**
 * A `create` statement.
 */
export interface CreateStatement extends Statement {
  type: StatementType.Create;
  data: Record<string, any>;
  select?: Record<string, any>;
  include?: Record<string, any>;
}

/**
 * An `update`/`updateMany` statement.
 */
export interface UpdateStatement extends Statement {
  type: StatementType.Update;
  where: Record<string, any>;
  data: Record<string, any>;
  select?: Record<string, any>;
  include?: Record<string, any>;
}

/**
 * An `upsert`/`upsertMany` statement.
 */
export interface UpsertStatement extends Statement {
  type: StatementType.Upsert;
  where: Record<string, any>;
  data: {
    create?: Record<string, any>;
    update?: Record<string, any>;
  };
  select?: Record<string, any>;
  include?: Record<string, any>;
}

/**
 * A `delete`/`deleteMany` statement.
 */
export interface DeleteStatement extends Statement {
  type: StatementType.Delete;
  where: Record<string, any>;
}

/**
 * A `connect` statement.
 */
export interface ConnectStatement extends Statement {
  type: StatementType.Connect;
  from: Record<string, any>;
  to: Record<string, any>;
  relation: string;
  direction?: string;
  properties?: Record<string, any>;
}

/**
 * A `connect` statement.
 */
export interface DisconnectStatement extends Statement {
  type: StatementType.Disconnect;
  from: Record<string, any>;
  to: Record<string, any>;
  relation: string;
  direction?: string;
  properties?: Record<string, any>;
}

/**
 * A `findPath`/`findShortestPath`/`findAllPaths` query.
 */
export interface RelationQueryStatement extends Statement {
  type: StatementType.RelationQuery;
  from: Record<string, any>;
  to: Record<string, any>;
  maxDepth?: number;
  minDepth?: number;
  direction?: string;
  limit?: number;
}

export interface TraverseStatement extends Statement {
  type: StatementType.Traverse;
  start: Record<string, any>;
  direction?: string;
  minDepth?: number;
  maxDepth?: number;
  relationFilter?: string | string[];
  includeNodes?: boolean;
  includeEdges?: boolean;
}

// ---------- Parser / Emitter Utilities ---------- //

/**
 * Emits a `QueryOpts` into a `FindStatement`
 */
export function emitFindStatement(
  modelName: string,
  opts: model.QueryOpts<any, any>,
): FindStatement {
  return {
    type: StatementType.Find,
    model: modelName,
    where: opts.where,
    select: opts.select,
    include: opts.include,
    orderBy: opts.orderBy as any,
    distinct: opts.distinct ? opts.distinct.map(String) : undefined,
    skip: opts.skip,
    take: opts.take,
  };
}

/**
 * Emits a `Count` query
 */
export function emitCountStatement(
  modelName: string,
  opts: model.QueryOpts<any, any>,
): CountStatement {
  return {
    type: StatementType.Count,
    model: modelName,
    where: opts.where,
  };
}

/**
 * Emits a `Create` query
 */
export function emitCreateStatement(
  modelName: string,
  opts: model.CreateOpts<any, any>,
): CreateStatement {
  return {
    type: StatementType.Create,
    model: modelName,
    data: opts.data,
    select: opts.select,
    include: opts.include,
  };
}

/**
 * Emits an `Upsert` query.
 */
export function emitUpsertStatement(
  modelName: string,
  opts: model.UpsertOpts<any, any>,
): UpsertStatement {
  return {
    type: StatementType.Upsert,
    model: modelName,
    where: opts.where,
    data: {
      create: opts.create,
      update: opts.update,
    },
    select: opts.select,
    include: opts.include,
  };
}

/**
 * Emits an `Update` query.
 */
export function emitUpdateStatement(
  modelName: string,
  opts: model.UpdateOpts<any, any>,
): UpdateStatement {
  return {
    type: StatementType.Update,
    model: modelName,
    where: opts.where,
    data: opts.data,
    select: opts.select,
    include: opts.include,
  };
}

/**
 * Emits a `Delete` query
 */
export function emitDeleteStatement(
  modelName: string,
  opts: model.DeleteOpts<any, any>,
): DeleteStatement {
  return {
    type: StatementType.Delete,
    model: modelName,
    where: opts.where,
  };
}

/**
 * Emits a `Connect` query
 */
export function emitConnectStatement(
  modelName: string,
  opts: model.ConnectOpts<any, any>,
): ConnectStatement {
  return {
    type: StatementType.Connect,
    model: modelName,
    from: opts.from.where,
    to: opts.to.where,
    relation: opts.relation,
    direction: opts.direction,
    properties: opts.properties,
  };
}

/**
 * Emits a `Disconnect` query
 */
export function emitDisconnectStatement(
  modelName: string,
  opts: model.ConnectOpts<any, any>,
): DisconnectStatement {
  return {
    type: StatementType.Disconnect,
    model: modelName,
    from: opts.from.where,
    to: opts.to.where,
    relation: opts.relation,
    direction: opts.direction,
    properties: opts.properties,
  };
}

/**
 * Emits a `Path` / Relation traversal query
 */
export function emitRelationQueryStatement(
  modelName: string,
  opts: model.PathOpts<any, any>,
): RelationQueryStatement {
  return {
    type: StatementType.RelationQuery,
    model: modelName,
    from: opts.from.where,
    to: opts.to.where,
    maxDepth: opts.maxDepth,
    minDepth: opts.minDepth,
    direction: opts.direction,
    limit: opts.limit,
  };
}

export function emitTraverseStatement(
  modelName: string,
  opts: model.TraverseOpts<any, any>,
): TraverseStatement {
  return {
    type: StatementType.Traverse,
    model: modelName,
    start: opts.start.where,
    direction: opts.direction,
    includeEdges: opts.includeEdges,
    includeNodes: opts.includeNodes,
    relationFilter: opts.relationFilter,
    maxDepth: opts.maxDepth,
    minDepth: opts.depth,
  };
}

// ---------- IR Construction Helpers ---------- //

/**
 * Takes one or more parsed statements and wraps them in an IR container.
 */
export function makeIR(...statements: Statement[]): IR {
  return { statements };
}

/**
 * Convenience: emit a generic model operation into IR
 */
export function emitToIR(modelName: string, op: string, opts: any): IR {
  let stmt: Statement;

  switch (op) {
    case "findFirst":
    case "findMany":
      stmt = emitFindStatement(modelName, opts);
      break;
    case "count":
      stmt = emitCountStatement(modelName, opts);
      break;
    case "create":
    case "createMany":
      stmt = emitCreateStatement(modelName, opts);
      break;
    case "update":
    case "updateMany":
      stmt = emitUpdateStatement(modelName, opts);
      break;
    case "upsert":
    case "upsertMany":
      stmt = emitUpsertStatement(modelName, opts);
      break;
    case "delete":
    case "deleteMany":
      stmt = emitDeleteStatement(modelName, opts);
      break;
    case "disconnect":
      stmt = emitDisconnectStatement(modelName, opts);
      break;
    case "connect":
      stmt = emitConnectStatement(modelName, opts);
      break;
    case "findPath":
    case "findShortestPath":
    case "findAllPaths":
      stmt = emitRelationQueryStatement(modelName, opts);
      break;
    case "traverse":
      stmt = emitTraverseStatement(modelName, opts);
      break;
    default:
      throw new Error(`Unknown operation type: ${op}`);
  }

  return makeIR(stmt);
}
