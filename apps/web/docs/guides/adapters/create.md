---
sidebar_position: 9999
---

# Create your own adapter

Kineo and KineoKit provide utility functions for creating adapters. You can use the `defineAdapter`, `defineEmitter` and `defineAdapterKit` (from KineoKit) functions to create your own.

## `defineAdapter`

Takes in a function, returns an adapter factory function. You must pass, as generic parameters, your adapter type and the parameters of your function, and as runtime parameters, a function that returns your adapter, which can be asynchronous. Take the Neo4j adapter, for example:

```ts
import { defineAdapter, type Adapter } from "kineo/adapter";

export interface Neo4jAdapter extends Adapter<
  typeof GraphModel,
  neo4j.ResultSummary
> {
  driver: neo4j.Driver;
  session: neo4j.Session;
}

export const neo4jAdapter = defineAdapter<Neo4jAdapter, [Neo4jOpts]>((opts) => {
  /* ... */
});
```

Adapters are always synchronous; `defineAdapter` handles async adapters for you.

## `defineEmitter`

Takes in a function, returns the same function with type definitions. You can also pass a generic parameter for a dialect type.

```ts
import { defineEmitter } from "kineo/adapter";

// Cypher emitter
export const emit = defineEmitter((ir) => {
  /* ... */
});
```

## `defineAdapterKit`

Takes in a function, returns a KineoKit adapter factory. You must pass, as generic parameters, your adapter type and the parameters of your function, and as runtime parameters, a function that returns your adapter, which can be asynchronous.

```ts
export interface Neo4jKit extends AdapterKit {
  driver: Driver;
  session: Session;
}

export const neo4jKit = defineAdapterKit<
  Neo4jKit,
  [Neo4jOpts | Neo4jAdapter | Kineo<any, any>]
>((opts) => {
  /* ... */
});
```

Adapter kits are always synchronous; `defineAdapterKit` handles async adapters for you.
