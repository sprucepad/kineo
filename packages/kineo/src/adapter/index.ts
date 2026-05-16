import type { Statement } from "@/ir";
import type { Model } from "@/runtime";
import type { ParsedSchema, Schema, SchemaDiff } from "@/schema";

export type Resolvable<T> = T | Promise<T>;

export type Emitter<T = undefined> = T extends undefined
  ? (ir: Statement[]) => Resolvable<EmitResult>
  : (ir: Statement[], dialect: T) => Resolvable<EmitResult>;

export interface EmitResult {
  statements: EmittedStatement[];
}

export interface EmittedStatement {
  command: string;
  params: any[];
}

export interface ExecResult {
  rows?: Record<string, any>[];
  rowCount?: number;
  lastInsertId?: any;
  meta?: Record<string, any>;
}

export type MigrationEmitter<T = undefined> = T extends undefined
  ? (diff: SchemaDiff) => Resolvable<MigrationEmitResult>
  : (diff: SchemaDiff, dialect: T) => Resolvable<MigrationEmitResult>;

export interface MigrationEmitResult {
  statements: EmittedMigrationStatement[];
}

export interface EmittedMigrationStatement {
  entries: MigrationEntry[];
  params: any[];
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
  /**
   * The export name of your runtime adapter. For example `default`.
   */
  runtimeExport?: "default" | (string & {});

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

export type MigrationEntry = MigrationCommand | MigrationNote;

export interface MigrationStatus {
  status: "deployed" | "pending";
  meta: {
    id: string;
    hash: string;
    appliedAt: Date;
    [key: PropertyKey]: any;
  };
}

export interface MigrationCommand {
  type: "command";
  command: string;
  description?: string;
}

export interface MigrationNote {
  type: "note";
  note: string;
}
