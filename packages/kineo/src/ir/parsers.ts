import type * as IR from "./types";
import type {
  AggregateOpts,
  CountOpts,
  CreateOpts,
  DeleteOpts,
  FindOpts,
  GroupByOpts,
  UpdateOpts,
  UpsertOpts,
} from "@/runtime/types";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const makeTable = (name: string): IR.TableReference => ({
  type: "table",
  name,
});

const literal = (value: unknown): IR.Literal => ({
  type: "literal",
  value: value as IR.Literal["value"],
});

const expression = (value: unknown): IR.Expression => {
  if (value == null) return literal(value);

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    value instanceof Date ||
    value instanceof Uint8Array ||
    Array.isArray(value)
  ) {
    return literal(value);
  }

  if (isPlainObject(value) && typeof value.type === "string") {
    return value as unknown as IR.Expression;
  }

  return literal(value);
};

const makeExpressionSelect = (
  expression: IR.Expression,
  alias?: string,
): IR.SelectItem => ({
  type: "expression",
  expression,
  alias,
});

const makeStarSelect = (): IR.SelectItem => ({ type: "star" });

const andExpression = (items: IR.Expression[]): IR.Expression | undefined => {
  const [first, ...rest] = items;
  if (!first) return undefined;
  if (rest.length === 0) return first;
  return rest.reduce<IR.Expression>(
    (acc, item) => ({
      type: "binary",
      operator: "and",
      left: acc,
      right: item,
    }),
    first,
  );
};

const orExpression = (items: IR.Expression[]): IR.Expression | undefined => {
  const [first, ...rest] = items;
  if (!first) return undefined;
  if (rest.length === 0) return first;
  return rest.reduce<IR.Expression>(
    (acc, item) => ({
      type: "binary",
      operator: "or",
      left: acc,
      right: item,
    }),
    first,
  );
};

const parseColumnReference = (key: string): IR.ColumnReference => ({
  type: "column",
  name: key,
});

const parseFilterCondition = (
  column: IR.ColumnReference,
  condition: unknown,
): IR.Expression => {
  if (!isPlainObject(condition)) {
    return {
      type: "binary",
      operator: "=",
      left: column,
      right: expression(condition),
    };
  }

  const expressions: IR.Expression[] = [];

  for (const key of Object.keys(condition)) {
    const value = condition[key];

    switch (key) {
      case "equals":
        expressions.push({
          type: "binary",
          operator: "=",
          left: column,
          right: expression(value),
        });
        break;
      case "not": {
        const nested = parseFilterCondition(column, value);
        expressions.push({
          type: "unary",
          operator: "not",
          operand: nested,
        });
        break;
      }
      case "in":
        expressions.push({
          type: "in",
          expr: column,
          values: Array.isArray(value)
            ? value.map(expression)
            : [expression(value)],
        });
        break;
      case "notIn":
        expressions.push({
          type: "in",
          expr: column,
          values: Array.isArray(value)
            ? value.map(expression)
            : [expression(value)],
          not: true,
        });
        break;
      case "lt":
      case "lte":
      case "gt":
      case "gte":
        expressions.push({
          type: "binary",
          operator:
            key === "lt"
              ? "<"
              : key === "lte"
                ? "<="
                : key === "gt"
                  ? ">"
                  : ">=",
          left: column,
          right: expression(value),
        });
        break;
      case "contains":
        expressions.push({
          type: "binary",
          operator: "like",
          left: column,
          right: literal(`%${String(value)}%`),
        });
        break;
      case "startsWith":
        expressions.push({
          type: "binary",
          operator: "like",
          left: column,
          right: literal(`${String(value)}%`),
        });
        break;
      case "endsWith":
        expressions.push({
          type: "binary",
          operator: "like",
          left: column,
          right: literal(`%${String(value)}`),
        });
        break;
      case "is":
        expressions.push({
          type: "binary",
          operator: "is",
          left: column,
          right: expression(value),
        });
        break;
      case "isNot":
        expressions.push({
          type: "binary",
          operator: "is not",
          left: column,
          right: expression(value),
        });
        break;
      default:
        break;
    }
  }

  const [first, ...rest] = expressions;
  if (!first) return literal(true);
  if (rest.length === 0) return first;

  return rest.reduce<IR.Expression>(
    (acc, item) => ({
      type: "binary",
      operator: "and",
      left: acc,
      right: item,
    }),
    first,
  );
};

