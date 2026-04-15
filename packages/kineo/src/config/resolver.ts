import process from "node:process";
import type { Adapter } from "@/adapter";
import type {
  KineoConfig,
  MigrationConfig,
  OutputConfig,
  SchemaConfig,
} from ".";
import { ModelBuilder, type Schema } from "@/schema";
import { createJiti } from "jiti";

export interface ResolvedConfig {
  adapter: Adapter;
  output: Required<OutputConfig>;
  migrations: Required<MigrationConfig>;

  schema: Schema;
  schemaConfig: Partial<SchemaConfig>;
}

export const jiti = createJiti(process.cwd());

export async function resolveConfig(files: string[]): Promise<ResolvedConfig> {
  let cfg: KineoConfig | undefined;
  for (const file of files) {
    cfg = await jiti.import(file, { default: true, try: true });
    if (cfg) break;
  }
  if (!cfg) throw new UnresolvedConfigError(files);

  const resolvedMigrations: ResolvedConfig["migrations"] = {} as any;
  if (typeof cfg.migrations === "string") {
    resolvedMigrations.path = cfg.migrations;
    resolvedMigrations.seed = "./db/seed.ts";
  } else {
    resolvedMigrations.path = cfg.migrations?.path ?? "./db/migrations";
    resolvedMigrations.seed = cfg.migrations?.seed ?? "./db/seed.ts";
  }

  const resolvedOutput: ResolvedConfig["output"] = {} as any;
  if (typeof cfg.output === "string") {
    resolvedOutput.path = cfg.output;
    resolvedOutput.mode = "dts";
  } else {
    resolvedOutput.path = cfg.output?.path ?? "./generated/kineo";
    resolvedOutput.mode = cfg.output?.mode ?? "dts";
  }

  const resolvedSchema = await resolveSchema(cfg.schema);

  return {
    adapter: await cfg.adapter,

    schema: resolvedSchema.schema,
    schemaConfig: resolvedSchema.schemaConfig,

    migrations: resolvedMigrations,
    output: resolvedOutput,
  };
}

export async function resolveSchema(
  cfg: KineoConfig["schema"],
): Promise<Pick<ResolvedConfig, "schema" | "schemaConfig">> {
  if (!cfg) {
    const path = "./db/schema.ts";
    const schema = await jiti.import(path, { try: true });
    if (!schema) throw new UnresolvedConfigError([path]);

    return {
      schema: schema as Schema,
      schemaConfig: {
        export: "all",
        path,
      },
    };
  }

  const awaited = await cfg;
  if (typeof awaited === "object") {
    if ("default" in awaited && !(awaited.default instanceof ModelBuilder)) {
      return {
        schema: awaited.default,
        schemaConfig: {
          export: "default",
        },
      };
    } else if ("path" in awaited && !(awaited.path instanceof ModelBuilder)) {
      const path = awaited.path;
      const exportName =
        awaited.export instanceof ModelBuilder
          ? "all"
          : (awaited.export ?? "all");

      const mod = (await jiti.import(path, { try: true })) as any;
      if (!mod) throw new UnresolvedConfigError([path]);

      let schema: Schema;
      if (exportName === "all") schema = mod as Schema;
      else schema = mod[exportName] as Schema;

      return {
        schema,
        schemaConfig: {
          path,
          export: exportName,
        },
      };
    } else {
      return {
        schema: awaited as Schema,
        schemaConfig: {},
      };
    }
  } else {
    const schema = await jiti.import(awaited, { try: true });
    if (!schema) throw new UnresolvedConfigError([awaited]);

    return {
      schema: schema as Schema,
      schemaConfig: {
        path: awaited,
        export: "all",
      },
    };
  }
}

export class UnresolvedConfigError extends Error {
  constructor(files: string[]) {
    super(
      `Could not resolve Kineo configuration. Files attempted: ${files.join(", ")}`,
    );
  }
}
