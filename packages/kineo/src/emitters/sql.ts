import { defineEmitter } from "@/adapter";
import * as IR from "@/ir";

/**
 * A SQL dialect. A mini emitter for specific sections of SQL.
 */
export interface Dialect {
  /**
   * Emits an identifier.
   * @param name The name of the identifier.
   */
  identifier(name: string): string;
  /**
   * Emits a string.
   * @param value The string value.
   */
  string(value: string): string;
  /**
   * Emits an array.
   * @param values The array entries.
   */
  array(values: unknown[]): string;
  /**
   * Emits a limit/offset.
   * @param limit The limit.
   * @param offset The offset.
   */
  limitOffset(limit?: number, offset?: number): string;
  /**
   * Emits a boolean.
   * @param value The boolean value.
   */
  boolean(value: boolean): string;
  /**
   * Emits an upsert command.
   * @param table The table to upsert to.
   * @param args All necessary arguments for upserting.
   */
  upsert(table: string, ...args: unknown[]): string;
  /**
   * Emits an auto-incrementing integer.
   */
  autoIncrement(): string;
  /**
   * Emits the way to get the current date.
   */
  now(): string;
  /**
   * Emits a JSON extract.
   * @param column The column to extract.
   * @param path The path to extract.
   */
  jsonExtract(column: string, path: string): string;
  /**
   * Emits a type.
   * @param type The type to emit.
   */
  type(type: string): string;
  /**
   * Emits a return.
   * @param columns The columns to return.
   */
  returning(columns?: string[]): string;
}

// ---------- Context ---------- //

/**
 * Emitter context.
 */
interface Ctx {
  dialect: Dialect;
  params: any[];
  addParam(value: any): string;
}

/**
 * Creates a new emitter context.
 * @param dialect The dialect.
 * @returns A emitter context.
 */
function createCtx(dialect: Dialect): Ctx {
  return {
    dialect,
    params: [],
    addParam(value: any) {
      this.params.push(value);
      // parameter placeholder, supports 1-based ($1, $2...) for Postgres-style
      return `$${this.params.length}`;
    },
  };
}

/**
 * Emits an IR into SQL, taking in an IR and a dialect.
 */
const emit = defineEmitter<Dialect>((ir, dialect) => {
  const ctx: Ctx = createCtx(dialect!);
  const sqlStatements: string[] = [];

  for (const stmt of ir.statements) {
    switch (stmt.type) {
      case IR.StatementType.Find:
        sqlStatements.push(emitFind(ctx, stmt as IR.FindStatement));
        break;
      case IR.StatementType.Count:
        sqlStatements.push(emitCount(ctx, stmt as IR.CountStatement));
        break;
      case IR.StatementType.Create:
        sqlStatements.push(emitCreate(ctx, stmt as IR.CreateStatement));
        break;
      case IR.StatementType.Upsert:
        sqlStatements.push(emitUpsert(ctx, stmt as IR.UpdateStatement));
        break;
      case IR.StatementType.Delete:
        sqlStatements.push(emitDelete(ctx, stmt as IR.DeleteStatement));
        break;
      case IR.StatementType.Connect:
      case IR.StatementType.RelationQuery:
        throw new Error(
          `${stmt.type} is not supported by the SQL emitter (graph operations).`,
        );
      default:
        throw new Error(`Unsupported statement type: ${(stmt as any).type}`);
    }
  }

  // join statements into a single SQL script
  return {
    command: sqlStatements.join(";"),
    params: ctx.params.reduce(
      (acc, val, i) => (acc[`__param_${i}`] = val),
      {} as Record<string, any>,
    ),
  };
});
export default emit;

// column path support: for `user.profile.name` treat as JSON extraction if needed
function emitColumnOrJson(ctx: Ctx, key: string): string {
  // simple heuristic: dot means JSON path extraction
  if (key.includes(".")) {
    const [col, ...pathParts] = key.split(".");
    // dialect.jsonExtract(column, path) expects path as something like '$.a.b'
    const jsonPath = "$." + pathParts.join(".");
    return ctx.dialect.jsonExtract(ctx.dialect.identifier(col), jsonPath);
  }
  return ctx.dialect.identifier(key);
}

function literalForValue(ctx: Ctx, val: unknown): string {
  const d = ctx.dialect;
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "string") return d.string(val);
  if (typeof val === "boolean") return d.boolean(val);
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) return d.array(val);
  // objects -> naive JSON string representation
  return d.string(JSON.stringify(val));
}

/**
 * Emits a simple expression map into SQL.
 */
