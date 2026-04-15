import process from "node:process";

export function env(key: string): string {
  const val = process.env[key];
  if (!val) throw new UndefinedEnvError(key);
  return val;
}

export class UndefinedEnvError extends Error {
  constructor(key: string) {
    super(`Undefined environment variable: ${key}.`);
  }
}

export function loadEnv(...files: string[]): void {
  for (const file of files) {
    try {
      process.loadEnvFile(file);
    } catch {
      continue;
    }
  }
}
