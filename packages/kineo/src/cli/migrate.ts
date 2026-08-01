import { Command, i, theme } from "convoker";
import { config } from "./_config";
import { NotSupportedError } from "./_error";
import { isRawSchema, parseSchema } from "@/schema";
import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import crypto from "node:crypto";
import childProcess from "node:child_process";

export default new Command("migrate")
  .description(
    "Generates and manages migrations. By default, this generates and deploys migrations.",
  )
  .input({
    noDeploy: i
      .option("boolean", "--no-deploy", "-n")
      .description("Disables deploying the migration after generation.")
      .optional(),
  })
  .action(async ({ noDeploy = false }) => {
    const cfg = config();
    if (!cfg.adapter.generate)
      throw new NotSupportedError(cfg.adapter, "generate");

    console.log(theme.bold("Pulling schema from database..."));
    const pulled = await cfg.adapter.pull?.();
    console.log(theme.bold("Parsing schemas..."));

    const prev =
      pulled == null
        ? { models: new Map() }
        : isRawSchema(pulled)
          ? parseSchema(pulled)
          : pulled;
    prev.models.delete("__kineo_migrations__");

    const cur = parseSchema(cfg.schema);

    console.log(theme.bold("Generating migration..."));
    const entries = await cfg.adapter.generate(prev, cur);

    if (entries.statements.length === 0) {
      console.log(theme.green("Nothing changed!"));
      return;
    }

    let code = "";
    for (const statement of entries.statements) {
      code +=
        (statement.type === "note"
          ? statement.note
          : `${statement.command} ${statement.description}`) + "\n";
    }

    const migrationPath = path.resolve(process.cwd(), cfg.migrations.path);
    if (fs.existsSync(migrationPath))
      await fs.promises.mkdir(migrationPath, { recursive: true });
    await fs.promises.writeFile(
      path.resolve(
        migrationPath,
        Date.now() + (cfg.adapter.migrationExtension ?? ".txt"),
      ),
      code,
    );

    const hash = crypto.createHash("sha256").update(code).digest();
    await cfg.adapter.afterGenerate?.(hash, code);

    if (!noDeploy) {
      console.log(theme.bold("Deploying migration..."));
      if (!cfg.adapter.deploy)
        throw new NotSupportedError(cfg.adapter, "deploy");
      await cfg.adapter.deploy(hash, code);
    }

    console.log(theme.green(theme.bold("Success!")));
  })
  .subCommand("seed", (c) =>
    c
      .description("Runs the seed script defined in your configuration.")
      .input({
        runner: i
          .option("string", "--runner", "-r")
          .description(
            "The command or package CLI to run to execute the seed. Defaults to `node`.",
          )
          .optional(),
      })
      .action(async ({ runner = "node" }) => {
        const cfg = config();

        function getPackageManagerExecuteCommand(
          script: string,
        ): [string, ...string[]] {
          // Direct runtime execution
          if (runner === "node") return ["node", script];
          else if (runner === "bun") return ["bun", "run", script];
          else if (runner === "deno") return ["deno", "run", script];

          // Package execution
          const userAgent = process.env.npm_config_user_agent ?? "";
          if (userAgent.includes("pnpm")) {
            return ["pnpm", "exec", runner, script];
          } else if (userAgent.includes("yarn")) {
            return ["yarn", "run", runner, script];
          } else if (userAgent.includes("bun")) {
            return ["bunx", runner, script];
          } else {
            return ["npx", runner, script];
          }
        }

        const cmd = getPackageManagerExecuteCommand(cfg.migrations.seed);
        console.log(
          `${theme.bold("Executing")} \`${theme.cyan(cmd.join(" "))}\`${theme.bold("...")}`,
        );

        const [command, ...args] = cmd;
        const pmProcess = childProcess.spawn(command, args, {
          stdio: "inherit",
        });

        const code = await new Promise<number | null>((resolve) =>
          pmProcess.on("exit", (code) => resolve(code)),
        );
        if (code !== 0)
          console.error(theme.bold(`Process exited with code ${code}`));
        else console.log(theme.bold("Seed ran successfully!"));
      }),
  )
  .subCommand("deploy", (c) =>
    c
      .description(
        "Deploys one or more migrations. By default, this deploys all pending migrations.",
      )
      .input({
        migrations: i
          .argument("string")
          .description("The migration file names to deploy.")
          .list()
          .optional(),
      })
      .action(async ({ migrations }) => {
        const cfg = config();

        const migrationsDir = path.resolve(process.cwd(), cfg.migrations.path);
        if (!fs.existsSync(migrationsDir))
          await fs.promises.mkdir(migrationsDir, { recursive: true });
        const files =
          migrations?.map((file) => path.resolve(migrationsDir, file)) ??
          (await fs.promises.readdir(migrationsDir));

        for (const migrationFile of files) {
          const fullMigrationPath = path.resolve(migrationsDir, migrationFile);

          const text = await fs.promises.readFile(fullMigrationPath, "utf-8");
          const hash = crypto.createHash("sha256").update(text).digest();
          const state = await cfg.adapter.status?.(hash, text);

          if (!state || state.status === "deployed") continue;

          if (!cfg.adapter.deploy)
            throw new NotSupportedError(cfg.adapter, "deploy");
          await cfg.adapter.deploy(hash, text);
        }
      }),
  )
  .subCommand("status", (c) =>
    c
      .description(
        "Checks the status of one or more migrations. By default, this shows the status of all migrations.",
      )
      .input({
        migrations: i
          .argument("string")
          .description("The migration file names to check the status of.")
          .list()
          .optional(),
      })
      .action(async ({ migrations }) => {
        const cfg = config();

        const migrationsDir = path.resolve(process.cwd(), cfg.migrations.path);
        if (!fs.existsSync(migrationsDir))
          await fs.promises.mkdir(migrationsDir, { recursive: true });
        const files =
          migrations?.map((file) => path.resolve(migrationsDir, file)) ??
          (await fs.promises.readdir(migrationsDir));

        console.log(
          theme.bold(`Printing migration status for ${files.length} files`),
        );
        for (const file of files) {
          const text = await fs.promises.readFile(
            path.resolve(migrationsDir, file),
            "utf-8",
          );
          const hash = crypto.createHash("sha256").update(text).digest();

          if (!cfg.adapter.status)
            throw new NotSupportedError(cfg.adapter, "status");
          const state = await cfg.adapter.status(hash, text);

          console.log(`${theme.bold(file)}: ${state.status}`);
        }
      }),
  );
