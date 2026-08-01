import type { Schema } from ".";
import { FieldBuilder, RelationBuilder, s, type Kind } from "./property";
import {
  ModelBuilder,
  type ModelProps,
  type ModelRelations,
  type ModelRelationsFn,
} from "./model";
import type { StandardSchemaV1 } from "./standard";

export interface ParsedSchema {
  models: Map<string, ParsedModel>;
}

export interface ParsedModel {
  name: string;
  key?: string;
  fields: Map<string, ParsedField>;
  relations: Map<string, ParsedRelation>;
  indexes: Map<string, ParsedIndex>;
}

export interface ParsedField {
  kind: Kind;
  name: string;
  key: string;
  required: boolean;
  many: boolean;
  id: boolean;
  validator?: StandardSchemaV1;
}

export interface ParsedRelation {
  name: string;
  key: string;
  from: string;
  to: string;
  many: boolean;
  virtual: boolean;
  fields?: PropertyKey[];
  refs?: PropertyKey[];
}

export interface ParsedIndex {
  fields: Map<string, ParsedIndexField>;
  name: string;
  unique: boolean;
  fulltext: boolean;
  type: "B-tree" | "Hash" | "GiST" | "SP-GiST" | "GIN" | "BRIN" | "bloom";
  length?: number;
  cols?: number[];
}

export interface ParsedIndexField {
  name: string;
  sort: "asc" | "desc";
  length?: number;
  ops?: string[];
}

