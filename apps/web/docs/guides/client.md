---
sidebar_position: 3
---

# The Kineo client

The Kineo client is a simple wrapper that gives you access to your models and their functions in a type-safe way, and the models access to your adapter. You can create a client using the `kineo` function.

```ts
import { kineo } from "kineo";
```

The `kineo` function takes in two parameters: an [adapter](/docs/guides/adapters), and a [schema](/docs/guides/schema). Kineo creates a new model instance for each model definition from your schema.

```ts
const schema = defineSchema({
  users: model("User", {
    username: field.string(),
  }),
});

const db = kineo(mockAdapter(), schema);

db.users;
```

You can access these model instances by using the same key you used in your schema.

## Model instances

Model instances are what you pass your queries to. The client simply holds the instance. There are two main model instance types: the **Model** and the **GraphModel**. The _GraphModel_ is simply an extension of the base _Model_ with more functions specific to graph databases.

### _Model_ functions

- **findFirst**: Finds the first element in the database that matches a filter.
- **findMany**: Finds all elements up to a point in the database that match a filter.
- **count**: Counts the amount of elements that match a filter.
- **create**: Creates a new element in the database.
- **update**: Updates a single element in the database.
- **updateMany**: Updates many elements in the database.
- **delete**: Deletes a single element in the database.
- **deleteMany**: Deletes many elements in the database.
- **upsert**: Updates a single element if it exists; otherwise, create it.
- **upsertMany**: Updates many elements if they exist; otherwise, create them.

### _GraphModel_ functions

All of the above, plus:

- **findPath**: Find a path that matches a filter.
- **findShortestPath**: Finds the shortest path that matches a filter.
- **findAllPaths**: Finds all paths that match a filter.
- **findNeighbors**: Finds nodes that are connected directly to a node that matches a filter.
- **connect**: Connects two nodes.
- **disconnect**: Disconnects two nodes.
- **traverse**: Traverses the graph.
