import path from "node:path";
import process from "node:process";
import dotenv, { type DotenvConfigOptions } from "dotenv";

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

export type EnvOptions = Omit<DotenvConfigOptions, "File">;

export function loadEnv(opts: EnvOptions, ...files: string[]): void;
export function loadEnv(...files: string[]): void;

export function loadEnv(...args: [EnvOptions, ...string[]] | string[]): void {
  let opts: EnvOptions | undefined;
  let files: string[];

  if (typeof args[0] === "string" || args.length === 0) {
    opts = undefined;
    files = args as string[];
  } else {
    opts = args[0];
    files = args.slice(1) as string[];
  }

  for (const file of files) {
    dotenv.config({ ...opts, path: path.join(process.cwd(), file) });
  }
}
