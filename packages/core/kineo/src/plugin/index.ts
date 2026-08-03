export interface ServerPlugin {
  // TODO
}

export type AsyncServerPlugin = Promise<ServerPlugin>;
export type AnyServerPlugin = ServerPlugin | AsyncServerPlugin;

export interface ClientPlugin {
  // TODO
}

export type AsyncClientPlugin = Promise<ClientPlugin>;
export type AnyClientPlugin = ClientPlugin | AsyncClientPlugin;
