import type { Kineo } from "kineo/client";
import type { AdapterKit } from "./adapter";
import type { Schema } from "kineo/schema";

/**
 * The shape of a file export.
 */
export interface FileExport {
  file: string;
  export: string;
}

/**
 * A reference function to an export.
 */
export type ReferenceFn<T> = () => Promise<T> | T;

/**
 * A reference to a file.
 */
export type Reference<T> =
  | string
  | FileExport
  | T
  | Promise<T>
  | ReferenceFn<T>;

/**
 * KineoKit configuration.
 */
export interface KineoConfig {
  /**
   * The adapter for KineoKit.
   */
  adapter: AdapterKit;
  /**
   * A reference to the schema.
   */
  schema: Reference<Schema>;
  /**
   * A reference to the client.
   */
  client: Reference<Kineo<any, any>>;
  /**
   * Directory containing migrations.
   */
  migrations: string;
}

/**
 * Adds type definitions of Kineo configuration to an object.
 * @param config The configuration.
 * @returns The same configuration.
 */
export function defineConfig(config: KineoConfig): KineoConfig {
  return config;
}
