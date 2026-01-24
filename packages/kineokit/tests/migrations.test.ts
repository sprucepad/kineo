import { describe, test, expect } from "vitest";
import type { MigrationEntry } from "kineo/adapter";

import { toMigration, toEntries } from "@/migration";

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

    const [up, down] = toMigration(entries);

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

    const [up, down] = toMigration(entries);

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

    const result = toEntries([up, down]);

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

    const result = toEntries([up, down]);

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

    const emitd = toMigration(entries);
    const deemitd = toEntries(emitd);

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
