import postgresRuntime, {
  type PostgresRuntimeAdapter,
  type PostgresOptions,
} from "./runtime";
import { postgresMigrationDialect } from "@/migrations/sql/postgres";
import type { Adapter } from "..";
import { diff, type ParsedSchema } from "@/schema";
import emit from "@/migrations/sql";
import type { Sql } from "postgres";

export interface PostgresAdapter extends PostgresRuntimeAdapter, Adapter {}

export default function postgres(opts: PostgresOptions): PostgresAdapter {
  const runtimeAdapter = postgresRuntime(opts);

  return {
    ...runtimeAdapter,
    runtimePath: "kineo/adapter/postgres/runtime",

    generate(prev, cur) {
      return emit(diff(prev, cur), postgresMigrationDialect);
    },

    async pull() {
      // TODO
      return {};
    },

    async push(schema) {
      const schemaInDb = (await this.pull!()) as ParsedSchema;
      const { statements } = emit(
        diff(schemaInDb, schema),
        postgresMigrationDialect,
      );

      const commands: string[] = [];
      for (const statement of statements) {
        if (statement.type === "note") continue;
        commands.push(statement.command);
      }

      const wrappedCommand = [`BEGIN;${commands.join(";")};COMMIT;`];
      await this.sql(Object.assign(wrappedCommand, { raw: wrappedCommand }));
    },

    async deploy(hash, migration) {
      await ensureMigrationsTable(runtimeAdapter.sql);
      const [row] =
        await runtimeAdapter.sql`select m_deployed_at from __kineo_migrations__ where m_hash = ${hash}`;

      if (row?.m_deployed_at != null) {
        throw new Error("Migration already exists"); // TODO better errors
      }

      const wrappedMigration = [migration];
      await runtimeAdapter.sql(
        Object.assign(wrappedMigration, { raw: wrappedMigration }),
      );

      await runtimeAdapter.sql`insert into __kineo_migrations__ values (${hash}, NULL)`;
    },

    async status(hash) {
      await ensureMigrationsTable(runtimeAdapter.sql);
      const [row] =
        await runtimeAdapter.sql`select m_hash, m_deployed_at from __kineo_migrations__ where m_hash = ${hash}`;
      if (!row) {
        throw new Error("Migration not found"); // TODO better errors
      }
      return {
        status: row.m_deployed_at == null ? "pending" : "deployed",
        meta: {
          hash: row.m_hash,
          appliedAt: new Date(row.m_deployed_at),
        },
      };
    },
  };
}

export { postgresMigrationDialect, type PostgresOptions };

function ensureMigrationsTable(sql: Sql) {
  return sql`
    create table if not exists __kineo_migrations__ (
      m_hash bytea primary key,
      m_deployed_at datetime
    )
  `;
}
