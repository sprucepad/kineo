import { describe, it, expect } from "vitest";
import { betterAuthSchema, toKineoSchema } from "@/schema";

import { twoFactor } from "better-auth/plugins";
import { organization } from "better-auth/plugins";
import type { BetterAuthPluginDBSchema } from "better-auth";

describe("betterAuthSchema", () => {
  it("includes core Better Auth models", () => {
    const schema = betterAuthSchema();

    expect(schema).toBeDefined();

    // Core models
    expect(schema.users).toBeDefined();
    expect(schema.sessions).toBeDefined();
    expect(schema.accounts).toBeDefined();
    expect(schema.verifications).toBeDefined();
  });

  it("merges plugin schemas into the base schema", () => {
    const schema = betterAuthSchema(twoFactor(), organization());

    // Two-factor plugin adds model(s)
    const hasTwoFactorModel = Object.keys(schema).some((k) =>
      k.toLowerCase().includes("twofactor"),
    );

    const hasOrganizationModel = Object.keys(schema).some((k) =>
      k.toLowerCase().includes("organization"),
    );

    expect(hasTwoFactorModel).toBe(true);
    expect(hasOrganizationModel).toBe(true);
  });

  it("returns null from toKineoSchema when schema is undefined", () => {
    expect(toKineoSchema(undefined)).toBeNull();
  });
});

describe("toKineoSchema field mapping", () => {
  const mockSchema: BetterAuthPluginDBSchema = {
    testModel: {
      modelName: "test_model",
      fields: {
        boolField: {
          type: "boolean",
          fieldName: "bool_field",
          required: true,
        },
        dateField: {
          type: "date",
          fieldName: "date_field",
        },
        jsonField: {
          type: "json",
          fieldName: "json_field",
        },
        floatField: {
          type: "number",
          fieldName: "float_field",
        },
        bigintField: {
          type: "number",
          fieldName: "bigint_field",
          bigint: true,
        },
        numberArrayField: {
          type: "number[]",
          fieldName: "number_array_field",
        },
        stringField: {
          type: "string",
          fieldName: "string_field",
          unique: true,
        },
        stringArrayField: {
          type: "string[]",
          fieldName: "string_array_field",
        },
        relationField: {
          type: "string",
          fieldName: "relation_field",
          references: {
            model: "user",
            field: "id",
          },
        },
      },
    },
  };

  it("converts BetterAuthPluginDBSchema into Kineo models", () => {
    const kineoSchema = toKineoSchema(mockSchema);

    expect(kineoSchema).toBeDefined();
    expect(kineoSchema?.testModel).toBeDefined();
  });

  it("throws for unsupported database type", () => {
    const badSchema: BetterAuthPluginDBSchema = {
      badModel: {
        fields: {
          weirdField: {
            // @ts-expect-error intentionally invalid
            type: "unsupported",
            fieldName: "weird_field",
          },
        },
      },
    };

    expect(() => toKineoSchema(badSchema)).toThrow("unsupported database type");
  });
});
