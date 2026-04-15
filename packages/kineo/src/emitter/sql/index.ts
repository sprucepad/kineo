import type { Emitter } from "@/adapter";
import type {
  Statement,
  QueryStatement,
  InsertStatement,
  UpdateStatement,
  DeleteStatement,
  TableExpression,
  TableReference,
  Join,
  SetOperation,
  SelectItem,
  OrderByItem,
  WindowDefinition,
  WindowFrame,
  FrameBound,
  Expression,
  UnaryOperator,
  BinaryOperator,
  OnConflict,
} from "@/ir";

export interface SQLDialect {
  quoteIdentifier(name: string): string;
  placeholder(index: number): string;
  formatIdentifier?(name: string, schema?: string): string;
  castType?(type: string): string;
  supportsReturning?: boolean;
  renderReturning?(items: SelectItem[]): string;
  renderOnConflict?(conflict: OnConflict, ctx: RenderContext): string;
  renderDistinctOn?(expressions: Expression[], ctx: RenderContext): string;
  renderJsonAccess?(
    exprSql: string,
    path: (string | number)[],
    operator?: string,
  ): string;
  renderLimitOffset?(limit?: number, offset?: number): string;
  renderWindowFrame?(frame: WindowFrame): string;
  binaryOperatorMap?: Partial<Record<BinaryOperator, string>>;
  unaryOperatorMap?: Partial<Record<UnaryOperator, string>>;
}

interface RenderContext {
  params: any[];
  dialect: SQLDialect;
  nextParam(value: unknown): string;
}

const defaultBinaryOperatorMap: Record<BinaryOperator, string> = {
  "=": "=",
  "!=": "!=",
  "<>": "<>",
  "<": "<",
  ">": ">",
  "<=": "<=",
  ">=": ">=",
  like: "LIKE",
  "not like": "NOT LIKE",
  ilike: "ILIKE",
  "not ilike": "NOT ILIKE",
  "similar to": "SIMILAR TO",
  "not similar to": "NOT SIMILAR TO",
  in: "IN",
  "not in": "NOT IN",
  is: "IS",
  "is not": "IS NOT",
  "+": "+",
  "-": "-",
  "*": "*",
  "/": "/",
  "%": "%",
  "||": "||",
  and: "AND",
  or: "OR",
};

const defaultUnaryOperatorMap: Record<UnaryOperator, string> = {
  "-": "-",
  "+": "+",
  not: "NOT",
  "is null": "IS NULL",
  "is not null": "IS NOT NULL",
};

const defaultDialectMethods = {
  formatIdentifier: (
    name: string,
    schema: string | undefined,
    dialect: SQLDialect,
  ) => {
    const quoted = dialect.quoteIdentifier(name);
    if (!schema) {
      return quoted;
    }
    return `${dialect.quoteIdentifier(schema)}.${quoted}`;
  },
  renderJsonAccess: (
    exprSql: string,
    path: (string | number)[],
    operator?: string,
  ) => {
    if (!operator) {
      operator = "->";
    }

    const quotedPath = path.map((segment) => {
      if (typeof segment === "number") {
        return segment.toString();
      }
      return `'${segment.replace(/'/g, "''")}'`;
    });

    if (operator === "#>" || operator === "#>>") {
      return `${exprSql} ${operator} '{${quotedPath.map((part) => part.replace(/'/g, "")).join(",")}}'`;
    }

    return quotedPath.reduce(
      (current, segment) => `${current} ${operator} ${segment}`,
      exprSql,
    );
  },
  renderLimitOffset: (limit?: number, offset?: number) => {
    if (limit == null && offset == null) {
      return "";
    }

    let fragment = "";
    if (limit != null) {
      fragment += ` LIMIT ${limit}`;
    }
    if (offset != null) {
      fragment += ` OFFSET ${offset}`;
    }
    return fragment;
  },
  renderWindowFrame: (frame: WindowFrame) => {
    const start = renderFrameBound(frame.start);
    const end = frame.end ? ` AND ${renderFrameBound(frame.end)}` : "";
    return `${frame.type.toUpperCase()} BETWEEN ${start}${end}`;
  },
};

