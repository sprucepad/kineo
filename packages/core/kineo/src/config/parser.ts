import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { transform } from "oxc-transform";
import type { AnyConfig } from ".";

export async function loadConfig(configFiles: string[]) {
  const files = configFiles.flatMap((rawFilePath) => {
    const file = path.resolve(process.cwd(), rawFilePath);
    if (!fs.existsSync(file)) return [];
    return { file, basename: path.basename(file) };
  });

  const configs = await Promise.all(
    files.map(async ({ file, basename }) => {
      const sourceCode = await fs.promises.readFile(file, "utf-8");
      const transformResult = await transform(file, sourceCode, {
        sourcemap: true,
        sourceType: "module",
      });

      const compiledPath = path.resolve(
        basename,
        `.config-${crypto.randomUUID()}.mjs`,
      );
      await fs.promises.writeFile(compiledPath, transformResult.code, "utf-8");
      const module = await import(compiledPath);
      await fs.promises.rm(compiledPath);

      return module.default ?? module;
    }),
  );

  const configMerged = configs.reduce(deepMerge, {} as AnyConfig);
  return await parseConfig(configMerged);
}

async function parseConfig(merged: AnyConfig) {
  void merged;
  // TODO
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

function deepMerge(target: unknown, source: unknown) {
  // If either is not an object, return the source to overwrite
  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  Object.keys(source).forEach((key) => {
    if (isObject(source[key])) {
      if (key in target) {
        // Recursively merge nested objects
        target[key] = deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    } else if (Array.isArray(source[key]) && Array.isArray(target[key])) {
      // Merge strategy for nested arrays: Concatenation
      target[key] = target[key].concat(source[key]);
    } else {
      target[key] = source[key];
    }
  });

  return target;
}
