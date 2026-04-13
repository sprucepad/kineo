export type Statement =
  | QueryStatement
  | InsertStatement
  | UpdateStatement
  | DeleteStatement;

// Count, aggregate, and groupBy can all be represented as query statements
// with aggregate expressions in `select`, `groupBy`, and optional `having`.
export interface QueryStatement {
  type: "query";
  with?: WithClause[];
  distinct?: boolean | Expression[];
  select: SelectItem[];
  from?: TableExpression[];
  joins?: Join[];
  where?: Expression;
  groupBy?: Expression[];
  having?: Expression;
  window?: WindowDefinition[];
  orderBy?: OrderByItem[];
  limit?: number;
  offset?: number;
  setOperations?: SetOperation[];
}

export interface InsertStatement {
  type: "insert";
  into: TableReference;
  columns?: string[];
  values?: Expression[][];
  returning?: SelectItem[];
  onConflict?: OnConflict;
}

export interface UpdateStatement {
  type: "update";
  table: TableReference;
  set: Record<string, Expression>;
  from?: TableExpression[];
  where?: Expression;
  returning?: SelectItem[];
}

export interface DeleteStatement {
  type: "delete";
  from: TableReference;
  where?: Expression;
  returning?: SelectItem[];
}

export interface WithClause {
  alias: string;
  query: QueryStatement;
  recursive?: boolean;
}

export type TableExpression =
  | TableReference
  | SubqueryExpression
  | ValuesExpression;

export interface TableReference {
  type: "table";
  name: string;
  alias?: string;
  schema?: string;
}

export interface SubqueryExpression {
  type: "subquery";
  query: QueryStatement;
  alias: string;
}

export interface ValuesExpression {
  type: "values";
  rows: Expression[][];
  alias?: string;
  columns?: string[];
}

export interface Join {
  type: "join";
  joinType: "inner" | "left" | "right" | "full" | "cross" | "natural";
  target: TableExpression;
  on?: Expression;
  using?: string[];
  lateral?: boolean;
}

export interface SetOperation {
  operation: "union" | "intersect" | "except";
  all?: boolean;
  query: QueryStatement;
}

export interface SelectItem {
  type: "star" | "expression";
  expression?: Expression;
  alias?: string;
  table?: string;
}

export interface OrderByItem {
  expression: Expression;
  direction?: "asc" | "desc";
  nulls?: "first" | "last";
  collation?: string;
}

export interface WindowDefinition {
  name: string;
  partitionBy?: Expression[];
  orderBy?: OrderByItem[];
  frame?: WindowFrame;
}

export interface WindowFrame {
  type: "rows" | "range";
  start: FrameBound;
  end?: FrameBound;
}

export type FrameBound =
  | { type: "unboundedPreceding" }
  | { type: "preceding"; value: number }
  | { type: "currentRow" }
  | { type: "following"; value: number }
  | { type: "unboundedFollowing" };

export type Expression =
  | ColumnReference
  | Literal
  | Parameter
  | FunctionCall
  | UnaryExpression
  | BinaryExpression
  | BetweenExpression
  | InExpression
  | ExistsExpression
  | CaseExpression
  | CastExpression
  | JsonAccessExpression;

export interface ColumnReference {
  type: "column";
  name: string;
  table?: string;
  alias?: string;
}

export interface Literal {
  type: "literal";
  value:
    | string
    | number
    | boolean
    | null
    | Date
    | bigint
    | Uint8Array
    | readonly any[];
}

export interface Parameter {
  type: "parameter";
  name?: string;
  position?: number;
  value?: unknown;
}

export interface FunctionCall {
  type: "function";
  name: string;
  args: Expression[];
  distinct?: boolean;
}

export interface UnaryExpression {
  type: "unary";
  operator: UnaryOperator;
  operand: Expression;
}

export interface BinaryExpression {
  type: "binary";
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export interface BetweenExpression {
  type: "between";
  expr: Expression;
  lower: Expression;
  upper: Expression;
  not?: boolean;
}

export interface InExpression {
  type: "in";
  expr: Expression;
  values: Expression[] | QueryStatement;
  not?: boolean;
}

export interface ExistsExpression {
  type: "exists";
  query: QueryStatement;
  not?: boolean;
}

export interface CaseExpression {
  type: "case";
  cases: CaseWhen[];
  else?: Expression;
}

export interface CaseWhen {
  when: Expression;
  then: Expression;
}

export interface CastExpression {
  type: "cast";
  expr: Expression;
  to: string;
}

export interface JsonAccessExpression {
  type: "jsonAccess";
  expr: Expression;
  path: (string | number)[];
  operator?: "->" | "->>" | "#>" | "#>>";
}

export type UnaryOperator = "-" | "+" | "not" | "is null" | "is not null";

export type BinaryOperator =
  | "="
  | "!="
  | "<>"
  | "<"
  | ">"
  | "<="
  | ">="
  | "like"
  | "not like"
  | "ilike"
  | "not ilike"
  | "similar to"
  | "not similar to"
  | "in"
  | "not in"
  | "is"
  | "is not"
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "||"
  | "and"
  | "or";

export interface OnConflict {
  target?: string[];
  where?: Expression;
  action: OnConflictAction;
}

// Upsert and upsertMany are represented by insert statements with ON CONFLICT.
export type OnConflictAction =
  | { type: "doNothing" }
  | { type: "doUpdate"; set: Record<string, Expression> };

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  default?: Expression;
  primaryKey?: boolean;
  unique?: boolean;
  references?: ForeignKeyReference;
}

export interface ForeignKeyReference {
  table: string;
  columns: string[];
  onDelete?: "cascade" | "restrict" | "set null" | "no action";
  onUpdate?: "cascade" | "restrict" | "set null" | "no action";
}

export type TableConstraint =
  | PrimaryKeyConstraint
  | UniqueConstraint
  | ForeignKeyConstraint
  | CheckConstraint;

export interface PrimaryKeyConstraint {
  type: "primaryKey";
  columns: string[];
  name?: string;
}

export interface UniqueConstraint {
  type: "unique";
  columns: string[];
  name?: string;
}

export interface ForeignKeyConstraint {
  type: "foreignKey";
  columns: string[];
  references: ForeignKeyReference;
  name?: string;
}

export interface CheckConstraint {
  type: "check";
  expression: Expression;
  name?: string;
}
