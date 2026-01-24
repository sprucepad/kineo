import path from "node:path";
import fs from "node:fs/promises";

import { config } from ".";
import { CWD } from "@/jiti";
import {
  filterEntries,
  toEntries,
  toMigration,
  currentDate,
} from "@/migration";
import { deploy } from "@/kit";

import { Command, i } from "convoker";

export default new Command("rollback")
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
          await deploy(config.adapter, filterEntries(migration, "reverse"));
      }),
    );
  });
