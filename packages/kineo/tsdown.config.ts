import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: [
      "./src/main.ts", // unfortunately can't be bundled separately
      "./src/index.ts",
      "./src/config/index.ts",
      "./src/schema/index.ts",
      "./src/ir/index.ts",
      "./src/runtime/index.ts",
      "./src/adapter/index.ts",

      // SQL emitters
      "./src/emitter/sql/index.ts",
      "./src/migrations/sql/index.ts",

      // PostgreSQL (`postgres`)
      "./src/adapter/postgres/index.ts",
      "./src/adapter/postgres/runtime.ts",
      // TODO SQLite (`better-sqlite3`)
      // "./src/adapter/sqlite3/index.ts",
      // "./src/adapter/sqlite3/runtime.ts",
      // TODO libSQL (`@libsql/client`)
      // "./src/adapter/libsql/index.ts",
      // "./src/adapter/libsql/runtime.ts",
      // TODO MySQL (`mysql2`)
      // "./src/adapter/mysql2/index.ts",
      // "./src/adapter/mysql2/runtime.ts",
      // TODO SQL Server (`mssql`)
      // "./src/adapter/mssql/index.ts",
      // "./src/adapter/mssql/runtime.ts",
    ],
    minify: true,
    sourcemap: true,
    outputOptions: {
      sourcemapExcludeSources: true,
    },
    dts: {
      sourcemap: true,
    },
  },
]);
