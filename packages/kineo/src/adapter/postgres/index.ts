import type { Sql } from "postgres";
import postgresRuntime, { type PostgresOptions } from "./runtime";
import { postgresMigrationDialect } from "@/migrations/sql/postgres";
import type { Adapter } from "..";

export interface PostgresAdapter extends Adapter {
  sql: Sql<any>;
}

export default function postgres(opts: PostgresOptions): PostgresAdapter {
  const runtimeAdapter = postgresRuntime(opts);

  return {
    ...runtimeAdapter,
    runtimePath: "kineo/adapter/postgres/runtime",

    // TODO migrations
  };
}

export { postgresMigrationDialect, type PostgresOptions };
