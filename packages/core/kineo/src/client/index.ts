export interface ClientAdapter {
  // TODO
}

export type AsyncClientAdapter = Promise<ClientAdapter>;
export type AnyClientAdapter = ClientAdapter | AsyncClientAdapter;
