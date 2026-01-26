import { describe, test, expect, vi } from "vitest";
import { model, defineSchema, field } from "kineo/schema";
import type { AdapterKit } from "@/adapter";

import { push, pull, generate, deploy, status, getDiff } from "@/kit";
import { KineoKitError, KineoKitErrorKind } from "@/error";

const simpleSchema = defineSchema({
  users: model("User", {
    id: field.int().required(),
  }),
});

describe("push()", () => {
  test("throws if adapter lacks pull or push", async () => {
    const adapter: AdapterKit = { exec() {} };
    await expect(push(adapter, simpleSchema)).rejects.toThrowError(
      KineoKitError,
    );
  });

  test("throws on breaking schema diff", async () => {
    const adapter: AdapterKit = {
      exec() {},
      pull: vi.fn().mockResolvedValue({
        schema: {
          User: model({
            id: field.int().id(),
            name: field.string(),
          }),
        },
        full: true,
      }),
      push: vi.fn(),
    };

    const newSchema = defineSchema({
      users: model("User", {
        id: field.int().id(),
      }),
    });

    await expect(push(adapter, newSchema)).rejects.toMatchObject({
      kind: KineoKitErrorKind.BreakingSchemaChange,
    });
  });

  test("calls push when no breaking changes", async () => {
    const adapter: AdapterKit = {
      exec() {},
      pull: vi.fn().mockResolvedValue({ schema: simpleSchema, full: true }),
      push: vi.fn(),
    };

    await push(adapter, simpleSchema);
    expect(adapter.push).toHaveBeenCalledWith(simpleSchema);
  });

  test("skips diff check when force = true", async () => {
    const adapter: AdapterKit = {
      exec() {},
      pull: vi.fn().mockRejectedValue(new Error("should not be called")),
      push: vi.fn(),
    };

    await push(adapter, simpleSchema, true);
    expect(adapter.push).toHaveBeenCalledWith(simpleSchema);
  });
});

describe("getDiff()", () => {
  test("detects added and removed models", () => {
    const prev = defineSchema({ User: model({}) });
    const cur = defineSchema({ Account: model({}) });
    const diff = getDiff(prev, cur);
    expect(diff.breaking).toContain('Model "User" was removed');
    expect(diff.nonBreaking).toContain('Model "Account" was added');
  });

  test("detects added and removed fields", () => {
    const prev = defineSchema({ users: model("User", { id: field.int() }) });
    const cur = defineSchema({
      users: model("User", { name: field.string() }),
    });
    const diff = getDiff(prev, cur);
    expect(diff.breaking[0]).toMatch(/id/);
    expect(diff.nonBreaking[0]).toMatch(/name/);
  });
});

describe("pull()", () => {
  test("throws if adapter lacks pull", async () => {
    const adapter: AdapterKit = { exec() {} };
    await expect(pull(adapter)).rejects.toThrowError(KineoKitError);
  });

  test("returns schema if adapter.pull exists", async () => {
    const adapter: AdapterKit = {
      exec() {},
      pull: vi.fn().mockResolvedValue({ schema: simpleSchema, full: true }),
    };

    const result = await pull(adapter);
    expect(result).toBe(simpleSchema);
    expect(adapter.pull).toHaveBeenCalled();
  });
});

describe("generate()", () => {
  test("throws if adapter lacks generate", async () => {
    const adapter: AdapterKit = { exec() {} };
    await expect(generate(adapter, simpleSchema, simpleSchema)).rejects.toThrow(
      KineoKitError,
    );
  });

  test("calls adapter.generate()", async () => {
    const adapter: AdapterKit = {
      exec() {},
      generate: vi.fn().mockResolvedValue(["migration.sql"]),
    };
    const result = await generate(adapter, simpleSchema, simpleSchema);
    expect(adapter.generate).toHaveBeenCalled();
    expect(result).toEqual(["migration.sql"]);
  });
});

describe("deploy()", () => {
  test("throws if adapter lacks deploy", async () => {
    const adapter: AdapterKit = { exec() {} };
    await expect(deploy(adapter, "")).rejects.toThrow(KineoKitError);
  });

  test("calls deploy with hash", async () => {
    const adapter: AdapterKit = {
      exec() {},
      deploy: vi.fn(),
    };

    await deploy(adapter, "");
    expect(adapter.deploy).toHaveBeenCalled();
  });
});

describe("status()", () => {
  test("throws if adapter lacks status", async () => {
    const adapter: AdapterKit = { exec() {} };
    await expect(status(adapter, "")).rejects.toThrow(KineoKitError);
  });

  test("calls status with hash", async () => {
    const adapter: AdapterKit = {
      exec() {},
      status: vi.fn().mockResolvedValue("completed"),
    };

    vi.mock("node:crypto", () => ({
      default: {
        createHash: vi
          .fn()
          .mockReturnValue({ update: () => ({ digest: () => "abc123" }) }),
      },
    }));

    const result = await status(adapter, "");
    expect(adapter.status).toHaveBeenCalled();
    expect(result).toBe("completed");
  });
});
