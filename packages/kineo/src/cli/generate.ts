import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Command } from "convoker";
import { config } from "./_config";
import { ENV_SYMBOL, type EnvMode } from "@/config";

export default new Command("generate")
  .description("Generates a client, used in codegen mode.")
  .input({})
  .action(async () => {
    const cfg = config();
    switch (cfg.output.mode) {
      case "dts":
        return await generateDTSClient();
      case "ts":
        return await generateTSClient();
    }
  });

export async function generateTSClient() {
  const cfg = config();
  const dir = path.resolve(process.cwd(), cfg.output.path);
  if (!fs.existsSync(dir)) await fs.promises.mkdir(dir, { recursive: true });

  // 1. create adapter
  const adapterPath = path.resolve(dir, "adapter.ts");
  await fs.promises.writeFile(
    adapterPath,
    await createAdapter(
      cfg.adapter.runtimePath,
      cfg.adapter.runtimeExport ?? "default",
      cfg.adapter.opts,
      cfg.output.envMode,
    ),
  );

  // 2. create parsed schemas and model instances for each model in the schema
  // 3. copy client functions (such as direct execution, transactions etc)
  // 4. create barrel files, exporting models, schemas and client functions
  // 5. done!
}

export async function generateDTSClient() {
  throw new Error("Not supported yet"); // TODO

  // 1. create adapter
  // 2. create parsed schemas and model instances for each model in the schema
  // 3. copy client functions (such as direct execution, transactions etc)
  // 4. create barrel files, exporting models, schemas and client functions
  // 5. done!
}

async function createAdapter(
  runtimePath: string,
  runtimeExport: string,
  opts: unknown,
  envMode: EnvMode,
) {
  const imports = new Set([
    `import { ${runtimeExport} as _adapter } from "${runtimePath}";`,
  ]);
  const builder: string[] = ["export default _adapter("];

  buildEnvVars(builder, opts, envMode, imports);

  builder.push(");\n");

  return [...imports, "", ...builder].join("\n");
}

function buildEnvVars(
  builder: string[],
  opts: unknown,
  envMode: EnvMode,
  imports: Set<string>,
  indentLevel = 1,
  keyName = "",
) {
  const indent = "  ".repeat(indentLevel);
  const key = keyName === "" ? indent : `${indent}${keyName}: `;

  switch (typeof opts) {
    case "string": {
      const metadataArr = opts[ENV_SYMBOL]();
      if (!metadataArr || metadataArr.length === 0)
        builder.push(`${key}"${opts}",`);
      else {
        const meta = metadataArr.shift()!;
        switch (envMode) {
          case "node:process":
            imports.add('import process from "node:process";');
          // eslint-disable-next-line -- this is on purpose
          case "global_process":
            if (meta.loader === "required")
              builder.push(`${key}process.env["${meta.key}"]!,`);
            else if (meta.loader === "nullable")
              builder.push(`${key}process.env["${meta.key}"] ?? null,`);
            else if (meta.loader === "optional")
              builder.push(`${key}process.env["${meta.key}"],`);
            break;
          case "deno.env":
            if (meta.loader === "required")
              builder.push(`${key}Deno.env.get("${meta.key}")!,`);
            else if (meta.loader === "nullable")
              builder.push(`${key}Deno.env.get("${meta.key}") ?? null,`);
            else if (meta.loader === "optional")
              builder.push(`${key}Deno.env.get("${meta.key}"),`);
            break;
          case "cloudflare:workers":
            imports.add('import { env } from "cloudflare:workers";');

            if (meta.loader === "required")
              builder.push(`${key}env["${meta.key}"]!,`);
            else if (meta.loader === "nullable")
              builder.push(`${key}env["${meta.key}"] ?? null,`);
            else if (meta.loader === "optional")
              builder.push(`${key}env["${meta.key}"],`);
            break;
          case "import.meta":
            if (meta.loader === "required")
              builder.push(`${key}import.meta.env["${meta.key}"]!,`);
            else if (meta.loader === "nullable")
              builder.push(`${key}import.meta.env["${meta.key}"] ?? null,`);
            else if (meta.loader === "optional")
              builder.push(`${key}import.meta.env["${meta.key}"],`);
        }
      }
      break;
    }
    case "object": {
      if (Array.isArray(opts)) {
        builder.push(`${key}[`);
        for (const value of opts) {
          buildEnvVars(builder, value, envMode, imports, indentLevel + 1);
        }
        builder.push(`${indent}],`);
      }

      builder.push(`${key}{`);
      for (const key in opts) {
        buildEnvVars(
          builder,
          (opts as Record<string, unknown>)[key],
          envMode,
          imports,
          indentLevel + 1,
          key,
        );
      }
      builder.push(`${indent}},`);
      break;
    }
  }
}
