import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Command, i } from "convoker";

import { greet } from ".";
import { loadConfigs } from "./config/parser";

new Command(
  "kineo",
  "An experimental, declarative TypeScript ORM.",
  "0.12.0-alpha",
)
  .input({
    envFiles: i
      .option("string", "-e", "--env-files", "--env", "--envs", "--env-file")
      .description("The environment file(s) to load.")
      .list()
      .optional(),
    configFiles: i
      .option("string", "-c", "--configs", "--config")
      .description("The configuration file(s) to load.")
      .list()
      .optional(),
  })
  .use(
    async ({
      envFiles = [".env", ".env.local", ".env.production"],
      configFiles = [
        "kineo.config.ts",
        ".config/kineo.ts",
        "kineo.config.js",
        ".config/kineo.js",
        "kineo.config.mjs",
        ".config/kineo.mjs",
        "kineo.config.cjs",
        ".config/kineo.cjs",
        "kineo.config.mts",
        ".config/kineo.mts",
        "kineo.config.cts",
        ".config/kineo.cts",
      ],
    }) => {
      for (const envFile of envFiles) {
        if (!fs.existsSync(envFile)) continue;
        process.loadEnvFile(path.resolve(process.cwd(), envFile));
      }
      loadConfigs(configFiles);
    },
  )
  .subCommand("greet", (c) =>
    c
      .description("Greets a set of users.")
      .input({
        names: i
          .positional("string")
          .description("The list of names to greet.")
          .list(),
      })
      .action(async ({ names }) => {
        greet(...names);
      }),
  )
  .run();
