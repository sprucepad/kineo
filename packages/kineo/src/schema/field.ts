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
  $id: TId = false as any;
  $required: TRequired = false as any;
  $array: TArray = false as any;
  $default: TDefault = undefined as any;

  constructor(
    public $kind: TKind,
    public $name?: string,
  ) {}

  type<T extends Kind>(kind: T): FieldDef<T, TId, TRequired, TArray, T> {
    this.$kind = kind as any;
    return this as any;
  }

  name(name?: string): this {
    this.$name = name;
    return this;
  }

  id(): FieldDef<TKind, true, true, TArray, TDefault> {
    this.$id = true as any;
    return this as any;
  }

  required(): FieldDef<TKind, TId, true, TArray, TDefault> {
    this.$required = true as any;
    return this as any;
  }

  optional(): FieldDef<TKind, TId, false, TArray, TDefault> {
    this.$required = false as any;
    return this as any;
  }

  array(): FieldDef<TKind, TId, TRequired, true, TDefault> {
    this.$array = true as any;
    return this as any;
  }

  single(): FieldDef<TKind, TId, TRequired, false, TDefault> {
    this.$array = false as any;
    return this as any;
  }

  default<T>(value: T): FieldDef<TKind, TId, TRequired, TArray, T> {
    this.$default = value as any;
    return this as any;
  }
}

export type Direction = "incoming" | "outgoing" | "both";

export class RelationDef<
  To extends string,
  TRequired extends boolean = false,
  TArray extends boolean = false,
  TDefault = undefined,
> {
  $required: TRequired = false as any;
  $array: TArray = false as any;
  $default: TDefault = undefined as any;
  $direction?: Direction;
  $label?: string;

  constructor(
    public $to: To,
    public $name?: string,
  ) {}

  to<T extends string>(to: T): RelationDef<T, TRequired, TArray, TDefault> {
    this.$to = to as any;
    return this as any;
  }

  name(name?: string): this {
    this.$name = name;
    return this;
  }

  label(label: string): this {
    this.$label = label;
    return this;
  }

  direction(direction: Direction): this {
    this.$direction = direction;
    return this;
  }

  outgoing(label?: string): this {
    this.$direction = "outgoing";
    if (label) this.$label = label;
    return this;
  }

  incoming(label?: string): this {
    this.$direction = "incoming";
    if (label) this.$label = label;
    return this;
  }

  both(label?: string): this {
    this.$direction = "both";
    if (label) this.$label = label;
    return this;
  }

  default<T>(value: T): RelationDef<To, TRequired, TArray, T> {
    this.$default = value as any;
    return this as any;
  }

  required(): RelationDef<To, true, TArray, TDefault> {
    this.$required = true as any;
    return this as any;
  }

  optional(): RelationDef<To, false, TArray, TDefault> {
    this.$required = false as any;
    return this as any;
  }

  array(): RelationDef<To, TRequired, true, TDefault> {
    this.$array = true as any;
    return this as any;
  }

  single(): RelationDef<To, TRequired, false, TDefault> {
    this.$array = false as any;
    return this as any;
  }
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