function emitWhere(ctx: Ctx, where?: Record<string, any>): string | undefined {
  if (!where || Object.keys(where).length === 0) return undefined;

  function expr(obj: any): string {
    // logical operators top-level
    if (obj && typeof obj === "object") {
      if ("AND" in obj && Array.isArray(obj.AND)) {
        const parts = obj.AND.map((p: any) => `(${expr(p)})`).join(" AND ");
        return parts || "1=1";
      }
      if ("OR" in obj && Array.isArray(obj.OR)) {
        const parts = obj.OR.map((p: any) => `(${expr(p)})`).join(" OR ");
        return parts || "1=0";
      }
    }

    // otherwise, assume a map of fields -> constraints
    const pieces: string[] = [];
    for (const k in obj) {
      const v = obj[k];

      // nested logical inside field is not expected
      // handle operators if v is object with operator keys
      if (v && typeof v === "object" && !Array.isArray(v)) {
        // operator map
        for (const opKey in v) {
          const operand = v[opKey];
          const colExpr = emitColumnOrJson(ctx, k);
          switch (opKey) {
            case "gt":
              pieces.push(`${colExpr} > ${literalForValue(ctx, operand)}`);
              break;
            case "gte":
              pieces.push(`${colExpr} >= ${literalForValue(ctx, operand)}`);
              break;
            case "lt":
              pieces.push(`${colExpr} < ${literalForValue(ctx, operand)}`);
              break;
            case "lte":
              pieces.push(`${colExpr} <= ${literalForValue(ctx, operand)}`);
              break;
            case "neq":
            case "not":
              pieces.push(`${colExpr} <> ${literalForValue(ctx, operand)}`);
              break;
            case "in":
              if (!Array.isArray(operand))
                throw new Error("`in` expects an array");
              pieces.push(`${colExpr} IN ${ctx.dialect.array(operand)}`);
              break;
            case "like":
              pieces.push(`${colExpr} LIKE ${literalForValue(ctx, operand)}`);
              break;
            case "contains":
              // fallback to JSON contains or LIKE depending on type
              if (typeof operand === "string") {
                pieces.push(
                  `${colExpr} LIKE ${literalForValue(ctx, `%${operand}%`)}`,
                );
              } else {
                pieces.push(`${colExpr} = ${literalForValue(ctx, operand)}`); // best-effort
              }
              break;
            default:
              // treat as equality fallback for unknown operator
              pieces.push(`${colExpr} = ${literalForValue(ctx, operand)}`);
          }
        }
      } else if (Array.isArray(v)) {
        // IN
        pieces.push(`${emitColumnOrJson(ctx, k)} IN ${ctx.dialect.array(v)}`);
      } else if (v === null) {
        pieces.push(`${emitColumnOrJson(ctx, k)} IS NULL`);
      } else {
        // equality
        pieces.push(`${emitColumnOrJson(ctx, k)} = ${literalForValue(ctx, v)}`);
      }
    }
    return pieces.join(" AND ");
  }

  const whereSql = expr(where);
  return whereSql ? `WHERE ${whereSql}` : undefined;
}

// -- Per-statement emitters -- //

function emitCreate(ctx: Ctx, s: IR.CreateStatement): string {
  const d = ctx.dialect;
  const data = s.data || {};
  const table = d.identifier(s.model);

  const columns = Object.keys(data);
  if (columns.length === 0)
    return `INSERT INTO ${table} DEFAULT VALUES ${d.returning(
      s.select ? Object.keys(s.select) : undefined,
    )}`.trim();

  const colList = columns.map((c) => d.identifier(c)).join(", ");
  const placeholders = columns
    .map((c) => literalForValue(ctx, data[c]))
    .join(", ");
  const returning = d.returning(s.select ? Object.keys(s.select) : undefined);

  return `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ${returning || ""}`.trim();
}

function emitUpsert(ctx: Ctx, s: IR.UpdateStatement): string {
  const d = ctx.dialect;
  const table = d.identifier(s.model);

  const createData = (s.data && (s.data as any).create) || {};
  const updateData = (s.data && (s.data as any).update) || {};

  const createCols = Object.keys(createData);
  const insertValues = createCols.map((c) =>
    literalForValue(ctx, createData[c]),
  );
  const conflictCols = s.where ? Object.keys(s.where) : [];

  const updateAssignments = Object.keys(updateData).map(
    (k) => `${d.identifier(k)} = ${literalForValue(ctx, updateData[k])}`,
  );

  const returning = d.returning(s.select ? Object.keys(s.select) : undefined);

  // Let the dialect handle the upsert syntax
  return d.upsert(table, {
    insertColumns: createCols,
    insertValues,
    conflictTarget: conflictCols,
    updateAssignments,
    returning,
  });
}

function emitDelete(ctx: Ctx, s: IR.DeleteStatement): string {
  const table = ctx.dialect.identifier(s.model);
  const whereFrag = emitWhere(ctx, s.where);
  return [`DELETE FROM ${table}`, whereFrag].filter(Boolean).join(" ");
}

function emitFind(ctx: Ctx, s: IR.FindStatement): string {
  const d = ctx.dialect;
  const table = d.identifier(s.model);
  const selectList =
    s.select && Object.keys(s.select).length
      ? Object.keys(s.select)
          .map((c) => d.identifier(c))
          .join(", ")
      : "*";

  const whereFrag = emitWhere(ctx, s.where);
  const orderBy = s.orderBy?.length
    ? `ORDER BY ${s.orderBy
        .map((ob) => {
          const [k, dir] = Object.entries(ob)[0];
          return `${d.identifier(k)} ${dir === "desc" ? "DESC" : "ASC"}`;
        })
        .join(", ")}`
    : undefined;
  const limitOffset = d.limitOffset(s.take, s.skip);

  return [`SELECT ${selectList} FROM ${table}`, whereFrag, orderBy, limitOffset]
    .filter(Boolean)
    .join(" ");
}

function emitCount(ctx: Ctx, s: IR.CountStatement): string {
  const table = ctx.dialect.identifier(s.model);
  const whereFrag = emitWhere(ctx, s.where);
  return [`SELECT COUNT(*) AS count FROM ${table}`, whereFrag]
    .filter(Boolean)
    .join(" ");
}
