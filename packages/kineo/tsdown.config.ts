import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    // modules //
    "./src/index.ts",
    "./src/schema/index.ts",
    "./src/model/index.ts",
    "./src/adapter.ts",
    "./src/client.ts",
    "./src/ir.ts",
    // adapters //
    "./src/adapters/neo4j.ts",
    // emitters //
    "./src/emitters/cypher.ts",
    "./src/emitters/sql.ts",
  ],
  external: ["neo4j-driver"],
  dts: true,
  sourcemap: true,
  minify: true,
});
