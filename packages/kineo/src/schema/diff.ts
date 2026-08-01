import type {
  ParsedSchema,
  ParsedModel,
  ParsedField,
  ParsedRelation,
  ParsedIndex,
  ParsedIndexField,
} from "./parser";
import type { Kind } from "./property";
import type { StandardSchemaV1 } from "./standard";

export interface SchemaDiff {
  operations: MigrationOp[];
}

export type MigrationOp =
  | { kind: "create_model"; model: ParsedModel }
  | { kind: "drop_model"; modelName: string }
  | { kind: "add_field"; model: string; field: ParsedField }
  | { kind: "drop_field"; model: string; fieldName: string }
  | {
      kind: "alter_field";
      model: string;
      fieldName: string;
      changes: FieldChange[];
    }
  | { kind: "add_relation"; model: string; relation: ParsedRelation }
  | { kind: "drop_relation"; model: string; relationName: string }
  | {
      kind: "alter_relation";
      model: string;
      relationName: string;
      changes: RelationChange[];
    }
  | { kind: "add_index"; model: string; index: ParsedIndex }
  | { kind: "drop_index"; model: string; indexName: string }
  | {
      kind: "alter_index";
      model: string;
      indexName: string;
      changes: IndexChange[];
    };

export type FieldChange =
  | { kind: "type"; from: Kind; to: Kind }
  | { kind: "required"; from: boolean; to: boolean }
  | { kind: "many"; from: boolean; to: boolean }
  | { kind: "id"; from?: boolean; to?: boolean }
  | { kind: "validator"; from?: StandardSchemaV1; to?: StandardSchemaV1 };

export type RelationChange =
  | { kind: "target"; from: string; to: string }
  | { kind: "cardinality"; from: boolean; to: boolean } // many
  | { kind: "virtual"; from: boolean; to: boolean }
  | { kind: "fields"; from?: PropertyKey[]; to?: PropertyKey[] }
  | { kind: "refs"; from?: PropertyKey[]; to?: PropertyKey[] };

export type IndexChange =
  | { kind: "unique"; from: boolean; to: boolean }
  | { kind: "type"; from: ParsedIndex["type"]; to: ParsedIndex["type"] }
  | { kind: "fields"; from: ParsedIndexField[]; to: ParsedIndexField[] };

export function diff(a: ParsedSchema, b: ParsedSchema): SchemaDiff {
  const ops: MigrationOp[] = [];

  diffModels(a, b, ops);

  return { operations: orderOperations(ops) };
}

function diffModels(a: ParsedSchema, b: ParsedSchema, ops: MigrationOp[]) {
  const aModels = a.models;
  const bModels = b.models;

  // Removed models
  for (const [name] of aModels) {
    if (!bModels.has(name)) {
      ops.push({ kind: "drop_model", modelName: name });
    }
  }

  // Added + changed models
  for (const [name, bModel] of bModels) {
    const aModel = aModels.get(name);

    if (!aModel) {
      ops.push({ kind: "create_model", model: bModel });

      // When a model is newly created, also emit add_relation operations
      // for any non-virtual relations so that foreign key constraints
      // are created (as ALTER TABLE ... ADD CONSTRAINT) after the table
      // itself is created.
      for (const [, rel] of bModel.relations) {
        if (!rel.virtual) {
          ops.push({ kind: "add_relation", model: bModel.name, relation: rel });
        }
      }

      continue;
    }

    diffModel(aModel, bModel, ops);
  }
}

function diffModel(a: ParsedModel, b: ParsedModel, ops: MigrationOp[]) {
  diffFields(a, b, ops);
  diffRelations(a, b, ops);
  diffIndexes(a, b, ops);
}

