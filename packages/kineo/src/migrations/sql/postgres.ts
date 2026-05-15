import type {
  ParsedField,
  ParsedIndexField,
  ParsedRelation,
  Kind,
} from "@/schema";
import { postgresDialect } from "@/emitter/sql/postgres";

import type { SQLMigrationDialect } from ".";

function quote(value: string) {
  return postgresDialect.quoteIdentifier(value);
}

function constraintName(model: string, relation: ParsedRelation) {
  return `${model}_${relation.name}_fkey`;
}

export const postgresMigrationDialect: SQLMigrationDialect = {
  ...postgresDialect,

  supportsIfExists: true,
  supportsCascade: true,

  mapType(kind: Kind, field: ParsedField) {
    switch (kind) {
      case "string":
        return "TEXT";

      case "float":
        return "DOUBLE PRECISION";

      case "decimal":
        return "DECIMAL";

      case "int":
        return "INTEGER";

      case "boolean":
        return "BOOLEAN";

      case "datetime":
        return "TIMESTAMP";

      case "json":
        return "JSONB";

      case "bytes":
        return "BYTEA";

      case "bigint":
        return "BIGINT";

      default: {
        if (field.many) {
          return "JSONB";
        }

        return "TEXT";
      }
    }
  },

  renderFieldChange(model, fieldName, change) {
    const table = quote(model);
    const column = quote(fieldName);

    switch (change.kind) {
      case "type":
        return `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${this.mapType(
          change.to,
          {
            name: fieldName,
            kind: change.to,
            many: false,
            required: false,
          } as ParsedField,
        )}`;

      case "required":
        return change.to
          ? `ALTER TABLE ${table} ALTER COLUMN ${column} SET NOT NULL`
          : `ALTER TABLE ${table} ALTER COLUMN ${column} DROP NOT NULL`;

      case "id":
        return change.to
          ? `ALTER TABLE ${table} ADD PRIMARY KEY (${column})`
          : `ALTER TABLE ${table} DROP CONSTRAINT ${quote(`${model}_pkey`)}`;

      case "many":
      case "validator":
        return null;

      default: {
        const exhaustive: never = change;
        return exhaustive;
      }
    }
  },

  renderRelation(model, relation) {
    if (relation.virtual || !relation.fields || !relation.refs) {
      return null;
    }

    const localFields = [...relation.fields.values()]
      .map((field) => quote(String(field)))
      .join(", ");

    const remoteFields = [...relation.refs.values()]
      .map((field) => quote(String(field)))
      .join(", ");

    return [
      `ALTER TABLE ${quote(model)}`,
      `ADD CONSTRAINT ${quote(constraintName(model, relation))}`,
      `FOREIGN KEY (${localFields})`,
      `REFERENCES ${quote(relation.to)} (${remoteFields})`,
    ].join(" ");
  },

  renderDropRelation(model, relationName) {
    return `ALTER TABLE ${quote(model)} DROP CONSTRAINT ${quote(
      `${model}_${relationName}_fkey`,
    )}`;
  },

  renderRelationChange(model, relationName, change) {
    switch (change.kind) {
      case "target":
      case "fields":
      case "refs":
      case "cardinality":
        return null;

      case "virtual":
        return change.to
          ? `ALTER TABLE ${quote(model)} DROP CONSTRAINT ${quote(
              `${model}_${relationName}_fkey`,
            )}`
          : null;

      default: {
        const exhaustive: never = change;
        return exhaustive;
      }
    }
  },

  renderIndexType(type) {
    switch (type) {
      case "B-tree":
        return "BTREE";

      case "Hash":
        return "HASH";

      case "GIN":
        return "GIN";

      case "GiST":
        return "GIST";

      case "BRIN":
        return "BRIN";

      default:
        return String(type).toUpperCase();
    }
  },

  renderIndexField(field: ParsedIndexField) {
    let sql = quote(field.name);

    if ("sort" in field && field.sort) {
      sql += ` ${field.sort.toUpperCase()}`;
    }

    return sql;
  },

  renderIndexChange(model, indexName, change) {
    switch (change.kind) {
      case "unique":
      case "type":
      case "fields":
        return `DROP INDEX IF EXISTS ${quote(
          indexName,
        )}; -- recreate index required`;

      default: {
        const exhaustive: never = change;
        return exhaustive;
      }
    }
  },
};
