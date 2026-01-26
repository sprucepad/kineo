/**
 * All supported field types.
 */
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

/**
 * A field definition.
 */
export class FieldDef<
  TKind extends Kind,
  TId extends boolean = false,
  TRequired extends boolean = false,
  TArray extends boolean = false,
  TDefault = undefined,
> {
  /**
   * If this field is the identifier (or primary key).
   */
  $id: TId = false as any;
  /**
   * If this field is required.
   */
  $required: TRequired = false as any;
  /**
   * If this field is an array.
   */
  $array: TArray = false as any;
  /**
   * The default value of the field.
   */
  $default: TDefault = undefined as any;
  /**
   * The index name of the field.
   */
  $indexName?: string;
  /**
   * If this field is unique.
   */
  $unique = false;

  /**
   * Creates a new field definition
   * @param $kind The row type.
   * @param $name The row name.
   */
  constructor(
    public $kind: TKind,
    public $name?: string,
  ) {}

  /**
   * Changes the type of the field.
   * @param kind The new type.
   * @returns `this`.
   */
  type<T extends Kind>(kind: T): FieldDef<T, TId, TRequired, TArray, TDefault> {
    this.$kind = kind as any;
    return this as any;
  }

  /**
   * Changes the name of the field.
   * @param name The new name.
   * @returns `this`.
   */
  name(name?: string): this {
    this.$name = name;
    return this;
  }

  /**
   * Makes this field the identifier (or primary key).
   * @returns `this`.
   */
  id(): FieldDef<TKind, true, true, TArray, TDefault> {
    this.$id = true as any;
    return this as any;
  }

  /**
   * Makes this field required.
   * @returns `this`.
   */
  required(): FieldDef<TKind, TId, true, TArray, TDefault> {
    this.$required = true as any;
    return this as any;
  }

  /**
   * Makes this field optional.
   * @returns `this`.
   */
  optional(): FieldDef<TKind, TId, false, TArray, TDefault> {
    this.$required = false as any;
    return this as any;
  }

  /**
   * Makes this field an array.
   * @returns `this`.
   */
  array(): FieldDef<TKind, TId, TRequired, true, TDefault> {
    this.$array = true as any;
    return this as any;
  }

  /**
   * Makes this field not an array.
   * @returns `this`.
   */
  single(): FieldDef<TKind, TId, TRequired, false, TDefault> {
    this.$array = false as any;
    return this as any;
  }

  /**
   * Changes the default value of the field.
   * @param kind The new default value.
   * @returns `this`.
   */
  default<T>(value: T): FieldDef<TKind, TId, TRequired, TArray, T> {
    this.$default = value as any;
    return this as any;
  }

  /**
   * The index name.
   * @param name The name of the index.
   * @returns `this`.
   */
  index(name: string): this {
    this.$indexName = name;
    return this;
  }

  /**
   * Sets the field as unique.
   * @returns `this`.
   */
  unique(): this {
    this.$unique = true;
    return this;
  }

  /**
   * Sets the field as common (not unique).
   * @returns `this`.
   */
  common(): this {
    this.$unique = false;
    return this;
  }
}

/**
 * Relationship direction (for graph databases).
 */
export type Direction = "incoming" | "outgoing" | "both";

/**
 * A relationship definition.
 */
export class RelationDef<
  To extends string,
  TRequired extends boolean = false,
  TArray extends boolean = false,
  TDefault = undefined,
> {
  /**
   * If this relationship is required.
   */
  $required: TRequired = false as any;
  /**
   * If this is a list of relationships.
   */
  $array: TArray = false as any;
  /**
   * The default value of the relationship.
   */
  $default: TDefault = undefined as any;
  /**
   * The direction of the relationship.
   */
  $direction?: Direction;
  /**
   * The relationship label.
   */
  $label?: string;
  /**
   * The relationship index name.
   */
  $indexName?: string;
  /**
   * If this relationship is unique (e.g. one-to-one relationships)
   */
  $unique: boolean = false;

  /**
   * Creates a new relationship definition
   * @param $to Where this relationship is pointing to.
   * @param $name The relationship name.
   */
  constructor(
    public $to: To,
    public $name?: string,
  ) {}

  /**
   * Changes where this relationship is pointing to.
   * @param pointTo Where this relationship is pointing to.
   * @returns `this`.
   */
  to<T extends string>(to: T): RelationDef<T, TRequired, TArray, TDefault> {
    this.$to = to as any;
    return this as any;
  }

  /**
   * Changes the name of the relationship.
   * @param relName The new name.
   * @returns `this`.
   */
  name(name?: string): this {
    this.$name = name;
    return this;
  }

  /**
   * Changes the label of the relationship.
   * @param relLabel The new label.
   * @returns `this`.
   */
  label(label: string): this {
    this.$label = label;
    return this;
  }

  /**
   * Changes the direction of the relationship.
   * @param relDirection The new direction.
   * @returns `this`.
   */
  direction(direction: Direction): this {
    this.$direction = direction;
    return this;
  }

  /**
   * Makes relationship outgoing and optionally sets a label.
   * @param label _optional_ The new label.
   * @returns `this`.
   */
  outgoing(label?: string): this {
    this.$direction = "outgoing";
    if (label) this.$label = label;
    return this;
  }

  /**
   * Makes the relationship incoming and optionally sets a label.
   * @param label _optional_ The new label.
   * @returns `this`.
   */
  incoming(label?: string): this {
    this.$direction = "incoming";
    if (label) this.$label = label;
    return this;
  }

  /**
   * Makes the relationship go both directions and optionally sets a label.
   * @param label _optional_ The new label.
   * @returns `this`.
   */
  both(label?: string): this {
    this.$direction = "both";
    if (label) this.$label = label;
    return this;
  }

  /**
   * Changes the default value.
   * @param defaultValue The new default value.
   * @returns `this`.
   */
  default<T>(value: T): RelationDef<To, TRequired, TArray, T> {
    this.$default = value as any;
    return this as any;
  }

  /**
   * Makes this relationship required.
   * @returns `this`.
   */
  required(): RelationDef<To, true, TArray, TDefault> {
    this.$required = true as any;
    return this as any;
  }

  /**
   * Makes this relationship optional.
   * @returns `this`.
   */
  optional(): RelationDef<To, false, TArray, TDefault> {
    this.$required = false as any;
    return this as any;
  }

  /**
   * Makes this relationship an array.
   * @returns `this`.
   */
  array(): RelationDef<To, TRequired, true, TDefault> {
    this.$array = true as any;
    return this as any;
  }

  /**
   * Makes this relationship a single element.
   * @returns `this`.
   */
  single(): RelationDef<To, TRequired, false, TDefault> {
    this.$array = false as any;
    return this as any;
  }

  /**
   * Creates an index for this relationship.
   * @param name The index name.
   * @returns `this`.
   */
  index(name: string): this {
    this.$indexName = name;
    return this;
  }

  /**
   * Sets the relationship as unique.
   * @returns `this`.
   */
  unique(): this {
    this.$unique = true;
    return this;
  }

  /**
   * Sets the relationship as not unique.
   * @returns `this`.
   */
  common(): this {
    this.$unique = false;
    return this;
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
