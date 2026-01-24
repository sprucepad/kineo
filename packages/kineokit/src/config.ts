import type { AdapterKit } from "kineo/adapter";
import { KineoKitError, KineoKitErrorKind } from "./error";
import type { Schema } from "kineo/schema";
import type { FileExport, KineoConfig, Reference, ReferenceFn } from ".";
import type { Kineo } from "kineo/client";
import { tryImport } from "./jiti";

/**
 * Parsed Kineo config, used internally by KineoKit.
 */
export interface ParsedConfig {
  /**
   * The adapter.
   */
  adapter: AdapterKit;
  /**
   * The schema.
   */
  schema: Schema;
  /**
   * The module of the schema.
   */
  schemaMod?: FileExport;
  /**
   * The client.
   */
  client: Kineo<any, any>;
  /**
   * The module of the client.
   */
  clientMod?: FileExport;
  /**
   * Migration directory.
   */
  migrations: string;
}

/**
 * Parses a high-level Kineo config to a lower-level representation.
 * @param jiti The Jiti instance to import references with.
 * @param module The Kineo configuration module.
 * @returns Parsed configuration.
 */
export async function parseConfig(module: KineoConfig): Promise<ParsedConfig> {
  const { exported: client, module: clientMod } = await extract(module.client);
  const { exported: schema, module: schemaMod } = await extract(module.schema);

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

/**
 * Extracts the module and the exported value from a reference.
 * @param jiti The Jiti module to import the reference with.
 * @param ref The reference.
 * @returns A module and its exported value.
 */
async function extract<T>(
  ref: Reference<T>,
): Promise<{ module?: FileExport; exported?: T }> {
  if (isReferenceFn(ref)) {
    return { exported: await ref() };
  }

  if (ref instanceof Promise) {
    return { exported: await ref };
  }

  if (isFileExport(ref)) {
    const module = await tryImport(ref.file);
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

// Guard for if the reference is a function.
function isReferenceFn<T>(ref: Reference<T>): ref is ReferenceFn<T> {
  return typeof ref === "function";
}

// Guard for if the reference is an object.
function isFileExport(ref: Reference<any>): ref is FileExport {
  return typeof ref === "object" && "file" in ref && "export" in ref;
}
