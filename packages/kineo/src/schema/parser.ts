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
  key: string;
  fields: Map<string, ParsedField>;
  relations: Map<string, ParsedRelation>;
  indexes: Map<string, ParsedIndex>;
}

export interface ParsedField {
  type: Kind;
  name: string;
  key: string;
  required: boolean;
  validator?: StandardSchemaV1;
}

export interface ParsedRelation {
  from: string;
  to: string;
  virtual: boolean;
  fields?: (keyof any)[];
  refs?: (keyof any)[];
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

// TODO detect implicit many-to-many relationships and add implicit models for them

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
        type: prop.$kind,
        required: prop.$required,
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
                sort: "asc",
              },
            ],
          ]),
        };
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
        from: modelName,
        to:
          relation.$to.$name ??
          modelNameMap.get(relation.$to) ??
          (() => {
            throw new Error(
              "Unknown Kineo error: relation model is undefined. This branch shouldn't be reached if the types are followed correctly, so report this at `https://github.com/sprucepad/kineo/issues` if this is unexpected.",
            );
          })(),
        virtual: relation.$fields != null || relation.$refs != null,
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

  return { models };
}
