#!/usr/bin/env node
import process from "node:process";
import { Command, i } from "convoker";
import { loadEnv, resolveConfig } from "@/config";
import { setConfig } from "./cli/_config";

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
  .use(
    async (
      {
        configs = [
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
        ],
        envs = [
          ".env",
          ".env.local",
          `.env.${process.env.NODE_ENV ?? "development"}`,
        ],
      },
      next,
    ) => {
      loadEnv(...envs);

      setConfig(await resolveConfig(configs));
      return next();
    },
  );

import init from "./cli/init";
import generate from "./cli/generate";
import migrate from "./cli/migrate";
import push from "./cli/push";
program.add(init, generate, migrate, push);

program.run();
