import type { Emitter } from "@/adapter";

export interface SQLDialect {
  // TODO
}

export default (async (ir, dialect) => {
  // TODO
  return {
    command: "",
    params: [],
  };
}) satisfies Emitter<SQLDialect>;
