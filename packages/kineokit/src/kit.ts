import crypto from "node:crypto";

import type { AdapterKit } from "./adapter";
import { FieldDef, RelationDef, type Schema } from "kineo/schema";
import { KineoKitError, KineoKitErrorKind } from "./error";
import { toMigration } from "./migration";

/**
 * Pushes a schema to the database.
 * @param adapter The adapter to push to.
 * @param newSchema The new schema.
 * @param force If the push should be forced, even if there are breaking changes.
 */
export async function push(
  adapter: AdapterKit,
  newSchema: Schema,
  force?: boolean,
) {
  let prevSchema: Schema | undefined;
  if (!force) {
    if (!adapter.pull) throw new KineoKitError(KineoKitErrorKind.NoSupport);
    ({ schema: prevSchema } = await adapter.pull());
    const diff = getDiff(prevSchema, newSchema);

    if (diff.breaking.length > 0) {
      throw new KineoKitError(KineoKitErrorKind.BreakingSchemaChange, diff);
    }
  }

  if (adapter.push) {
    await adapter.push(newSchema);
  } else {
    if (!adapter.generate) throw new KineoKitError(KineoKitErrorKind.NoSupport);
    if (!adapter.deploy) throw new KineoKitError(KineoKitErrorKind.NoSupport);

    if (!prevSchema) {
      if (!adapter.pull) throw new KineoKitError(KineoKitErrorKind.NoSupport);
      ({ schema: prevSchema } = await adapter.pull());
    }

    const entries = await adapter.generate(prevSchema, newSchema);
    const [up] = toMigration(entries);
    await adapter.exec(up, {});
  }
}

/**
 * Difference between two schemas.
 */
export interface SchemaDiff {
  /**
   * Breaking changes between two schemas (e.g. removing a model, renaming a required field)
   */
  breaking: string[];
  /**
   * Non-breaking changes between two schemas (e.g. adding a model, adding an optional field)
   */
  nonBreaking: string[];
}

/**
 * Calculates the difference between two schemas.
 * @param prev The previous schema.
 * @param cur The current schema.
 * @returns The diff between both schemas.
 */
export function getDiff(prev: Schema, cur: Schema): SchemaDiff {
  const breaking: string[] = [];
  const nonBreaking: string[] = [];

  const prevModels = Object.keys(prev);
  const curModels = Object.keys(cur);

  // Detect removed or new models
  for (const model of prevModels) {
    if (!cur[model]) {
      breaking.push(`Model "${model}" was removed`);
    } else if (cur[model].$name !== prev[model]!.$name) {
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
    const prevDef = prev[model]!;
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

/**
 * Gets a schema from a database.
 * @param adapter The adapter to pull from.
 * @returns The schema.
 */
export async function pull(adapter: AdapterKit) {
  if (!adapter.pull) throw new KineoKitError(KineoKitErrorKind.NoSupport);
  const { schema, full } = await adapter.pull();
  if (!full) throw new KineoKitError(KineoKitErrorKind.NoSupport);
  return schema;
}

/**
 * Generates migrations.
 * @param adapter The adapter to generate from.
 * @param prevSchema The previous schema.
 * @param newSchema The new schema.
 * @returns The generated migrations.
 */
export async function generate(
  adapter: AdapterKit,
  prevSchema: Schema,
  newSchema: Schema,
) {
  if (!adapter.generate) throw new KineoKitError(KineoKitErrorKind.NoSupport);
  return adapter.generate(prevSchema, newSchema);
}

/**
 * Deploys a migration.
 * @param adapter The adapter.
 * @param migration The migration to deploy.
 */
export async function deploy(adapter: AdapterKit, migration: string) {
  if (!adapter.deploy) throw new KineoKitError(KineoKitErrorKind.NoSupport);
  await adapter.deploy(
    migration,
    crypto.createHash("sha512").update(JSON.stringify(migration)).digest("hex"),
  );
}

/**
 * Gets the status of a migration.
 * @param adapter The adapter.
 * @param migration The migration.
 * @returns The migration's status.
 */
export async function status(adapter: AdapterKit, migration: string) {
  if (!adapter.status) throw new KineoKitError(KineoKitErrorKind.NoSupport);
  return adapter.status(
    migration,
    crypto.createHash("sha512").update(JSON.stringify(migration)).digest("hex"),
  );
}
