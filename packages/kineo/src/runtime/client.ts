import type {
  AsyncRuntimeAdapter,
  EmitResult,
  RuntimeAdapter,
} from "@/adapter";
import { parseSchema, type Schema } from "@/schema";
import { Model } from "./model";

export type Kineo<T extends Schema> = {
  $adapter: RuntimeAdapter | AsyncRuntimeAdapter;

  $exec<T>(
    strings: TemplateStringsArray,
    ...values: any[]
  ): Promise<{ rows: T[]; rowCount: number }>;
  $close(): Promise<void>;
  // TODO transactions
} & ModelsForSchema<T>;

export type ModelsForSchema<T extends Schema> = {
  [K in keyof T]: Model<T[K]>;
};

export function kineo<T extends Schema>(
  adapter: RuntimeAdapter | AsyncRuntimeAdapter,
  schema: T,
): Kineo<T> {
  if (adapter instanceof Promise) adapter.then((a) => a.extend?.(Model));
  else adapter.extend?.(Model);

  const parsedSchema = parseSchema(schema);

  const modelsForSchema: Record<string, Model<any>> = {};
  for (const [modelName, parsedModel] of parsedSchema.models) {
    modelsForSchema[modelName] = new Model(
      parsedSchema,
      parsedModel,
      modelName,
      adapter,
    );
  }

  return {
    ...(modelsForSchema as ModelsForSchema<T>),
    $adapter: adapter,

    async $exec(strings, ...values) {
      const result = await (
        await adapter
      ).exec(templateToParams(strings, values));
      return {
        rows: (result.rows as any[]) ?? [],
        rowCount: result.rowCount ?? 0,
      };
    },

    async $close() {
      return await (await adapter).close();
    },
  };
}

export function templateToParams(
  strings: TemplateStringsArray,
  ...values: any[]
): EmitResult {
  let command = "";
  const params: any[] = [];

  for (let i = 0; i < strings.length; i++) {
    command += strings[i];

    if (i < values.length) {
      const value = values[i];

      // Handle arrays (e.g. WHERE id IN (...))
      if (Array.isArray(value)) {
        if (value.length === 0) {
          // Edge case: empty IN ()
          command += "(NULL)";
        } else {
          const placeholders = value.map(
            (_, index) => `$${params.length + index + 1}`,
          );
          command += placeholders.join(",");
          params.push(...value);
        }
      } else {
        command += `$${params.length + 1}`;
        params.push(value);
      }
    }
  }

  return { command, params: { ...params } };
}