const renderFrameBound = (bound: FrameBound): string => {
  switch (bound.type) {
    case "unboundedPreceding":
      return "UNBOUNDED PRECEDING";
    case "preceding":
      return `${bound.value} PRECEDING`;
    case "currentRow":
      return "CURRENT ROW";
    case "following":
      return `${bound.value} FOLLOWING`;
    case "unboundedFollowing":
      return "UNBOUNDED FOLLOWING";
  }
};

const renderIdentifier = (
  ctx: RenderContext,
  name: string,
  schema?: string,
): string => {
  const dialect = ctx.dialect;
  const formatter =
    dialect.formatIdentifier ??
    ((name: string, schema?: string) =>
      defaultDialectMethods.formatIdentifier(name, schema, dialect));
  return formatter(name, schema);
};

const renderTableReference = (
  ctx: RenderContext,
  table: TableReference,
): string => {
  const text = renderIdentifier(ctx, table.name, table.schema);
  if (table.alias) {
    return `${text} AS ${ctx.dialect.quoteIdentifier(table.alias)}`;
  }
  return text;
};

const renderTableExpression = (
  ctx: RenderContext,
  expression: TableExpression,
): string => {
  switch (expression.type) {
    case "table":
      return renderTableReference(ctx, expression);
    case "subquery": {
      const subquery = renderQueryStatement(ctx, expression.query);
      return `(${subquery}) AS ${ctx.dialect.quoteIdentifier(expression.alias)}`;
    }
    case "values": {
      const rows = expression.rows
        .map(
          (row) =>
            `(${row.map((expr) => renderExpression(ctx, expr)).join(", ")})`,
        )
        .join(", ");
      let valuesSql = `VALUES ${rows}`;
      if (expression.alias) {
        valuesSql += ` AS ${ctx.dialect.quoteIdentifier(expression.alias)}`;
        if (expression.columns?.length) {
          valuesSql += ` (${expression.columns.map((column) => ctx.dialect.quoteIdentifier(column)).join(", ")})`;
        }
      }
      return valuesSql;
    }
  }
};

const renderExpressionList = (
  ctx: RenderContext,
  expressions: Expression[],
): string => expressions.map((expr) => renderExpression(ctx, expr)).join(", ");

const renderSelectItem = (ctx: RenderContext, item: SelectItem): string => {
  if (item.type === "star") {
    const prefix = item.table
      ? `${ctx.dialect.quoteIdentifier(item.table)}.`
      : "";
    return `${prefix}*`;
  }

  const content = item.expression ? renderExpression(ctx, item.expression) : "";
  if (item.alias) {
    return `${content} AS ${ctx.dialect.quoteIdentifier(item.alias)}`;
  }
  return content;
};

const renderOrderByItem = (ctx: RenderContext, item: OrderByItem): string => {
  const expression = renderExpression(ctx, item.expression);
  const direction = item.direction ? ` ${item.direction.toUpperCase()}` : "";
  const nulls = item.nulls ? ` NULLS ${item.nulls.toUpperCase()}` : "";
  const collation = item.collation
    ? ` COLLATE ${ctx.dialect.quoteIdentifier(item.collation)}`
    : "";
  return `${expression}${direction}${collation}${nulls}`;
};

const renderWindowDefinition = (
  ctx: RenderContext,
  window: WindowDefinition,
): string => {
  const partitionBy = window.partitionBy
    ? `PARTITION BY ${renderExpressionList(ctx, window.partitionBy)}`
    : "";
  const orderBy = window.orderBy
    ? `ORDER BY ${window.orderBy.map((item) => renderOrderByItem(ctx, item)).join(", ")}`
    : "";
  const frame = window.frame
    ? ` ${ctx.dialect.renderWindowFrame?.(window.frame) ?? defaultDialectMethods.renderWindowFrame(window.frame)}`
    : "";
  const clauses = [partitionBy, orderBy].filter(Boolean).join(" ");
  return `${ctx.dialect.quoteIdentifier(window.name)} AS (${clauses}${frame ? ` ${frame}` : ""})`;
};

