import { describe, expect, it, vi } from "vitest";

import { greet } from "./index";

describe("greet()", () => {
  it("greets list of people", () => {
    const spy = vi.spyOn(console, "log");
    greet("John", "Amy");

    expect(spy).toHaveBeenCalledWith("Hello, John!");
    expect(spy).toHaveBeenCalledWith("Hello, Amy!");
  });
});
