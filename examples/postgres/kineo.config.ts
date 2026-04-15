import { defineConfig } from "kineo";
import postgres from "kineo/adapter/postgres";

export default defineConfig({
  adapter: postgres(),

  schema: "./src/db/schema.ts",
  migrations: "./src/db/migrations",
});
