import type { RuntimeAdapter } from "@/adapter";

export class Transaction {
  constructor(public adapter: RuntimeAdapter) {}

  async commit() {}

  // TODO transactions
}
