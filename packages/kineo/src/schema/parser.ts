import type { Schema } from ".";
import { FieldBuilder, s, type Kind } from "./property";
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

export type ParsedRelation = {
  from: string;
  to: string;
} & (
  | {
      virtual: true;
    }
  | {
      virtual: false;
      fields: string[];
      refs: string[];
    }
);

export type ParsedIndex = {
  fields: Map<
    string,
    {
      sort: "asc" | "desc";
      length?: number;
      ops?: string[];
    }
  >;
  name: string;
  unique: boolean;
  fulltext: boolean;
} & (
  | {
      type: "B-tree" | "Hash" | "GiST" | "SP-GiST" | "GIN" | "BRIN";
    }
  | {
      type: "bloom";
      length: number;
      cols: number[];
    }
);

export function parseSchema(schema: Schema): ParsedSchema {
  const models = new Map<string, ParsedModel>();
  for (const key in schema) {
    const rawModel = schema[key] as
      | ModelBuilder<ModelProps, ModelRelationsFn<ModelRelations, ModelProps>>
      | undefined;
    if (!(rawModel instanceof ModelBuilder)) continue;

    const name = rawModel.$name ?? key;
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
        const defaultIndexName = `__kidx_${name}__`;

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

    const relationObj = rawModel.$relationFn(s);
    // TODO relations

    const indexObj = rawModel.$indexes;
    // TODO indexes

    models.set(name, { name, key, fields, relations, indexes });
  }

  return { models };
}
