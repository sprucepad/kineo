import { defineConfig } from "eslint/config";
import base from "./base";

const config = defineConfig([
  base,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
export default config;
