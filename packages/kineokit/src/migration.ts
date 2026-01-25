import type { MigrationEntry } from "@/adapter";

/**
 * An [up, down] migration.
 */
export type Migration = [string, string];

/**
 * Generates a single migration from a list of entries.
 * @param entries A list of migration entries.
 * @returns A single migration.
 */
export function toMigration(entries: MigrationEntry[]): Migration {
  let up = "";
  let down = "";

  for (const entry of entries) {
    if (entry.type === "command") {
      up += `${entry.command}${entry.description ? ` -- ${entry.description}` : ""}\n\n`;
      if (entry.reverse) down += `${entry.reverse}\n\n`;
    } else if (entry.type === "note") {
      up += `${entry.description ? `-- ${entry.description}\n` : ""}-- ${entry.note}\n`;
      down += `-- Revert: ${entry.description ? `${entry.description}\n` : `-- ${entry.note}`}\n`;
    }
  }

  return [up, down];
}

/**
 * Converts a migration to a list of migration entries.
 * @param migration The [up, down] migration.
 * @returns A list of migration entries.
 */
export function toEntries([up, down]: Migration): MigrationEntry[] {
  const migrations: MigrationEntry[] = [];

  const upSplit = up.split("\n\n");
  const downSplit = down.split("\n\n");

  toEntriesSplit(upSplit, migrations, "command");
  toEntriesSplit(downSplit, migrations, "reverse");

  return migrations;
}

/**
 * Converts a split migration into migration entries.
 * @param statements The split.
 * @param migrations The list to append to.
 * @param key The type of the spçlit.
 */
function toEntriesSplit(
  statements: string[],
  migrations: MigrationEntry[],
  key: "command" | "reverse",
) {
  for (const stmt of statements) {
    const split = stmt.split("\n");
    for (let i = 0; i < split.length; i++) {
      const entry = split[i];
      // skip empty lines, to avoid creating blank commands
      if (!entry || entry.trim() === "") continue;

      if (entry.startsWith("--")) {
        if (key === "reverse") continue;

        let note: string;
        let description: string | undefined;
        if (i + 1 < split.length && split[i + 1].startsWith("--")) {
          description = entry;
          note = split[++i];
        } else {
          note = entry;
        }

        migrations.push({
          type: "note",
          description,
          note,
        });
      } else {
        const [command, description] = entry.split(" -- ");
        migrations.push({
          type: "command",
          description,
          [key]: command,
        } as any);
      }
    }
  }
}

/**
 * Filters and maps through enrries.
 * @param entries The entries to filter.
 * @param key The key to map into.
 * @returns Filtered entries.
 */
export function filterEntries(
  entries: MigrationEntry[],
  key: "command" | "reverse",
) {
  return entries
    .filter((entry) => entry.type === "command")
    .map((entry) => entry[key])
    .join("\n");
}

/**
 * Formats the current date.
 * @returns A formatted date.
 */
export function currentDate(): string {
  const now = new Date();

  // date components
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  // time components
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  // convert to string
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}
