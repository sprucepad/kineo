import { defineSchema, kineo, type InferSchema } from "kineo";
import sharedSchema from "@/shared-schema";
import { neo4jAdapter } from "kineo/adapters/neo4j";

export const schema = defineSchema({
  ...sharedSchema,
});

export type Schema = InferSchema<typeof schema>;

export const db = kineo(
  neo4jAdapter({
    url: "bolt://localhost:7687/",
    auth: {
      username: "neo4j",
      password: "password",
    },
  }),
  schema,
);
