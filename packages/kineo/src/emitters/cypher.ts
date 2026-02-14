import { defineEmitter } from "@/adapter";
import neo4j from "neo4j-driver";
import * as IR from "@/ir";

/**
 * Parameters.
 */
type Params = Record<string, any>;

/**
 * Emits an IR to Cypher.
 * @param ir The IR to emit.
 * @returns A compilation result.
 */
const emit = defineEmitter((ir) => {
  const ctx = createEmitContext();
  const chunks: string[] = [];

  for (const stmt of ir.statements) {
    switch (stmt.type) {
      case IR.StatementType.Find:
        chunks.push(emitFindStatement(ctx, stmt as IR.FindStatement));
        break;
      case IR.StatementType.Count:
        chunks.push(emitCountStatement(ctx, stmt as IR.CountStatement));
        break;
      case IR.StatementType.Create:
        chunks.push(emitCreateStatement(ctx, stmt as IR.CreateStatement));
        break;
      case IR.StatementType.Update:
        chunks.push(emitUpdateStatement(ctx, stmt as IR.UpdateStatement));
        break;
      case IR.StatementType.Upsert:
        chunks.push(emitUpsertStatement(ctx, stmt as IR.UpsertStatement));
        break;
      case IR.StatementType.Delete:
        chunks.push(emitDeleteStatement(ctx, stmt as IR.DeleteStatement));
        break;
      case IR.StatementType.Connect:
        chunks.push(emitConnectStatement(ctx, stmt as IR.ConnectStatement));
        break;
      case IR.StatementType.Disconnect:
        chunks.push(
          emitDisconnectStatement(ctx, stmt as IR.DisconnectStatement),
        );
        break;
      case IR.StatementType.RelationQuery:
        chunks.push(
          emitRelationStatement(ctx, stmt as IR.RelationQueryStatement),
        );
        break;
      case IR.StatementType.Traverse:
        chunks.push(emitTraverseStatement(ctx, stmt as IR.TraverseStatement));
        break;
      default:
        throw new Error(`Unsupported statement type: ${stmt.type}`);
    }
  }

  return { command: chunks.join("\n\n"), params: ctx.params };
});
export default emit;

/* -------------------------------------------------------------------------- */
/*                               Emitter Context                             */
/* -------------------------------------------------------------------------- */

/**
 * Shared state between emit functions.
 */
interface EmitContext {
  params: Params;
  nextParamName(base?: string): string;
}

/**
 * Creates a shared emitter context.
 * @returns A new emitter context.
 */
function createEmitContext(): EmitContext {
  let idx = 0;
  const params: Params = {};
  const nextParamName = (base = "p") => `${base}_${++idx}`;
  return { params, nextParamName };
}

/* -------------------------------------------------------------------------- */
/*                              Helper Utilities                              */
/* -------------------------------------------------------------------------- */

/**
 * Emits properties to Cypher.
 * @param ctx The emitter context.
 * @param prefix The prefix of the property.
 * @param props The properties to convert.
 * @returns The emitted properties.
 */
function propsToCypher(
  ctx: EmitContext,
  prefix: string,
  props: Record<string, any>,
): string {
  const entries: string[] = [];
  for (const [k, v] of Object.entries(props || {})) {
    const pname = ctx.nextParamName(`${prefix}_${k}`.replace(/\W/g, ""));
    ctx.params[pname] = normalizeValue(v);
    entries.push(`${k}: $${pname}`);
  }
  return entries.length ? `{ ${entries.join(", ")} }` : "{}";
}

function normalizeValue(v: any): any {
  if (Array.isArray(v)) {
    return v.map(normalizeValue);
  }

  if (v instanceof Date) {
    return neo4j.types.DateTime.fromStandardDate(v);
  }

  if (v && typeof v === "object") {
    const obj: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      obj[k] = normalizeValue(val);
    }
    return obj;
  }

  return v;
}

/**
 * Convert recursive where object into a valid Cypher boolean expression.
 * @param ctx The emitter context.
 * @param alias The result alias.
 * @param where The where object.
 */
