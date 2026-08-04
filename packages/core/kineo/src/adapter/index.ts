export interface ServerAdapter {
  clientEntrypoint?: {
    path: string;
    export: string;
    props?: unknown[];
  };
}

export type AsyncServerAdapter = Promise<ServerAdapter>;
export type AnyServerAdapter = ServerAdapter | AsyncServerAdapter;
