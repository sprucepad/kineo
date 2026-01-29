---
sidebar_position: 2
---

# Schema definition

Schemas are essential to Kineo. They're how you get type definitions for your models and your code, and they allow you to create indexes or uniqueness constraints. To define a schema, you can use the `defineSchema`, `model`, `field` and `relation` helpers.

```ts
import { defineSchema, model, field, relation } from "kineo";

export const schema = defineSchema({
  users: model("User", {
    id: field.string().id(),
    username: field.string(),
    posts: relation.to("posts").array(),
  }),
  posts: model("Post", {
    id: field.string().id(),
    author: relation.to("author").required(),
  }),
});
```

:::info
You can also extract TypeScript definitions from your schema, by using the `InferSchema`, `InferModelDef` and `InferModelShape` helpers.

```ts
import type { InferSchema, InferModelDef, InferModelShape } from "kineo";

type Schema = InferSchema<typeof schema>;
//   ^ {
//       users: {
//         id: string,
//         username: string | undefined,
//         posts: Post[],
//       },
//       posts: { id: string, author: User },
//     }

type User = InferModelDef<typeof schema.users>;
//   ^ { id: string, username: string | undefined, posts: unknown[] }

type User2 = InferModelShape<typeof schema.users.$shape>;
//   ^ { id: string, username: string | undefined, posts: unknown[] }
```

:::

## `relation`

The `relation` helper contains a single function: `to`, which defines a relationship to another model, taking in the model key and, optionally, an override for the row name.

:::note
Currently, relationships are not type-safe during schema definition. We're working on it, and they are fully type-safe on clients and after schema definition!
:::

Relationship definitions have the following metadata functions:

- `name(string?)`: Sets the row name.
- `label(string)`: Sets a relationship label. Useful for graph databases.
- `direction("incoming" | "outgoing" | "both")`: Sets the relationship. Useful for graph databases.
- `outgoing(string?)`: Sets the relationship direction to outgoing, and, optionally, sets a label.
- `incoming(string?)`: Sets the relationship direction to incoming, and, optionally, sets a label.
- `both(string?)`: Sets the relationship direction to both, and, optionally, sets a label.
- `default(T)`: Adds a default value to the relationship.
- `required()`: Sets the relationship as required.
- `optional()`: Sets the relationship as optional.
- `array()`: Sets the relationship as an array.
- `single()`: Sets the relationship as not an array.
- `index(string)`: Creates an index on this relationship.
- `unique()`: Creates a unique constraint on this relationship.
- `common()`: Disables the unique constraint.
- `validate(StandardSchemaV1)`: Adds a Standard Schema validator.

## `field`

The `field` helper contains several functions for all types Kineo supports. All of them take a single optional parameter: an override for the row name.

- `.string`: A string.
- `.char`: A single character.
- `.int`: An integer.
- `.bigint`: A `bigint`.
- `.float`: A floating point number.
- `.date`: A date.
- `.time`: A time.
- `.datetime`: A date and time.
- `.timestamp`: A timestamp.
- `.bool`/`.boolean`: A boolean.

Field definitions have similar metadata functions to relationship definitions

- `name(string?)`: Sets the row name.
- `id()`: Sets this field as the identifier, or primary key.
- `required()`: Sets the field as required.
- `optional()`: Sets the field as optional.
- `array()`: Sets the field as an array.
- `single()`: Sets the field as not an array.
- `index(string)`: Creates an index on this field.
- `unique()`: Creates a unique constraint on this field.
- `common()`: Disables the unique constraint.
- `validate(StandardSchemaV1)`: Adds a Standard Schema validator.
