import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    // modules //
    "./src/index.ts",
    "./src/error.ts",
    "./src/schema/index.ts",
    "./src/model.ts",
    "./src/adapter.ts",
    "./src/ir.ts",
    "./src/client.ts",
    // adapters //
    "./src/adapters/neo4j",
    // compilers //
    "./src/compilers/cypher.ts",
    "./src/compilers/sql.ts",
  ],
  external: ["neo4j-driver"],
  dts: true,
  sourcemap: true,
  minify: true,
});
