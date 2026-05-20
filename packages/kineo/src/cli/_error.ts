import type { Adapter } from "@/adapter";

export class NotSupportedError extends Error {
  constructor(
    public adapter: Adapter,
    public op: keyof Adapter,
  ) {
    super(`Your adapter doesn't support the operation "${op}"`);
  }
}
