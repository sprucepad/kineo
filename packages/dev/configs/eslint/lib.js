import { defineConfig } from "eslint/config";
import base from "./base.js";

export default defineConfig([
  base,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
