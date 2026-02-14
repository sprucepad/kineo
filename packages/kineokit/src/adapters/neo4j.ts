import {
  defineAdapterKit,
  type AdapterKit,
  type MigrationEntry,
} from "@/adapter";

import neo4j, { Session, type Driver, type SessionConfig } from "neo4j-driver";
import { auth, type Neo4jAdapter, type Neo4jOpts } from "kineo/adapters/neo4j";
import {
  field,
  FieldDef,
  ModelDef,
  relation,
  RelationDef,
  type Schema,
} from "kineo/schema";
import type { Kineo } from "kineo/client";

// Where migration metadata is stored in the database.
const META_LABEL = "`__MIGRATION$META__`";

/**
 * KineoKit adapter for Neo4j.
 */
export interface Neo4jKit extends AdapterKit {
  driver: Driver;
  session: Session;
}

/**
 * Creates a new KineoKit adapter.
 * @param opts Runtime adapter, client or options for creating the adapter.
 * @returns A Neo4j KineoKit adapter.
 */
export const neo4jKit = defineAdapterKit<
  Neo4jKit,
  [Neo4jOpts | Neo4jAdapter | Kineo<any, any>]
>((opts) => {
  const { driver, session } = getDriverSession(opts);

  return {
    driver,
    session,

    async exec(command, params) {
      await session.run(command, params);
    },

    async pull() {
      const models: Schema = {};

      try {
        // 1. Get all labels in the DB
        const labelsRes = await session.run(`CALL db.labels()`);
        const labels = labelsRes.records.map((r) => r.get("label") as string);

        // 2. Sample node properties from each label
        for (const label of labels) {
          // Initialize models
          models[label] = new ModelDef({}, label);

          const sampleRes = await session.run(
            `MATCH (n:\`${label}\`) RETURN n LIMIT 50`,
          );

          for (const record of sampleRes.records) {
            const node = record.get("n");
            mergeProperties(models[label], node.properties);
          }
        }

        // 3. Sample relationships for each label
        const relRes = await session.run(
          `
          MATCH (a)-[r]->(b)
          RETURN labels(a) AS fromLabels, type(r) AS relType, labels(b) AS toLabels
          LIMIT 1000
          `,
        );

        for (const row of relRes.records) {
          const fromLabels: string[] = row.get("fromLabels");
          const toLabels: string[] = row.get("toLabels");
          const relType: string = row.get("relType");

          // Neo4j nodes can have multiple labels, pick the first (or refine)
          const from = fromLabels[0];
          const to = toLabels[0];

          if (!from || !to) continue;

          mergeRelationship(models, from, relType, to, "outgoing");
          mergeRelationship(models, to, relType, from, "incoming");
        }
      } catch (err) {
        console.error("[kineo/neo4j] schema pulling error:", err);
      }

      return {
        schema: models,
        full: false,
      };
    },

    async deploy(migration, hash) {
      await session.run(migration);

      await session.run(
        `
        CREATE INDEX migration_meta_idx IF NOT EXISTS
        FOR (m:${META_LABEL}) ON (m.id)
        `,
      );

      await session.run(
        `
        MERGE (m:${META_LABEL} { id: $hash })
        SET m.deployed = true
        `,
        { hash },
      );
    },

    async status(_, hash) {
      const result = await session.run(
        `
        MATCH (m:${META_LABEL} { id: $hash })
        RETURN m.deployed AS deployed
        `,
        { hash },
      );

      if (result.records.length === 0) {
        return "pending";
      }

      const deployed = result.records[0].get("deployed");
      return deployed ? "completed" : "pending";
    },

    generate(
      prev /*: Record<string, ModelDef<any>>*/,
      cur /*: Record<string, ModelDef<any>>*/,
    ) {
      const migrations: MigrationEntry[] = [];

      const prevModels = new Set(Object.keys(prev || {}));
      const curModels = new Set(Object.keys(cur || {}));

      // ---------- New models ----------
      for (const m in cur) {
        if (!prevModels.has(m)) {
          const def = cur[m];
          const label = modelLabel(m, def);
          const idProp = findIdFieldName(def);

          if (idProp) {
            migrations.push({
              type: "command",
              description: `Create uniqueness constraint for new model ${label}`,
              command: `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${label}) REQUIRE n.${idProp} IS UNIQUE;`,
              reverse: `DROP CONSTRAINT IF EXISTS FOR (n:${label}) REQUIRE n.${idProp} IS UNIQUE;`,
            });
          } else {
            migrations.push({
              type: "note",
              description: `New model ${label} added`,
              note: `Model '${label}' added. No id field found -> no constraint created automatically.`,
            });
          }
        }
      }

      // ---------- Removed models ----------
      for (const m of Object.keys(prev)) {
        if (!curModels.has(m)) {
          const def = prev[m];
          const label = modelLabel(m, def);
          const idProp = findIdFieldName(def);

          if (idProp) {
            migrations.push({
              type: "command",
              description: `Drop uniqueness constraint and delete nodes for removed model ${label}`,
              command:
                `DROP CONSTRAINT IF EXISTS FOR (n:${label}) REQUIRE n.${idProp} IS UNIQUE;\n` +
                `MATCH (n:${label}) DETACH DELETE n;`,
              reverse: "",
            });
          } else {
            migrations.push({
              type: "command",
              description: `Delete nodes for removed model ${label}`,
              command: `MATCH (n:${label}) DETACH DELETE n;`,
              reverse: "",
            });
          }
        }
      }

      // ---------- Existing models ----------
      for (const m of Object.keys(cur)) {
        if (!prev[m]) continue;

        const prevDef = prev[m];
        const curDef = cur[m];
        const label = modelLabel(m, curDef);

        const prevKeys = new Set(Object.keys(prevDef.$shape));
        const curKeys = new Set(Object.keys(curDef.$shape));

        // ---------- Added keys ----------
        for (const key of curKeys) {
          if (!prevKeys.has(key)) {
            const val = curDef.$shape[key];

            if (isFieldDef(val)) {
              const fieldDef = val;
              const propName = fieldDef.$name || key;

              if (fieldDef.$default !== undefined) {
                migrations.push({
                  type: "command",
                  description: `Set default for added field ${propName} on ${label}`,
                  command: `MATCH (n:${label}) WHERE n.${propName} IS NULL OR NOT exists(n.${propName}) SET n.${propName} = ${serializeDefault(fieldDef.$default)};`,
                  reverse: `MATCH (n:${label}) REMOVE n.${propName};`,
                });
              }

              // ---- UNIQUE ----
              if (fieldDef.$id || fieldDef.$unique) {
                migrations.push({
                  type: "command",
                  description: `Create uniqueness constraint for ${propName} on ${label}`,
                  command: `CREATE CONSTRAINT ${uniqueConstraintName(label, propName, fieldDef.$indexName)} IF NOT EXISTS FOR (n:${label}) REQUIRE n.${propName} IS UNIQUE;`,
                  reverse: `DROP CONSTRAINT ${uniqueConstraintName(label, propName, fieldDef.$indexName)} IF EXISTS;`,
                });
              }

              // ---- INDEX ----
              if (fieldDef.$indexName && !fieldDef.$unique && !fieldDef.$id) {
                migrations.push({
                  type: "command",
                  description: `Create index for ${propName} on ${label}`,
                  command: `CREATE INDEX ${indexName(label, propName, fieldDef.$indexName)} IF NOT EXISTS FOR (n:${label}) ON (n.${propName});`,
                  reverse: `DROP INDEX ${indexName(label, propName, fieldDef.$indexName)} IF EXISTS;`,
                });
              }
            } else if (isRelationDef(val)) {
              const rel = val;
              const relLabel = rel.$label || key;

              // ---- RELATION UNIQUE ----
              if (rel.$unique) {
                migrations.push({
                  type: "command",
                  description: `Create unique relationship constraint for ${relLabel}`,
                  command: `CREATE CONSTRAINT ${uniqueConstraintName(relLabel, "rel", rel.$indexName)} IF NOT EXISTS FOR ()-[r:${relLabel}]-() REQUIRE r IS UNIQUE;`,
                  reverse: `DROP CONSTRAINT ${uniqueConstraintName(relLabel, "rel", rel.$indexName)} IF EXISTS;`,
                });
              }

              // ---- RELATION INDEX ----
              if (rel.$indexName && !rel.$unique) {
                migrations.push({
                  type: "command",
                  description: `Create relationship index for ${relLabel}`,
                  command: `CREATE INDEX ${indexName(relLabel, "rel", rel.$indexName)} IF NOT EXISTS FOR ()-[r:${relLabel}]-() ON (r);`,
                  reverse: `DROP INDEX ${indexName(relLabel, "rel", rel.$indexName)} IF EXISTS;`,
                });
              }
            }
          }
        }

        // ---------- Modified keys ----------
        for (const key of curKeys) {
          if (!prevKeys.has(key)) continue;

          const p = prevDef.$shape[key];
          const c = curDef.$shape[key];

          // ---------- FIELD ----------
          if (isFieldDef(p) && isFieldDef(c)) {
            const propName = c.$name || key;

            const prevUnique = !!p.$id || !!p.$unique;
            const curUnique = !!c.$id || !!c.$unique;

            // ---- UNIQUE CHANGED ----
            if (!prevUnique && curUnique) {
              migrations.push({
                type: "command",
                description: `Create uniqueness constraint for ${propName}`,
                command: `CREATE CONSTRAINT ${uniqueConstraintName(label, propName, c.$indexName)} IF NOT EXISTS FOR (n:${label}) REQUIRE n.${propName} IS UNIQUE;`,
                reverse: `DROP CONSTRAINT ${uniqueConstraintName(label, propName, c.$indexName)} IF EXISTS;`,
              });
            }

            if (prevUnique && !curUnique) {
              migrations.push({
                type: "command",
                description: `Drop uniqueness constraint for ${propName}`,
                command: `DROP CONSTRAINT ${uniqueConstraintName(label, propName, p.$indexName)} IF EXISTS;`,
                reverse: `CREATE CONSTRAINT ${uniqueConstraintName(label, propName, p.$indexName)} IF NOT EXISTS FOR (n:${label}) REQUIRE n.${propName} IS UNIQUE;`,
              });
            }

            // ---- INDEX NAME CHANGED ----
            if (p.$indexName !== c.$indexName && !curUnique) {
              if (p.$indexName) {
                migrations.push({
                  type: "command",
                  description: `Drop index for ${propName}`,
                  command: `DROP INDEX ${indexName(label, propName, p.$indexName)} IF EXISTS;`,
                  reverse: "",
                });
              }

              if (c.$indexName) {
                migrations.push({
                  type: "command",
                  description: `Create index for ${propName}`,
                  command: `CREATE INDEX ${indexName(label, propName, c.$indexName)} IF NOT EXISTS FOR (n:${label}) ON (n.${propName});`,
                  reverse: `DROP INDEX ${indexName(label, propName, c.$indexName)} IF EXISTS;`,
                });
              }
            }
          }

          // ---------- RELATION ----------
          else if (isRelationDef(p) && isRelationDef(c)) {
            const relLabel = c.$label || key;

            if (p.$unique !== c.$unique) {
              if (c.$unique) {
                migrations.push({
                  type: "command",
                  description: `Create unique constraint for relationship ${relLabel}`,
                  command: `CREATE CONSTRAINT ${uniqueConstraintName(relLabel, "rel", c.$indexName)} IF NOT EXISTS FOR ()-[r:${relLabel}]-() REQUIRE r IS UNIQUE;`,
                  reverse: `DROP CONSTRAINT ${uniqueConstraintName(relLabel, "rel", c.$indexName)} IF EXISTS;`,
                });
              } else {
                migrations.push({
                  type: "command",
                  description: `Drop unique constraint for relationship ${relLabel}`,
                  command: `DROP CONSTRAINT ${uniqueConstraintName(relLabel, "rel", p.$indexName)} IF EXISTS;`,
                  reverse: "",
                });
              }
            }
          }
        }
      }

      if (migrations.length === 0) {
        migrations.push({
          type: "note",
          description: "No detectable changes",
          note: "No differences between prev and cur schema.",
        });
      }

      return migrations;
    },
  };
});

