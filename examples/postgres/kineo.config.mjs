// @ts-check
import { defineConfig, env } from "kineo";
import postgres from "kineo/adapter/postgres";

export default defineConfig({
  adapter: postgres({
    url: env("DB_URL"),
    database: env("DB_NAME"),
  }),
  output: "./generated/kineo",

  migrations: "./db/migrations",
  schema: "./db/schema.ts",
});
