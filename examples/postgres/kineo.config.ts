import { defineConfig, env } from "kineo";
import postgres from "kineo/adapter/postgres";

export default defineConfig({
  adapter: postgres(env("DB_URL")),

  schema: "./src/db/schema.ts",
  migrations: "./src/db/migrations",
});
