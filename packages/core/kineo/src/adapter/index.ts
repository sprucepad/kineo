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
    custom?: Record<string, TypeCapability | false> | false;
  };

  relations?: {
    one?: OneRelationCapability;
    many?: ManyRelationCapability;
  };

  builders?: {
    model?: ModelCapability | false;
    index?: IndexCapability | false;
    enumType?: EnumCapability | false;
    custom?: Record<string, ImportedBuilderCapability | false> | false;
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
}

export interface BuilderCapability<T extends BuilderCapabilityOpts = object> {
  functions?: {
    [
      K in Exclude<
        ExtractConfigValue<T, "Functions", "Include"> | "updatedAt",
        ExtractConfigValue<T, "Functions", "Exclude">
      >
    ]?: FunctionCapability | false;
  } & {
    [key: string]: FunctionCapability | false;
  };
}

export interface FunctionCapability {
  args: Array<
    | "bigint"
    | "boolean"
    | "function"
    | "number"
    | "object"
    | "string"
    | "symbol"
    | "undefined"
    | (string & {})
  >;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- this allows you to set any value
  apply(ctx: any, ...args: any[]): unknown;
}

export interface TypeCapability<
  T extends BuilderCapabilityOpts = object,
> extends BuilderCapability<T> {
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