const renderDistinct = (
  ctx: RenderContext,
  distinct?: boolean | Expression[],
): string => {
  if (!distinct) {
    return "";
  }
  if (distinct === true) {
    return "DISTINCT ";
  }
  if (Array.isArray(distinct)) {
    if (ctx.dialect.renderDistinctOn) {
      return ctx.dialect.renderDistinctOn(distinct, ctx);
    }
    return `DISTINCT ON (${distinct.map((expr) => renderExpression(ctx, expr)).join(", ")}) `;
  }
  return "";
};

const renderSetOperations = (
  ctx: RenderContext,
  setOperations: SetOperation[],
): string =>
  setOperations
    .map((operation) => {
      const op = operation.operation.toUpperCase();
      const all = operation.all ? " ALL" : "";
      return `${op}${all} ${renderQueryStatement(ctx, operation.query)}`;
    })
    .join(" ");

const renderReturning = (ctx: RenderContext, items: SelectItem[]): string => {
  if (ctx.dialect.renderReturning) {
    return ctx.dialect.renderReturning(items);
  }
  return `RETURNING ${items.map((item) => renderSelectItem(ctx, item)).join(", ")}`;
};

const renderOnConflict = (
  ctx: RenderContext,
  onConflict: OnConflict,
): string => {
  if (ctx.dialect.renderOnConflict) {
    return ctx.dialect.renderOnConflict(onConflict, ctx);
  }

  const target = onConflict.target
    ? ` (${onConflict.target.map((column) => ctx.dialect.quoteIdentifier(column)).join(", ")})`
    : "";
  const where = onConflict.where
    ? ` WHERE ${renderExpression(ctx, onConflict.where)}`
    : "";

  if (onConflict.action.type === "doNothing") {
    return `ON CONFLICT${target}${where} DO NOTHING`;
  }

  const assignments = Object.entries(onConflict.action.set)
    .map(
      ([column, expression]) =>
        `${ctx.dialect.quoteIdentifier(column)} = ${renderExpression(ctx, expression)}`,
    )
    .join(", ");

  return `ON CONFLICT${target}${where} DO UPDATE SET ${assignments}`;
};