function diffFields(a: ParsedModel, b: ParsedModel, ops: MigrationOp[]) {
  const aFields = a.fields;
  const bFields = b.fields;

  // removed
  for (const [name] of aFields) {
    if (!bFields.has(name)) {
      ops.push({ kind: "drop_field", model: a.name, fieldName: name });
    }
  }

  // added + changed
  for (const [name, bField] of bFields) {
    const aField = aFields.get(name);

    if (!aField) {
      ops.push({ kind: "add_field", model: a.name, field: bField });
      continue;
    }

    const changes: FieldChange[] = [];

    if (aField.kind !== bField.kind) {
      changes.push({ kind: "type", from: aField.kind, to: bField.kind });
    }

    if (aField.required !== bField.required) {
      changes.push({
        kind: "required",
        from: aField.required,
        to: bField.required,
      });
    }

    if (aField.id !== bField.id) {
      changes.push({ kind: "id", from: aField.id, to: bField.id });
    }

    if (aField.many !== bField.many) {
      changes.push({ kind: "many", from: aField.many, to: bField.many });
    }

    // naive deep compare
    if (JSON.stringify(aField.validator) !== JSON.stringify(bField.validator)) {
      changes.push({
        kind: "validator",
        from: aField.validator,
        to: bField.validator,
      });
    }

    if (changes.length > 0) {
      ops.push({
        kind: "alter_field",
        model: a.name,
        fieldName: name,
        changes,
      });
    }
  }
}

function diffRelations(a: ParsedModel, b: ParsedModel, ops: MigrationOp[]) {
  const aRels = a.relations;
  const bRels = b.relations;

  // removed relations
  for (const [name] of aRels) {
    if (!bRels.has(name)) {
      ops.push({
        kind: "drop_relation",
        model: a.name,
        relationName: name,
      });
    }
  }

  // added + changed
  for (const [name, bRel] of bRels) {
    const aRel = aRels.get(name);

    if (!aRel) {
      ops.push({
        kind: "add_relation",
        model: a.name,
        relation: bRel,
      });
      continue;
    }

    const changes: RelationChange[] = [];

    if (aRel.to !== bRel.to) {
      changes.push({
        kind: "target",
        from: aRel.to,
        to: bRel.to,
      });
    }

    if (aRel.many !== bRel.many) {
      changes.push({
        kind: "cardinality",
        from: aRel.many,
        to: bRel.many,
      });
    }

    if (aRel.virtual !== bRel.virtual) {
      changes.push({
        kind: "virtual",
        from: aRel.virtual,
        to: bRel.virtual,
      });
    }

    if (!arrayEqual(aRel.fields, bRel.fields)) {
      changes.push({
        kind: "fields",
        from: aRel.fields,
        to: bRel.fields,
      });
    }

    if (!arrayEqual(aRel.refs, bRel.refs)) {
      changes.push({
        kind: "refs",
        from: aRel.refs,
        to: bRel.refs,
      });
    }

    if (changes.length > 0) {
      ops.push({
        kind: "alter_relation",
        model: a.name,
        relationName: name,
        changes,
      });
    }
  }
}

function diffIndexes(a: ParsedModel, b: ParsedModel, ops: MigrationOp[]) {
  const aIdx = a.indexes;
  const bIdx = b.indexes;

  for (const [name] of aIdx) {
    if (!bIdx.has(name)) {
      ops.push({ kind: "drop_index", model: a.name, indexName: name });
    }
  }

  for (const [name, bIndex] of bIdx) {
    const aIndex = aIdx.get(name);

    if (!aIndex) {
      ops.push({ kind: "add_index", model: a.name, index: bIndex });
      continue;
    }

    if (
      JSON.stringify(normalizeIndex(aIndex)) !==
      JSON.stringify(normalizeIndex(bIndex))
    ) {
      ops.push({
        kind: "alter_index",
        model: a.name,
        indexName: name,
        changes: [
          {
            kind: "fields",
            from: normalizeIndex(aIndex).fields,
            to: normalizeIndex(bIndex).fields,
          },
        ],
      });
    }
  }
}

function normalizeIndex(idx: ParsedIndex) {
  return {
    ...idx,
    fields: [...idx.fields.values()].map((f) => ({
      name: f.name,
      sort: f.sort,
      length: f.length,
      ops: f.ops ?? [],
    })),
  };
}

function orderOperations(ops: MigrationOp[]): MigrationOp[] {
  const priority: Record<MigrationOp["kind"], number> = {
    drop_index: 0,
    drop_relation: 1,
    drop_field: 2,
    drop_model: 3,

    create_model: 4,
    add_field: 5,
    alter_field: 6,
    add_relation: 7,
    alter_relation: 8,
    add_index: 9,
    alter_index: 10,
  };

  return ops.sort((a, b) => priority[a.kind] - priority[b.kind]);
}

function arrayEqual(a?: PropertyKey[], b?: PropertyKey[]) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
