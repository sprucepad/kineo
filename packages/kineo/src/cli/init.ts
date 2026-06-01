import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import childProcess from "node:child_process";
import { Command, i, theme } from "convoker";
import type { AdapterMeta } from "@/adapter";
import { jiti } from "@/config";

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
  })
  .action(
    async ({
      packageJson = "./package.json",
      packageManager = getPackageManager(),
      adapter = "sqlite3",
      noInstall = false,
    }) => {
      const packages = ["kineo"];

      const builtInAdapters = {
        sqlite3: {
          packages: ["better-sqlite3"],
          adapterPath: "kineo/adapter/sqlite3",
          adapterExport: "default",
          adapterOptions: 'env("DB_URL")',
        },
        mysql2: {
          packages: ["mysql2"],
          adapterPath: "kineo/adapter/mysql2",
          adapterExport: "default",
          adapterOptions: {
            url: 'env("DB_URL")',
            database: 'env("DB_NAME")',
          },
        },
        postgres: {
          packages: ["postgres"],
          adapterPath: "kineo/adapter/postgres",
          adapterExport: "default",
          adapterOptions: {
            url: 'env("DB_URL")',
            database: 'env("DB_NAME")',
          },
        },
        libsql: {
          packages: ["@kineojs/adapter-libsql", "@libsql/client"],
          adapterPath: "@kineojs/adapter-libsql",
          adapterExport: "default",
          adapterOptions: {
            url: 'env("DB_URL")',
            authToken: 'env("DB_TOKEN")',
          },
        },
        mssql: {
          packages: ["@kineojs/adapter-mssql", "mssql"],
          adapterPath: "@kineojs/adapter-mssql",
          adapterExport: "default",
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
      if (!noInstall) {
        const contents = await fs.promises.readFile(
          path.resolve(process.cwd(), packageJson),
          "utf-8",
        );
        pkg = JSON.parse(contents);

        if (containsPackages(pkg, ["kineo"])) {
          console.log(theme.gray(`$ ${command.join(" ")}\n`));

          const exitCode = await installDeps(command);
          if (exitCode !== 0)
            console.log(
              theme.bold(
                theme.red(
                  "Something went wrong installing dependencies. Try running the command listed above yourself!",
                ),
              ),
            );
          else console.log(theme.bold(theme.green("Installed dependencies!")));
        } else {
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

      if (pkg) {
        if (!containsPackages(pkg, adapterMeta.packages)) {
          const command = [
            packageManager,
            installCommand,
            ...adapterMeta.packages,
          ] as [string, ...string[]];
          console.log(theme.gray(`$ ${command.join(" ")}\n`));

          const code = await installDeps(command);
          if (code !== 0)
            console.log(
              theme.bold(
                theme.red(
                  "Something went wrong with installing secondary dependencies. Try running the command listed above yourself!",
                ),
              ),
            );
          else
            console.log(
              theme.bold(theme.green("Installed secondary dependencies!")),
            );
        }
      }

      const generatedConfig = await generateConfig(adapterMeta);
      await fs.promises.writeFile(
        path.resolve(process.cwd(), "kineo.config.mjs"),
        generatedConfig,
        "utf-8",
      );
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

async function generateConfig(adapter: AdapterMeta) {
  void adapter;
  return "TODO";
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
      pkg.dependencies[pkgName] ||
      pkg.devDependencies[pkgName] ||
      pkg.peerDependencies[pkgName] ||
      pkg.optionalDependencies[pkgName] ||
      pkg.bundleDependencies.some((a: string) => a === pkgName) ||
      pkg.bundledDependencies.some((a: string) => a === pkgName),
  );
}
