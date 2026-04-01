import { defineConfig } from "kineo";

export default defineConfig({
  adapter: null as any, // TODO

  schema: "./src/db/schema.ts",
  migrations: "./src/db/migrations",
});