const parseWhere = (where?: unknown): IR.Expression | undefined => {
  if (!where || !isPlainObject(where)) return undefined;

  const expressions: IR.Expression[] = [];

  for (const key of Object.keys(where)) {
    const value = (where as Record<string, unknown>)[key];

    if (key === "AND") {
      const items = Array.isArray(value)
        ? (value.map(parseWhere).filter(Boolean) as IR.Expression[])
        : ([parseWhere(value)].filter(Boolean) as IR.Expression[]);
      const node = andExpression(items);
      if (node) expressions.push(node);
      continue;
    }

    if (key === "OR") {
      const items = Array.isArray(value)
        ? (value.map(parseWhere).filter(Boolean) as IR.Expression[])
        : ([parseWhere(value)].filter(Boolean) as IR.Expression[]);
      const node = orExpression(items);
      if (node) expressions.push(node);
      continue;
    }

    if (key === "NOT") {
      const item = parseWhere(value);
      if (item) {
        expressions.push({
          type: "unary",
          operator: "not",
          operand: item,
        });
      }
      continue;
    }

    expressions.push(parseFilterCondition(parseColumnReference(key), value));
  }

  return andExpression(expressions) ?? undefined;
};

const parseSelect = (select?: Record<string, true>): IR.SelectItem[] => {
  if (!select) return [makeStarSelect()];
  return Object.keys(select).map((key) =>
    makeExpressionSelect(parseColumnReference(key), key),
  );
};

const parseOrderBy = (orderBy?: unknown): IR.OrderByItem[] | undefined => {
  if (!orderBy) return undefined;

  const entries = Array.isArray(orderBy)
    ? orderBy.flatMap((item) =>
        isPlainObject(item) ? Object.entries(item) : [],
      )
    : isPlainObject(orderBy)
      ? Object.entries(orderBy)
      : [];

  return entries.map(([key, direction]) => ({
    expression: parseColumnReference(key),
    direction: direction === "desc" ? "desc" : "asc",
  }));
};

const updateValue = (
  value: unknown,
  column: IR.ColumnReference,
): IR.Expression => {
  if (!isPlainObject(value)) return expression(value);

  if (Object.prototype.hasOwnProperty.call(value, "set")) {
    return expression((value as Record<string, unknown>).set);
  }

  if (Object.prototype.hasOwnProperty.call(value, "increment")) {
    return {
      type: "binary",
      operator: "+",
      left: column,
      right: expression((value as Record<string, unknown>).increment),
    };
  }

  if (Object.prototype.hasOwnProperty.call(value, "decrement")) {
    return {
      type: "binary",
      operator: "-",
      left: column,
      right: expression((value as Record<string, unknown>).decrement),
    };
  }

  if (Object.prototype.hasOwnProperty.call(value, "multiply")) {
    return {
      type: "binary",
      operator: "*",
      left: column,
      right: expression((value as Record<string, unknown>).multiply),
    };
  }

  if (Object.prototype.hasOwnProperty.call(value, "divide")) {
    return {
      type: "binary",
      operator: "/",
      left: column,
      right: expression((value as Record<string, unknown>).divide),
    };
  }

  return expression(value);
};

const parseUpdateData = (
  data: Record<string, unknown>,
): Record<string, IR.Expression> => {
  const result: Record<string, IR.Expression> = {};
  for (const key of Object.keys(data)) {
    const column = parseColumnReference(key);
    result[key] = updateValue(data[key], column);
  }
  return result;
};

const inferConflictTarget = (where: unknown): string[] | undefined => {
  const items = Array.isArray(where) ? where : [where];

  if (items.some((item) => !isPlainObject(item))) return undefined;

  const keys = items
    .map((item) => Object.keys(item as Record<string, unknown>))
    .filter((list) => list.length > 0);

  if (keys.length === 0) return undefined;

  const [first, ...rest] = keys;
  if (!first) return undefined;
  return rest.reduce<string[]>(
    (acc, next) => acc.filter((value) => next.includes(value)),
    first,
  );
};

