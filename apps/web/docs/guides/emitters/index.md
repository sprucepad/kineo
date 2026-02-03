---
sidebar_position: 5
---

# Emitters

Emitters transpile your query objects into a string that can be run against your database. Emitters are simply functions, that take in an [IR](../../api/ir) and optionally a [dialect](#dialects), and return a command and parameters.

## Dialects

Dialects can be of any shape. They are passed as the second argument to emitters. They can be defined by passing a generic argument to the `defineEmitter` function (or to the `Emitter` interface).

## Creating your own emitter

To create your own emitter, you can use the `defineEmitter` helper.

```ts
import { defineEmitter } from "kineo";

interface Dialect {
  string(val: string): string;
}

const emit = defineEmitter<Dialect>(async (ir, dialect) => {
  return {
    command: `SELECT id, title, content FROM posts WHERE id = $id`,
    params: { id: 4 },
  };
});
```
