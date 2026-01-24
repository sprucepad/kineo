import init from "./init";

import path from "node:path";
import { existsSync, promises as fs } from "node:fs";

import { color, Command, i, log, prompt } from "convoker";
import { FieldDef, RelationDef, type Schema } from "kineo/schema";

import { CWD, tryImport } from "@/jiti";
import { parseConfig, type ParsedConfig } from "@/config";
import * as kit from "@/kit";
import { KineoKitError, KineoKitErrorKind } from "@/error";
import { filterEntries, toEntries, toMigration } from "@/migration";

const CONFIG_FILES = [
  "./kineo.config.ts",
  "./kineo.config.js",
  "./kineo.config.mts",
  "./kineo.config.mjs",
  "./kineo.config.cts",
  "./kineo.config.cjs",
];

let config: ParsedConfig;

/**
 * The program KineoKit runs.
 */
export const program = new Command("kineokit")
  .version("0.1.2")
  .description("Manages migrations and schema.")
  .input({
    clientExport: i.option("string", "--client-export", "-x").optional(),
    clientFile: i.option("string", "--client-file", "-c").optional(),
    schemaExport: i.option("string", "--schema-export", "-e").optional(),
    schemaFile: i.option("string", "--schema-file", "-s").optional(),
    migrations: i.option("string", "--migrations-dir", "-m").optional(),
  })
  .use(
    async (
      { clientExport, clientFile, schemaExport, schemaFile, migrations },
      next,
    ) => {
      if (!config) {
        for (const file of CONFIG_FILES) {
          try {
            const module = await tryImport(file, {
              default: true,
            });
            config = await parseConfig(module);
            break;
          } catch (e) {
            log.error(
              `an error occurred trying to import '${file}'${
                typeof e === "object" && e !== null && "message" in e
                  ? `: ${e.message}`
                  : ""
              }. trying to import next file.`,
            );
            continue;
          }
        }

        if (!config) {
          log.warn(
            "could not import a configuration file. make sure to create one using `kineo init` or pass options to this command. see `kineo --help` for more details.",
          );
          config = {} as any;
        }
      }

      if (schemaFile) {
        config.schemaMod = {
          file: schemaFile,
          export: schemaExport ?? "schema",
        };

        const mod = await tryImport(config.schemaMod.file);
        config.schema = mod[config.schemaMod.export];
      } else {
        log.warn(
          "config missing schemaFile. either pass `--schema-file` to this command or create a configuration file using `kineo init`.",
        );
      }

      if (clientFile) {
        config.clientMod = {
          file: clientFile,
          export: clientExport ?? "client",
        };

        const mod = await tryImport(config.clientMod.file);
        config.client = mod[config.clientMod.export];
      } else {
        log.warn(
          "config missing clientFile. either pass `--client-file` to this command or create a configuration file using `kineo init`.",
        );
      }

      if (migrations) {
        config.migrations = migrations;
      } else {
        log.warn(
          "config missing migrations directory. either pass `--migrations-dir` to this command or create a configuration file using `kineo init`.",
        );
      }

      return next();
    },
  );

