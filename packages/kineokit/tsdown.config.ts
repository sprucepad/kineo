import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/adapters/neo4j.ts"],
    external: ["neo4j-driver"],
    dts: true,
    minify: true,
    sourcemap: true,
  },
  {
    entry: "./src/main.ts",
    dts: false,
    minify: true,
    sourcemap: false,
  },
]);
