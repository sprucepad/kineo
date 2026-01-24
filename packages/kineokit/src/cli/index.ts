import init from "./init";
import push from "./push";
import pull from "./pull";
import migrate from "./migrate";
import status from "./status";
import create from "./create";
import deploy from "./deploy";
import rollback from "./rollback";

import { Command, i, log } from "convoker";

import { tryImport } from "@/jiti";
import { parseConfig, type ParsedConfig } from "@/config";

const CONFIG_FILES = [
  "./kineo.config.ts",
  "./kineo.config.js",
  "./kineo.config.mts",
  "./kineo.config.mjs",
  "./kineo.config.cts",
  "./kineo.config.cjs",
];

export let config: ParsedConfig;

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

program.add(init, push, pull, migrate, status, create, deploy, rollback);
