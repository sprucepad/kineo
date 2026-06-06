import { defineConfig } from "eslint/config";
import lib from "@dev/configs/eslint/lib";

export default defineConfig([
  lib,

  // Generated code
  {
    files: ["**/gen/{ts,js}/*{.js,ts,mjs,mts}"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
]);
