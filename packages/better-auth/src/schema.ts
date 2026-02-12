import type { BetterAuthPlugin, BetterAuthPluginDBSchema } from "better-auth";
import {
  defineSchema,
  field,
  model,
  relation,
  type ModelDef,
  type ModelShape,
} from "kineo/schema";

/**
 * Creates a schema based on your Better-Auth plugins that you can spread onto your schema.
 */
export function betterAuthSchema(...plugins: BetterAuthPlugin[]) {
  const pluginSchemas = plugins.map((plugin) => toKineoSchema(plugin.schema));

  return Object.assign(
    defineSchema({
      users: model("user", {
        id: field.string().id(),
        name: field.string().required(),
        email: field.string().required(),
        emailVerified: field.bool().default(false),
        image: field.string().optional(),
        createdAt: field.datetime().required(),
        updatedAt: field.datetime().required(),
      }),

      sessions: model("session", {
        id: field.string().id(),
        userId: relation.to("user").required(),
        token: field.string().required(),
        expiresAt: field.datetime().required(),
        ipAddress: field.string().optional(),
        userAgent: field.string().optional(),
        createdAt: field.datetime().required(),
        updatedAt: field.datetime().required(),
      }),

      accounts: model("account", {
        id: field.string().id(),
        userId: relation.to("user").required(),
        accountId: field.string().required(),
        providerId: field.string().required(),
        accessToken: field.string().optional(),
        refreshToken: field.string().optional(),
        accessTokenExpiresAt: field.datetime().optional(),
        refreshTokenExpiresAt: field.datetime().optional(),
        scope: field.string().optional(),
        idToken: field.string().optional(),
        password: field.string().optional(),
        createdAt: field.datetime().required(),
        updatedAt: field.datetime().required(),
      }),

      verifications: model("verification", {
        id: field.string().id(),
        identifier: field.string().required(),
        value: field.string().required(),
        expiresAt: field.datetime().required(),
        createdAt: field.datetime().required(),
        updatedAt: field.datetime().required(),
      }),
    }),

    ...pluginSchemas,
  );
}

export function toKineoSchema(schema?: BetterAuthPluginDBSchema) {
  if (!schema) return null;

  const models: Record<string, ModelDef<any>> = {};
  for (const modelKey in schema) {
    const baModel = schema[modelKey];

    const fields: ModelShape = {};
    for (const fieldKey in baModel.fields) {
      const baField = baModel.fields[fieldKey];
      let f: ModelShape[string];

      if (baField.references) {
        f = relation
          .to(baField.references.model)
          .both(baField.references.field);
      } else {
        switch (baField.type) {
          case "boolean":
            f = field.bool(baField.fieldName);
            break;
          case "date":
            f = field.datetime(baField.fieldName);
            break;
          case "json":
            f = field.string(baField.fieldName);
            break;
          case "number":
            if (baField.bigint) f = field.bigint(baField.fieldName);
            else f = field.float(baField.fieldName);
            break;
          case "number[]":
            f = field.float(baField.fieldName).array();
            break;
          case "string":
            f = field.string(baField.fieldName);
            break;
          case "string[]":
            f = field.string(baField.fieldName).array();
            break;
          default:
            throw new Error("[@kineojs/better-auth] unsupported database type");
        }
      }

      if (baField.defaultValue) f.default(baField.defaultValue);
      if (baField.index) f.index(`better_auth_${f.$name ?? fieldKey}`);
      if (baField.required) f.required();
      if (baField.unique) f.unique();
      if (baField.validator?.output) f.validate(baField.validator.output);

      fields[fieldKey] = f;
    }

    models[modelKey] = model(baModel.modelName ?? modelKey, fields);
  }

  return models;
}
