import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { config } from "../_config";
import { theme } from "convoker";
import type { Adapter } from "@/adapter";
import { ENV_SYMBOL, type EnvMode } from "@/config";
import { parseSchema, type ParsedModel } from "@/schema";

// TODO inspect tsconfig for file extensions in exports

export async function generateTS() {
  const cfg = config();
  const files = new Map<string, string>();

  // 1. create parsed schemas and model instances for each model in the schema
  const schema = parseSchema(cfg.schema);
  for (const [key, model] of schema.models) {
    if (model.key == null) continue;
    files.set(`models/${key}.ts`, serializeModel(model));
  }

  // 2. create adapter
  files.set("adapter.ts", generateAdapter(cfg.adapter, cfg.output.envMode));

  // 3. create client
  const functionsURL = new URL("./ts/functions.ts", import.meta.url);
  const functions = await fs.promises.readFile(functionsURL, "utf-8");
  files.set(
    "client.ts",
    `${functions}\n${Object.keys(cfg.schema)
      .map((key) => `export { default as ${key} } from "./models/${key}.js";`)
      .join("\n")}\n`,
  );
  files.set("index.ts", `export * as db from "./client.js";\n`);

  // 4. write files
  for (const [file, contents] of files) {
    process.stdout.write(theme.bold(`Writing file ${file}...`));
    const fullPath = path.resolve(process.cwd(), cfg.output.path, file);

    const dirname = path.dirname(fullPath);
    if (!fs.existsSync(dirname))
      await fs.promises.mkdir(dirname, { recursive: true });
    await fs.promises.writeFile(fullPath, contents, "utf-8");

    process.stdout.clearLine(0);
    process.stdout.write(theme.bold(`\rWrote file ${file}!\n`));
  }
}

function generateAdapter(adapter: Adapter, envMode: EnvMode) {
  const imports = new Set([
    `import { ${adapter.runtimeExport ?? "default"} as _adapter } from "${adapter.runtimePath}";`,
  ]);
  const builder = ["export const adapter = _adapter("];

  generateAdapterOpts(builder, imports, 1, envMode, "", adapter.opts);

  builder.push(");\n");
  return [...imports, "", ...builder].join("\n");
}

function generateAdapterOpts(
  builder: string[],
  imports: Set<string>,
  indentLevel: number,
  envMode: EnvMode,
  keyName: string,
  opts: unknown,
) {
  const indent = "  ".repeat(indentLevel);
  const key = keyName ? `${indent}"${keyName}": ` : indent;

  if (typeof opts === "string") {
    const metadata = opts[ENV_SYMBOL]();

    let value: string;
    if (!metadata || metadata.length === 0) value = `"${opts}"`;
    else {
      const meta = metadata.shift()!;
      if (meta.loader === "required")
        value = `${getEnv(meta.key, imports, envMode)}!`;
      else if (meta.loader === "nullable")
        value = `${getEnv(meta.key, imports, envMode)} ?? null`;
      else if (meta.loader === "optional")
        value = getEnv(meta.key, imports, envMode);
      else throw new Error("Unhandled env loader: " + meta.loader);
    }

    builder.push(`${key}${value},`);
  } else if (typeof opts === "object") {
    if (Array.isArray(opts)) {
      builder.push(`${key}[`);
      for (const value of opts) {
        generateAdapterOpts(
          builder,
          imports,
          indentLevel + 1,
          envMode,
          "",
          value,
        );
      }
      builder.push(`${indent}],`);
    } else {
      builder.push(`${key}{`);
      for (const key in opts) {
        generateAdapterOpts(
          builder,
          imports,
          indentLevel + 1,
          envMode,
          key,
          (opts as Record<string, unknown>)[key],
        );
      }
      builder.push(`${indent}},`);
    }
  } else builder.push(`${key}${JSON.stringify(opts, null, 2)},`);
}

function getEnv(key: string, imports: Set<string>, mode: EnvMode) {
  switch (mode) {
    case "node:process":
      imports.add('import process from "node:process";');
      return `process.env["${key}"]`;
    case "global_process":
      return `process.env["${key}"]`;
    case "deno.env":
      return `Deno.env.get("${key}")`;
    case "cloudflare:workers":
      imports.add('import { env } from "cloudflare:workers";');
      return `env["${key}"]`;
    case "import.meta":
      return `import.meta.env["${key}"]`;
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

function serializeModel(model: ParsedModel) {
  void model; // TODO
  return "";
}