export function parseSchema(schema: Schema): ParsedSchema {
  const models = new Map<string, ParsedModel>();

  const modelNameMap = new Map<ModelBuilder<any, any>, string>();
  for (const key in schema) {
    const rawModel = schema[key];
    if (rawModel instanceof ModelBuilder) {
      const modelName = rawModel.$name ?? key;
      modelNameMap.set(rawModel, modelName);
    }
  }

  for (const key in schema) {
    const rawModel = schema[key] as
      | ModelBuilder<ModelProps, ModelRelationsFn<ModelRelations, ModelProps>>
      | undefined;
    if (!(rawModel instanceof ModelBuilder)) continue;

    const modelName = rawModel.$name ?? key;
    const fields = new Map<string, ParsedField>();
    const relations = new Map<string, ParsedRelation>();
    const indexes = new Map<string, ParsedIndex>();

    const propObj = rawModel.$props(s);
    for (const key in propObj) {
      const prop = propObj[key];
      if (!(prop instanceof FieldBuilder)) continue;

      const name = prop.$name ?? key;
      fields.set(name, {
        kind: prop.$kind,
        required: prop.$required,
        many: prop.$many,
        id: prop.$id,
        validator: prop.$validator,
        name,
        key,
      });

      if (typeof prop.$index === "object" || prop.$unique) {
        const defaultIndexName = `${name}_${modelName}_idx`;

        const baseIndex = {
          type: "B-tree",
          fulltext: false,
          fields: new Map([
            [
              name,
              {
                name,
                sort: "asc",
              },
            ],
          ]),
        } satisfies Partial<ParsedIndex>;
        const indexName =
          typeof prop.$index === "object"
            ? (prop.$index.name ?? defaultIndexName)
            : defaultIndexName;

        indexes.set(indexName, {
          name: indexName,
          ...baseIndex,
          unique: typeof prop.$index === "object" ? prop.$unique : true,
          ...(typeof prop.$index === "object" ? (prop.$index as any) : {}),
        });
      }
    }

    const relationObj = rawModel.$relationFn?.(s) ?? {};
    for (const key in relationObj) {
      const relation = relationObj[key];
      if (!(relation instanceof RelationBuilder)) continue;

      const name = relation.$name ?? key;
      relations.set(name, {
        name,
        key,
        from: modelName,
        to:
          relation.$to.$name ??
          modelNameMap.get(relation.$to) ??
          (() => {
            throw new Error(
              "Unknown Kineo error: relation model is undefined. This branch shouldn't be reached if the types are followed correctly, so report this at `https://github.com/sprucepad/kineo/issues` if this is unexpected.",
            );
          })(),
        many: relation.$many,
        virtual: relation.$fields == null && relation.$refs == null,
        fields: relation.$fields,
        refs: relation.$refs,
      });
    }

    const indexObj = rawModel.$indexes;
    for (const index of indexObj) {
      const name = index.name ?? `${index.fields.join("__")}_${modelName}_idx`;
      indexes.set(name, {
        name,
        unique: index.unique ?? false,
        fields: new Map(
          index.fields.map((field): [string, ParsedIndexField] => {
            if (typeof field === "object")
              return [
                field.name,
                {
                  name: field.name,
                  sort: field.sort ?? "asc",
                  length: field.length,
                  ops: field.ops,
                },
              ];
            else return [field, { name: field, sort: "asc" }];
          }),
        ),
        fulltext: index.fulltext ?? false,
        type: index.type ?? "B-tree",
        length: "length" in index ? index.length : (undefined as any),
        cols: "cols" in index ? index.cols : (undefined as any),
      });
    }

    models.set(modelName, { name: modelName, key, fields, relations, indexes });
  }

  // --- generate implicit many-to-many join tables ---
  const seen = new Set<string>();

  for (const [modelAName, modelA] of models) {
    for (const [, relA] of modelA.relations) {
      // Many-to-many relations are always virtual (no explicit fields/refs)
      if (!relA.virtual || !relA.many) continue;

      const modelB = models.get(relA.to);
      if (!modelB) continue;

      for (const [, relB] of modelB.relations) {
        const isReciprocal =
          relB.to === modelAName && relB.virtual && relB.many;

        if (!isReciprocal) continue;

        // prevent duplicates
        const pairKey = [modelAName, modelB.name].sort().join("_");
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        // deterministic join table name
        const joinName = `${modelAName}_${modelB.name}`;

        const fields = new Map<string, ParsedField>();
        const relations = new Map<string, ParsedRelation>();
        const indexes = new Map<string, ParsedIndex>();

        const aIdField = [...modelA.fields.values()].find((f) => f.id);
        const bIdField = [...modelB.fields.values()].find((f) => f.id);

        if (!aIdField || !bIdField) {
          throw new Error(
            `Cannot create join table for ${modelAName} and ${modelB.name} without id fields`,
          );
        }

        const aFieldName = `${modelAName}Id`;
        const bFieldName = `${modelB.name}Id`;

        // fields
        fields.set(aFieldName, {
          name: aFieldName,
          key: aFieldName,
          kind: aIdField.kind,
          id: true,
          many: false,
          required: true,
        });

        fields.set(bFieldName, {
          name: bFieldName,
          key: bFieldName,
          kind: bIdField.kind,
          id: true,
          many: false,
          required: true,
        });

        // relations
        const aRelationName = `mn_${modelAName}_${modelB.name}`;
        relations.set(modelAName, {
          name: aRelationName,
          key: aRelationName,
          from: joinName,
          to: modelAName,
          virtual: false,
          many: false,
          fields: [aFieldName],
          refs: [aIdField.name],
        });

        const bRelationName = `mn_${modelB.name}_${modelAName}`;
        relations.set(modelB.name, {
          name: bRelationName,
          key: bRelationName,
          from: joinName,
          to: modelB.name,
          virtual: false,
          many: false,
          fields: [bFieldName],
          refs: [bIdField.name],
        });

        // composite unique index
        const indexName = `${joinName}_unique`;
        indexes.set(indexName, {
          name: indexName,
          unique: true,
          fulltext: false,
          type: "B-tree",
          fields: new Map([
            [aFieldName, { name: aFieldName, sort: "asc" }],
            [bFieldName, { name: bFieldName, sort: "asc" }],
          ]),
        });

        models.set(joinName, {
          name: joinName,
          // no key, as this shouldn't be generated
          fields,
          relations,
          indexes,
        });
      }
    }
  }

  return { models };
}

export function isRawSchema(v: Schema | ParsedSchema): v is Schema {
  return !("models" in v) || v.models instanceof ModelBuilder;
}

export function isParsedSchema(v: ParsedSchema | Schema): v is ParsedSchema {
  return "models" in v && !(v.models instanceof ModelBuilder);
}
