import fs from "node:fs/promises";
import path from "node:path";

import { CWD } from "@/jiti";

import { Command, i, prompt, log } from "convoker";

export default new Command("init")
  .description("Creates configuration for Kineo.")
  .input({
    clientExport: i.option("string", "--client-export", "-x").optional(),
    clientFile: i.option("string", "--client-file", "-c").optional(),
    schemaExport: i.option("string", "--schema-export", "-e").optional(),
    schemaFile: i.option("string", "--schema-file", "-s").optional(),
    migrations: i.option("string", "--migrations-dir", "-m").optional(),
    style: i.option("string", "--style", "-t").optional(),
  })
  .action(
    async ({
      clientExport,
      clientFile,
      schemaExport,
      schemaFile,
      migrations,
      style,
    }) => {
      if (!clientFile) {
        clientFile = await prompt.text({
          message: "Where is your client located?",
          default: "src/db/index.ts",
          placeholder: "src/db/index.ts",
        });
      }

      if (!clientExport) {
        clientExport = await prompt.text({
          message: "What is the name of the export of your client?",
          default: "client",
          placeholder: "client",
        });
      }

      if (!schemaFile) {
        schemaFile = await prompt.text({
          message: "Where is your schema located?",
          default: "./src/db/index.ts",
          placeholder: "./src/db/index.ts",
        });
      }

      if (!schemaExport) {
        schemaExport = await prompt.text({
          message: "What is the name of the export of your schema?",
          default: "schema",
          placeholder: "schema",
        });
      }

      if (!migrations) {
        migrations = await prompt.text({
          message: "Where do you want your migrations to be stored?",
          default: "migrations",
          placeholder: "migrations",
        });
      }

      if (!style) {
        style = await prompt.select({
          message: "How do you want your configuration file to be structured?",
          options: [
            {
              label: "Direct imports",
              value: "direct",
            },
            {
              label: "Dynamic imports",
              value: "dynamic",
            },
            {
              label: "File paths",
              value: "paths",
            },
            {
              label: "CommonJS",
              value: "commonjs",
            },
            {
              label: "CommonJS file paths",
              value: "commonjs-paths",
            },
          ],
        });
      }

      log.info("Generating configuration file.");

      let contents: string;
      let fileName = "kineo.config.ts";
      if (style === "direct") {
        contents = `import { defineConfig } from "kineokit";
import ${schemaExport === "default" ? "schema" : `{ ${schemaExport} as schema }`} from ${importPath(schemaFile)};
import ${clientExport === "default" ? "client" : `{ ${clientExport} as client }`} from ${importPath(clientFile)};

export default defineConfig({
  schema,
  client,
  migrations: ${importPath(migrations)},
});
`;
      } else if (style === "dynamic") {
        contents = `import { defineConfig } from "kineokit";

export default defineConfig({
  schema: import(${importPath(schemaFile)}).then((mod) => mod["${schemaExport}"]),
  client: import(${importPath(clientFile)}).then((moimport * as kit from "..";d) => mod["${clientExport}"]),
  migrations: ${importPath(migrations)},
});
`;
      } else if (style === "paths") {
        contents = `import { defineConfig } from "kineokit";

export default defineConfig({
  schema: { file: ${importPath(schemaFile)}, export: "${schemaExport}" },
  client: { file: ${importPath(clientFile)}, export: "${clientExport}" },
  migrations: ${importPath(migrations)},
});
`;
      } else if (style === "commonjs") {
        contents = `const { defineConfig } = require("kineokit");

module.exports = defineConfig({
  schema: require(${importPath(schemaFile)})["${schemaExport}"],
  client: require(${importPath(clientFile)})["${clientExport}"],
  migrations: ${importPath(migrations)}
});
`;
        fileName = "kineo.config.cts";
      } else {
        contents = `const { defineConfig } = require("kineokit");

module.exports = defineConfig({
  schema: { file: ${importPath(schemaFile)}, export: "${schemaExport}" },
  client: { file: ${importPath(clientFile)}, export: "${clientExport}" },
  migrations: ${importPath(migrations)},
});
`;
        fileName = "kineo.config.cts";
      }

      log.trace("writing", contents, "to", fileName);

      await fs.writeFile(path.join(CWD, fileName), contents, "utf-8");

      log.info(
        "Configuration file generated! You can now start using Kineo migrations.",
      );
    },
  );

/**
 * Gets the import path of a file, wrapped in quotes.
 * @param file The file path.
 * @returns The import path.
 */
export function importPath(file: string) {
  return `"${file.startsWith(".") ? file : `./${file}`}"`;
}