program
  .add(init)
  .subCommand("push", (c) =>
    c
      .description(
        "Pushes the current schema to the database, warning you for breaking changes.",
      )
      .input({
        force: i.option("boolean", "-f", "--force").optional(),
      })
      .action(async ({ force }) => {
        try {
          await kit.push(config.adapter, config.schema, force);
        } catch (e) {
          if (e instanceof KineoKitError) {
            const { data } = e as KineoKitError<kit.SchemaDiff>;
            if ((data?.breaking.length ?? 0) > 0) {
              log.info(
                `Changes:\n${color.bold("- Breaking:")}\n${data?.breaking.map((entry) => `  ${entry}`).join("\n")}
${color.bold("- Not Breaking:")}\n${data?.nonBreaking.map((entry) => `  ${entry}`)}`,
              );
              const confirmed = await prompt.confirm({
                message:
                  "A breaking change was detected. PUSHING THE SCHEMA WILL CAUSE DATA LOSS. Proceed anyways?",
              });

              if (confirmed)
                await kit.push(config.adapter, config.schema, true);
            }
          }

          throw e;
        }
      }),
  )
  .subCommand("pull", (c) =>
    c
      .description(
        "Pulls the current schema from the database. This only works for file path style imports in the configuration.",
      )
      .input({
        force: i.option("boolean", "-f", "--force").optional(),
      })
      .action(async ({ force }) => {
        if (!config.schemaMod)
          throw new KineoKitError(KineoKitErrorKind.FilePathNecessary);
        if (!force && config.adapter.pull) {
          const confirmed = await prompt.confirm({
            message:
              "This will delete your current schema. Not all adapters support full schema introspection features. THIS MAY CAUSE LOSS. Make sure you can revert this action.",
          });
          if (!confirmed) return;
        }

        const schema = await kit.pull(config.adapter);
        const contents = ensureImports(
          await fs.readFile(config.schemaMod.file, "utf-8"),
        );

        const newExport = generateSchemaSource(schema, config.schemaMod.export);
        const namedExportRegex = new RegExp(
          `export\\s+const\\s+${config.schemaMod.export}\\s*=([\\s\\S]*?);`,
          "m",
        );
        const defaultExportRegex =
          /export\s+default\s+defineSchema\([\s\S]*?\);?/m;

        let updatedContents: string;

        if (config.schemaMod.export === "default") {
          if (defaultExportRegex.test(contents)) {
            updatedContents = contents.replace(defaultExportRegex, newExport);
          } else {
            updatedContents = contents.trimEnd() + "\n\n" + newExport + "\n";
          }
        } else if (namedExportRegex.test(contents)) {
          updatedContents = contents.replace(namedExportRegex, newExport);
        } else {
          updatedContents = contents.trimEnd() + "\n\n" + newExport + "\n";
        }

        await fs.writeFile(config.schemaMod.file, updatedContents, "utf8");
      }),
  )
  .subCommand(["generate", "migrate"], (c) =>
    c
      .input({
        noPush: i.option("boolean", "--no-push", "-n").optional(),
      })
      .description(
        "Generates migrations based on the current database state and the current schema.",
      )
      .action(async ({ noPush }) => {
        const adapter = config.adapter;
        const entries = await kit.generate(
          adapter,
          await kit.pull(adapter),
          config.schema,
        );

        const contents = JSON.stringify(toMigration(entries));
        await fs.writeFile(
          path.join(CWD, config.migrations, `${currentDate()}_migration.json`),
          contents,
        );
        if (!noPush)
          await kit.deploy(adapter, filterEntries(entries, "command"));
      }),
  )
  .subCommand("status", (c) =>
    c.description("Gets status for existing migrations.").action(async () => {
      const entries = await fs.readdir(path.join(CWD, config.migrations));

      const statuses = await Promise.all(
        entries.map(async (entry) => {
          const migration = toEntries(
            JSON.parse(
              await fs.readFile(
                path.join(CWD, config.migrations, entry),
                "utf-8",
              ),
            ),
          );
          return {
            entry,
            status: await kit.status(
              config.adapter,
              filterEntries(migration, "command"),
            ),
          };
        }),
      );

      for (const status of statuses) {
        log.info(`${status.entry}: ${status.status}`);
      }
    }),
  )
  .subCommand("create", (c) =>
    c
      .description("Creates a new migration file.")
      .input({
        name: i.option("string", "-n", "--name"),
      })
      .action(async ({ name }) => {
        const filePath = path.join(
          CWD,
          config.migrations,
          `${name ?? Date.now()}.json`,
        );
        log.trace("creating migration", filePath);

        if (!existsSync(filePath)) {
          const confirmed = await prompt.confirm({
            message: `The file ${filePath} already exists. Would you like to override it?`,
          });
          if (!confirmed) return;
        }

        await fs.writeFile(filePath, "", "utf-8");
      }),
  )
  .subCommand("deploy", (c) =>
    c.description("Deploys existing migrations.").action(async () => {
      const entries = await fs.readdir(path.join(CWD, config.migrations));

      await Promise.all(
        entries.map(async (entry) => {
          const migration = toEntries(
            JSON.parse(
              await fs.readFile(
                path.join(CWD, config.migrations, entry),
                "utf-8",
              ),
            ),
          );
          const command = filterEntries(migration, "command");
          const status = await kit.status(config.adapter, command);
          if (status === "completed") return;

          await kit.deploy(config.adapter, command);
        }),
      );
    }),
  )
  .subCommand("rollback", (c) =>
    c
      .description("Rolls back a certain number of migrations.")
      .input({
        n: i.positional("number"),
        noPush: i.option("boolean", "-n", "--no-push").optional(),
      })
      .action(async ({ n, noPush }) => {
        const entries = await fs.readdir(path.join(CWD, config.migrations));
        const sortedEntries = await Promise.all(
          entries.map(async (entry) => {
            const fullPath = path.join(CWD, config.migrations, entry);
            const stat = await fs.stat(fullPath);
            return { entry: fullPath, mtime: stat.mtime };
          }),
        ).then((entries) =>
          entries
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
            .map(({ entry }) => entry),
        );

        await Promise.all(
          sortedEntries.slice(0, n).map(async (entry) => {
            const contents = JSON.parse(await fs.readFile(entry, "utf-8"));
            const migration = toEntries(contents).filter(
              (entry) => entry.type === "command" && !!entry.reverse,
            );

            await fs.writeFile(
              `${currentDate()}_rollback.json`,
              JSON.stringify(toMigration(migration)),
            );

            if (!noPush)
              await kit.deploy(
                config.adapter,
                filterEntries(migration, "reverse"),
              );
          }),
        );
      }),
  );

