import type { Adapter } from "@/adapter";
import type { Schema } from "@/schema";

export interface KineoConfig {
  adapter: Adapter | Promise<Adapter>;
  output?: string | OutputConfig;

  schema?:
    | string
    | SchemaConfig
    | Schema
    | Promise<Schema>
    | Promise<{ default: Schema }>;
  migrations?: string | MigrationConfig;
}

export interface SchemaConfig {
  path?: string;
  export?: "all" | "default" | (string & {});
}

export type EnvMode =
  | "import.meta"
  | "deno.env"
  | "global_process"
  | "node:process"
  | "cloudflare:workers";

export interface OutputConfig {
  path?: string;
  mode?: "dts" | "ts";
  envMode?: EnvMode;
}

export interface MigrationConfig {
  path?: string;
  seed?: string;
}

export function defineConfig(cfg: KineoConfig): KineoConfig {
  return cfg;
}

export * from "./env";
export * from "./resolver";
