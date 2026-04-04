import type { ModelBuilder } from "./model";

export type Schema = Record<string, ModelBuilder<any, any>>;

export * from "./model";
export * from "./property";
export * from "./infer";
export * from "./parser";