function whereToCypher(
  ctx: EmitContext,
  alias: string,
  where?: Record<string, any>,
): string {
  if (!where || Object.keys(where).length === 0) return "1=1";

  const opMap: Record<string, (f: string, val: string) => string> = {
    gt: (f, v) => `${f} > $${v}`,
    gte: (f, v) => `${f} >= $${v}`,
    lt: (f, v) => `${f} < $${v}`,
    lte: (f, v) => `${f} <= $${v}`,
    contains: (f, v) => `${f} CONTAINS $${v}`,
    startsWith: (f, v) => `${f} STARTS WITH $${v}`,
    endsWith: (f, v) => `${f} ENDS WITH $${v}`,
    in: (f, v) => `${f} IN $${v}`,
    not: (f, v) => `${f} <> $${v}`,
  };

  const parts: string[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (key === "AND" || key === "OR" || key === "NOT") continue;

    const field = `${alias}.${key}`;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [op, val] of Object.entries(value)) {
        const pname = ctx.nextParamName(key);
        ctx.params[pname] = normalizeValue(val);
        const opHandler = opMap[op];
        parts.push(
          opHandler ? opHandler(field, pname) : `${field} = $${pname}`,
        );
      }
    } else if (Array.isArray(value)) {
      const pname = ctx.nextParamName(key);
      ctx.params[pname] = normalizeValue(value);
      parts.push(`${field} IN $${pname}`);
    } else {
      const pname = ctx.nextParamName(key);
      ctx.params[pname] = normalizeValue(value);
      parts.push(`${field} = $${pname}`);
    }
  }

  // Now handle logical operators
  const logicParts: string[] = [];

  if ("AND" in where) {
    const subs = (where.AND as any[]).map((w) => whereToCypher(ctx, alias, w));
    logicParts.push(`(${subs.join(" AND ")})`);
  }
  if ("OR" in where) {
    const subs = (where.OR as any[]).map((w) => whereToCypher(ctx, alias, w));
    logicParts.push(`(${subs.join(" OR ")})`);
  }
  if ("NOT" in where) {
    logicParts.push(`(NOT ${whereToCypher(ctx, alias, where.NOT as any)})`);
  }

  if (parts.length && logicParts.length) {
    return `(${parts.join(" AND ")} AND ${logicParts.join(" AND ")})`;
  }

  return parts.length
    ? `(${parts.join(" AND ")})`
    : logicParts.length
      ? logicParts.join(" AND ")
      : "1=1";
}

/**
 * Projects `select`/`include` objects into Cypher.
 * @param alias The return alias.
 * @param select The select projection.
 * @param include The include projection.
 * @returns A Cypher string.
 */
function projection(
  alias: string,
  select?: Record<string, any>,
  include?: Record<string, any>,
): string {
  const fields: string[] = [];

  if (select && Object.keys(select).length) {
    for (const key in select) {
      fields.push(`${alias}.${key} AS ${key}`);
    }
  } else {
    fields.push(`properties(${alias}) AS ${alias}`);
  }

  if (include) {
    const collectFields = collectIncludeProjections(alias, include);
    fields.push(...collectFields);
  }

  return fields.join(", ");
}

/**
 * Collects projections from an include object.
 * @param parentAlias The return alias.
 * @param include The include object.
 * @param acc Accumulator.
 * @returns Emitd Cypher chunks.
 */
function collectIncludeProjections(
  parentAlias: string,
  include: Record<string, any>,
  acc: string[] = [],
): string[] {
  for (const [relName, relOpts] of Object.entries(include)) {
    const relAlias = `${parentAlias}_${relName}`;
    const label = (relOpts as any)?.as ?? relName;
    acc.push(`collect(properties(${relAlias})) AS ${label}`);
    if ((relOpts as any)?.include) {
      collectIncludeProjections(relAlias, (relOpts as any).include, acc);
    }
  }
  return acc;
}

/* -------------------------------------------------------------------------- */
/*                            Statement Emitters                             */
/* -------------------------------------------------------------------------- */

/**
 * Emits a Find statement.
 * @param ctx The emitter context.
 * @param s The statement.
 * @returns A Cypher query.
 */
