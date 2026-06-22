import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("jiti", () => {
  return {
    createJiti: () => ({
      import: vi.fn(),
    }),
  };
});

import { jiti, resolveConfig, resolveSchema } from "./resolver";
import { model } from "@/schema";
import path from "node:path";

describe("resolveConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw if no config found", async () => {
    (jiti.import as any).mockResolvedValue(undefined);

    expect(await resolveConfig(["a.ts", "b.ts"])).toBeNull();
  });

  it("should resolve basic config with defaults", async () => {
    (jiti.import as any)
      .mockResolvedValueOnce({
        adapter: Promise.resolve("adapter"),
      }) // config
      .mockResolvedValueOnce({ foo: "bar" }); // schema

    const result = await resolveConfig(["config.ts"]);

    expect(result).not.toBeNull();
    expect(result?.adapter).toBe("adapter");
    expect(result?.output).toEqual({
      path: path.resolve(process.cwd(), "./generated/kineo"),
      mode: "ts",
      envMode: "global_process",
    });
    expect(result?.migrations).toEqual({
      path: path.resolve(process.cwd(), "./db/migrations"),
      seed: path.resolve(process.cwd(), "./db/seed.ts"),
    });
  });

  it("should resolve string output and migrations", async () => {
    (jiti.import as any)
      .mockResolvedValueOnce({
        adapter: Promise.resolve("adapter"),
        output: "./out",
        migrations: "./migrations",
      })
      .mockResolvedValueOnce({});

    const result = await resolveConfig(["config.ts"]);

    expect(result).not.toBeNull();
    expect(result?.output).toEqual({
      path: path.resolve(process.cwd(), "./out"),
      mode: "ts",
      envMode: "global_process",
    });

    expect(result?.migrations).toEqual({
      path: path.resolve(process.cwd(), "./migrations"),
      seed: path.resolve(process.cwd(), "./db/seed.ts"),
    });
  });
});

describe("resolveSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load default schema when none provided", async () => {
    (jiti.import as any).mockResolvedValue({ foo: "bar" });

    const result = await resolveSchema(undefined);

    expect(result).not.toBeNull();
    expect(result?.schema).toEqual({ foo: "bar" });
    expect(result?.schemaConfig).toEqual({
      path: "./db/schema.ts",
      export: "all",
    });
  });

  it("should throw if default schema missing", async () => {
    (jiti.import as any).mockResolvedValue(undefined);

    expect(await resolveSchema(undefined)).toBeNull();
  });

  it("should resolve schema from string path", async () => {
    (jiti.import as any).mockResolvedValue({ foo: "bar" });

    const result = await resolveSchema("./schema.ts");

    expect(result).not.toBeNull();
    expect(result?.schema).toEqual({ foo: "bar" });
    expect(result?.schemaConfig).toEqual({
      path: "./schema.ts",
      export: "all",
    });
  });

  it("should resolve schema from module with default export", async () => {
    const schema = { hello: model(() => ({})) };

    const result = await resolveSchema(Promise.resolve({ default: schema }));

    expect(result).not.toBeNull();
    expect(result?.schema).toBe(schema);
    expect(result?.schemaConfig).toEqual({
      export: "default",
    });
  });

  it("should resolve schema from SchemaConfig path + export", async () => {
    (jiti.import as any).mockResolvedValue({
      mySchema: { foo: "bar" },
    });

    const result = await resolveSchema({
      path: "./schema.ts",
      export: "mySchema",
    });

    expect(result).not.toBeNull();
    expect(result?.schema).toEqual({ foo: "bar" });
    expect(result?.schemaConfig).toEqual({
      path: "./schema.ts",
      export: "mySchema",
    });
  });

  it("should fallback to direct schema object", async () => {
    const schema = { foo: "bar" };

    const result = await resolveSchema(schema as any);

    expect(result).not.toBeNull();
    expect(result?.schema).toBe(schema);
    expect(result?.schemaConfig).toEqual({});
  });
});
