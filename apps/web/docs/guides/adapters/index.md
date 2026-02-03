---
sidebar_position: 4
---

# Adapters

Adapters are the piece that connects Kineo's client to your database. It defines which emitter to use, how to connect to your database and how to execute queries. They're a simple interface; you define two properties:

- `Model`: A _built-in_ extension of the `Model` class. This is useful for graph databases. _This can not be a custom extension at the moment, so only `Model` and `GraphModel` are accepted. We're working on it!_
- `kit`: A string containing the import path of the KineoKit adapter that goes with this adapter. This is optional.

And 3 methods:

- `emit(ir)`: Compiles an IR to a string and parameters.
- `exec(emitResult)`: Executes an emission result (string and parameters) against your database.
- `close()`: The function to close the database connection. Returns nothing; can be asynchronous.

Adapters can come from anywhere, but Kineo has a few built-in adapters.
