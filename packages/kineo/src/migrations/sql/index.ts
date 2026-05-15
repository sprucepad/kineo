import type { MigrationEmitter } from "@/adapter";
import type {
  FieldChange,
  IndexChange,
  MigrationOp,
  RelationChange,
  SchemaDiff,
  ParsedField,
  ParsedIndex,
  ParsedIndexField,
  ParsedModel,
  ParsedRelation,
  Kind,
} from "@/schema";
import type { SQLDialect } from "@/emitter/sql";

export interface SQLMigrationDialect extends SQLDialect {
  mapType(kind: Kind, field: ParsedField): string;

  renderFieldChange?(
    model: string,
    fieldName: string,
    change: FieldChange,
    ctx: RenderContext,
  ): string | null;

  renderRelation?(
    model: string,
    relation: ParsedRelation,
    ctx: RenderContext,
  ): string | null;

  renderDropRelation?(
    model: string,
    relationName: string,
    ctx: RenderContext,
  ): string | null;

  renderRelationChange?(
    model: string,
    relationName: string,
    change: RelationChange,
    ctx: RenderContext,
  ): string | null;

  renderIndexType?(type: ParsedIndex["type"]): string;

  renderIndexField?(field: ParsedIndexField): string;

  renderIndexChange?(
    model: string,
    indexName: string,
    change: IndexChange,
    ctx: RenderContext,
  ): string | null;

  supportsIfExists?: boolean;
  supportsCascade?: boolean;
}

interface Statement {
  command: string;
  params: unknown[];
}

interface RenderContext {
  dialect: SQLMigrationDialect;
  push(statement: string, ...params: unknown[]): void;
}

function q(dialect: SQLMigrationDialect, value: string) {
  return dialect.quoteIdentifier(value);
}

function tableName(dialect: SQLMigrationDialect, model: string) {
  return dialect.formatIdentifier?.(model) ?? q(dialect, model);
}

function valuesOf<T>(map: Map<string, T>): T[] {
  return [...map.values()];
}

function columnDefinition(field: ParsedField, dialect: SQLMigrationDialect) {
  const parts: string[] = [
    q(dialect, field.name),
    dialect.mapType(field.kind, field),
  ];

  if (field.required) {
    parts.push("NOT NULL");
  }

  if (field.id) {
    parts.push("PRIMARY KEY");
  }

  return parts.join(" ");
}

function renderCreateTable(model: ParsedModel, dialect: SQLMigrationDialect) {
  const columns = valuesOf(model.fields).map((field) =>
    columnDefinition(field, dialect),
  );

  return `CREATE TABLE ${tableName(
    dialect,
    model.name,
  )} (\n  ${columns.join(",\n  ")}\n)`;
}

function renderDropTable(modelName: string, dialect: SQLMigrationDialect) {
  return `DROP TABLE ${
    dialect.supportsIfExists ? "IF EXISTS " : ""
  }${tableName(dialect, modelName)}${
    dialect.supportsCascade ? " CASCADE" : ""
  }`;
}

function renderAddColumn(
  model: string,
  field: ParsedField,
  dialect: SQLMigrationDialect,
) {
  return `ALTER TABLE ${tableName(
    dialect,
    model,
  )} ADD COLUMN ${columnDefinition(field, dialect)}`;
}

function renderDropColumn(
  model: string,
  fieldName: string,
  dialect: SQLMigrationDialect,
) {
  return `ALTER TABLE ${tableName(
    dialect,
    model,
  )} DROP COLUMN ${q(dialect, fieldName)}`;
}

