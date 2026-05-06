import type { ModelBuilder } from "./model";

export type Schema = Record<string, ModelBuilder<any, any>>;

export function defineSchema<T extends Schema>(s: T): T {
  return s;
}

export * from "./model";
export * from "./property";
export * from "./infer";
export * from "./parser";
export * from "./diff";