const renderExpression = (
  ctx: RenderContext,
  expression: Expression,
): string => {
  const dialect = ctx.dialect;
  switch (expression.type) {
    case "column": {
      const name = ctx.dialect.quoteIdentifier(expression.name);
      const table = expression.table
        ? `${ctx.dialect.quoteIdentifier(expression.table)}.`
        : "";
      return `${table}${name}`;
    }
    case "literal": {
      if (expression.value === null) {
        return "NULL";
      }
      if (
        typeof expression.value === "string" ||
        typeof expression.value === "number" ||
        typeof expression.value === "boolean" ||
        expression.value instanceof Date ||
        typeof expression.value === "bigint" ||
        expression.value instanceof Uint8Array ||
        Array.isArray(expression.value)
      ) {
        return ctx.nextParam(expression.value);
      }
      return ctx.nextParam(expression.value);
    }
    case "parameter": {
      return ctx.nextParam(expression.value);
    }
    case "function": {
      const distinct = expression.distinct ? "DISTINCT " : "";
      return `${expression.name}(${distinct}${expression.args.map((arg) => renderExpression(ctx, arg)).join(", ")})`;
    }
    case "unary": {
      const operator =
        dialect.unaryOperatorMap?.[expression.operator] ??
        defaultUnaryOperatorMap[expression.operator];
      const operand = renderExpression(ctx, expression.operand);
      if (
        expression.operator === "is null" ||
        expression.operator === "is not null"
      ) {
        return `${operand} ${operator}`;
      }
      return `${operator} ${operand}`;
    }
    case "binary": {
      const operator =
        dialect.binaryOperatorMap?.[expression.operator] ??
        defaultBinaryOperatorMap[expression.operator];
      const left = renderExpression(ctx, expression.left);
      const right = renderExpression(ctx, expression.right);
      return `${left} ${operator} ${right}`;
    }
    case "between": {
      const not = expression.not ? "NOT " : "";
      return `${renderExpression(ctx, expression.expr)} ${not}BETWEEN ${renderExpression(ctx, expression.lower)} AND ${renderExpression(ctx, expression.upper)}`;
    }
    case "in": {
      const not = expression.not ? "NOT " : "";
      const expr = renderExpression(ctx, expression.expr);
      if (Array.isArray(expression.values)) {
        return `${expr} ${not}IN (${expression.values.map((value) => renderExpression(ctx, value)).join(", ")})`;
      }
      return `${expr} ${not}IN (${renderQueryStatement(ctx, expression.values)})`;
    }
    case "exists": {
      const not = expression.not ? "NOT " : "";
      return `${not}EXISTS (${renderQueryStatement(ctx, expression.query)})`;
    }
    case "case": {
      const branches = expression.cases
        .map(
          (branch) =>
            `WHEN ${renderExpression(ctx, branch.when)} THEN ${renderExpression(ctx, branch.then)}`,
        )
        .join(" ");
      const otherwise = expression.else
        ? ` ELSE ${renderExpression(ctx, expression.else)}`
        : "";
      return `CASE ${branches}${otherwise} END`;
    }
    case "cast": {
      const type = ctx.dialect.castType
        ? ctx.dialect.castType(expression.to)
        : expression.to;
      return `CAST(${renderExpression(ctx, expression.expr)} AS ${type})`;
    }
    case "jsonAccess": {
      const exprSql = renderExpression(ctx, expression.expr);
      return ctx.dialect.renderJsonAccess
        ? ctx.dialect.renderJsonAccess(
            exprSql,
            expression.path,
            expression.operator,
          )
        : defaultDialectMethods.renderJsonAccess(
            exprSql,
            expression.path,
            expression.operator,
          );
    }
  }
};

const renderJoin = (ctx: RenderContext, join: Join): string => {
  const target = renderTableExpression(ctx, join.target);
  const using = join.using
    ? ` USING (${join.using.map((column) => ctx.dialect.quoteIdentifier(column)).join(", ")})`
    : "";
  const on = join.on ? ` ON ${renderExpression(ctx, join.on)}` : "";
  const lateral = join.lateral ? "LATERAL " : "";
  return `${join.joinType.toUpperCase()} JOIN ${lateral}${target}${using}${on}`;
};

const renderQueryStatement = (
  ctx: RenderContext,
  statement: QueryStatement,
): string => {
  const withClause = statement.with
    ? `WITH ${statement.with
        .map((clause) => {
          const recursive = clause.recursive ? "RECURSIVE " : "";
          return `${recursive}${ctx.dialect.quoteIdentifier(clause.alias)} AS (${renderQueryStatement(ctx, clause.query)})`;
        })
        .join(", ")} `
    : "";

  const distinct = renderDistinct(ctx, statement.distinct);
  const select = `SELECT ${distinct}${statement.select.map((item) => renderSelectItem(ctx, item)).join(", ")}`;
  const from = statement.from
    ? ` FROM ${statement.from.map((expr) => renderTableExpression(ctx, expr)).join(", ")}`
    : "";
  const joins = statement.joins
    ? ` ${statement.joins.map((join) => renderJoin(ctx, join)).join(" ")}`
    : "";
  const where = statement.where
    ? ` WHERE ${renderExpression(ctx, statement.where)}`
    : "";
  const groupBy = statement.groupBy
    ? ` GROUP BY ${statement.groupBy.map((expr) => renderExpression(ctx, expr)).join(", ")}`
    : "";
  const having = statement.having
    ? ` HAVING ${renderExpression(ctx, statement.having)}`
    : "";
  const window = statement.window
    ? ` WINDOW ${statement.window.map((windowDef) => renderWindowDefinition(ctx, windowDef)).join(", ")}`
    : "";
  const orderBy = statement.orderBy
    ? ` ORDER BY ${statement.orderBy.map((item) => renderOrderByItem(ctx, item)).join(", ")}`
    : "";
  const limitOffset = ctx.dialect.renderLimitOffset
    ? ctx.dialect.renderLimitOffset(statement.limit, statement.offset)
    : defaultDialectMethods.renderLimitOffset(
        statement.limit,
        statement.offset,
      );
  const setOperations = statement.setOperations
    ? ` ${renderSetOperations(ctx, statement.setOperations)}`
    : "";

  return `${withClause}${select}${from}${joins}${where}${groupBy}${having}${window}${orderBy}${limitOffset}${setOperations}`.trim();
};

