import path from "node:path";
import { promises as fs, existsSync } from "node:fs";

import { config } from ".";
import { CWD } from "@/jiti";

import { Command, i, log, prompt } from "convoker";

export default new Command("create")
  .description("Creates a new migration file.")
  .input({
    name: i.option("string", "-n", "--name"),
  })
  .action(async ({ name }) => {
    const filePath = path.join(
      CWD,
      config.migrations,
      `${name ?? Date.now()}.json`,
    );
    log.trace("creating migration", filePath);

    if (!existsSync(filePath)) {
      const confirmed = await prompt.confirm({
        message: `The file ${filePath} already exists. Would you like to override it?`,
      });
      if (!confirmed) return;
    }

    await fs.writeFile(filePath, "", "utf-8");
  });
