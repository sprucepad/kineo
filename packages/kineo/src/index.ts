export function greet(...names: string[]) {
  for (const name of names) {
    console.log(`Hello, ${name}!`);
  }
}

export { defineConfig, env, loadEnv, type KineoConfig } from "./config";
export { model, s, Decimal } from "./schema";
