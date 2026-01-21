import neo4j, { Session, type Driver, type SessionConfig } from "neo4j-driver";
import { auth, type Neo4jAdapter, type Neo4jOpts } from "kineo/adapters/neo4j";
import type { AdapterKit, MigrationEntry } from "kineo/adapter";
import {
  field,
  FieldDef,
  ModelDef,
  relation,
  RelationDef,
  type Schema,
} from "kineo/schema";
import type { Kineo } from "kineo";

const META_LABEL = "`__MIGRATION$META__`";

export interface Neo4jKit extends AdapterKit {
  driver: Driver;
  session: Session;
}

export function neo4jKit(
  opts: Neo4jOpts | Neo4jAdapter | Kineo<any, any>,
): Neo4jKit {
  const { driver, session } = getDriverSession(opts);

  return {
    driver,
    session,

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

    async push(schema: Schema) {
      // Wrap everything so one exception doesn't stop the rest
      async function tryRun(cypher: string) {
        try {
          await session.run(cypher);
        } catch (err: any) {
          // Neo4j will error with "already exists" -> ignore
          console.warn(
            "[kineo/neo4j] Skipped:",
            cypher,
            "Reason:",
            err.code || err.message,
          );
        }
      }

      // Convert schema key or $modelName to label
      function getLabel(name: string, model: ModelDef<any>): string {
        return model.$name ?? name;
      }

      /**
       * For each model -> produce constraints & indexes
       */
      for (const [modelKey, modelDef] of Object.entries(schema)) {
        const label = getLabel(modelKey, modelDef);

        const fieldEntries = Object.entries(modelDef).filter(
          ([k, v]) => k !== "$modelName" && v instanceof FieldDef,
        ) as [string, FieldDef<any, any, any, any>][];

        const relationEntries = Object.entries(modelDef).filter(
          ([k, v]) => k !== "$modelName" && v instanceof RelationDef,
        ) as [string, RelationDef<any, any, any, any>][];

        // ------------------------------------------------------------
        // 1. FIELD-BASED NODE CONSTRAINTS
        // ------------------------------------------------------------

        for (const [propName, field] of fieldEntries) {
          const neoProp = field.$name ?? propName;

          // 1a. ID -> unique constraint
          if (field.$id) {
            const cypher = `
          CREATE CONSTRAINT ${label}_${neoProp}_unique
          IF NOT EXISTS
          FOR (n:${label})
          REQUIRE n.${neoProp} IS UNIQUE
        `;
            await tryRun(cypher);
          }

          // 1b. Required -> existence constraint
          if (field.$required) {
            const cypher = `
          CREATE CONSTRAINT ${label}_${neoProp}_exists
          IF NOT EXISTS
          FOR (n:${label})
          REQUIRE n.${neoProp} IS NOT NULL
        `;
            await tryRun(cypher);
          }

          // 1c. Optional index (useful for search)
          if (!field.$id) {
            const cypher = `
          CREATE INDEX ${label}_${neoProp}_index
          IF NOT EXISTS
          FOR (n:${label})
          ON (n.${neoProp})
        `;
            await tryRun(cypher);
          }
        }

        // ------------------------------------------------------------
        // 2. RELATIONSHIP CONSTRAINTS
        // ------------------------------------------------------------

        for (const [relName, rel] of relationEntries) {
          const relLabel = rel.$label ?? relName;

          // Directions:
          // outgoing: (a)-[:REL]->(b)
          // incoming: (a)<-[:REL]-(b)
          // both:     (a)-[:REL]-(b)
          const direction = rel.$direction;

          // Required relationship existence constraint
          if (rel.$required) {
            // For required rels we at least enforce presence of the relationship.
            // Neo4j supports relationship property constraints, but required relationships
            // must be enforced through pattern constraints (Neo4j 5+):
            //
            //   FOR (a:Label) REQUIRE (a)-[:REL]->() IS NOT EMPTY
            //
            let pattern = "";
            if (direction === "outgoing") {
              pattern = `(a:${label})-[:${relLabel}]->()`;
            } else if (direction === "incoming") {
              pattern = `(a:${label})<-[:${relLabel}]-()`;
            } else {
              pattern = `(a:${label})-[:${relLabel}]-()`;
            }

            const cypher = `
          CREATE CONSTRAINT ${label}_${relLabel}_rel_required
          IF NOT EXISTS
          FOR (a:${label})
          REQUIRE ${pattern} IS NOT EMPTY
        `;
            await tryRun(cypher);
          }
        }
      }

      console.log("[kineo/neo4j] Schema push completed.");
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

    generate(prev, cur) {
      const migrations: MigrationEntry[] = [];

      const prevModels = new Set(Object.keys(prev || {}));
      const curModels = new Set(Object.keys(cur || {}));

      function findIdFieldName(modelDef: ModelDef<any>): string | undefined {
        for (const k of Object.keys(modelDef)) {
          const v = (modelDef as any)[k];
          if (isFieldDef(v)) {
            if ((v as FieldDef<any, any, any, any>).$id) {
              return (v as FieldDef<any, any, any, any>).$name || k;
            }
          }
        }
        return undefined;
      }

      // ---------- New models ----------
      for (const m of Object.keys(cur)) {
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
              reverse: "", // cannot bring deleted nodes back
            });
          } else {
            migrations.push({
              type: "command",
              description: `Delete nodes for removed model ${label}`,
              command: `MATCH (n:${label}) DETACH DELETE n;`,
              reverse: "", // irreversible
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

        const prevKeys = new Set(
          Object.keys(prevDef.$shape || {}).filter((k) => k !== "$modelName"),
        );
        const curKeys = new Set(
          Object.keys(curDef.$shape || {}).filter((k) => k !== "$modelName"),
        );

        // ---------- Added keys ----------
        for (const key of Array.from(curKeys)) {
          if (!prevKeys.has(key)) {
            const val = curDef.$shape[key];

            if (isFieldDef(val)) {
              const fieldDef = val as FieldDef<any, any, any, any>;
              const propName = fieldDef.$name || key;

              if (fieldDef.$default !== undefined) {
                migrations.push({
                  type: "command",
                  description: `Set default for added field ${propName} on ${label}`,
                  command: `MATCH (n:${label}) WHERE n.${propName} IS NULL OR NOT exists(n.${propName}) SET n.${propName} = ${serializeDefault(fieldDef.$default)};`,
                  reverse: `MATCH (n:${label}) REMOVE n.${propName};`,
                });
              } else {
                migrations.push({
                  type: "note",
                  description: `Field ${propName} added to ${label}`,
                  note: `Field '${propName}' added with no default; existing nodes unchanged.`,
                });
              }

              if (fieldDef.$id) {
                migrations.push({
                  type: "command",
                  description: `Create uniqueness constraint for newly-added id field ${propName} on ${label}`,
                  command: `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${label}) REQUIRE n.${propName} IS UNIQUE;`,
                  reverse: `DROP CONSTRAINT IF EXISTS FOR (n:${label}) REQUIRE n.${propName} IS UNIQUE;`,
                });
              }
            } else if (isRelationDef(val)) {
              const rel = val as RelationDef<any, any, any, any>;
              migrations.push({
                type: "note",
                description: `Relation ${key} added on ${label}`,
                note: `Relation '${key}' added on '${label}' pointing to '${rel.$to}'.`,
              });
            } else {
              migrations.push({
                type: "note",
                description: `Unknown key ${String(key)} added`,
                note: `Key '${String(key)}' added but not recognized.`,
              });
            }
          }
        }

        // ---------- Removed keys ----------
        for (const key of Array.from(prevKeys)) {
          if (!curKeys.has(key)) {
            const val = prevDef.$shape[key];

            if (isFieldDef(val)) {
              const fieldDef = val as FieldDef<any, any, any, any>;
              const propName = fieldDef.$name || key;

              migrations.push({
                type: "command",
                description: `Remove property for removed field ${propName} on ${label}`,
                command: `MATCH (n:${label}) REMOVE n.${propName};`,
                reverse: "", // cannot restore old values
              });

              if (fieldDef.$id) {
                migrations.push({
                  type: "command",
                  description: `Drop uniqueness constraint for removed id field ${propName}`,
                  command: `DROP CONSTRAINT IF EXISTS FOR (n:${label}) REQUIRE n.${propName} IS UNIQUE;`,
                  reverse: `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${label}) REQUIRE n.${propName} IS UNIQUE;`,
                });
              }
            } else if (isRelationDef(val)) {
              migrations.push({
                type: "note",
                description: `Relation ${key} removed from ${label}`,
                note: `Relation '${key}' removed; relationship data not automatically deleted.`,
              });
            } else {
              migrations.push({
                type: "note",
                description: `Unknown key ${String(key)} removed`,
                note: `Key '${String(key)}' removed from '${label}'.`,
              });
            }
          }
        }

        // ---------- Modified keys ----------
        for (const key of Array.from(curKeys)) {
          if (!prevKeys.has(key)) continue;

          const prevVal = prevDef.$shape[key];
          const curVal = curDef.$shape[key];

          if (isFieldDef(prevVal) && isFieldDef(curVal)) {
            const p = prevVal as FieldDef<any, any, any, any>;
            const c = curVal as FieldDef<any, any, any, any>;
            const propName = c.$name || key;

            if (p.$default !== c.$default) {
              if (c.$default !== undefined) {
                migrations.push({
                  type: "command",
                  description: `Apply new default for ${propName} on ${label}`,
                  command: `MATCH (n:${label}) WHERE n.${propName} IS NULL OR NOT exists(n.${propName}) SET n.${propName} = ${serializeDefault(c.$default)};`,
                  reverse:
                    p.$default !== undefined
                      ? `MATCH (n:${label}) WHERE n.${propName} = ${serializeDefault(c.$default)} SET n.${propName} = ${serializeDefault(p.$default)};`
                      : `MATCH (n:${label}) REMOVE n.${propName};`,
                });
              } else {
                migrations.push({
                  type: "note",
                  description: `Default removed for ${propName} on ${label}`,
                  note: `Default removed; no data change.`,
                });
              }
            }

            if (!p.$id && c.$id) {
              migrations.push({
                type: "command",
                description: `Create uniqueness constraint for ${propName}`,
                command: `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${label}) REQUIRE n.${propName} IS UNIQUE;`,
                reverse: `DROP CONSTRAINT IF EXISTS FOR (n:${label}) REQUIRE n.${propName} IS UNIQUE;`,
              });
            }

            if (p.$id && !c.$id) {
              migrations.push({
                type: "command",
                description: `Drop uniqueness constraint for ${propName}`,
                command: `DROP CONSTRAINT IF EXISTS FOR (n:${label}) REQUIRE n.${propName} IS UNIQUE;`,
                reverse: `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${label}) REQUIRE n.${propName} IS UNIQUE;`,
              });
            }

            if (p.$kind !== c.$kind) {
              migrations.push({
                type: "note",
                description: `Type changed for ${propName}`,
                note: `Type changed from '${p.$kind}' to '${c.$kind}'.`,
              });
            }

            if (p.$array !== c.$array) {
              migrations.push({
                type: "note",
                description: `Array flag changed for ${propName}`,
                note: `Array-ness changed; may require custom migration.`,
              });
            }
          } else if (isRelationDef(prevVal) && isRelationDef(curVal)) {
            const p = prevVal;
            const c = curVal;

            if (
              p.$to !== c.$to ||
              p.$label !== c.$label ||
              p.$direction !== c.$direction
            ) {
              migrations.push({
                type: "note",
                description: `Relation changed for '${key}'`,
                note: `Relation '${key}' changed; cannot auto-migrate data.`,
              });
            }
          } else {
            migrations.push({
              type: "note",
              description: `Key ${key} changed type`,
              note: `Field <-> relation change; no automatic migration.`,
            });
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
}

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
function inferKind(value: any): FieldDef<any, any, any, any> {
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

/**
 * Produce a stable label for a model: prefer $modelName when set, otherwise use schema key.
 */
function modelLabel(key: string, def: any) {
  return (def && typeof def.$modelName === "string" && def.$modelName) || key;
}

function isFieldDef(v: any): v is FieldDef<any, any, any, any> {
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
