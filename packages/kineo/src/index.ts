export function greet(...names: string[]) {
  for (const name of names) {
    console.log(`Hello, ${name}!`);
  }
}

export * from "./schema";
export type * as IR from "./ir";
