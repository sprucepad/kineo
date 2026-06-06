import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Command, theme } from "convoker";
import { config } from "../_config";
import { generateMinTS } from "./min-ts";
import { generateTS } from "./ts";
import { generateMinDTS } from "./min-dts";
import { generateDTS } from "./dts";

export default new Command("generate")
  .description("Generates a client, used in codegen mode.")
  .input({})
  .action(async () => {
    const cfg = config();

    const outputPath = path.resolve(process.cwd(), cfg.output.path);
    if (!fs.existsSync(outputPath)) {
      await fs.promises.mkdir(outputPath, { recursive: true });
    }

    console.log(theme.bold(`Generating in \`${cfg.output.mode}\` mode...`));

    switch (cfg.output.mode) {
      case "min-ts":
        await generateMinTS();
        break;
      case "ts":
        await generateTS();
        break;
      case "min-dts":
        await generateMinDTS();
        break;
      case "dts":
        await generateDTS();
        break;
      default: {
        const exhaustive: never = cfg.output.mode;
        return exhaustive;
      }
    }

    console.log(theme.bold(theme.green("Generated!")));
  });