function emitFindStatement(ctx: EmitContext, s: IR.FindStatement): string {
  const alias = s.alias ?? "n";
  const match = `MATCH (${alias}:${s.model})`;
  const where = `WHERE ${whereToCypher(ctx, alias, s.where)}`;

  const includeMatches = emitIncludesRecursive(ctx, alias, s.include);

  const orderBy =
    s.orderBy && s.orderBy.length
      ? `ORDER BY ${s.orderBy
          .map((o) => {
            const [[field, dir]] = Object.entries(o);
            return `${alias}.${field} ${dir.toUpperCase()}`;
          })
          .join(", ")}`
      : "";

  const skip = typeof s.skip === "number" ? `SKIP ${s.skip}` : "";
  const take = typeof s.take === "number" ? `LIMIT ${s.take}` : "";

  const ret = `RETURN ${projection(alias, s.select, s.include)}`;

  return [match, where, ...includeMatches, ret, orderBy, skip, take]
    .filter(Boolean)
    .join("\n");
}

/**
 * Emits includes recursively.
 * @param ctx Emitter context.
 * @param parentAlias The return alias.
 * @param include The include object.
 * @param depth The current include depth.
 * @returns Cypher queries.
 */
function emitIncludesRecursive(
  ctx: EmitContext,
  parentAlias: string,
  include?: Record<string, any>,
  depth = 0,
): string[] {
  if (!include) return [];

  const lines: string[] = [];

  for (const [relName, relOpts] of Object.entries(include)) {
    const relAlias = `${parentAlias}_${relName}`;
    const whereClause =
      relOpts && typeof relOpts === "object" && "where" in relOpts
        ? `WHERE ${whereToCypher(ctx, relAlias, (relOpts as any).where)}`
        : "";

    // MATCH the relationship
    lines.push(
      [
        `OPTIONAL MATCH (${parentAlias})-[:${relName.toUpperCase()}]->(${relAlias}:${relName})`,
        whereClause,
      ]
        .filter(Boolean)
        .join("\n"),
    );

    // Recursively emit nested includes
    if (relOpts && typeof relOpts === "object" && "include" in relOpts) {
      const nested = emitIncludesRecursive(
        ctx,
        relAlias,
        (relOpts as any).include,
        depth + 1,
      );
      lines.push(...nested);
    }
  }

  return lines;
}

/**
 * Emits a Count statement.
 * @param ctx The context.
 * @param s The statement.
 * @returns A Cypher query.
 */
function emitCountStatement(ctx: EmitContext, s: IR.CountStatement): string {
  const alias = s.alias ?? "n";
  return [
    `MATCH (${alias}:${s.model})`,
    `WHERE ${whereToCypher(ctx, alias, s.where)}`,
    `RETURN count(${alias}) AS count`,
  ].join("\n");
}

/**
 * Emits a Create statement.
 * @param ctx The context.
 * @param s The statement.
 * @returns A Cypher query.
 */
function emitCreateStatement(ctx: EmitContext, s: IR.CreateStatement): string {
  const alias = s.alias ?? "n";
  const props = propsToCypher(ctx, "create", s.data || {});
  const create = `CREATE (${alias}:${s.model} ${props})`;
  return [create, `RETURN ${projection(alias, s.select, s.include)}`].join(
    "\n",
  );
}

/**
 * Emits an Update statement.
 * @param ctx The context.
 * @param s The statement.
 * @returns A Cypher query.
 */
function emitUpdateStatement(ctx: EmitContext, s: IR.UpdateStatement): string {
  const alias = "n";

  if (!s.where || Object.keys(s.where).length === 0) {
    throw new Error("Update statements require a non-empty where clause.");
  }

  if (!s.data || Object.keys(s.data).length === 0) {
    throw new Error("Update statements require non-empty data.");
  }

  // ---- MATCH ----
  const whereClauses = Object.entries(s.where).map(([k, v]) => {
    const p = ctx.nextParamName(`where_${k}`);
    ctx.params[p] = normalizeValue(v);
    return `${alias}.${k} = $${p}`;
  });

  const match = `MATCH (${alias}:${s.model})`;
  const where = `WHERE ${whereClauses.join(" AND ")}`;

  // ---- PARTIAL UPDATE ----
  const patchParam = ctx.nextParamName("patch");
  ctx.params[patchParam] = normalizeValue(s.data);

  const set = `SET ${alias} += $${patchParam}`;

  // ---- INCLUDE SUPPORT ----
  const includeClauses: string[] = [];
  const returnFields: string[] = [];

  if (s.include) {
    Object.entries(s.include).forEach(([key, value]) => {
      if (!value) return;

      const relAlias = `${alias}_${key}`;
      const relType = key.toUpperCase();

      includeClauses.push(
        `OPTIONAL MATCH (${alias})-[:${relType}]->(${relAlias})`,
      );

      returnFields.push(`${key}: collect(properties(${relAlias}))`);
    });
  }

  // ---- SELECT SUPPORT ----
  if (s.select && Object.keys(s.select).length > 0) {
    const selectedProps = Object.entries(s.select)
      .filter(([, v]) => v)
      .map(([k]) => `.${k}`)
      .join(", ");

    returnFields.unshift(`${alias} { ${selectedProps} }`);
  } else {
    // default: full node
    returnFields.unshift(`properties(${alias})`);
  }

  const returnClause =
    returnFields.length === 1
      ? `RETURN ${returnFields[0]} AS ${alias}`
      : `RETURN { ${returnFields.join(", ")} } AS ${alias}`;

  return [match, where, set, ...includeClauses, returnClause].join("\n");
}

