import { Command, i } from "convoker";
import { greet } from ".";

// To make Knip ignore this for now
// -- Will be used in CLI
import { text as _text } from "@clack/prompts";
// -- Will be used in schema parsers
import { parse as _parse } from "oxc-parser";
import _resolve from "oxc-resolver";

new Command(
  "kineo",
  "An experimental, declarative TypeScript ORM.",
  "0.12.0-alpha",
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
