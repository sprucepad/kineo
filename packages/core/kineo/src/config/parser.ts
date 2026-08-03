import "@oxc-node/core/register";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import type { AnyConfig } from ".";

export interface ParsedConfig {
  // TODO
}

let config: ParsedConfig;

export async function loadConfigs(configFiles: string[]) {
  const files = configFiles.flatMap((rawFilePath) => {
    const file = path.resolve(process.cwd(), rawFilePath);
    if (!fs.existsSync(file)) return [];
    return file;
  });

  const configs = await Promise.all(files.map((file) => import(file)));

  const configMerged = configs.reduce(
    (acc, next) => ({ ...acc, ...next }),
    {},
  ) as AnyConfig;

  const parsedConfig = await parseConfig(configMerged);
  config = parsedConfig;
}

async function parseConfig(merged: AnyConfig): Promise<ParsedConfig> {
  void merged;
  // TODO
  return {};
}

export function useConfig() {
  return config;
}
