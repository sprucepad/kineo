import fs from "node:fs/promises";

import { FieldDef, RelationDef, type Schema } from "kineo/schema";

import { KineoKitError, KineoKitErrorKind } from "@/error";
import { config } from ".";
import { pull } from "@/kit";

import { Command, i, prompt } from "convoker";

export default new Command("pull")
  .description(
    "Pulls the current schema from the database. This only works for file path style imports in the configuration.",
  )
  .input({
    force: i.option("boolean", "-f", "--force").optional(),
  })
  .action(async ({ force }) => {
    if (!config.schemaMod)
      throw new KineoKitError(KineoKitErrorKind.FilePathNecessary);
    if (!force && config.adapter.pull) {
      const confirmed = await prompt.confirm({
        message:
          "This will delete your current schema. Not all adapters support full schema introspection features. THIS MAY CAUSE LOSS. Make sure you can revert this action.",
      });
      if (!confirmed) return;
    }

    const schema = await pull(config.adapter);
    const contents = ensureImports(
      await fs.readFile(config.schemaMod.file, "utf-8"),
    );

    const newExport = generateSchemaSource(schema, config.schemaMod.export);
    const namedExportRegex = new RegExp(
      `export\\s+const\\s+${config.schemaMod.export}\\s*=([\\s\\S]*?);`,
      "m",
    );
    const defaultExportRegex = /export\s+default\s+defineSchema\([\s\S]*?\);?/m;

    let updatedContents: string;

    if (config.schemaMod.export === "default") {
      if (defaultExportRegex.test(contents)) {
        updatedContents = contents.replace(defaultExportRegex, newExport);
      } else {
        updatedContents = contents.trimEnd() + "\n\n" + newExport + "\n";
      }
    } else if (namedExportRegex.test(contents)) {
      updatedContents = contents.replace(namedExportRegex, newExport);
    } else {
      updatedContents = contents.trimEnd() + "\n\n" + newExport + "\n";
    }

    await fs.writeFile(config.schemaMod.file, updatedContents, "utf8");
  });

/**
 * Ensures source code has the correct imports.
 * @param source The source code.
 * @returns The source code, with imports included if not already.
 */
export function ensureImports(source: string): string {
  const hasImports =
    source.includes("defineSchema") &&
    source.includes("model") &&
    source.includes("field") &&
    source.includes("relation");

  if (hasImports) return source;

  const importLine = `import { defineSchema, model, field, relation } from "kineo/schema";\n`;

  // Insert before first import or at top
  if (/^import\s/m.test(source)) {
    return source.replace(/^import\s/m, importLine + "import ");
  }

  return importLine + source;
}

/**
 * Generates schema source code.
 * @param schemaObj The schema to generate source code for.
 * @param exportName The name of the export.
 * @returns Schema source.
 */
export function generateSchemaSource(
  schemaObj: Schema,
  exportName: string,
): string {
  const models = Object.entries(schemaObj)
    .map(([modelName, modelDef]) => {
      const fields = Object.entries(modelDef)
        .map(([fieldName, fieldValue]) => {
          const serialized = serializeFieldOrRelation(fieldValue);
          return `    ${fieldName}: ${serialized}`;
        })
        .join(",\n");

      return `  ${modelName}: model({\n${fields}\n  })`;
    })
    .join(",\n");

  if (exportName === "default") {
    return `export default defineSchema({\n${models}\n});`;
  }

  return `export const ${exportName} = defineSchema({\n${models}\n});`;
}

/**
 * Serializes a field or relation.
 * @param value The field or relation.
 * @returns A serialized field/relation.
 */
export function serializeFieldOrRelation(value: unknown): string {
  // Handle FieldDef
  if (value instanceof FieldDef) {
    const f = value as FieldDef<any, any, any, any>;
    let expr = `field.${f.$kind}(${f.$name ? `"${f.$name}"` : ""})`;

    if (f.$id) expr += `.id()`;
    if (f.$required) expr += `.required()`;
    if (f.$array) expr += `.array()`;
    if (f.$default !== undefined)
      expr += `.default(${JSON.stringify(f.$default)})`;

    return expr;
  }

  // Handle RelationDef
  if (value instanceof RelationDef) {
    const r = value as RelationDef<any, any, any, any>;
    let expr = `relation.to("${r.$to}"${r.$name ? `, "${r.$name}"` : ""})`;

    switch (r.$direction) {
      case "incoming":
        expr += `.incoming()`;
        break;
      case "outgoing":
        expr += `.outgoing()`;
        break;
      case "both":
        expr += `.both()`;
        break;
    }

    if (r.$required) expr += `.required()`;
    if (r.$array) expr += `.array()`;

    return expr;
  }

  // fallback
  return JSON.stringify(value);
}
