import type { MigrationEmitter } from "@/adapter";
import type { SQLDialect } from "@/emitter/sql";

export interface SQLMigrationDialect extends SQLDialect {
  // TODO
}

export default (async (diff, dialect) => {
  // TODO
  return {
    statements: [
      {
        command: `CREATE TABLE ${dialect.placeholder(1)}...`,
        params: ["users"],
      },
    ],
  };
}) satisfies MigrationEmitter<SQLMigrationDialect>;
