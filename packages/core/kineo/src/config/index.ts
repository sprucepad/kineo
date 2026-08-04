import type { AnyServerAdapter } from "@/adapter";
import type { AnyServerPlugin } from "@/plugin";

export type OutMode = "ts"; // TODO declaration output mode
export type EnvMode =
  | "import.meta.env"
  | "deno.env"
  | "process.env"
  | "node:process"
  | "cloudflare:workers";

interface Config {
  plugins?: AnyServerPlugin[];
}

export interface DatabaseConfig {
  out?: string;
  migrationOut?: string;
  seed?: string | string[];
  outMode?: OutMode;
  envMode?: EnvMode;

  adapter: AnyServerAdapter;
  schema: string;
}

export interface MultiConfig extends Config {
  out?: string;
  migrationOut?: string;
  schema?: string;
  outMode?: OutMode;
  envMode?: EnvMode;

  databases: Record<string, DatabaseConfig>;
}

export interface SingleConfig extends DatabaseConfig, Config {}

export type AnyConfig = SingleConfig | MultiConfig;

export function defineConfig(config: SingleConfig): SingleConfig;
export function defineConfig(config: MultiConfig): MultiConfig;

export function defineConfig(config: AnyConfig) {
  return config;
}
