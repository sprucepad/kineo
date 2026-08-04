import "@oxc-node/core/register";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import type { AnyConfig, DatabaseConfig, EnvMode, OutMode } from ".";
import type { ServerPlugin } from "@/plugin";
import type { ServerAdapter } from "@/adapter";
import type { AnyClientAdapter, ClientAdapter } from "@/client";
import { parseSchema, type NormalizedSchema } from "@/schema/parser";

class Database {
  server!: ServerAdapter;
  client?: ClientAdapter;
  key!: string;

  out!: string;
  outMode!: OutMode;
  envMode!: EnvMode;

  migrationOut!: string;
  seed?: string[];

  schema!: NormalizedSchema;
  schemaPath!: string;

  public static async parse(key: string, raw: DatabaseConfig) {
    const db = new Database();
    db.server = await raw.adapter;
    const entry = db.server.clientEntrypoint;
    if (entry) {
      const mod = await import(entry.path);
      const adapter = mod[entry.export] as (
        ...props: unknown[]
      ) => AnyClientAdapter;

      db.client = await adapter(...(entry.props ?? []));
    }
    db.key = key;

    db.out = path.resolve(process.cwd(), raw.out ?? `./generated/${key}`);
    db.outMode = raw.outMode ?? "ts";
    db.envMode = raw.envMode ?? "process.env";

    db.migrationOut = path.resolve(process.cwd(), raw.migrationOut ?? "kineo");
    if (typeof raw.seed === "string") {
      if (raw.seed.startsWith("./") || raw.seed.startsWith("../")) {
        db.seed = [path.resolve(process.cwd(), raw.seed)];
      } else {
        db.seed = raw.seed.split(" ");
      }
    } else {
      db.seed = raw.seed;
    }

    db.schema = await parseSchema(raw.schema, db.server);

    return db;
  }
}

class Config extends Map<string, Database> {
  plugins!: ServerPlugin;

  public static async parse(raw: AnyConfig) {
    const cfg = new Config();
    cfg.plugins = await Promise.all(raw.plugins ?? []);

    if ("databases" in raw) {
      for (const key in raw.databases) {
        const rawDb = raw.databases[key]!;
        cfg.set(
          key,
          await Database.parse(key, {
            ...rawDb,
            envMode: rawDb.envMode ?? raw.envMode,
            outMode: rawDb.outMode ?? raw.outMode,
            migrationOut:
              rawDb.migrationOut ?? raw.migrationOut?.replace(/\*/g, key),
            out: rawDb.out ?? raw.out?.replace(/\*/g, key),
            schema: raw.schema?.replace(/\*/g, rawDb.schema) ?? rawDb.schema,
          }),
        );
      }
    } else {
      const key = "kineo";
      cfg.set(key, await Database.parse(key, raw));
    }

    return cfg;
  }
}

let config: Config;

export async function loadConfigs(configFiles: string[]) {
  const files = configFiles.flatMap((rawFilePath) => {
    const file = path.resolve(process.cwd(), rawFilePath);
    if (!fs.existsSync(file)) return [];
    return file;
  });

  const configs = await Promise.all(files.map((file) => import(file)));

  const configMerged = configs.reduce(
    (acc, next) => ({ ...acc, ...next }),
    {},
  ) as AnyConfig;

  const parsedConfig = await Config.parse(configMerged);
  config = parsedConfig;
}

export function useConfig() {
  return config;
}
