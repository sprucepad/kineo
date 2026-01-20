import type { InferModelDef, ModelDef } from "./model";

export interface Schema {
  [key: string]: ModelDef<any>;
}

export type InferSchema<TSchema extends Schema> = {
  [M in keyof TSchema]: InferModelDef<TSchema[M], TSchema>;
};

export function defineSchema<T extends Schema>(obj: T): T {
  return obj;
}

export * from "./model";
export * from "./field";