/**
 * Extracts a driver and a session from options, a runtime adapter or a client.
 * @param opts The options/runtime adapter/client.
 * @returns A driver and a session.
 */
function getDriverSession(opts: Neo4jOpts | Neo4jAdapter | Kineo<any, any>) {
  const driver: Driver =
    "$adapter" in opts
      ? (opts.$adapter as Neo4jAdapter).driver
      : "driver" in opts
        ? opts.driver
        : neo4j.driver(opts.url, auth(opts.auth));

  let session: Session;
  if ("session" in opts) {
    if (opts.session instanceof Session) session = opts.session;
    else session = driver.session(opts.session as SessionConfig);
  } else {
    session = driver.session();
  }

  return { driver, session };
}

/**
 * Infer field type from Neo4j value.
 */
function inferKind(value: any): FieldDef<any, any, any, any, any> {
  if (Array.isArray(value)) {
    // recursively infer base type
    if (value.length === 0) return field.string().array(); // unknown empty array
    const base = inferKind(value[0]);
    return base.array();
  }
  if (typeof value === "string") return field.string();
  if (typeof value === "number") return field.float(); // could refine via integer check
  if (typeof value === "boolean") return field.bool();
  if (neo4j.isInt(value)) return field.int();
  if (value instanceof Date) return field.datetime();
  return field.string(); // fallback
}

