import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/main.ts",
    "src/adapter/index.ts",
    "src/plugin/index.ts",
    "src/client/index.ts",
  ],
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
