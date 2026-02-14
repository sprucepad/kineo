import type { Direction, InferModelShape, ModelShape, Schema } from "@/schema";
import { Model, type FieldFilter, type QueryOpts } from ".";

/**
 * Path options (`findPath`, `findShortestPath`, etc.).
 */
export interface PathOpts<
  S extends Schema,
  M extends ModelShape,
  MType = InferModelShape<M, S>,
> {
  from: {
    where: { [K in keyof MType]?: FieldFilter<MType[K]> };
  };
  to: {
    where: { [K in keyof MType]?: FieldFilter<MType[K]> };
  };
  maxDepth?: number;
  minDepth?: number;
  direction?: Direction;
  limit?: number;
}

/**
 * Connect options (`connect`, `disconnect`).
 */
export interface ConnectOpts<
  S extends Schema,
  M extends ModelShape,
  MType = InferModelShape<M, S>,
> {
  from: { where: { [K in keyof MType]?: FieldFilter<MType[K]> } };
  to: { where: { [K in keyof MType]?: FieldFilter<MType[K]> } };
  relation: string; // rel label
  direction?: Direction;
  properties?: Record<string, any>;
}

/**
 * Traverse options (`traverse`)..
 */
export interface TraverseOpts<
  S extends Schema,
  M extends ModelShape,
  MType = InferModelShape<M, S>,
> {
  start: { where: { [K in keyof MType]?: FieldFilter<MType[K]> } };
  direction?: Direction;
  depth?: number;
  maxDepth?: number;
  relationFilter?: string | string[];
  includeNodes?: boolean;
  includeEdges?: boolean;
}

// ---------- Graph Return Types ---------- //

/**
 * The return type for everything related to paths.
 */
export type PathReturn<S extends Schema, M extends ModelShape> = Promise<{
  nodes: InferModelShape<M, S>[];
  edges: Array<{
    type: string;
    direction: "incoming" | "outgoing";
    props?: any;
  }>;
}>;

/**
 * The return  type for `findNeighbors`.
 */
export type NeighborsReturn<S extends Schema, M extends ModelShape> = Promise<
  InferModelShape<M, S>[]
>;

/**
 * The return  type for `connect`.
 */
export type ConnectReturn = Promise<{ success: boolean }>;

/**
 * The return  type for `disconnect`.
 */
export type DisconnectReturn = Promise<{ success: boolean }>;

/**
 * The return  type for `traverse`.
 */
export type TraverseReturn<S extends Schema, M extends ModelShape> = Promise<{
  path: Array<{ node: InferModelShape<M, S>; edge?: any }>;
}>;

/**
 * Provides utility methods for graph databases on top of the default model.
 */
export class GraphModel<S extends Schema, M extends ModelShape> extends Model<
  S,
  M
> {
  /**
   * Finds a path that matches a filter.
   * @param opts Path options.
   * @returns The path the matches the filter.
   */
  async findPath(opts: PathOpts<S, M>): PathReturn<S, M> {
    const result = await this.$exec(opts, "findPath");

    const entry = result.entries?.[0] as any;

    // If adapter returned a Neo4j-style path object
    if (entry && Array.isArray(entry.segments)) {
      const nodes = [entry.start];

      for (const seg of entry.segments) {
        nodes.push(seg.end);
      }

      return {
        nodes: nodes as InferModelShape<M, S>[],
        edges:
          result.edges?.map((e) => ({
            type: e.type,
            direction: "outgoing", // path queries currently undirected
            props: e.props,
          })) ?? [],
      };
    }

    // Fallback (non-path adapter)
    return {
      nodes: result.entries as InferModelShape<M, S>[],
      edges: result.edges ?? [],
    };
  }

  /**
   * Finds the shortest path to a node.
   * @param opts Path options.
   * @returns The shortest path.
   */
  async findShortestPath(opts: PathOpts<S, M>): PathReturn<S, M> {
    const result = await this.$exec(opts, "findShortestPath");
    return {
      nodes: result.entries as InferModelShape<M, S>[],
      edges: result.edges ?? [],
    };
  }

  /**
   * Finds all paths that match a filter.
   * @param opts Path options.
   * @returns The paths that match the filter.
   */
  async findAllPaths(opts: PathOpts<S, M>): PathReturn<S, M> {
    const result = await this.$exec(opts, "findAllPaths");
    return {
      nodes: result.entries as InferModelShape<M, S>[],
      edges: result.edges ?? [],
    };
  }

  /**
   * Finds neighbor nodes, or nodes that are connected directly.
   * @param opts Query options.
   * @returns The neighbor nodes.
   */
  async findNeighbors(opts: QueryOpts<S, M>): NeighborsReturn<S, M> {
    const result = await this.$exec(opts, "findNeighbors");
    return result.entries as InferModelShape<M, S>[];
  }

  /**
   * Connects a node to another node.
   * @param opts Connect options.
   * @returns If the connection was successful or not.
   */
  async connect(opts: ConnectOpts<S, M>): ConnectReturn {
    const result = await this.$exec(opts, "connect");
    return { success: !!result.summary || true };
  }

  /**
   * Disconnects a node from another node.
   * @param opts Connect options.
   * @returns If the connection was successful or not.
   */
  async disconnect(opts: ConnectOpts<S, M>): DisconnectReturn {
    const result = await this.$exec(opts, "disconnect");
    return { success: !!result.summary || true };
  }

  /**
   * Traverses a graph.
   * @param opts Traverse options.
   * @returns The paths it passed through.
   */
  async traverse(opts: TraverseOpts<S, M>): TraverseReturn<S, M> {
    const result = await this.$exec(opts, "traverse");

    return {
      path: (result.entries ?? []).map((node, i) => ({
        node: node as InferModelShape<M, S>,
        edge: result.edges?.[i],
      })),
    };
  }
}
