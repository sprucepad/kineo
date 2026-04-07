import type { Statement } from "@/ir";
import type { Model } from "@/runtime";
import type { ParsedSchema, Schema } from "@/schema";

export type Resolvable<T> = T | Promise<T>;

export interface EmitResult {
  command: string;
  params: any[];
}

export type Emitter<T = any> = (
  ir: Statement[],
  dialect: T,
) => Resolvable<EmitResult>;

export interface ExecResult {
  rows?: Record<string, any>[];
  rowCount?: number;
  lastInsertId?: any;
  meta?: Record<string, any>;
}

export interface RuntimeAdapter {
  /**
   * Extends the default Kineo model constructor.
   * @param ModelConstructor The model constructor.
   */
  extend?(ModelConstructor: typeof Model): Resolvable<void>;

  emit(ir: Statement[]): Resolvable<EmitResult>;
  exec(opts: EmitResult): Resolvable<ExecResult>;
  close(): Resolvable<void>;
}

export type AsyncRuntimeAdapter = Promise<RuntimeAdapter>;

export interface Adapter extends RuntimeAdapter {
  /**
   * The export path of your runtime adapter. For example, `kineo/adapter/postgres/runtime`.
   */
  runtimePath: string;

  push?(schema: ParsedSchema): Resolvable<void>;
  pull?(): Resolvable<ParsedSchema | Schema>;
  generate?(
    prev: ParsedSchema,
    cur: ParsedSchema,
  ): Resolvable<MigrationEntry[]>;
  status?(hash: string, migration: string): Resolvable<MigrationStatus>;
  deploy?(hash: string, migration: string): Resolvable<void>;
}

export type AsyncAdapter = Promise<Adapter>;

export const enum MigrationStatus {
  Deployed,
  Pending,
}

export type MigrationEntry = MigrationCommand | MigrationNote;

export interface MigrationCommand {
  type: "command";
  command: string;
  description?: string;
}

export interface MigrationNote {
  type: "note";
  note: string;
}
