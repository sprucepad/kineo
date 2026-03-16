import { theme, Command, i, log, prompt } from "convoker";
import { push, type SchemaDiff } from "@/kit";
import { KineoKitError } from "@/error";
import { config } from ".";

export default new Command("push")
  .description(
    "Pushes the current schema to the database, warning you for breaking changes.",
  )
  .input({
    force: i.option("boolean", "-f", "--force").optional(),
  })
  .action(async ({ force }) => {
    try {
      await push(config.adapter, config.schema, force);
    } catch (e) {
      if (e instanceof KineoKitError) {
        const { data } = e as KineoKitError<SchemaDiff>;
        if ((data?.breaking.length ?? 0) > 0) {
          log.info(
            `Changes:\n${theme.bold("- Breaking:")}\n${data?.breaking.map((entry) => `  ${entry}`).join("\n")}
${theme.bold("- Not Breaking:")}\n${data?.nonBreaking.map((entry) => `  ${entry}`)}`,
          );
          const confirmed = await prompt.confirm({
            message:
              "A breaking change was detected. PUSHING THE SCHEMA WILL CAUSE DATA LOSS. Proceed anyways?",
          });

          if (confirmed) await push(config.adapter, config.schema, true);
        }
      }

      throw e;
    }
  });
