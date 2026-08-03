// To make Knip ignore this for now
// -- Will be used in CLI
import { text as _text } from "@clack/prompts";
// -- Will be used for schema parsing
import _resolver from "oxc-resolver";
import { parse as _parse } from "oxc-parser";
import { walk as _walk } from "oxc-walker";

import process from "node:process";
import path from "node:path";
import { Command, i } from "convoker";

import { greet } from ".";
import { loadConfigs } from "./config/parser";

new Command(
  "kineo",
  "An experimental, declarative TypeScript ORM.",
  "0.12.0-alpha",
)
  .input({
    envFiles: i.option("string", "-e", "--env-files").list().optional(),
    configs: i.option("string", "-c", "--configs").list().optional(),
  })
  .use(
    async ({
      envFiles = [".env", ".env.local", ".env.production"],
      configs = [],
    }) => {
      for (const envFile of envFiles) {
        process.loadEnvFile(path.resolve(process.cwd(), envFile));
      }
      loadConfigs(configs);
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