/**
 * Emits an Upsert statement.
 * @param ctx The context.
 * @param s The statement.
 * @returns A Cypher query.
 */
function emitUpsertStatement(ctx: EmitContext, s: IR.UpsertStatement): string {
  const alias = s.alias ?? "n";

  // If there are no where keys, fallback to simple create
  if (!s.where || Object.keys(s.where).length === 0) {
    const props = propsToCypher(
      ctx,
      "upsert_create",
      (s.data as any).create || {},
    );
    const create = `CREATE (${alias}:${s.model} ${props})`;
    return [create, `RETURN properties(${alias}) AS ${alias}`].join("\n");
  }

  // Otherwise, use MERGE with where keys
  const mergeProps = propsToCypher(ctx, "merge", s.where);
  const merge = `MERGE (${alias}:${s.model} ${mergeProps})`;

  const createData = (s.data as any).create || {};
  const updateData = (s.data as any).update || {};

  const onCreate = Object.entries(createData).length
    ? `ON CREATE SET ${Object.entries(createData)
        .map(([k, v]) => {
          const p = ctx.nextParamName(`oncreate_${k}`);
          ctx.params[p] = normalizeValue(v);
          return `${alias}.${k} = $${p}`;
        })
        .join(", ")}`
    : "";

  const onMatch = Object.entries(updateData).length
    ? `ON MATCH SET ${Object.entries(updateData)
        .map(([k, v]) => {
          const p = ctx.nextParamName(`onmatch_${k}`);
          ctx.params[p] = normalizeValue(v);
          return `${alias}.${k} = $${p}`;
        })
        .join(", ")}`
    : "";

  return [merge, onCreate, onMatch, `RETURN properties(${alias}) AS ${alias}`]
    .filter(Boolean)
    .join("\n");
}

/**
 * Emits a Delete statement.
 * @param ctx The context.
 * @param s The statement.
 * @returns A Cypher query.
 */
function emitDeleteStatement(ctx: EmitContext, s: IR.DeleteStatement): string {
  const alias = s.alias ?? "n";
  return [
    `MATCH (${alias}:${s.model})`,
    `WHERE ${whereToCypher(ctx, alias, s.where)}`,
    `DELETE ${alias}`,
  ].join("\n");
}

/**
 * Emits a Connect query statement.
 * @param ctx The context.
 * @param s The statement.
 * @returns A Cypher query.
 */
function emitConnectStatement(
  ctx: EmitContext,
  s: IR.ConnectStatement,
): string {
  const from = "a";
  const to = "b";
  const rel = s.relation.toUpperCase();
  const relProps = propsToCypher(ctx, "rel", s.properties || {});

  const direction =
    s.direction === "IN"
      ? `<-[r:${rel} ${relProps}]-`
      : s.direction === "BOTH"
        ? `-[r:${rel} ${relProps}]-`
        : `-[r:${rel} ${relProps}]->`;

  return [
    `MATCH (${from}:${s.model})`,
    `WHERE ${whereToCypher(ctx, from, s.from)}`,
    `MATCH (${to}:${s.model})`,
    `WHERE ${whereToCypher(ctx, to, s.to)}`,
    `MERGE (${from})${direction}(${to})`,
    `RETURN properties(r) AS relation`,
  ].join("\n");
}

