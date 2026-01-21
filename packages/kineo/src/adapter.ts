import type { IR } from "./ir";
import type { Model } from "./model";
import type { Schema } from "./schema";

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

/**
 * An adapter used in KineoKit.
 */
export interface AdapterKit {
  /**
   * Push a schema to the database. You don't need to warn the user, Kineo does that for you.
   * @param schema The schema to push.
   */
  push?(schema: Schema): Resolvable<void>;
  /**
   * Gets a schema from the database.
   */
  pull?(): Resolvable<{ schema: Schema; full?: boolean }>;
  /**
   * Generates migrations.
   */
  generate?(prev: Schema, cur: Schema): Resolvable<MigrationEntry[]>;
  /**
   * Gets a status for a migration.
   * @param migration The migration to get the status for.
   * @param hash The hash of the migration.
   */
  status?(migration: string, hash: string): Resolvable<"pending" | "completed">;
  /**
   * Deploys a migration.
   * @param migration The migration to deploy.
   * @param hash The hash of the migration.
   */
  deploy?(migration: string, hash: string): Resolvable<void>;
}

/**
 * A migration entry. Can either be a note or comment, or a command.
 */
export type MigrationEntry = MigrationCommand | MigrationNote;

/**
 * A migration note.
 */
export interface MigrationNote {
  type: "note";
  note: string;
  description?: string;
}

/**
 * A migration command.
 */
export interface MigrationCommand {
  type: "command";
  /**
   * The command to run;
   */
  command: string;
  /**
   * The reverse of the command to run, in case of rollbacks.
   */
  reverse?: string;
  description?: string;
}
