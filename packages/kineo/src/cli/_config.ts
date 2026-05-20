import type { ResolvedConfig } from "@/config";

let cfg: ResolvedConfig;

export function config() {
  return cfg;
}

export function setConfig(newCfg: ResolvedConfig) {
  cfg = newCfg;
}
