import postgresRuntime, {
  type PostgresRuntimeAdapter,
  type PostgresOptions,
} from "./runtime";
import { postgresMigrationDialect } from "@/migrations/sql/postgres";
import type { Adapter } from "..";
import { diff } from "@/schema";
import emit from "@/migrations/sql";
import type { Sql } from "postgres";
import type {
  Kind,
  ParsedIndex,
  ParsedIndexField,
  ParsedModel,
} from "@/schema";

export interface PostgresAdapter extends PostgresRuntimeAdapter, Adapter {}

export default function postgres(opts: PostgresOptions): PostgresAdapter {
  const runtimeAdapter = postgresRuntime(opts);

  return {
    ...runtimeAdapter,
    runtimePath: "kineo/adapter/postgres/runtime",

    generate(prev, cur) {
      return emit(diff(prev, cur), postgresMigrationDialect);
    },

    async afterGenerate(hash) {
      await ensureMigrationsTable(this.sql);
      await this.sql`insert into __kineo_migrations__ values (${hash}, NULL);`;
    },

    async pull(schema = "public") {
      const { sql } = runtimeAdapter;
      const [columns, primaryKeys, foreignKeys, indexes] = await Promise.all([
        sql<ColumnRow[]>`
          select
            table_name,
            column_name,
            udt_name,
            data_type,
            is_nullable
          from information_schema.columns
          where table_schema = ${schema}
          order by table_name, ordinal_position;
        `,

        sql<PkRow[]>`
          select
            tc.table_name,
            kcu.column_name
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            on tc.constraint_name = kcu.constraint_name
          and tc.table_schema = kcu.table_schema
          where tc.constraint_type = 'PRIMARY KEY'
            and tc.table_schema = ${schema};
        `,

        sql<FkRow[]>`
          select
            tc.constraint_name,
            kcu.table_name,
            kcu.column_name,
            ccu.table_name as foreign_table_name,
            ccu.column_name as foreign_column_name
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            on tc.constraint_name = kcu.constraint_name
          and tc.table_schema = kcu.table_schema
          join information_schema.constraint_column_usage ccu
            on ccu.constraint_name = tc.constraint_name
          and ccu.table_schema = tc.table_schema
          where tc.constraint_type = 'FOREIGN KEY'
            and tc.table_schema = ${schema};
        `,

        sql<IndexRow[]>`
          select
            t.relname as table_name,
            i.relname as index_name,
            ix.indisunique as unique,
            am.amname::text as method,
            pg_get_indexdef(ix.indexrelid) as definition,
            a.attname as column_name,
            array_position(ix.indkey, a.attnum) as column_order
          from pg_class t
          join pg_index ix on t.oid = ix.indrelid
          join pg_class i on i.oid = ix.indexrelid
          join pg_am am on i.relam = am.oid
          left join pg_attribute a
            on a.attrelid = t.oid
          and a.attnum = any(ix.indkey)
          join pg_namespace ns on ns.oid = t.relnamespace
          where ns.nspname = ${schema}
          order by table_name, index_name, column_order;
        `,
      ]);

      const pkSet = new Set(
        primaryKeys.map((pk) => `${pk.table_name}.${pk.column_name}`),
      );

      const models = new Map<string, ParsedModel>();

      // build models + fields
      for (const col of columns) {
        let model = models.get(col.table_name);

        if (!model) {
          model = {
            name: col.table_name,
            key: col.table_name,
            fields: new Map(),
            relations: new Map(),
            indexes: new Map(),
          };

          models.set(col.table_name, model);
        }

        model.fields.set(col.column_name, {
          kind: mapPgType(col.udt_name, col.data_type),
          name: col.column_name,
          key: col.column_name,
          required: col.is_nullable === "NO",
          many: false,
          id: pkSet.has(`${col.table_name}.${col.column_name}`),
        });
      }

      // regular fk relations
      for (const fk of foreignKeys) {
        const from = models.get(fk.table_name);
        const to = models.get(fk.foreign_table_name);

        if (!from || !to) continue;

        const relationName = fk.column_name.replace(/_id$/, "");

        from.relations.set(relationName, {
          name: relationName,
          from: fk.table_name,
          to: fk.foreign_table_name,
          many: false,
          virtual: false,
          fields: [fk.column_name],
          refs: [fk.foreign_column_name],
        });

        // reverse virtual relation
        const reverseName = pluralize(fk.table_name);

        if (!to.relations.has(reverseName)) {
          to.relations.set(reverseName, {
            name: reverseName,
            from: fk.foreign_table_name,
            to: fk.table_name,
            many: true,
            virtual: true,
          });
        }
      }

      // indexes
      const groupedIndexes = new Map<string, IndexRow[]>();

      for (const idx of indexes) {
        const key = `${idx.table_name}:${idx.index_name}`;
        const arr = groupedIndexes.get(key) ?? [];
        arr.push(idx);
        groupedIndexes.set(key, arr);
      }

      for (const rows of groupedIndexes.values()) {
        const first = rows[0]!;
        const model = models.get(first.table_name);

        if (!model) continue;

        const fields = new Map<string, ParsedIndexField>();

        for (const row of rows) {
          if (!row.column_name) continue;

          fields.set(row.column_name, {
            name: row.column_name,
            sort: /DESC/i.test(row.definition) ? "desc" : "asc",
          });
        }

        model.indexes.set(first.index_name, {
          name: first.index_name,
          unique: first.unique,
          fulltext: first.method.toLowerCase() === "gin",
          type: first.method,
          fields,
        });
      }

      return { models };
    },

    async push(prev, cur) {
      const { statements } = emit(diff(prev, cur), postgresMigrationDialect);

      const commands: string[] = [];
      for (const statement of statements) {
        if (statement.type === "note") continue;
        commands.push(statement.command);
      }

      await this.sql.unsafe(commands.join(";"));
    },

    async deploy(hash, migration) {
      await ensureMigrationsTable(this.sql);
      const [row] = await this
        .sql`select m_deployed_at from __kineo_migrations__ where m_hash = ${hash};`;

      if (row && row.m_deployed_at != null) {
        throw new Error("Migration already deployed"); // TODO better errors
      }

      await this.sql.unsafe(migration);

      await this
        .sql`update __kineo_migrations__ set m_deployed_at = ${new Date()} where m_hash = ${hash};`;
    },

    async status(hash) {
      await ensureMigrationsTable(this.sql);
      const [row] = await this
        .sql`select m_hash, m_deployed_at from __kineo_migrations__ where m_hash = ${hash};`;
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

async function ensureMigrationsTable(sql: Sql) {
  await sql`
    create table if not exists __kineo_migrations__ (
      m_hash bytea primary key,
      m_deployed_at timestamp
    );
  `;
}

interface ColumnRow {
  table_name: string;
  column_name: string;
  udt_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
}

interface PkRow {
  table_name: string;
  column_name: string;
}

interface FkRow {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface IndexRow {
  table_name: string;
  index_name: string;
  unique: boolean;
  method: ParsedIndex["type"];
  definition: string;
  column_name: string | null;
  column_order: number;
}

function mapPgType(udt: string, dataType: string): Kind {
  if (udt === "int2" || udt === "int4") {
    return "int";
  }

  if (udt === "int8") {
    return "bigint";
  }

  if (udt === "float4" || udt === "float8") {
    return "float";
  }

  if (udt === "numeric" || udt === "decimal") {
    return "decimal";
  }

  if (udt === "varchar" || udt === "text" || udt === "bpchar") {
    return "string";
  }

  if (udt === "bool") {
    return "boolean";
  }

  if (
    udt === "timestamp" ||
    udt === "timestamptz" ||
    udt === "date" ||
    dataType.includes("timestamp")
  ) {
    return "datetime";
  }

  if (udt === "json" || udt === "jsonb") {
    return "json";
  }

  return "json";
}

function pluralize(value: string): string {
  if (value.endsWith("s")) {
    return `${value}es`;
  }

  return `${value}s`;
}
