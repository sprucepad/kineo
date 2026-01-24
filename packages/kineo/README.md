# Kineo

Object-Relation/Graph Mapper (ORM/OGM) for TypeScript.

# Usage

**Install Kineo.** Run one of these commands to install Kineo as a dependency:

```sh
npm install kineo
yarn add kineo
pnpm add kineo
bun add kineo
```

**Define a schema.** This schema can be anywhere in your codebase, as long as you can reference it.

```ts
import { defineSchema, model, field, relation, type InferSchema } from "kineo";

export const schema = defineSchema({
  users: model("User", {
    name: field.string().id(),
    password: field.string().required(),
    posts: relation.to("Post").outgoing("HAS_POST").array(),
  }),

  posts: model("Post", {
    id: field.string().id(),
    title: field.string().required(),
    author: relation.to("User").incoming("HAS_POST"),
  }),
});

export type Schema = InferSchema<typeof schema>;
```

**Create a client.** Use an adapter, which is the set of functions that converts Kineo's representation to your database's query language. Here, we use the Neo4j adapter, which requires you to install `neo4j-driver` as a dependency.

```ts
import { kineo } from "kineo";
import { neo4jAdapter } from "kineo/adapters/neo4j";

export const db = kineo(
  neo4jAdapter({
    url: "bolt://localhost:7687",
    auth: {
      username: "neo4j",
      password: "password",
    },
  }),
  schema,
);
```

Different adapters will have different parameters.

**Query your database.** Kineo uses objects for querying.

```ts
const user = await db.users.findFirst({
  where: {
    name: {
      startsWith: "a",
      not: {
        endsWith: "z",
      },
    },
    AND: [
      {
        password: {
          contains: "secure",
        },
      },
    ],
  },
  include: {
    posts: true,
  },
});
```

## Migrations

Kineo also has a migration manager, as a separate package.

```sh
npm install kineokit
yarn add kineokit
pnpm add kineokit
bun add kineokit
```

After installing, run one of these commands to initialize your configuration file.

```sh
npx kineokit init
yarn kineokit init
pnpm kineokit init
bunx kineokit init
```

### Manual setup

Create a `kineo.config.ts` at the root of your project, and paste these contents:

```ts
import { defineConfig } from "kineokit";
import { neo4jKit } from "kineokit/adapters/neo4j"; // replace this with the adapter you're using

import { schema } from "<your schema path>";
import { client } from "<your client path>";

export default defineConfig({
  adapter: neo4jKit(client),
  schema: schema,
  client: client,
  migrations: "./migrations",
});
```

Replace `<your schema path>` and `{ schema }` with your schema file path and export name, and do the same for the client.

# License information

Kineo uses the MIT License. See [LICENSE](LICENSE) for more details.
