import process from "node:process";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { env, UndefinedEnvError } from "./env";

describe("env", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return environment variable", () => {
    process.env.TEST_KEY = "value";
    expect(env("TEST_KEY")).toBe("value");
  });

  it("should throw if env is undefined", () => {
    delete process.env.MISSING_KEY;
    expect(() => env("MISSING_KEY")).toThrow(UndefinedEnvError);
  });
});

describe("loadEnv", () => {
  it("should call process.loadEnvFile for each file", () => {
    const spy = vi.spyOn(process, "loadEnvFile").mockImplementation(() => {});

    env.load(".env", ".env.local");

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(".env");
    expect(spy).toHaveBeenCalledWith(".env.local");
  });

  it("should ignore errors", () => {
    const spy = vi.spyOn(process, "loadEnvFile").mockImplementation(() => {
      throw new Error("fail");
    });

    expect(() => env.load(".env")).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});
