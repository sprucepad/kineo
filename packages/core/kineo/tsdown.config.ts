import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/main.ts"],
  minify: true,
  dts: {
    sourcemap: true,
  },
  sourcemap: true,
  outputOptions: {
    sourcemapExcludeSources: true,
  },

  inputOptions: {
    experimental: {
      resolveNewUrlToAsset: true,
    },
  },
});
