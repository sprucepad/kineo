import fs from "node:fs/promises";
import path from "node:path";

import { config } from ".";
import { CWD } from "@/jiti";
import { toEntries, filterEntries } from "@/migration";
import { status, deploy } from "@/kit";

import { Command } from "convoker";

export default new Command("deploy")
  .description("Deploys existing migrations.")
  .action(async () => {
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
        const st = await status(config.adapter, command);
        if (st === "completed") return;

        await deploy(config.adapter, command);
      }),
    );
  });