function findIdFieldName(modelDef: ModelDef<any>) {
  for (const k in modelDef.$shape) {
    const v = modelDef.$shape[k];
    if (isFieldDef(v)) {
      if (v.$id) {
        return v.$name ?? k;
      }
    }
  }
  return null;
}

/**
 * Produce a stable label for a model: prefer def.$name when set, otherwise use schema key.
 */
function modelLabel(key: string, def?: ModelDef<any>) {
  return def && typeof def.$name === "string" ? def.$name : key;
}

function isFieldDef(v: any): v is FieldDef<any, any, any, any, any> {
  return v instanceof FieldDef;
}
function isRelationDef(v: any): v is RelationDef<any, any, any, any> {
  return v instanceof RelationDef;
}

/**
 * Serialize a default value into a Cypher literal.
 * - strings are quoted
 * - numbers/booleans emitted bare
 * - Dates serialized as datetime('...') (ISO)
 * - other values use a JSON.stringify fallback
 */
function serializeDefault(v: any): string {
  if (v === null) return "null";
  if (v === undefined) return "null";
  if (typeof v === "string") {
    // escape single quotes
    return `'${v.replace(/'/g, "\\'")}'`;
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  if (v instanceof Date) {
    return `datetime('${v.toISOString()}')`;
  }
  // fallback to json
  try {
    return JSON.stringify(v);
  } catch {
    return `'${String(v).replace(/'/g, "\\'")}'`;
  }
}

/**
 * Merges new inferred fields into a model definition.
 */
function mergeProperties(model: ModelDef<any>, props: Record<string, any>) {
  for (const [key, value] of Object.entries(props)) {
    if (!model.$shape[key]) {
      model.$shape[key] = inferKind(value).name(key);
    }
  }
}

/**
 * Adds or merges a relationship.
 */
function mergeRelationship(
  models: Schema,
  from: string,
  relType: string,
  to: string,
  direction: "outgoing" | "incoming",
) {
  const model = models[from] ?? (models[from] = new ModelDef({}, from));

  if (!model.$shape[relType]) {
    model.$shape[relType] = relation.to(to, relType).direction(direction);
  } else {
    // already exists: update direction heuristically
    const rel: RelationDef<any> = model.$shape[relType];
    if (rel.$direction !== direction) {
      rel.both(relType);
    }
  }
}

function uniqueConstraintName(label: string, prop: string, name?: string) {
  return name || `${label}_${prop}_unique`;
}

function indexName(label: string, prop: string, name?: string) {
  return name || `${label}_${prop}_idx`;
}
