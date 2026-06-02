import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import childProcess from "node:child_process";
import { Command, i, prompt, theme } from "convoker";
import type { AdapterMeta } from "@/adapter";
import { jiti, resolveConfig } from "@/config";
import { generateClient } from "./generate";
import { setConfig } from "./_config";

export default new Command("init")
  .description("Initializes a new project.")
  .input({
    packageJson: i
      .option("string", "-p", "--package", "--package-json")
      .description("The package.json file of your project.")
      .optional(),
    packageManager: i
      .option("string", "-p", "--pm", "--package-manager")
      .description(
        "The package manager to install Kineo and your chosen adapter if not installed yet.",
      )
      .optional(),
    noInstall: i
      .option("boolean", "-n", "--no-install")
      .description("Ignores the installation of Kineo and your chosen adapter.")
      .optional(),

    adapter: i
      .option("string", "-a", "--adapter")
      .description(
        "The adapter to use. Can be a package name, or a built-in Kineo adapter.",
      )
      .optional(),
    schema: i
      .option("string", "-s", "--schema")
      .description("Where your schema is located.")
      .optional(),
    migrations: i
      .option("string", "-m", "--migrations")
      .description("Where to generate your migrations.")
      .optional(),
    output: i
      .option("string", "-o", "--output")
      .description("Where to generate your client.")
      .optional(),
  })
  .action(
    async ({
      packageJson = "./package.json",
      packageManager = getPackageManager(),
      noInstall,

      adapter,
      schema,
      migrations,
      output,
    }) => {
      if (!adapter) {
        adapter = await prompt.search({
          message: "Which adapter would you like to use?",
          options: [
            { label: "SQLite (better-sqlite3)", value: "sqlite3" },
            { label: "Postgres (postgres)", value: "postgres" },
            { label: "MySQL (mysql2)", value: "mysql2" },
            // TODO
            // { label: "libSQL (@libsql/client)", value: "libsql" },
            // { label: "Microsoft SQL Server (mssql)", value: "mssql" },
            // { label: "Dexie.js (IndexedDB, dexie)", value: "dexie" },
          ],
          default: "sqlite3",
        });
      }

      if (!schema) {
        schema = await prompt.text({
          message: "Where is your schema located?",
          default: "./db/schema.ts",
        });
      }

      if (!output) {
        output = await prompt.text({
          message: "Where should your client be generated?",
          default: "./generated/kineo",
        });
      }

      if (!migrations) {
        migrations = await prompt.text({
          message: "Where should your migrations be stored?",
          default: "./db/migrations",
        });
      }

      if (!noInstall) {
        noInstall = await prompt.confirm({
          message: "Install dependencies?",
        });
      }

      const packages = ["kineo"];

      const builtInAdapters = {
        sqlite3: {
          packages: ["better-sqlite3"],
          adapterPath: "kineo/adapter/sqlite3",
          adapterExport: "default",
          adapterName: "sqlite",
          adapterOptions: 'env("DB_URL")',
        },
        mysql2: {
          packages: ["mysql2"],
          adapterPath: "kineo/adapter/mysql2",
          adapterExport: "default",
          adapterName: "mysql",
          adapterOptions: {
            url: 'env("DB_URL")',
            database: 'env("DB_NAME")',
          },
        },
        postgres: {
          packages: ["postgres"],
          adapterPath: "kineo/adapter/postgres",
          adapterExport: "default",
          adapterName: "postgres",
          adapterOptions: {
            url: 'env("DB_URL")',
            database: 'env("DB_NAME")',
          },
        },
        libsql: {
          packages: ["@kineojs/adapter-libsql", "@libsql/client"],
          adapterPath: "@kineojs/adapter-libsql",
          adapterExport: "default",
          adapterName: "libsql",
          adapterOptions: {
            url: 'env("DB_URL")',
            authToken: 'env("DB_TOKEN")',
          },
        },
        mssql: {
          packages: ["@kineojs/adapter-mssql", "mssql"],
          adapterPath: "@kineojs/adapter-mssql",
          adapterExport: "default",
          adapterName: "mssql",
          adapterOptions: {
            url: 'env("DB_URL")',
            database: 'env("DB_NAME")',
            user: 'env("DB_USER")',
            password: 'env("DB_PASSWORD")',
          },
        },
        dexie: {
          packages: ["@kineojs/adapter-dexie", "dexie"],
          adapterPath: "@kineojs/adapter-dexie",
          adapterExport: "default",
          adapterName: "dexie",
          adapterOptions: '"kineo"',
        },
      } satisfies Record<string, AdapterMeta>;

      type BuiltInAdapter = keyof typeof builtInAdapters;

      const builtInAdapter = builtInAdapters[adapter as BuiltInAdapter];
      if (builtInAdapter) {
        packages.push(...builtInAdapters[adapter as BuiltInAdapter].packages);
      } else {
        packages.push(adapter);
      }

      const installCommand = getInstallCommand(packageManager);
      const command = [packageManager, installCommand, ...packages] as [
        string,
        ...string[],
      ];

      let pkg: any | undefined;
      let installed = false;
      if (!noInstall) {
        const contents = await fs.promises.readFile(
          path.resolve(process.cwd(), packageJson),
          "utf-8",
        );
        pkg = JSON.parse(contents);

        if (!containsPackages(pkg, ["kineo"])) {
          console.log(theme.gray(`$ ${command.join(" ")}`));

          const exitCode = await installDeps(command);
          if (exitCode !== 0) {
            installed = false;
            console.log(
              theme.bold(
                theme.red(
                  "Something went wrong installing dependencies. Try running the command listed above yourself!",
                ),
              ),
            );
          } else {
            installed = true;
            console.log(theme.bold(theme.green("Installed dependencies!")));
          }
        } else {
          installed = true;
          console.log(theme.bold(theme.green("Kineo is already installed!")));
        }
      }

      console.log(theme.bold("Creating configuration..."));

      const adapterMeta: AdapterMeta | undefined =
        builtInAdapter ??
        (async () => {
          return await jiti.import(`${adapter}/meta`, {
            default: true,
            try: true,
          });
        });

      if (pkg && !noInstall) {
        if (!containsPackages(pkg, adapterMeta.packages)) {
          const command = [
            packageManager,
            installCommand,
            ...adapterMeta.packages,
          ] as [string, ...string[]];
          packages.push(...adapterMeta.packages);

          console.log(theme.gray(`$ ${command.join(" ")}`));

          const code = await installDeps(command);
          if (code !== 0) {
            installed = false;
            console.log(
              theme.bold(
                theme.red(
                  "Something went wrong with installing secondary dependencies. Try running the command listed above yourself!",
                ),
              ),
            );
          } else {
            installed = true;
            console.log(
              theme.bold(theme.green("Installed secondary dependencies!")),
            );
          }
        }
      }

      const generatedConfig = await generateConfig(
        adapterMeta,
        output,
        migrations,
        schema,
      );
      await fs.promises.writeFile(
        path.resolve(process.cwd(), "kineo.config.mjs"),
        generatedConfig,
        "utf-8",
      );
      console.log(theme.bold(theme.green("Configuration generated!")));

      function getPackageManagerExecuteCommand(
        pkg: string,
      ): [string, ...string[]] {
        if (packageManager === "pnpm") {
          return ["pnpm", "exec", pkg];
        } else if (packageManager === "yarn") {
          return ["yarn", "run", pkg];
        } else if (packageManager === "bun") {
          return ["bunx", pkg];
        } else {
          return ["npx", pkg];
        }
      }

      if (!installed) {
        console.log(
          theme.yellow(
            "Dependencies were not installed. Make sure to run these commands to get started, after fixing any conflicts:",
          ),
        );
        console.log(
          theme.gray(
            `$ ${packageManager} ${installCommand} ${packages.join(" ")}`,
          ),
        );
        console.log(
          theme.gray(`$ ${getPackageManagerExecuteCommand("kineo")} generate`),
        );
      } else {
        console.log(theme.bold("Generating client..."));
        try {
          const config = await resolveConfig(["kineo.config.mjs"]);
          setConfig(config);

          await generateClient();
          console.log(theme.bold(theme.green("Kineo is ready for use!")));
        } catch (e) {
          console.error(e);
          console.log(
            theme.red(
              "Failed to generate client. After fixing any issues, run this command manually:",
            ),
          );
          console.log(
            theme.gray(
              `$ ${getPackageManagerExecuteCommand("kineo").join(" ")} generate`,
            ),
          );
        }
      }
    },
  );

