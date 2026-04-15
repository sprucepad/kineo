import type { SQLDialect } from ".";
import type { Expression } from "@/ir";

const quoteIdentifier = (name: string): string =>
  `"${name.replace(/"/g, '""')}"`;

const expressionToSql = (expression: Expression): string => {
  switch (expression.type) {
    case "column": {
      const prefix = expression.table
        ? `${quoteIdentifier(expression.table)}.`
        : "";
      return `${prefix}${quoteIdentifier(expression.name)}`;
    }
    default:
      throw new Error(
        `Unsupported DISTINCT ON expression type: ${expression.type}`,
      );
  }
};

export const postgresDialect: SQLDialect = {
  quoteIdentifier,
  placeholder: (index) => `$${index}`,
  renderDistinctOn: (expressions) =>
    `DISTINCT ON (${expressions.map(expressionToSql).join(", ")}) `,
  supportsReturning: true,
};