export function parseFindStatement(
  table: string,
  opts?: FindOpts<any, any, any, any>,
): IR.QueryStatement {
  return {
    type: "query",
    select: parseSelect(opts?.select as Record<string, true> | undefined),
    from: [makeTable(table)],
    where: parseWhere(opts?.where),
    orderBy: parseOrderBy(opts?.orderBy),
    limit: opts?.take,
    offset: opts?.skip,
    distinct: opts?.distinct
      ? (opts.distinct as string[]).map((column) =>
          parseColumnReference(column),
        )
      : undefined,
  };
}

export function parseInsertStatement(
  table: string,
  opts: CreateOpts<any, any, any, any, any>,
): IR.InsertStatement {
  const rows = Array.isArray(opts.data) ? opts.data : [opts.data];
  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row as Record<string, unknown>))),
  );

  return {
    type: "insert",
    into: makeTable(table),
    columns,
    values: rows.map((row) =>
      columns.map((column) =>
        expression((row as Record<string, unknown>)[column]),
      ),
    ),
    returning: opts.select
      ? parseSelect(opts.select as Record<string, true>)
      : undefined,
  };
}

export function parseUpdateStatement(
  table: string,
  opts: UpdateOpts<any, any, any, any, any>,
): IR.UpdateStatement {
  return {
    type: "update",
    table: makeTable(table),
    set: parseUpdateData(opts.data as Record<string, unknown>),
    where: parseWhere(opts.where),
    returning: opts.select
      ? parseSelect(opts.select as Record<string, true>)
      : undefined,
  };
}

export function parseDeleteStatement(
  table: string,
  opts: DeleteOpts<any, any, any, any, any>,
): IR.DeleteStatement {
  return {
    type: "delete",
    from: makeTable(table),
    where: parseWhere(opts.where),
    returning: opts.select
      ? parseSelect(opts.select as Record<string, true>)
      : undefined,
  };
}

export function parseUpsertStatement(
  table: string,
  opts: UpsertOpts<any, any, any, any, any>,
): IR.InsertStatement {
  const createRows = Array.isArray(opts.create) ? opts.create : [opts.create];
  const columns = Array.from(
    new Set(
      createRows.flatMap((row) => Object.keys(row as Record<string, unknown>)),
    ),
  );

  return {
    type: "insert",
    into: makeTable(table),
    columns,
    values: createRows.map((row) =>
      columns.map((column) =>
        expression((row as Record<string, unknown>)[column]),
      ),
    ),
    returning: opts.select
      ? parseSelect(opts.select as Record<string, true>)
      : undefined,
    onConflict: {
      target: inferConflictTarget(opts.where),
      where: parseWhere(opts.where),
      action: {
        type: "doUpdate",
        set: parseUpdateData(opts.update as Record<string, unknown>),
      },
    },
  };
}

export function parseCountStatement(
  table: string,
  opts?: CountOpts<any, any, any, any>,
): IR.QueryStatement {
  return {
    type: "query",
    select: [
      {
        type: "expression",
        expression: {
          type: "function",
          name: "count",
          args: [{ type: "literal", value: "*" }],
        },
        alias: "_count",
      },
    ],
    from: [makeTable(table)],
    where: parseWhere(opts?.where),
    orderBy: parseOrderBy(opts?.orderBy),
    limit: opts?.take,
    offset: opts?.skip,
  };
}

