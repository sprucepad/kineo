export interface ClientAdapter {
  // TODO client adapters
}

export type AsyncClientAdapter = Promise<ClientAdapter>;
export type AnyClientAdapter = ClientAdapter | AsyncClientAdapter;
