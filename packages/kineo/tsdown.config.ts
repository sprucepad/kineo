import { defineConfig } from "tsdown";

export default defineConfig({
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
    // TODO MySQL (`mysql2`)
    // "./src/adapter/mysql2/index.ts",
    // "./src/adapter/mysql2/runtime.ts",
  ],
  minify: true,
  sourcemap: true,

  // for codegen, that way i can use `new URL("../gen/ts/client.ts")` to just copy the client directly.
  // this is great for reducing bundle sizes in the codegen mode specifically.
  inputOptions: {
    experimental: {
      resolveNewUrlToAsset: true,
    },
  },
  outputOptions: {
    sourcemapExcludeSources: true,
  },

  dts: {
    sourcemap: true,
  },
});
