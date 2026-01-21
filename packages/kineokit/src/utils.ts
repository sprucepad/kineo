import crypto from "node:crypto";

import type { Kineo } from "kineo/client";
import type { AdapterKit, MigrationEntry } from "kineo/adapter";
import { FieldDef, RelationDef, type Schema } from "kineo/schema";

import type { Jiti } from "jiti";

// TODO update this (it expects the wrong shape, therefore it thinks $shape is a property in models)

export const enum KineoKitErrorKind {
  MissingSchema = "MissingSchema",
  MissingClient = "MissingClient",
  NoSupport = "NoSupport",
  BreakingSchemaChange = "BreakingSchemaChange",
  FilePathNecessary = "FilePathNecessary",
}

export class KineoKitError<T> extends Error {
  kind: KineoKitErrorKind;
  data?: T;

  constructor(kind: KineoKitErrorKind, data?: T, message?: string) {
    super(message ?? KineoKitError.getMessageFromKind(kind));
    this.kind = kind;
    this.data = data;
  }

  static getMessageFromKind(kind: KineoKitErrorKind) {
    switch (kind) {
      case KineoKitErrorKind.NoSupport:
        return "the adapter you're using doesn't support this function";
      case KineoKitErrorKind.MissingClient:
      case KineoKitErrorKind.MissingSchema:
        return `${kind === KineoKitErrorKind.MissingClient ? "client" : "schema"} is undefined. check if the file exists or if imports are resolving correctly`;
      case KineoKitErrorKind.BreakingSchemaChange:
        return "a breaking change was detected in the schema";
      case KineoKitErrorKind.FilePathNecessary:
        return "file path style imports are necessary for this action";
      default:
        return "no message";
    }
  }
}

export interface FileExport {
  file: string;
  export: string;
}

export type ReferenceFn<T> = () => Promise<T> | T;
export type Reference<T> =
  | string
  | FileExport
  | T
  | Promise<T>
  | ReferenceFn<T>;

export interface KineoConfig {
  adapter: AdapterKit;
  schema: Reference<Schema>;
  client: Reference<Kineo<any, any>>;
  migrations: string;
}

export function defineConfig(config: KineoConfig) {
  return config;
}

export interface ParsedConfig {
  adapter: AdapterKit;
  schema: Schema;
  schemaMod?: FileExport;
  client: Kineo<any, any>;
  clientMod?: FileExport;
  migrations: string;
}

export async function parseConfig(
  jiti: Jiti,
  module: KineoConfig,
): Promise<ParsedConfig> {
  const { exported: client, module: clientMod } = await extract(
    jiti,
    module.client,
  );
  const { exported: schema, module: schemaMod } = await extract(
    jiti,
    module.schema,
  );

  if (!client) {
    throw new KineoKitError(KineoKitErrorKind.MissingClient);
  }

  if (!schema) {
    throw new KineoKitError(KineoKitErrorKind.MissingSchema);
  }

  return {
    adapter: module.adapter,
    client,
    clientMod,
    schema,
    schemaMod,
    migrations: module.migrations,
  };
}

async function extract<T>(
  jiti: Jiti,
  ref: Reference<T>,
): Promise<{ module?: FileExport; exported?: T }> {
  if (isReferenceFn(ref)) {
    return { exported: await ref() };
  }

  if (ref instanceof Promise) {
    return { exported: await ref };
  }

  if (isFileExport(ref)) {
    const module = (await jiti.import(ref.file)) as { [ref.export]: T };
    const exported = module[ref.export];
    return {
      exported,
      module: {
        file: ref.file,
        export: ref.export,
      },
    };
  }

  return { exported: ref as T };
}

function isReferenceFn<T>(ref: Reference<T>): ref is ReferenceFn<T> {
  return typeof ref === "function";
}

function isFileExport(ref: Reference<any>): ref is FileExport {
  return typeof ref === "object" && "file" in ref && "export" in ref;
}

export async function push(
  adapter: AdapterKit,
  newSchema: Schema,
  force?: boolean,
) {
  if (!adapter.pull) throw new KineoKitError(KineoKitErrorKind.NoSupport);
  if (!adapter.push) throw new KineoKitError(KineoKitErrorKind.NoSupport);

  if (!force) {
    const { schema: prevSchema } = await adapter.pull();
    const diff = getDiff(prevSchema, newSchema);

    if (diff.breaking.length > 0) {
      throw new KineoKitError(KineoKitErrorKind.BreakingSchemaChange, diff);
    }
  }

  await adapter.push(newSchema);
}

export interface SchemaDiff {
  breaking: string[];
  nonBreaking: string[];
}

