import type { InferModelDef, ModelDef } from "./model";

/**
 * A schema. Contains model definitions.
 */
export interface Schema {
  [key: string]: ModelDef<any>;
}

/**
 * Infers a whole schema.
 */
export type InferSchema<TSchema extends Schema> = {
  [M in keyof TSchema]: InferModelDef<TSchema[M], TSchema>;
};

/**
 * Adds schema type definitions to an object.
 * @param schema The object.
 * @returns The same object.
 */
export function defineSchema<T extends Schema>(obj: T): T {
  return obj;
}

export * from "./model";
export * from "./field";
