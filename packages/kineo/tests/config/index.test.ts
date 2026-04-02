import { describe, it, expect } from "vitest";
import { defineConfig } from "@/config";

describe("defineConfig", () => {
  it("should return the same config object", () => {
    const cfg = {
      adapter: {} as any,
      output: "./out",
    };

    const result = defineConfig(cfg);
    expect(result).toBe(cfg);
  });
});