function renderDefaultFieldChange(
  model: string,
  fieldName: string,
  change: FieldChange,
  dialect: SQLMigrationDialect,
) {
  const table = tableName(dialect, model);
  const column = q(dialect, fieldName);

  switch (change.kind) {
    case "type":
      return `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${dialect.mapType(
        change.to,
        {
          name: fieldName,
          kind: change.to,
          required: false,
          many: false,
        } as ParsedField,
      )}`;

    case "required":
      return change.to
        ? `ALTER TABLE ${table} ALTER COLUMN ${column} SET NOT NULL`
        : `ALTER TABLE ${table} ALTER COLUMN ${column} DROP NOT NULL`;

    case "id":
      return change.to
        ? `ALTER TABLE ${table} ADD PRIMARY KEY (${column})`
        : null;

    case "many":
    case "validator":
      return null;

    default: {
      const exhaustive: never = change;
      return exhaustive;
    }
  }
}

function renderIndexField(
  field: ParsedIndexField,
  dialect: SQLMigrationDialect,
) {
  return dialect.renderIndexField?.(field) ?? q(dialect, field.name);
}

function renderCreateIndex(
  model: string,
  index: ParsedIndex,
  dialect: SQLMigrationDialect,
) {
  const unique = index.unique ? "UNIQUE " : "";
  const type = dialect.renderIndexType?.(index.type);

  const fields = valuesOf(index.fields)
    .map((field) => renderIndexField(field, dialect))
    .join(", ");

  return `CREATE ${unique}INDEX ${q(
    dialect,
    index.name,
  )} ON ${tableName(dialect, model)}${
    type ? ` USING ${type}` : ""
  } (${fields})`;
}

function renderDropIndex(indexName: string, dialect: SQLMigrationDialect) {
  return `DROP INDEX ${
    dialect.supportsIfExists ? "IF EXISTS " : ""
  }${q(dialect, indexName)}`;
}

function emitOperation(op: MigrationOp, ctx: RenderContext) {
  const { dialect } = ctx;

  switch (op.kind) {
    case "create_model":
      ctx.push(renderCreateTable(op.model, dialect));
      return;

    case "drop_model":
      ctx.push(renderDropTable(op.modelName, dialect));
      return;

    case "add_field":
      ctx.push(renderAddColumn(op.model, op.field, dialect));
      return;

    case "drop_field":
      ctx.push(renderDropColumn(op.model, op.fieldName, dialect));
      return;

    case "alter_field":
      for (const change of op.changes) {
        const sql =
          dialect.renderFieldChange?.(op.model, op.fieldName, change, ctx) ??
          renderDefaultFieldChange(op.model, op.fieldName, change, dialect);

        if (sql) {
          ctx.push(sql);
        }
      }

      return;

    case "add_relation": {
      const sql = dialect.renderRelation?.(op.model, op.relation, ctx);

      if (sql) {
        ctx.push(sql);
      }

      return;
    }

    case "drop_relation": {
      const sql = dialect.renderDropRelation?.(op.model, op.relationName, ctx);

      if (sql) {
        ctx.push(sql);
      }

      return;
    }

    case "alter_relation":
      for (const change of op.changes) {
        const sql = dialect.renderRelationChange?.(
          op.model,
          op.relationName,
          change,
          ctx,
        );

        if (sql) {
          ctx.push(sql);
        }
      }

      return;

    case "add_index":
      ctx.push(renderCreateIndex(op.model, op.index, dialect));

      return;

    case "drop_index":
      ctx.push(renderDropIndex(op.indexName, dialect));

      return;

    case "alter_index":
      for (const change of op.changes) {
        const sql = dialect.renderIndexChange?.(
          op.model,
          op.indexName,
          change,
          ctx,
        );

        if (sql) {
          ctx.push(sql);
        }
      }

      return;

    default: {
      const exhaustive: never = op;

      throw new Error(
        `Unhandled migration operation: ${JSON.stringify(exhaustive)}`,
      );
    }
  }
}

export default (async (diff: SchemaDiff, dialect: SQLMigrationDialect) => {
  const statements: Statement[] = [];

  const ctx: RenderContext = {
    dialect,

    push(command, ...params) {
      statements.push({
        command,
        params,
      });
    },
  };

  for (const operation of diff.operations) {
    emitOperation(operation, ctx);
  }

  return {
    statements,
  };
}) satisfies MigrationEmitter<SQLMigrationDialect>;