/**
 * Formats the current date.
 * @returns A formatted date.
 */
export function currentDate(): string {
  const now = new Date();

  // date components
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  // time components
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  // convert to string
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Ensures source code has the correct imports.
 * @param source The source code.
 * @returns The source code, with imports included if not already.
 */
export function ensureImports(source: string): string {
  const hasImports =
    source.includes("defineSchema") &&
    source.includes("model") &&
    source.includes("field") &&
    source.includes("relation");

  if (hasImports) return source;

  const importLine = `import { defineSchema, model, field, relation } from "kineo/schema";\n`;

  // Insert before first import or at top
  if (/^import\s/m.test(source)) {
    return source.replace(/^import\s/m, importLine + "import ");
  }

  return importLine + source;
}

/**
 * Generates schema source code.
 * @param schemaObj The schema to generate source code for.
 * @param exportName The name of the export.
 * @returns Schema source.
 */
export function generateSchemaSource(
  schemaObj: Schema,
  exportName: string,
): string {
  const models = Object.entries(schemaObj)
    .map(([modelName, modelDef]) => {
      const fields = Object.entries(modelDef)
        .map(([fieldName, fieldValue]) => {
          const serialized = serializeFieldOrRelation(fieldValue);
          return `    ${fieldName}: ${serialized}`;
        })
        .join(",\n");

      return `  ${modelName}: model({\n${fields}\n  })`;
    })
    .join(",\n");

  if (exportName === "default") {
    return `export default defineSchema({\n${models}\n});`;
  }

  return `export const ${exportName} = defineSchema({\n${models}\n});`;
}

/**
 * Serializes a field or relation.
 * @param value The field or relation.
 * @returns A serialized field/relation.
 */
export function serializeFieldOrRelation(value: unknown): string {
  // Handle FieldDef
  if (value instanceof FieldDef) {
    const f = value as FieldDef<any, any, any, any>;
    let expr = `field.${f.$kind}(${f.$name ? `"${f.$name}"` : ""})`;

    if (f.$id) expr += `.id()`;
    if (f.$required) expr += `.required()`;
    if (f.$array) expr += `.array()`;
    if (f.$default !== undefined)
      expr += `.default(${JSON.stringify(f.$default)})`;

    return expr;
  }

  // Handle RelationDef
  if (value instanceof RelationDef) {
    const r = value as RelationDef<any, any, any, any>;
    let expr = `relation.to("${r.$to}"${r.$name ? `, "${r.$name}"` : ""})`;

    switch (r.$direction) {
      case "incoming":
        expr += `.incoming()`;
        break;
      case "outgoing":
        expr += `.outgoing()`;
        break;
      case "both":
        expr += `.both()`;
        break;
    }

    if (r.$required) expr += `.required()`;
    if (r.$array) expr += `.array()`;

    return expr;
  }

  // fallback
  return JSON.stringify(value);
}