const parseAggregateSelect = (
  opts: AggregateOpts<any, any, any, any>,
): IR.SelectItem[] => {
  const select: IR.SelectItem[] = [];

  if (opts.by) {
    select.push(
      ...opts.by.map((column) =>
        makeExpressionSelect(
          parseColumnReference(String(column)),
          String(column),
        ),
      ),
    );
  }

  if (opts._count) {
    if (opts._count === true) {
      select.push(
        makeExpressionSelect(
          {
            type: "function",
            name: "count",
            args: [{ type: "literal", value: "*" }],
          },
          "_count",
        ),
      );
    } else if (opts._count.select) {
      select.push(
        ...Object.keys(opts._count.select).map((column) =>
          makeExpressionSelect(
            {
              type: "function",
              name: "count",
              args: [parseColumnReference(column)],
            },
            `_count_${column}`,
          ),
        ),
      );
    }
  }

  const aggregateGroup = ["_min", "_max", "_avg", "_sum"] as const;

  for (const key of aggregateGroup) {
    const property = opts[key];
    if (!property?.select) continue;
    select.push(
      ...Object.keys(property.select).map((column) =>
        makeExpressionSelect(
          {
            type: "function",
            name: key.slice(1),
            args: [parseColumnReference(column)],
          },
          `${key}_${column}`,
        ),
      ),
    );
  }

  return select.length > 0 ? select : [{ type: "star" }];
};

export function parseAggregateStatement(
  table: string,
  opts: AggregateOpts<any, any, any, any>,
): IR.QueryStatement {
  return {
    type: "query",
    select: parseAggregateSelect(opts),
    from: [makeTable(table)],
    where: parseWhere(opts.where),
    groupBy: opts.by
      ? opts.by.map((column) => parseColumnReference(String(column)))
      : undefined,
    orderBy: parseOrderBy(opts.orderBy),
    limit: opts.take,
    offset: opts.skip,
  };
}

const parseGroupByHaving = (
  having?: GroupByOpts<any, any, any, any>["having"],
): IR.Expression | undefined => {
  if (!having) return undefined;

  const expressions: IR.Expression[] = [];

  for (const key of Object.keys(having) as Array<keyof typeof having>) {
    const value = having[key as string];

    if (key === "_count") {
      if (typeof value === "number") {
        expressions.push({
          type: "binary",
          operator: "=",
          left: {
            type: "function",
            name: "count",
            args: [{ type: "literal", value: "*" }],
          },
          right: expression(value),
        });
      } else if (isPlainObject(value)) {
        for (const op of ["gt", "gte", "lt", "lte"] as const) {
          if (Object.prototype.hasOwnProperty.call(value, op)) {
            expressions.push({
              type: "binary",
              operator:
                op === "gt"
                  ? ">"
                  : op === "gte"
                    ? ">="
                    : op === "lt"
                      ? "<"
                      : "<=",
              left: {
                type: "function",
                name: "count",
                args: [{ type: "literal", value: "*" }],
              },
              right: expression((value as Record<string, unknown>)[op]),
            });
          }
        }
      }
      continue;
    }

    if (isPlainObject(value)) {
      for (const op of ["gt", "gte", "lt", "lte"] as const) {
        if (Object.prototype.hasOwnProperty.call(value, op)) {
          expressions.push({
            type: "binary",
            operator:
              op === "gt"
                ? ">"
                : op === "gte"
                  ? ">="
                  : op === "lt"
                    ? "<"
                    : "<=",
            left: parseColumnReference(String(key)),
            right: expression((value as Record<string, unknown>)[op]),
          });
        }
      }
      continue;
    }

    expressions.push({
      type: "binary",
      operator: "=",
      left: parseColumnReference(String(key)),
      right: expression(value),
    });
  }

  return andExpression(expressions);
};

export function parseGroupByStatement(
  table: string,
  opts: GroupByOpts<any, any, any, any>,
): IR.QueryStatement {
  const select: IR.SelectItem[] = [
    ...opts.by.map((column) =>
      makeExpressionSelect(
        parseColumnReference(String(column)),
        String(column),
      ),
    ),
  ];

  if (opts.having) {
    select.push(
      makeExpressionSelect(
        {
          type: "function",
          name: "count",
          args: [{ type: "literal", value: "*" }],
        },
        "_count",
      ),
    );
  }

  return {
    type: "query",
    select,
    from: [makeTable(table)],
    where: parseWhere(opts.where),
    groupBy: opts.by.map((column) => parseColumnReference(String(column))),
    having: parseGroupByHaving(opts.having),
    orderBy: parseOrderBy(opts.orderBy),
    limit: opts.take,
    offset: opts.skip,
  };
}
