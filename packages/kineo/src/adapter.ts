import type { IR } from "./ir";
import type { Model } from "./model";

/**
 * Either a Promise or not.
 */
type Resolvable<T> = T | Promise<T>;

/**
 * A result from a emitter.
 */
export interface EmitResult {
  command: string;
  params: Record<string, any>;
}

/**
 * A emitter.
 */
export type Emitter<T = any> = (ir: IR, preset?: T) => Resolvable<EmitResult>;

/**
 * Result of executing a query.
 */
export interface ExecResult<T = any> {
  entries: Record<string, any>[];
  entryCount: number;
  edges?: {
    type: string;
    direction: "incoming" | "outgoing";
    props?: any;
    from?: string | number;
    to?: string | number;
  }[];
  edgeCount?: number;

  summary?: T;
  raw?: unknown;
}

/**
 * A model constructor, for any inheritors of `Model`.
 */
export type ModelCtor = {
  new (name: string, adapter: Adapter<any, any>): Model<any, any>;
};

/**
 * An adapter. Contains functions necessary to interact with the database of choice.
 */
export interface Adapter<TModelCtor extends ModelCtor, Summary = any> {
  /**
   * What extension of the model class you're using. This can be just the default model or `GraphModel`. Right now, this can't be a custom class.
   */
  Model: TModelCtor;
  /**
   * Where the KineoKit adapter is located.
   */
  kit?: string;

  /**
   * Emits an intermediate representation into a query language.
   */
  emit(ir: IR): Resolvable<EmitResult>;
  /**
   * Runs a compilation result against the database.
   * @param result The emit result.
   */
  exec(result: EmitResult): Resolvable<ExecResult<Summary>>;
  /**
   * Closes the adapter.
   */
  close(): Resolvable<void>;
}

/**
 * Defines an emitter.
 * @param fn The emitter function.
 * @returns The same function.
 */
export function defineEmitter<T>(fn: Emitter<T>): Emitter<T> {
  return fn;
}

/**
 * Defines an adapter.
 * @param a Sync adapter factory.
 */
export function defineAdapter<
  A extends Adapter<any, any>,
  P extends any[] = any[],
>(fn: (...args: P) => A): (...args: P) => A;

/**
 * Defines an adapter.
 * @param a Async adapter factory.
 */
export function defineAdapter<
  A extends Adapter<any, any>,
  P extends any[] = any[],
>(fn: (...args: P) => Promise<A>): (...args: P) => Asyncify<A>;

/**
 * Defines an adapter.
 * @param fn Sync adapter.
 */
export function defineAdapter<
  A extends Adapter<any, any>,
  P extends any[] = any[],
>(a: A): (...args: P) => A;

/**
 * Defines an adapter.
 * @param fn Async adapter.
 */
export function defineAdapter<
  A extends Adapter<any, any>,
  P extends any[] = any[],
>(a: Promise<A>): (...args: P) => Asyncify<A>;

export function defineAdapter<A extends Adapter<any, any>>(a: unknown) {
  // if the parameter is...
  if (typeof a === "function") {
    // an async function?
    if ((a as any)[Symbol.toStringTag] === "AsyncFunction") {
      return asyncify<A>(a as any); // safe
    }

    // a standard function
    return a;
  } else {
    const factory = () => a;

    if (a instanceof Promise) {
      return asyncify<A>(factory as any); // safe
    }

    return factory;
  }
}

/**
 * Turns every property into a `Promise`, and every function to return a `Promise`.
 */
export type Asyncify<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : Promise<T[K]>;
};

/**
 * Handles an async adapter factory.
 * @param factory The factory.
 */
export function asyncify<A>(promise: Promise<A>): Asyncify<A> {
  return new Proxy({} as Asyncify<A>, {
    get(_target, prop) {
      // Special case: allow awaiting the whole adapter
      if (prop === "then") {
        return undefined;
      }

      return async (...args: any[]) => {
        const adapter = await promise;
        const value = (adapter as any)[prop];

        if (typeof value === "function") {
          return value.apply(adapter, args);
        }

        // property access -> Promise<property>
        if (args.length === 0) {
          return value;
        }

        throw new TypeError(`${String(prop)} is not a function`);
      };
    },
  });
}
