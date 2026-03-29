#!/usr/bin/env node
import { Command, i } from "convoker";
import { greet } from "..";

const program = new Command("kineo")
  .description("Declarative, TypeScript-first ORM.")
  .version("0.12.0");

program.subCommand("greet", (c) =>
  c
    .input({
      names: i
        .positional("string")
        .description("List of names to greet")
        .list(),
    })
    .action(({ names }) => {
      greet(...names);
    }),
);

program.run();