const renderInsertStatement = (
  ctx: RenderContext,
  statement: InsertStatement,
): string => {
  const table = renderTableReference(ctx, statement.into);
  const columns = statement.columns
    ? ` (${statement.columns.map((column) => ctx.dialect.quoteIdentifier(column)).join(", ")})`
    : "";
  const values = statement.values
    ? ` VALUES ${statement.values
        .map(
          (row) =>
            `(${row.map((expr) => renderExpression(ctx, expr)).join(", ")})`,
        )
        .join(", ")}`
    : "";
  const returning = statement.returning
    ? ` ${renderReturning(ctx, statement.returning)}`
    : "";
  const onConflict = statement.onConflict
    ? ` ${renderOnConflict(ctx, statement.onConflict)}`
    : "";

  return `INSERT INTO ${table}${columns}${values}${onConflict}${returning}`.trim();
};

const renderUpdateStatement = (
  ctx: RenderContext,
  statement: UpdateStatement,
): string => {
  const table = renderTableReference(ctx, statement.table);
  const set = Object.entries(statement.set)
    .map(
      ([column, expr]) =>
        `${ctx.dialect.quoteIdentifier(column)} = ${renderExpression(ctx, expr)}`,
    )
    .join(", ");
  const from = statement.from
    ? ` FROM ${statement.from.map((expr) => renderTableExpression(ctx, expr)).join(", ")}`
    : "";
  const where = statement.where
    ? ` WHERE ${renderExpression(ctx, statement.where)}`
    : "";
  const returning = statement.returning
    ? ` ${renderReturning(ctx, statement.returning)}`
    : "";

  return `UPDATE ${table} SET ${set}${from}${where}${returning}`.trim();
};

const renderDeleteStatement = (
  ctx: RenderContext,
  statement: DeleteStatement,
): string => {
  const table = renderTableReference(ctx, statement.from);
  const where = statement.where
    ? ` WHERE ${renderExpression(ctx, statement.where)}`
    : "";
  const returning = statement.returning
    ? ` ${renderReturning(ctx, statement.returning)}`
    : "";

  return `DELETE FROM ${table}${where}${returning}`.trim();
};

const renderStatement = (ctx: RenderContext, statement: Statement): string => {
  switch (statement.type) {
    case "query":
      return renderQueryStatement(ctx, statement);
    case "insert":
      return renderInsertStatement(ctx, statement);
    case "update":
      return renderUpdateStatement(ctx, statement);
    case "delete":
      return renderDeleteStatement(ctx, statement);
  }
};

export default (async (ir, dialect) => {
  const params: any[] = [];
  const ctx: RenderContext = {
    params,
    dialect,
    nextParam(value: unknown) {
      const index = params.length + 1;
      params.push(value);
      return dialect.placeholder(index);
    },
  };

  const sql = ir.map((statement) => renderStatement(ctx, statement)).join("; ");
  return {
    command: sql,
    params,
  };
}) satisfies Emitter<SQLDialect>;
