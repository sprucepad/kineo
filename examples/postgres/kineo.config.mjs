// @ts-check
import { defineConfig, env } from "kineo";
import postgres from "kineo/adapter/postgres";

export default defineConfig({
  adapter: postgres({
    url: env("DB_URL"),
    database: env("DB_NAME"),
  }),
  output: {
    path: "./generated/kineo",
    mode: "ts",
  },

  migrations: "./src/db/migrations",
  schema: "./src/db/schema.ts",
});
