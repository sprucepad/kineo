import path from "node:path";
import fs from "node:fs/promises";

import { filterEntries, toMigration, currentDate } from "@/migration";
import { deploy, generate, pull } from "@/kit";
import { CWD } from "@/jiti";
import { config } from ".";

import { Command, i } from "convoker";

export default new Command(["migrate", "generate"])
  .input({
    noPush: i.option("boolean", "--no-push", "-n").optional(),
  })
  .description(
    "Generates migrations based on the current database state and the current schema.",
  )
  .action(async ({ noPush }) => {
    const adapter = config.adapter;
    const entries = await generate(adapter, await pull(adapter), config.schema);

    const contents = JSON.stringify(toMigration(entries));
    await fs.writeFile(
      path.join(CWD, config.migrations, `${currentDate()}_migration.json`),
      contents,
    );
    if (!noPush) await deploy(adapter, filterEntries(entries, "command"));
  });
