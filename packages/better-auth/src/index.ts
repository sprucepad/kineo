import type { Schema } from "kineo/schema";
import type { Adapter } from "kineo/adapter";
import type { Kineo } from "kineo/client";
import { createAdapterFactory } from "better-auth/adapters";
import { emit } from "./emitter";

/**
 * Creates a Better-Auth adapter from a Kineo client.
 * @param client The Kineo client.
 * @returns A Better-Auth adapter.
 */
export const kineoAdapter = (client: Kineo<any, any>) =>
  createAdapterFactory({
    config: {
      adapterId: "@kineojs/better-auth",
    },
    adapter: () => ({
      async count(props) {
        return (await exec(client, "count", props)).entryCount;
      },

      async create(props) {
        return (await exec(client, "create", props)).entries[0];
      },

      async delete(props) {
        await exec(client, "delete", props);
      },

      async deleteMany(props) {
        return (await exec(client, "deleteMany", props)).entryCount;
      },

      async findOne(props) {
        return (await exec(client, "findOne", props)).entries[0];
      },

      async findMany(props) {
        return (await exec(client, "findMany", props)).entries;
      },

      async update(props) {
        return (await exec(client, "update", props)).entries[0];
      },

      async updateMany(props) {
        return (await exec(client, "updateMany", props)).entryCount;
      },
    }),
  });

/**
 * Executes a query.
 * @param client The client.
 * @param mode The type of operation.
 * @param props The operation's required properties.
 * @returns Properties from the database.
 */
async function exec(
  client: Kineo<Schema, Adapter<any, any>>,
  mode: string,
  props: any,
) {
  const ir = emit(mode, props);
  const result = await client.$adapter.emit(ir);
  return (await client.$adapter.exec(result)) as any;
}

export { betterAuthSchema } from "./schema";
