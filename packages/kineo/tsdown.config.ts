import { defineConfig } from "tsdown";
import pkg from "./package.json";

export default defineConfig({
  entry: Object.values(pkg.exports).map((pkgExport) => pkgExport.development),
  external: ["neo4j-driver"],
  dts: true,
  sourcemap: true,
  minify: true,
});