async function installDeps([command, ...args]: [string, ...string[]]) {
  const pmProcess = childProcess.spawn(command, args, {
    stdio: "inherit",
  });

  return new Promise<number>((resolve) =>
    pmProcess.on("exit", (code) => resolve(code ?? -1)),
  );
}

async function generateConfig(
  meta: AdapterMeta,
  output: string,
  migrations: string,
  schema: string,
) {
  const adapterName = meta.adapterName ?? meta.adapterExport!;
  return `// @ts-check
import { ${[...getKineoImports()].join(", ")} } from "kineo";
import ${meta.adapterExport === "default" ? adapterName : `{ ${adapterName} }`} from ${JSON.stringify(meta.adapterPath)};

export default defineConfig({
  adapter: ${adapterName}(${getAdapterOptions()}),
  output: ${JSON.stringify(output)},

  migrations: ${JSON.stringify(migrations)},
  schema: ${JSON.stringify(schema)},
});
`;

  function getKineoImports(
    opts = meta.adapterOptions,
    imports = new Set(["defineConfig"]),
  ) {
    if (typeof opts === "string") {
      if (
        opts.includes("env(") ||
        opts.includes("env.nullable(") ||
        opts.includes("env.optional(") ||
        opts.includes("env.load(")
      )
        imports.add("env");
    } else {
      for (const key in opts) {
        getKineoImports(opts[key], imports);
      }
    }

    return imports;
  }

  function getAdapterOptions(
    opts = meta.adapterOptions,
    indentLevel = 1,
  ): string {
    if (typeof opts === "string") {
      return opts;
    }

    if (opts && typeof opts === "object") {
      const indent = "  ".repeat(indentLevel);
      const childIndent = "  ".repeat(indentLevel + 1);

      const entries = Object.entries(opts)
        .map(
          ([key, value]) =>
            `${childIndent}${key}: ${getAdapterOptions(value, indentLevel + 1)}`,
        )
        .join(",\n");

      return `{\n${entries},\n${indent}}`;
    }

    return String(opts);
  }
}

function getPackageManager() {
  const userAgent = process.env.npm_config_user_agent ?? "";
  return userAgent.includes("pnpm")
    ? "pnpm"
    : userAgent.includes("bun")
      ? "bun"
      : userAgent.includes("yarn")
        ? "yarn"
        : "npm";
}

function getInstallCommand(packageManager: string) {
  return packageManager === "pnpm"
    ? "add"
    : packageManager === "bun"
      ? "add"
      : packageManager === "yarn"
        ? "add"
        : "install";
}

function containsPackages(pkg: any, packages: string[]) {
  return packages.some(
    (pkgName) =>
      pkg.dependencies?.[pkgName] ||
      pkg.devDependencies?.[pkgName] ||
      pkg.peerDependencies?.[pkgName] ||
      pkg.optionalDependencies?.[pkgName] ||
      pkg.bundleDependencies?.some((a: string) => a === pkgName) ||
      pkg.bundledDependencies?.some((a: string) => a === pkgName),
  );
}
