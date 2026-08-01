import process from "node:process";

export const ENV_SYMBOL = Symbol.for("env.metadata");

declare global {
  interface String {
    [ENV_SYMBOL]: () => EnvMeta[] | undefined;
  }
}

interface EnvMeta {
  key: string;
  loader: "required" | "optional" | "nullable";
}

const metadata = new Map<string, EnvMeta[]>();

function register(value: string | null | undefined, meta: EnvMeta) {
  const key =
    value === null ? "null" : value === undefined ? "undefined" : value;
  const arr = metadata.get(key) ?? [];
  arr.push(meta);
  metadata.set(key, arr);
}

String.prototype[ENV_SYMBOL] = function () {
  return metadata.get(String(this));
};

export function env(key: string): string {
  const val = process.env[key];
  if (!val) throw new UndefinedEnvError(key);
  register(val, { key, loader: "required" });
  return val;
}

env.nullable = (key: string): string | null => {
  const val = process.env[key];
  register(val, { key, loader: "nullable" });
  return val ?? null;
};

env.optional = (key: string): string | undefined => {
  const val = process.env[key];
  register(val, { key, loader: "optional" });
  return val;
};

export class UndefinedEnvError extends Error {
  constructor(key: string) {
    super(`Undefined environment variable: ${key}.`);
  }
}

env.load = (...files: string[]): void => {
  for (const file of files) {
    try {
      process.loadEnvFile(file);
    } catch {
      continue;
    }
  }
};
