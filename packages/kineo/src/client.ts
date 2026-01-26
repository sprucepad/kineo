import type { InferSchema, ModelDef, Schema } from "./schema";
import type { Model, GraphModel } from "./model";
import type { Adapter } from "./adapter";

// Mapped type over a schema that defines model types
type ModelsForSchema<
  TSchema extends Schema,
  TAdapter extends Adapter<any, any>,
> = {
  [Key in keyof TSchema]: Key extends string
    ? TAdapter extends Adapter<infer TModelCtor, any>
      ? TSchema[Key] extends ModelDef<infer Shape>
        ? InstanceType<TModelCtor> extends GraphModel<any, any>
          ? GraphModel<TSchema, Shape>
          : Model<TSchema, Shape>
        : never
      : never
    : never;
};

/**
 * A Kineo client.
 */
export type Kineo<
  TSchema extends Schema,
  TAdapter extends Adapter<any, any>,
> = ModelsForSchema<TSchema, TAdapter> & {
  /**
   * The adapter.
   */
  $adapter: TAdapter;
  /**
   * The schema.
   */
  $schema: TSchema;
};

/**
 * Infers a schema from a client.
 */
export type InferClient<T> =
  T extends Kineo<infer TSchema, any> ? InferSchema<TSchema> : never;

/**
 * Creates a Kineo client, with an adapter.
 * @param adapter The adapter.
 * @param schema The schema.
 * @returns A Kineo client.
 */
export function kineo<
  TAdapter extends Adapter<any, any>,
  TSchema extends Schema,
>(adapter: TAdapter, schema: TSchema): Kineo<TSchema, TAdapter> {
  const modelsForSchema: Partial<ModelsForSchema<TSchema, TAdapter>> = {};
  for (const key in schema) {
    const modelDef = schema[key];
    modelDef.update();

    modelsForSchema[key] = new adapter.Model(
      modelDef,
      modelDef.$name ?? key,
      adapter,
    );
  }

  return {
    ...(modelsForSchema as ModelsForSchema<TSchema, TAdapter>),
    $adapter: adapter,
    $schema: schema,
  };
}
