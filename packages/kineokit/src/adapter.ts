import { asyncify, type Asyncify } from "kineo/adapter";
import type { Schema } from "kineo/schema";

/**
 * Either a Promise or not.
 */
type Resolvable<T> = T | Promise<T>;

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
  /**
   * A description of the migration command.
   */
  description?: string;
}

/**
 * Defines an adapter.
 * @param a Sync adapter factory.
 */
export function defineAdapterKit<A extends AdapterKit, P extends any[] = any[]>(
  fn: (...args: P) => A,
): (...args: P) => A;

/**
 * Defines an adapter.
 * @param a Async adapter factory.
 */
export function defineAdapterKit<A extends AdapterKit, P extends any[] = any[]>(
  fn: (...args: P) => Promise<A>,
): (...args: P) => Asyncify<A>;

/**
 * Defines an adapter.
 * @param fn Sync adapter.
 */
export function defineAdapterKit<A extends AdapterKit, P extends any[] = any[]>(
  a: A,
): (...args: P) => A;

/**
 * Defines an adapter.
 * @param fn Async adapter.
 */
export function defineAdapterKit<A extends AdapterKit, P extends any[] = any[]>(
  a: Promise<A>,
): (...args: P) => Asyncify<A>;

export function defineAdapterKit<A extends AdapterKit>(a: unknown) {
  // if the parameter is...
  if (typeof a === "function") {
    // an async function?
    if ((a as any)[Symbol.toStringTag] === "AsyncFunction") {
      return asyncify<A>(a as any); // safe
    }

    // a standard function
    return a;
  } else {
    const factory = () => a;

    if (a instanceof Promise) {
      return asyncify<A>(factory as any); // safe
    }

    return factory;
  }
}
