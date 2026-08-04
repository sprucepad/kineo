export interface ServerPlugin {
  // TODO server plugins
}

export type AsyncServerPlugin = Promise<ServerPlugin>;
export type AnyServerPlugin = ServerPlugin | AsyncServerPlugin;

export interface ClientPlugin {
  // TODO client plugins
}

export type AsyncClientPlugin = Promise<ClientPlugin>;
export type AnyClientPlugin = ClientPlugin | AsyncClientPlugin;
