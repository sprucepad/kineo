import fs from "node:fs/promises";
import path from "node:path";

import { CWD } from "@/jiti";
import { filterEntries, toEntries } from "@/migration";
import { status } from "@/kit";
import { config } from ".";

import { Command, log } from "convoker";

export default new Command("status")
  .description("Gets status for existing migrations.")
  .action(async () => {
    const entries = await fs.readdir(path.join(CWD, config.migrations));

    const statuses = entries.map(async (entry) => {
      const migration = toEntries(
        JSON.parse(
          await fs.readFile(path.join(CWD, config.migrations, entry), "utf-8"),
        ),
      );
      return {
        entry,
        status: await status(
          config.adapter,
          filterEntries(migration, "command"),
        ),
      };
    });

    for await (const status of statuses) {
      log.info(`${status.entry}: ${status.status}`);
    }
  });
