export type Kind =
  | "string"
  | "char"
  | "int"
  | "float"
  | "date"
  | "time"
  | "datetime"
  | "timestamp"
  | "bool"
  | "blob";

export class FieldDef<
  TKind extends Kind,
  TId extends boolean = false,
  TRequired extends boolean = false,
  TArray extends boolean = false,
  TDefault = undefined,
> {
  constructor(
    public $kind: TKind,
    public $name?: string,
  ) {}
}

export class RelationDef<
  To extends string,
  TId extends boolean = false,
  TRequired extends boolean = false,
  TArray extends boolean = false,
  TDefault = undefined,
> {
  constructor(
    public $to: To,
    public $name?: string,
  ) {}
}

/**
 * Utilities for creating field definitions.
 */
export const field = {
  /**
   * Creates a new string field definition.
   * @param name _optional_ The name of the field.
   * @returns A string field definition.
   */
  string: (name?: string) => new FieldDef("string", name),
  /**
   * Creates a new char field definition.
   * @param name _optional_ The name of the field.
   * @returns A char field definition.
   */
  char: (name?: string) => new FieldDef("char", name),
  /**
   * Creates a new integer field definition.
   * @param name _optional_ The name of the field.
   * @returns A int field definition.
   */
  int: (name?: string) => new FieldDef("int", name),
  /**
   * Creates a new floating point field definition.
   * @param name _optional_ The name of the field.
   * @returns A floating point field definition.
   */
  float: (name?: string) => new FieldDef("float", name),
  /**
   * Creates a new date field definition.
   * @param name _optional_ The name of the field.
   * @returns A date field definition.
   */
  date: (name?: string) => new FieldDef("date", name),
  /**
   * Creates a new time field definition.
   * @param name _optional_ The name of the field.
   * @returns A time field definition.
   */
  time: (name?: string) => new FieldDef("time", name),
  /**
   * Creates a new datetime field definition.
   * @param name _optional_ The name of the field.
   * @returns A datetime field definition.
   */
  datetime: (name?: string) => new FieldDef("datetime", name),
  /**
   * Creates a new timestamp field definition.
   * @param name _optional_ The name of the field.
   * @returns A timestamp field definition.
   */
  timestamp: (name?: string) => new FieldDef("timestamp", name),
  /**
   * Creates a new boolean field definition.
   * @param name _optional_ The name of the field.
   * @returns A boolean field definition.
   */
  bool: (name?: string) => new FieldDef("bool", name),
  /**
   * Creates a new boolean field definition.
   * @param name _optional_ The name of the field.
   * @returns A boolean field definition.
   */
  boolean: (name?: string) => new FieldDef("bool", name),
};

/**
 * Utilities for creating relationship definitions.
 */
export const relation = {
  /**
   * Creates a new relationship definition.
   * @param to Where this relationship is pointing to.
   * @param name _optional_ The name of the relationship.
   * @returns A new relationship definition.
   */
  to: <To extends string>(to: To, name?: string) =>
    new RelationDef<To>(to, name),
};
