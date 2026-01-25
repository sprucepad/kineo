import type { IR } from "./ir";
import type { Model } from "./model";

/**
 * Either a Promise or not.
 */
type Resolvable<T> = T | Promise<T>;

/**
 * A result from a emitter.
 */
export interface EmitResult {
  command: string;
  params: Record<string, any>;
}

/**
 * A emitter.
 */
export type Emitter<T = any> = (ir: IR, preset?: T) => EmitResult;

/**
 * Result of executing a query.
 */
export interface ExecResult<T = any> {
  entries: Record<string, any>[];
  entryCount: number;
  edges?: {
    type: string;
    direction: "incoming" | "outgoing";
    props?: any;
    from?: string | number;
    to?: string | number;
  }[];
  edgeCount?: number;

  summary?: T;
  raw?: unknown;
}

/**
 * An adapter. Contains functions necessary to interact with the database of choice.
 */
export interface Adapter<
  TModelCtor extends {
    new (name: string, adapter: Adapter<any, any>): Model<any, any>;
  },
  Summary = any,
> {
  /**
   * What extension of the model class you're using. This can be just the default model or `GraphModel`. Right now, this can't be a custom class.
   */
  Model: TModelCtor;
  /**
   * Where the KineoKit adapter is located.
   */
  kit?: string;

  /**
   * Emits an intermediate representation into a query language.
   */
  emit(ir: IR): Resolvable<EmitResult>;
  /**
   * Runs a compilation result against the database.
   * @param result The emit result.
   */
  exec(result: EmitResult): Resolvable<ExecResult<Summary>>;
  /**
   * Closes the adapter.
   */
  close(): Resolvable<void>;
}
