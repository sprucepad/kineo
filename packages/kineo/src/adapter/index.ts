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
  statements: MigrationEntry[];
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

  /**
   * Pushes a schema to the database.
   * - If your database doesn't have a schema, you don't need this function.
   * - If your database does have a schema, even if optional, but you have migrations, you don't need this function.
   * - Otherwise, it is recommended to implement this function.
   * @param schema The (parsed) schema to push.
   */
  push?(schema: ParsedSchema): Resolvable<void>;
  /**
   * Pulls a schema from the database.
   * - Kineo doesn't have a `pull` command. This is for detecting breaking changes between your current schema and your database schema.
   * - If your database doesn't have a schema, you don't need this function.
   * - Otherwise, it is recommended to implement this function.
   */
  pull?(): Resolvable<ParsedSchema | Schema>;
  generate?(
    prev: ParsedSchema,
    cur: ParsedSchema,
  ): Resolvable<MigrationEmitResult>;
  status?(hash: Buffer, migration: string): Resolvable<MigrationStatus>;
  deploy?(hash: Buffer, migration: string): Resolvable<void>;
}

export type AsyncAdapter = Promise<Adapter>;

export type MigrationEntry = MigrationCommand | MigrationNote;

export interface MigrationStatus {
  status: "deployed" | "pending";
  meta: {
    hash: Buffer;
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
