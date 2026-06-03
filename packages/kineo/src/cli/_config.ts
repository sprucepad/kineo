import type { ResolvedConfig } from "@/config";

let cfg: ResolvedConfig | null;

export function config(throwOnNull?: true): ResolvedConfig;
export function config(throwOnNull: false): ResolvedConfig | null;

export function config(throwOnNull = true) {
  if (!cfg && throwOnNull)
    throw new Error(
      "This command requires a configuration. Make sure the config files exist.",
    );
  return cfg;
}

export function setConfig(newCfg: ResolvedConfig | null) {
  cfg = newCfg;
}
