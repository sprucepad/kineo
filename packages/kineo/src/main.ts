#!/usr/bin/env node
import process from "node:process";
import { Command, i } from "convoker";
import { loadEnv, resolveConfig, type ResolvedConfig } from "@/config";

let config: ResolvedConfig;

const program = new Command("kineo")
  .description("Declarative, TypeScript-first ORM.")
  .version("0.12.0")
  .input({
    configs: i
      .option("string", "-c", "--configs", "--config-files")
      .description("A list of configuration files to attempt loading from.")
      .list()
      .optional(),
    envs: i
      .option("string", "-e", "--envs", "--env-files")
      .description("A list of environment variable paths to load from.")
      .list()
      .optional(),
  })
  .use(async ({ configs, envs }) => {
    loadEnv(
      ".env",
      ".env.local",
      `.env.${process.env.NODE_ENV ?? "development"}`,
      ...(envs ?? []),
    );
    config = await resolveConfig([
      "kineo.config.ts",
      "kineo.config.js",
      ".config/kineo.ts",
      ".config/kineo.js",
      "kineo.config.mts",
      "kineo.config.mjs",
      ".config/kineo.mts",
      ".config/kineo.mjs",
      "kineo.config.cts",
      "kineo.config.cjs",
      ".config/kineo.cts",
      ".config/kineo.cjs",
      ...(configs ?? []),
    ]);

    console.log(config); // TODO
  });

program.subCommand("greet", (c) =>
  c
    .input({
      names: i
        .positional("string")
        .description("List of names to greet")
        .list(),
    })
    .action(({ names }) => {
      for (const name of names) {
        console.log(`Hello, ${name}!`);
      }
    }),
);

program.run();
