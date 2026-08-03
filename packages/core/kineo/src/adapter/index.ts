import type { ClientAdapter } from "@/client";

export interface ServerAdapter extends ClientAdapter {
  // TODO
}

export type AsyncServerAdapter = Promise<ServerAdapter>;
export type AnyServerAdapter = ServerAdapter | AsyncServerAdapter;
