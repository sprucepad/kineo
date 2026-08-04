import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { ResolverFactory } from "oxc-resolver";
import { parse } from "oxc-parser";
import { walk } from "oxc-walker";

import type { ServerAdapter } from "@/adapter";

interface SchemaIR {
  models: Record<string, unknown>;
  // TODO schema ir
}

export async function parseSchema(
  file: string,
  adapter: ServerAdapter,
): Promise<NormalizedSchema> {
  const tsconfigPath = path.resolve(process.cwd(), "tsconfig.json");
  const resolver = new ResolverFactory({
    tsconfig: {
      configFile: tsconfigPath,
      references: "auto",
    },
  });

  const contents = await fs.promises.readFile(file, "utf-8");
  const { program, module } = await parse(file, contents, { range: true });

  const ir: SchemaIR = { models: {} };

  void adapter; // TODO get function metadata to generate schema ir
  walk(program, {});
  void ir;

  void module; // TODO extract imports
  void resolver; // TODO resolve those imports
  // TODO normalize ir (as code), save into file

  return normalizeIrInMemory(ir);
}

export interface NormalizedSchema {
  models: Record<string, unknown>;
  // TODO in-memory normalized schema
}

function normalizeIrInMemory(ir: SchemaIR): NormalizedSchema {
  void ir;
  return undefined as unknown as NormalizedSchema;
}