export function getDiff(prev: Schema, cur: Schema): SchemaDiff {
  const breaking: string[] = [];
  const nonBreaking: string[] = [];

  const prevModels = Object.keys(prev);
  const curModels = Object.keys(cur);

  // Detect removed or new models
  for (const model of prevModels) {
    if (!cur[model]) {
      breaking.push(`Model "${model}" was removed`);
    } else if (cur[model].$name !== prev[model].$name) {
      breaking.push(`Model "${model}" was renamed to ${cur[model].$name}`);
    }
  }

  for (const model of curModels) {
    if (!prev[model]) {
      nonBreaking.push(`Model "${model}" was added`);
    }
  }

  // Compare existing models
  for (const model of prevModels) {
    const prevDef = prev[model];
    const curDef = cur[model];
    if (!curDef) continue;

    const prevKeys = Object.keys(prevDef.$shape);
    const curKeys = Object.keys(curDef.$shape);

    // Detect removed or new fields/relations
    for (const key of prevKeys) {
      if (!curDef.$shape[key]) {
        breaking.push(`In model "${model}", property "${key}" was removed`);
      }
    }

    for (const key of curKeys) {
      if (!prevDef.$shape[key]) {
        nonBreaking.push(`In model "${model}", property "${key}" was added`);
      }
    }

    // Compare existing fields/relations
    for (const key of prevKeys) {
      const prevField = prevDef.$shape[key] as any;
      const curField = curDef.$shape[key] as any;
      if (!curField) continue;

      const bothFields =
        prevField instanceof FieldDef && curField instanceof FieldDef;
      const bothRelations =
        prevField instanceof RelationDef && curField instanceof RelationDef;

      if (bothFields) {
        if (prevField.$kind !== curField.$kind) {
          breaking.push(
            `In model "${model}", field "${key}" changed kind from "${prevField.$kind}" to "${curField.$kind}"`,
          );
        }

        if (prevField.$array !== curField.$array) {
          breaking.push(
            `In model "${model}", field "${key}" changed array flag (${prevField.$array} -> ${curField.$array})`,
          );
        }

        if (!prevField.$required && curField.$required) {
          breaking.push(`In model "${model}", field "${key}" became required`);
        } else if (prevField.$required && !curField.$required) {
          nonBreaking.push(
            `In model "${model}", field "${key}" became optional`,
          );
        }
      } else if (bothRelations) {
        if (prevField.$to !== curField.$to) {
          breaking.push(
            `In model "${model}", relation "${key}" now points to "${curField.$to}" instead of "${prevField.$to}"`,
          );
        }

        if (prevField.$array !== curField.$array) {
          breaking.push(
            `In model "${model}", relation "${key}" changed array flag (${prevField.$array} -> ${curField.$array})`,
          );
        }

        if (!prevField.$required && curField.$required) {
          breaking.push(
            `In model "${model}", relation "${key}" became required`,
          );
        } else if (prevField.$required && !curField.$required) {
          nonBreaking.push(
            `In model "${model}", relation "${key}" became optional`,
          );
        }

        if (prevField.$direction !== curField.$direction) {
          nonBreaking.push(
            `In model "${model}", relation "${key}" changed direction (${prevField.$direction} -> ${curField.$direction})`,
          );
        }
      } else if (prevField.constructor !== curField.constructor) {
        breaking.push(
          `In model "${model}", property "${key}" changed type (field ↔ relation)`,
        );
      }
    }
  }

  return { breaking, nonBreaking };
}

export async function pull(adapter: AdapterKit) {
  if (!adapter.pull) throw new KineoKitError(KineoKitErrorKind.NoSupport);
  const { schema, full } = await adapter.pull();
  if (!full) throw new KineoKitError(KineoKitErrorKind.NoSupport);
  return schema;
}

export async function generate(
  adapter: AdapterKit,
  prevSchema: Schema,
  newSchema: Schema,
) {
  if (!adapter.generate) throw new KineoKitError(KineoKitErrorKind.NoSupport);
  return await adapter.generate(prevSchema, newSchema);
}

export async function deploy(adapter: AdapterKit, migration: string) {
  if (!adapter.deploy) throw new KineoKitError(KineoKitErrorKind.NoSupport);
  return await adapter.deploy(
    migration,
    crypto.createHash("sha512").update(JSON.stringify(migration)).digest("hex"),
  );
}

export async function status(adapter: AdapterKit, migration: string) {
  if (!adapter.status) throw new KineoKitError(KineoKitErrorKind.NoSupport);
  return await adapter.status(
    migration,
    crypto.createHash("sha512").update(JSON.stringify(migration)).digest("hex"),
  );
}

export type Migration = [string, string];

export function emitEntries(entries: MigrationEntry[]): Migration {
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

export function deemitEntries([up, down]: Migration): MigrationEntry[] {
  const migrations: MigrationEntry[] = [];

  const upSplit = up.split("\n\n");
  const downSplit = down.split("\n\n");

  deemit(upSplit, migrations, "command");
  deemit(downSplit, migrations, "reverse");

  return migrations;
}

function deemit(
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

export function filterEntries(
  entries: MigrationEntry[],
  key: "command" | "reverse",
) {
  return entries
    .filter((entry) => entry.type === "command")
    .map((entry) => entry[key])
    .join("\n");
}
