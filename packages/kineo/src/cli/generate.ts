import fs from "node:fs";
import { Command, theme } from "convoker";
import { config } from "./_config";
import path from "node:path";
import type { EnvMode } from "@/config";
import { parseSchema, type Schema } from "@/schema";

// TODO 1: fix type errors in generated schema typescript file
// TODO 2: client generation

export default new Command("generate")
  .description("Generates a client, used in codegen mode.")
  .input({})
  .action(generateClient);

export async function generateClient() {
  const cfg = config();

  const outputPath = path.resolve(process.cwd(), cfg.output.path);
  if (!fs.existsSync(outputPath))
    await fs.promises.mkdir(outputPath, { recursive: true });
  else {
    console.log(theme.bold("Cleaning previously generated code..."));
    await fs.promises.rm(outputPath, { recursive: true, force: true });
    await fs.promises.mkdir(outputPath);
  }

  console.log(theme.bold("Generating code..."));

  let map: Map<string, string>;
  switch (cfg.output.mode) {
    case "ts":
      map = await generateTs(cfg.schema, cfg.output.envMode);
      break;
    case "dts":
      map = await generateDts(cfg.schema, cfg.output.envMode);
      break;
    default: {
      const exhaustive: never = cfg.output.mode;
      return exhaustive;
    }
  }

  for (const [filename, contents] of map) {
    console.log(theme.bold(`Writing file ${filename}...`));
    const fullPath = path.resolve(outputPath, filename);
    await fs.promises.writeFile(fullPath, contents, "utf-8");
  }

  console.log(theme.bold(theme.green("Client generated!")));
}

async function generateTs(schema: Schema, envMode: EnvMode) {
  const map = new Map<string, string>();

  map.set(
    "schema.ts",
    `import type { ParsedSchema } from "kineo/schema";

export default ${serializeSchema(schema)} satisfies ParsedSchema;
`,
  );

  return map;
}

async function generateDts(schema: Schema, envMode: EnvMode) {
  const map = new Map<string, string>();

  map.set("schema.js", `export default ${serializeSchema(schema)};`);
  map.set(
    "schema.d.ts",
    `import type { ParsedSchema } from "kineo/schema";

declare const s: ParsedSchema;
export default s;
`,
  );

  return map;
}

function serializeSchema(rawSchema: Schema) {
  const schema = parseSchema(rawSchema);

  return `{
  models: new Map([${[...schema.models]
    .map(
      ([modelName, model]) => `
    [${JSON.stringify(modelName)}, {
      name: ${JSON.stringify(model.name)},
      key: ${JSON.stringify(model.key)},
      fields: new Map([${[...model.fields]
        .map(
          ([fieldName, field]) => `
        [${JSON.stringify(fieldName)}, {
          name: ${JSON.stringify(field.name)},
          key: ${JSON.stringify(field.key)},
          id: ${JSON.stringify(field.id)},
          kind: ${JSON.stringify(field.kind)},
          many: ${JSON.stringify(field.many)},
          required: ${JSON.stringify(field.required)},
        }],`,
        )
        .join("\n")}
      ]),
      relations: new Map([${[...model.relations]
        .map(
          ([relationName, relation]) => `
        [${JSON.stringify(relationName)}, {
          name: ${JSON.stringify(relation.name)},
          key: ${JSON.stringify(relation.key)},
          from: ${JSON.stringify(relation.from)},
          to: ${JSON.stringify(relation.to)},
          ${
            relation.fields != null
              ? `fields: ${JSON.stringify(relation.fields)},
`
              : ""
          }${
            relation.refs != null
              ? `refs: ${JSON.stringify(relation.refs)},
`
              : ""
          }many: ${JSON.stringify(relation.many)},
          virtual: ${JSON.stringify(relation.virtual)},
        }],`,
        )
        .join("\n")}
      ]),
      indexes: new Map([${[...model.indexes].map(
        ([indexName, index]) => `
        [${JSON.stringify(indexName)}, {
          name: ${JSON.stringify(index.name)},
          type: ${JSON.stringify(index.type)},
          unique: ${JSON.stringify(index.unique)},
          fulltext: ${JSON.stringify(index.fulltext)},
          ${index.length != null ? `length: ${JSON.stringify(index.length)},` : ""}
          ${index.cols != null ? `cols: ${JSON.stringify(index.cols)},` : ""}
          fields: new Map([${[...index.fields]
            .map(
              ([indexFieldName, indexFieldConfig]) => `
            [${JSON.stringify(indexFieldName)}, {
              name: ${JSON.stringify(indexFieldConfig.name)},
              sort: ${JSON.stringify(indexFieldConfig.sort)},${
                indexFieldConfig.ops != null
                  ? `ops: ${JSON.stringify(indexFieldConfig.ops)},
`
                  : ""
              }${
                indexFieldConfig.length != null
                  ? `length: ${JSON.stringify(indexFieldConfig.length)},
`
                  : ""
              }}],`,
            )
            .join("\n")}
          ]),
        }]`,
      )}
      ]),
    }],`,
    )
    .join("\n")}
  ]),
}`;
}
