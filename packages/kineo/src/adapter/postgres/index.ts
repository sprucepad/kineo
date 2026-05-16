import postgresRuntime, {
  type PostgresRuntimeAdapter,
  type PostgresOptions,
} from "./runtime";
import { postgresMigrationDialect } from "@/migrations/sql/postgres";
import type { Adapter } from "..";

export interface PostgresAdapter extends PostgresRuntimeAdapter, Adapter {}

export default function postgres(opts: PostgresOptions): PostgresAdapter {
  const runtimeAdapter = postgresRuntime(opts);

  return {
    ...runtimeAdapter,
    runtimePath: "kineo/adapter/postgres/runtime",

    // TODO migrations
  };
}

export { postgresMigrationDialect, type PostgresOptions };
