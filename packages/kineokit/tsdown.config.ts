import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/index.ts", "./src/adapters/neo4j.ts"],
    external: ["neo4j-driver"],
    dts: true,
    minify: true,
    sourcemap: true,
  },
  {
    entry: "./src/cli/main.ts",
    dts: false,
    minify: true,
    sourcemap: false,
  },
]);
