import { parseConfig } from "@/config";
import type { KineoConfig } from "@/index";
import type { AdapterKit } from "@/adapter";

import { kineo } from "kineo/client";
import { defineSchema } from "kineo/schema";
import type { Adapter } from "kineo/adapter";
import { GraphModel } from "kineo/model";

import { describe, expect, test, vi } from "vitest";

// --- Mock adapters ---
function mockAdapter(): Adapter<typeof GraphModel, any> {
  return {
    Model: GraphModel,
    close() {},
    emit() {
      return {
        command: "",
        params: {},
      };
    },
    exec() {
      return { entries: [], entryCount: 0 };
    },
  };
}

function mockAdapterKit(): AdapterKit {
  return {
    exec() {},
  };
}

describe("parseConfig()", () => {
  // shared configuration
  const adapter = mockAdapterKit();
  const schema = defineSchema({});
  const client = kineo(mockAdapter(), schema);
  const migrations = "./migrations";

  test("parses direct imports correctly", async () => {
    const mod: KineoConfig = {
      migrations,
      adapter,
      client,
      schema,
    };

    const parsed = await parseConfig(mod);
    expect(parsed.adapter).toBe(adapter);
    expect(parsed.client).toBe(client);
    expect(parsed.clientMod).toBeUndefined();
    expect(parsed.schema).toBe(schema);
    expect(parsed.schemaMod).toBeUndefined();
  });

  test("parses promises correctly", async () => {
    const mod: KineoConfig = {
      adapter,
      migrations,
      client: Promise.resolve(client),
      schema: Promise.resolve(schema),
    };

    const parsed = await parseConfig(mod);
    expect(parsed.adapter).toBe(adapter);
    expect(parsed.client).toBe(client);
    expect(parsed.clientMod).toBeUndefined();
    expect(parsed.schema).toBe(schema);
    expect(parsed.schemaMod).toBeUndefined();
  });

  test("parses async functions correctly", async () => {
    const mod: KineoConfig = {
      adapter,
      migrations,
      client: async () => client,
      schema: async () => schema,
    };

    const parsed = await parseConfig(mod);
    expect(parsed.adapter).toBe(adapter);
    expect(parsed.client).toBe(client);
    expect(parsed.clientMod).toBeUndefined();
    expect(parsed.schema).toBe(schema);
    expect(parsed.schemaMod).toBeUndefined();
  });

  test("parses jiti file imports correctly", async () => {
    vi.resetModules();

    const jitiImportMock = vi.fn().mockResolvedValue({
      db: client,
      schema,
    });

    vi.doMock("jiti", () => ({
      createJiti: () => ({
        import: jitiImportMock,
      }),
    }));

    const { parseConfig } = await import("@/config");

    const mod: KineoConfig = {
      adapter,
      migrations,
      client: { file: "./client.ts", export: "db" },
      schema: { file: "./schema.ts", export: "schema" },
    };

    const parsed = await parseConfig(mod);
    expect(parsed.client).toBe(client);
  });
});
