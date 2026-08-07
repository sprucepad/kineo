export interface ServerAdapter {
  clientEntrypoint?: ClientEntrypoint;
  capabilities?: Capabilities;
}

export type AsyncServerAdapter = Promise<ServerAdapter>;
export type AnyServerAdapter = ServerAdapter | AsyncServerAdapter;

export interface ClientEntrypoint {
  path: string;
  export: string;
  props?: unknown[];
}

export interface Capabilities {
  types?: {
    string?: StringCapability | false;
    int?: IntCapability | false;
    bigint?: BigIntCapability | false;
    float?: FloatCapability | false;
    decimal?: DecimalCapability | false;
    bool?: BooleanCapability | false;
    date?: DateTimeCapability | false;
    json?: JSONCapability | false;
    bytes?: BytesCapability | false;
    custom?:
      Record<string, TypeCapability<BuilderCapabilityOpts> | false> | false;
  };

  relations?: {
    one?: OneRelationCapability;
    many?: ManyRelationCapability;
  };

  builders?: {
    model?: ModelCapability | false;
    index?: IndexCapability | false;
    compositeIndex?: IndexCapability | false;
    enumType?: EnumCapability | false;
    custom?:
      Record<string, BuilderCapability<BuilderCapabilityOpts> | false> | false;
  };

  defaults?: {
    uuid?: UUIDDefaultCapability | false;
    cuid?: CUIDDefaultCapability | false;
    autoincrement?: AutoIncrementDefaultCapability | false;
    now?: NowDefaultCapability | false;
    custom?: Record<string, DefaultCapability | false> | false;
  };

  directCommands?: {
    sql?: SQLCapability;
    custom?: Record<string, DirectCommandCapability | false> | false;
  };
}

type ExtractConfigValue<
  T,
  Section extends PropertyKey,
  Field extends PropertyKey,
> = Section extends keyof T
  ? T[Section] extends Record<Field, infer V extends PropertyKey>
    ? V
    : never
  : never;

interface BuilderCapabilityOpts {
  Functions?: {
    Exclude?: string;
    Include?: string;
  };

  BuiltIns?: {
    Functions?: string;
  };
}

type Arg =
  | "bigint"
  | "boolean"
  | "function"
  | "number"
  | "object"
  | "string"
  | "symbol"
  | "undefined"
  | (string & {});

export interface CreatorFunction {
  args: Arg[];
  returnType: Arg;
  imports: [string[], string][];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- this allows you to set any value
  create(...args: any[]): unknown;
}

export interface ApplierFunction {
  args: Arg[];
  imports: [string[], string][];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- this allows you to set any value
  apply(ctx: any, ...args: any[]): unknown;
}

export interface BuilderCapability<
  T extends BuilderCapabilityOpts = object,
> extends CreatorFunction {
  functions?: {
    [
      K in Exclude<
        | ExtractConfigValue<T, "Functions", "Include">
        | ExtractConfigValue<T, "BuiltIns", "Functions">,
        ExtractConfigValue<T, "Functions", "Exclude">
      >
    ]?: ApplierFunction | false;
  } & {
    [key: string]: ApplierFunction | false;
  };
}

export interface TypeCapability<
  T extends BuilderCapabilityOpts = object,
> extends BuilderCapability<
  T & {
    BuiltIns: {
      Functions:
        | "id"
        | "required"
        | "optional"
        | "many"
        | "single"
        | "default"
        | "index"
        | "validator";
    };
  }
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- this allows you to set any value
  infer?: (ctx: any) => string;
}

export type StringCapability = TypeCapability;
export type IntCapability = TypeCapability;
export type BigIntCapability = TypeCapability;
export type FloatCapability = TypeCapability;
export type DecimalCapability = TypeCapability;
export type BooleanCapability = TypeCapability<{
  Functions: { Include: "asInt" };
}>;
export type DateTimeCapability = TypeCapability<{
  Functions: { Include: "updatedAt" };
}>;
export type JSONCapability = TypeCapability<{ Functions: { Include: "type" } }>;
export type BytesCapability = TypeCapability<{
  Functions: { Include: "buffer" | "arrayBuffer" | "uint8Array" };
}>;

export type RelationCapability<T extends BuilderCapabilityOpts = object> =
  BuilderCapability<
    T & { BuiltIns: { Functions: "from" | "to" | "required" | "optional" } }
  >;

export type OneRelationCapability = RelationCapability;
export type ManyRelationCapability = RelationCapability;

export type ModelCapability = BuilderCapability<{
  BuiltIns: {
    Functions: "relations" | "indexes";
  };
}>;
export type EnumCapability = BuilderCapability;
export type IndexCapability = BuilderCapability;

export interface DefaultCapability extends CreatorFunction {
  functions: Record<string, ApplierFunction>;
}

export type UUIDDefaultCapability = DefaultCapability;
export type CUIDDefaultCapability = DefaultCapability;
export type AutoIncrementDefaultCapability = DefaultCapability;
export type NowDefaultCapability = DefaultCapability;

export interface DirectCommandCapability {
  imports: [string, string[]][];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- this allows you to set any value
  apply(ctx: any, strings: TemplateStringsArray, ...arrays: any[]): unknown;
}

export type SQLCapability = DirectCommandCapability;