/**
 * Emits a direction.
 * @param min The minimum value.
 * @param max The maximum value.
 * @param direction The direction.
 */
function directionalRel(
  min: number,
  max: number,
  direction?: "IN" | "OUT" | "BOTH",
) {
  const range = `[*${min}..${max}]`;

  switch (direction) {
    case "IN":
      return `<-${range}-`;
    case "OUT":
      return `-${range}->`;
    case "BOTH":
    default:
      return `-${range}-`;
  }
}

/**
 * Emits a Relation query statement.
 * @param ctx The context.
 * @param s The statement.
 * @returns A Cypher query.
 */
function emitRelationStatement(
  ctx: EmitContext,
  s: IR.RelationQueryStatement,
): string {
  const from = "a";
  const to = "b";
  const min = s.minDepth ?? 1;
  const max = s.maxDepth ?? s.limit ?? 5;
  const limit = s.limit ? `LIMIT ${s.limit}` : "";

  const relPattern = directionalRel(min, max, s.direction as any);
  const path = `p = (${from})${relPattern}(${to})`;

  return [
    `MATCH (${from}:${s.model})`,
    `WHERE ${whereToCypher(ctx, from, s.from)}`,
    `MATCH (${to}:${s.model})`,
    `WHERE ${whereToCypher(ctx, to, s.to)}`,
    `MATCH ${path}`,
    `RETURN p`,
    limit,
  ]
    .filter(Boolean)
    .join("\n");
}

function emitDisconnectStatement(
  ctx: EmitContext,
  s: IR.DisconnectStatement,
): string {
  const from = "a";
  const to = "b";
  const rel = s.relation.toUpperCase();

  // Make disconnect direction-agnostic unless explicitly specified
  const relPattern =
    s.direction === "IN"
      ? `<-[r:${rel}]-`
      : s.direction === "OUT"
        ? `-[r:${rel}]->`
        : `-[r:${rel}]-`; // default BOTH

  return [
    `MATCH (${from}:${s.model})`,
    `WHERE ${whereToCypher(ctx, from, s.from)}`,
    `MATCH (${to}:${s.model})`,
    `WHERE ${whereToCypher(ctx, to, s.to)}`,
    `MATCH (${from})${relPattern}(${to})`,
    `DELETE r`,
  ].join("\n");
}

export function emitTraverseStatement(
  ctx: EmitContext,
  s: IR.TraverseStatement,
): string {
  const startAlias = "a";
  const endAlias = "b";

  const min = s.minDepth ?? 1;
  const max = s.maxDepth ?? 5;

  // Build relationship type filter
  let relTypes = "";
  if (s.relationFilter) {
    const types = Array.isArray(s.relationFilter)
      ? s.relationFilter
      : [s.relationFilter];

    relTypes = ":" + types.map((t) => t.toUpperCase()).join("|:");
  }

  // IMPORTANT: range must follow type directly
  const relCore = `[r${relTypes}*${min}..${max}]`;

  let relPattern: string;
  switch (s.direction) {
    case "IN":
      relPattern = `<-${relCore}-`;
      break;
    case "OUT":
      relPattern = `-${relCore}->`;
      break;
    case "BOTH":
    default:
      relPattern = `-${relCore}-`;
      break;
  }

  const path = `p = (${startAlias})${relPattern}(${endAlias})`;

  const includeNodes = s.includeNodes ?? true;
  const includeEdges = s.includeEdges ?? false;

  let returnClause: string;

  if (includeNodes && includeEdges) {
    returnClause = `
RETURN {
  nodes: [n IN nodes(p) | properties(n)],
  edges: [e IN relationships(p) | properties(e)]
} AS traversal`;
  } else if (includeEdges) {
    returnClause = `
RETURN [e IN relationships(p) | properties(e)] AS edges`;
  } else if (includeNodes) {
    returnClause = `
RETURN [n IN nodes(p) | properties(n)] AS nodes`;
  } else {
    returnClause = `RETURN p`;
  }

  return [
    `MATCH (${startAlias})`,
    `WHERE ${whereToCypher(ctx, startAlias, s.start)}`,
    `MATCH ${path}`,
    returnClause.trim(),
  ].join("\n");
}
