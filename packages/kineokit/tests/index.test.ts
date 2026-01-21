import { describe, test, expect, vi } from "vitest";
import {
  push,
  pull,
  generate,
  deploy,
  status,
  getDiff,
  emitEntries,
  deemitEntries,
  KineoKitError,
  KineoKitErrorKind,
} from "@/index";
import { model, defineSchema, field } from "kineo/schema";
import type { AdapterKit, MigrationEntry } from "kineo/adapter";

const simpleSchema = defineSchema({
  users: model("User", {
    id: field.int().required(),
  }),
});

describe("push()", () => {
  test("throws if adapter lacks pull or push", async () => {
    const adapter: AdapterKit = {};
    await expect(push(adapter, simpleSchema)).rejects.toThrowError(
      KineoKitError,
    );
  });

  test("throws on breaking schema diff", async () => {
    const adapter: AdapterKit = {
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
      pull: vi.fn().mockResolvedValue({ schema: simpleSchema, full: true }),
      push: vi.fn(),
    };

    await push(adapter, simpleSchema);
    expect(adapter.push).toHaveBeenCalledWith(simpleSchema);
  });

  test("skips diff check when force = true", async () => {
    const adapter: AdapterKit = {
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
    const adapter: AdapterKit = {};
    await expect(pull(adapter)).rejects.toThrowError(KineoKitError);
  });

  test("returns schema if adapter.pull exists", async () => {
    const adapter: AdapterKit = {
      pull: vi.fn().mockResolvedValue({ schema: simpleSchema, full: true }),
    };

    const result = await pull(adapter);
    expect(result).toBe(simpleSchema);
    expect(adapter.pull).toHaveBeenCalled();
  });
});

describe("generate()", () => {
  test("throws if adapter lacks generate", async () => {
    const adapter: AdapterKit = {};
    await expect(generate(adapter, simpleSchema, simpleSchema)).rejects.toThrow(
      KineoKitError,
    );
  });

  test("calls adapter.generate()", async () => {
    const adapter: AdapterKit = {
      generate: vi.fn().mockResolvedValue(["migration.sql"]),
    };
    const result = await generate(adapter, simpleSchema, simpleSchema);
    expect(adapter.generate).toHaveBeenCalled();
    expect(result).toEqual(["migration.sql"]);
  });
});

describe("deploy()", () => {
  test("throws if adapter lacks deploy", async () => {
    const adapter: AdapterKit = {};
    await expect(deploy(adapter, "")).rejects.toThrow(KineoKitError);
  });

  test("calls deploy with hash", async () => {
    const adapter: AdapterKit = {
      deploy: vi.fn(),
    };

    await deploy(adapter, "");
    expect(adapter.deploy).toHaveBeenCalled();
  });
});

describe("status()", () => {
  test("throws if adapter lacks status", async () => {
    const adapter: AdapterKit = {};
    await expect(status(adapter, "")).rejects.toThrow(KineoKitError);
  });

  test("calls status with hash", async () => {
    const adapter: AdapterKit = {
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

describe("emitEntries()", () => {
  test("emits command entries with and without descriptions", () => {
    const entries: MigrationEntry[] = [
      {
        type: "command",
        command: "CREATE TABLE users",
        description: "create users table",
        reverse: "DROP TABLE users",
      },
      {
        type: "command",
        command: "ALTER TABLE users ADD name TEXT",
      },
    ];

    const [up, down] = emitEntries(entries);

    expect(up).toContain("CREATE TABLE users -- create users table");
    expect(up).toContain("ALTER TABLE users ADD name TEXT");

    expect(down).toContain("DROP TABLE users");
    // second command had no reverse
    expect(down).not.toContain("ALTER TABLE users ADD name TEXT");
  });

  test("emits note entries with and without description", () => {
    const entries: MigrationEntry[] = [
      {
        type: "note",
        note: "This is a note",
        description: "Description",
      },
      {
        type: "note",
        note: "Another note",
      },
    ];

    const [up, down] = emitEntries(entries);

    expect(up).toContain("-- Description");
    expect(up).toContain("-- This is a note");
    expect(up).toContain("-- Another note");

    expect(down).toContain("-- Revert: Description");
    expect(down).toContain("-- Revert: -- Another note");
  });
});

describe("deemitEntries()", () => {
  test("deemits command entries and maintains reverses", () => {
    const up =
      "CREATE TABLE users -- create users table\n\n" +
      "ALTER TABLE users ADD name TEXT\n\n";

    const down = "DROP TABLE users\n\n";

    const result = deemitEntries([up, down]);

    const command = result.find((x) => x.type === "command" && x.command);
    expect(command?.type === "command" && command?.command).toBe(
      "CREATE TABLE users",
    );
    expect(command?.description).toBe("create users table");

    const reverse = result.find((x) => x.type === "command" && x.reverse);
    expect(reverse?.type === "command" && reverse?.reverse).toBe(
      "DROP TABLE users",
    );
  });

  test("deemits notes with and without descriptions", () => {
    const up = "-- Description\n-- Note1\n" + "\n" + "-- Note2\n";

    const down = "-- Revert: -- Description\n\n" + "-- Revert: -- -- Note2\n";

    const result = deemitEntries([up, down]);

    const notes = result.filter((x) => x.type === "note");
    expect(notes.length).toBe(2);

    expect(notes.some((n) => n.description === "-- Description")).toBe(true);
    expect(notes.some((n) => n.note === "-- Note1")).toBe(true);
    expect(notes.some((n) => n.note === "-- Note2")).toBe(true);
  });

  test("round-trip: emit -> deemit returns equivalent structure", () => {
    const entries: MigrationEntry[] = [
      {
        type: "command",
        command: "CREATE TABLE test",
        description: "desc",
        reverse: "DROP TABLE test",
      },
      {
        type: "note",
        note: "Note content",
      },
    ];

    const emitd = emitEntries(entries);
    const deemitd = deemitEntries(emitd);

    expect(deemitd).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "command",
          command: "CREATE TABLE test",
          description: "desc",
        }),
        expect.objectContaining({
          type: "note",
          note: "-- Note content",
        }),
      ]),
    );
  });
});
