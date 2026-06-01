import { Command, i, prompt, theme } from "convoker";
import { config } from "./_config";
import { diff, isRawSchema, parseSchema, type ParsedSchema } from "@/schema";
import {
  getBreakingChanges,
  hasBreakingChanges,
  type BreakingLevel,
} from "./_utils";
import { NotSupportedError } from "./_error";

export default new Command("push")
  .description(
    "Pushes the current schema to the database, warning you for breaking changes.",
  )
  .input({
    force: i
      .option("boolean", "--force", "-f")
      .description("Forces the push, ignoring any breaking changes.")
      .optional(),
    level: i
      .option("string", "--level", "-l")
      .description(
        "What breaking change level should be considered as unacceptable (safe, breaking, destructive).",
      )
      .optional(),
  })
  .action(async ({ force = false, level = "destructive" }) => {
    const cfg = config();
    const curSchema = parseSchema(cfg.schema);

    let prevSchema = await cfg.adapter.pull?.();
    if (!prevSchema) return await push({ models: new Map() }, curSchema);
    if (isRawSchema(prevSchema)) prevSchema = parseSchema(prevSchema);

    let shouldContinue = force;
    if (!shouldContinue) {
      const difference = diff(prevSchema, curSchema);
      const breakingChanges = getBreakingChanges(difference);
      if (hasBreakingChanges(breakingChanges, level as BreakingLevel)) {
        console.log(theme.bold(theme.red("Breaking changes were detected.")));

        for (const { levels, kind } of breakingChanges) {
          for (const level of levels) {
            if (level === "safe") continue;
            console.log(`${colorizeLevel(level)}: ${kind}`);
          }
        }

        shouldContinue = await prompt.confirm({
          message:
            "Are you sure you want to continue? This may cause data loss.",
        });
      }
    }

    if (!shouldContinue) {
      console.log(theme.bold("Cancelled."));
      return;
    }

    await push(prevSchema, curSchema);
  });

async function push(prev: ParsedSchema, cur: ParsedSchema) {
  const adapter = config().adapter;
  if (!adapter.push) throw new NotSupportedError(adapter, "push");
  return await adapter.push(prev, cur);
}

function colorizeLevel(level: BreakingLevel) {
  switch (level) {
    case "safe":
      return theme.green(level.toUpperCase());
    case "breaking":
      return theme.red(level.toUpperCase());
    case "destructive":
      return theme.bold(theme.red(level.toUpperCase()));
  }
}
