import createPostgresInstance, {
  type Sql,
  type Options as PgJsOptions,
} from "postgres";
import type { RuntimeAdapter } from "..";
import { postgresDialect } from "@/emitter/sql/postgres";
import sqlEmitter from "@/emitter/sql";

export interface PostgresRuntimeAdapter extends RuntimeAdapter {
  sql: Sql<any>;
}

export type PostgresOptions =
  | {
      sql: Sql<any>;
    }
  | PgJsOptions<any>
  | ({
      url: string;
    } & PgJsOptions<any>)
  | string;

export default function postgres(
  opts: PostgresOptions,
): PostgresRuntimeAdapter {
  const sql =
    typeof opts === "string"
      ? createPostgresInstance(opts)
      : "sql" in opts
        ? opts.sql
        : "url" in opts
          ? createPostgresInstance(opts.url, opts)
          : createPostgresInstance(opts);

  return {
    sql,

    async close() {
      return await sql.end();
    },

    async emit(ir) {
      return await sqlEmitter(ir, postgresDialect);
    },

    async exec(opts) {
      const strings: string[] = [];
      const values: any[] = [];

      let lastIndex = 0;
      let match: RegExpExecArray | null;

      // Match $1, $2, ... in order
      const regex = /\$(\d+)/g;

      while ((match = regex.exec(opts.command)) !== null) {
        const index = match.index;
        const paramPosition = Number(match[1]) - 1;

        // Push the string before this match
        strings.push(opts.command.slice(lastIndex, index));

        // Push the corresponding param
        values.push(opts.params[paramPosition]);

        lastIndex = index + match[0].length;
      }

      // Push the remaining string after the last match
      strings.push(opts.command.slice(lastIndex));

      const rows = await sql(
        Object.assign(strings, { raw: strings }),
        ...values,
      );
      return {
        rows,
        rowCount:
          rows.length > 0 && "count" in rows[0]! ? rows[0].count : rows.length,
      };
    },
  };
}

export { postgresDialect };
