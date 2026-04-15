import { describe, it, expect, beforeEach } from "vitest";
import type { RuntimeAdapter } from "@/adapter";
import {
  type ParsedSchema,
  type ParsedModel,
  model,
  type InferModel,
} from "@/schema";
import { Model } from "@/runtime/model";

// Mock adapter for testing
class MockAdapter implements RuntimeAdapter {
  async exec() {
    return { rows: [], rowCount: 0 };
  }

  async close() {
    // noop
  }

  async emit() {
    return { command: "SELECT 1", params: [] };
  }
}

// Mock schema and shape for testing
const createMockSchema = (): ParsedSchema => ({
  models: new Map(),
});

const createMockModel = (): ParsedModel => ({
  name: "User",
  key: "user",
  fields: new Map(),
  relations: new Map(),
  indexes: new Map(),
});

// Test data type
// eslint-disable-next-line -- it's better to create a model and use typeof
const user = model("User", (s) => ({
  id: s.int().id(),
  name: s.string().unique().required(),
  email: s.string().unique().required(),
  age: s.int(),
  createdAt: s.datetime().required(),
}));

type User = InferModel<typeof user>;
type UserInput = InferModel<typeof user, true>;

describe("Model", () => {
  let model: Model<any, User, UserInput>;
  let adapter: MockAdapter;
  let schema: ParsedSchema;
  let shape: ParsedModel;

  beforeEach(() => {
    adapter = new MockAdapter();
    schema = createMockSchema();
    shape = createMockModel();
    model = new Model(schema, shape, "User", adapter);
  });

  describe("find", () => {
    it("should find a single record without options", async () => {
      const result = await model.find();
      expect(result).toBeDefined();
    });

    it("should find a single record with where clause", async () => {
      const result = await model.find({
        where: { id: 1 },
      });
      expect(result).toBeDefined();
    });

    it("should find a record with select", async () => {
      const result = await model.find({
        where: { id: 1 },
        select: { id: true, name: true },
      });
      expect(result).toBeDefined();
    });

    it("should find a record with orderBy", async () => {
      const result = await model.find({
        orderBy: { name: "asc" },
      });
      expect(result).toBeDefined();
    });

    it("should find a record with skip and take", async () => {
      const result = await model.find({
        skip: 0,
        take: 10,
      });
      expect(result).toBeDefined();
    });

    it("should find a record with complex where conditions", async () => {
      const result = await model.find({
        where: {
          AND: [{ name: "John" }, { age: { gte: 18 } }],
        },
      });
      expect(result).toBeDefined();
    });
  });

  describe("findMany", () => {
    it("should find multiple records without options", async () => {
      const results = await model.findMany();
      expect(Array.isArray(results)).toBe(true);
    });

    it("should find multiple records with where clause", async () => {
      const results = await model.findMany({
        where: { age: { gte: 18 } },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should find multiple records with select", async () => {
      const results = await model.findMany({
        select: { id: true, name: true },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should find records with pagination", async () => {
      const results = await model.findMany({
        skip: 0,
        take: 10,
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should find records with orderBy (single)", async () => {
      const results = await model.findMany({
        orderBy: { name: "asc" },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should find records with orderBy (multiple)", async () => {
      const results = await model.findMany({
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should find records with distinct", async () => {
      const results = await model.findMany({
        distinct: ["name"],
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("create", () => {
    it("should create a single record", async () => {
      const result = await model.create({
        data: { name: "John", email: "john@example.com" },
      });
      expect(result).toBeDefined();
    });

    it("should create a record with select", async () => {
      const result = await model.create({
        data: { name: "Jane", email: "jane@example.com", age: 25 },
        select: { id: true, name: true },
      });
      expect(result).toBeDefined();
    });

    it("should create a record with optional fields", async () => {
      const result = await model.create({
        data: { name: "Bob", email: "bob@example.com", age: 30 },
      });
      expect(result).toBeDefined();
    });
  });

  describe("createMany", () => {
    it("should create multiple records", async () => {
      const results = await model.createMany({
        data: [
          { name: "User1", email: "user1@example.com" },
          { name: "User2", email: "user2@example.com" },
          { name: "User3", email: "user3@example.com" },
        ],
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should create multiple records with select", async () => {
      const results = await model.createMany({
        data: [
          { name: "Alice", email: "alice@example.com" },
          { name: "Bob", email: "bob@example.com" },
        ],
        select: { id: true, name: true },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should create records with mixed optional fields", async () => {
      const results = await model.createMany({
        data: [
          { name: "User1", email: "user1@example.com", age: 25 },
          { name: "User2", email: "user2@example.com" },
          { name: "User3", email: "user3@example.com", age: 35 },
        ],
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("createReturn", () => {
    it("should create and return a single record", async () => {
      const result = await model.createReturn({
        data: { name: "John", email: "john@example.com" },
      });
      expect(result).toBeDefined();
    });

    it("should create and return record with selected fields", async () => {
      const result = await model.createReturn({
        data: { name: "Jane", email: "jane@example.com" },
        select: { id: true, name: true },
      });
      expect(result).toBeDefined();
    });
  });

  describe("createManyReturn", () => {
    it("should create and return multiple records", async () => {
      const results = await model.createManyReturn({
        data: [
          { name: "User1", email: "user1@example.com" },
          { name: "User2", email: "user2@example.com" },
        ],
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should create and return multiple records with selection", async () => {
      const results = await model.createManyReturn({
        data: [
          { name: "Alice", email: "alice@example.com" },
          { name: "Bob", email: "bob@example.com" },
        ],
        select: { id: true, name: true, email: true },
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("update", () => {
    it("should update a single record", async () => {
      const result = await model.update({
        where: { id: 1 },
        data: { name: "Updated Name" },
      });
      expect(result).toBeDefined();
    });

    it("should update with complex where clause", async () => {
      const result = await model.update({
        where: { email: "john@example.com" },
        data: { age: 26 },
      });
      expect(result).toBeDefined();
    });

    it("should update with select", async () => {
      const result = await model.update({
        where: { id: 1 },
        data: { name: "New Name", age: 28 },
        select: { id: true, name: true, age: true },
      });
      expect(result).toBeDefined();
    });

    it("should update with field operations", async () => {
      const result = await model.update({
        where: { id: 1 },
        data: { age: { increment: 1 } },
      });
      expect(result).toBeDefined();
    });
  });

  describe("updateMany", () => {
    it("should update multiple records", async () => {
      const results = await model.updateMany({
        where: { age: { gte: 18 } },
        data: { name: "Adult" },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should update multiple with select", async () => {
      const results = await model.updateMany({
        where: { email: { contains: "@example.com" } },
        data: { age: 30 },
        select: { id: true, email: true },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should update multiple with complex where", async () => {
      const results = await model.updateMany({
        where: {
          AND: [{ age: { lt: 18 } }, { name: { startsWith: "User" } }],
        },
        data: { age: 18 },
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("updateReturn", () => {
    it("should update and return a single record", async () => {
      const result = await model.updateReturn({
        where: { id: 1 },
        data: { name: "Updated" },
      });
      expect(result).toBeDefined();
    });

    it("should update and return with field selection", async () => {
      const result = await model.updateReturn({
        where: { id: 1 },
        data: { age: { increment: 5 } },
        select: { id: true, age: true },
      });
      expect(result).toBeDefined();
    });
  });

  describe("updateManyReturn", () => {
    it("should update and return multiple records", async () => {
      const results = await model.updateManyReturn({
        where: { age: { gte: 21 } },
        data: { name: "Adult User" },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should update multiple and return selected fields", async () => {
      const results = await model.updateManyReturn({
        where: { createdAt: { lt: new Date("2023-01-01") } },
        data: { name: "Legacy User" },
        select: { id: true, name: true, createdAt: true },
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("upsert", () => {
    it("should upsert a single record (create path)", async () => {
      const result = await model.upsert({
        where: { id: 999 },
        create: { name: "New User", email: "new@example.com" },
        update: { name: "Updated User" },
      });
      expect(result).toBeDefined();
    });

    it("should upsert with select", async () => {
      const result = await model.upsert({
        where: { email: "user@example.com" },
        create: { name: "User", email: "user@example.com" },
        update: { age: 30 },
        select: { id: true, name: true, email: true },
      });
      expect(result).toBeDefined();
    });
  });

  describe("upsertMany", () => {
    it("should upsert multiple records", async () => {
      const results = await model.upsertMany({
        where: [{ id: 1 }, { id: 2 }],
        create: [
          { name: "User1", email: "user1@example.com" },
          { name: "User2", email: "user2@example.com" },
        ],
        update: { name: "Updated" },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should upsert multiple with select", async () => {
      const results = await model.upsertMany({
        where: [
          { email: "existing@example.com" },
          { email: "new@example.com" },
        ],
        create: [
          { name: "New User 1", email: "new@example.com" },
          { name: "New User 2", email: "new2@example.com" },
        ],
        update: { name: "Updated User" },
        select: { id: true, email: true },
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("delete", () => {
    it("should delete a single record", async () => {
      const result = await model.delete({
        where: { id: 1 },
      });
      expect(result).toBeDefined();
    });

    it("should delete with select", async () => {
      const result = await model.delete({
        where: { email: "user@example.com" },
        select: { id: true, name: true },
      });
      expect(result).toBeDefined();
    });

    it("should delete with complex where", async () => {
      const result = await model.delete({
        where: {
          OR: [{ age: { lt: 18 } }, { name: { equals: "DeleteMe" } }],
        },
      });
      expect(result).toBeDefined();
    });
  });

  describe("deleteMany", () => {
    it("should delete multiple records", async () => {
      const results = await model.deleteMany({
        where: { age: { lt: 18 } },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should delete multiple with select", async () => {
      const results = await model.deleteMany({
        where: { email: { endsWith: "@temp.com" } },
        select: { id: true, email: true },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should delete multiple with complex conditions", async () => {
      const results = await model.deleteMany({
        where: {
          AND: [
            { createdAt: { lt: new Date("2020-01-01") } },
            { age: undefined },
          ],
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("count", () => {
    it("should count all records", async () => {
      const count = await model.count();
      expect(typeof count).toBe("number");
    });

    it("should count with where clause", async () => {
      const count = await model.count({
        where: { age: { gte: 18 } },
      });
      expect(typeof count).toBe("number");
    });

    it("should count with complex conditions", async () => {
      const count = await model.count({
        where: {
          AND: [{ name: { startsWith: "A" } }, { age: { gte: 18, lte: 65 } }],
        },
      });
      expect(typeof count).toBe("number");
    });

    it("should count with skip and take", async () => {
      const count = await model.count({
        skip: 10,
        take: 20,
      });
      expect(typeof count).toBe("number");
    });
  });

  describe("aggregate", () => {
    it("should aggregate with count", async () => {
      const result = await model.aggregate({
        _count: true,
      });
      expect(result).toBeDefined();
      expect(typeof result._count).toBe("number");
    });

    it("should aggregate with count select", async () => {
      const result = await model.aggregate({
        _count: {
          select: { id: true, name: true },
        },
      });
      expect(result).toBeDefined();
      expect(result._count).toBeDefined();
    });

    it("should aggregate with min and max", async () => {
      const result = await model.aggregate({
        _min: { select: { age: true, createdAt: true } },
        _max: { select: { age: true, createdAt: true } },
      });
      expect(result).toBeDefined();
    });

    it("should aggregate with sum and avg", async () => {
      const result = await model.aggregate({
        _sum: { select: { age: true } },
        _avg: { select: { age: true } },
      });
      expect(result).toBeDefined();
    });

    it("should aggregate with where clause", async () => {
      const result = await model.aggregate({
        where: { age: { gte: 18 } },
        _count: true,
        _avg: { select: { age: true } },
      });
      expect(result).toBeDefined();
    });

    it("should aggregate with group by", async () => {
      const result = await model.aggregate({
        by: ["name"],
        _count: true,
      });
      expect(result).toBeDefined();
    });

    it("should aggregate with orderBy and pagination", async () => {
      const result = await model.aggregate({
        _count: true,
        orderBy: { _count: "desc" },
        take: 10,
        skip: 0,
      });
      expect(result).toBeDefined();
    });
  });

  describe("groupBy", () => {
    it("should group by a single field", async () => {
      const results = await model.groupBy({
        by: ["name"],
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should group by multiple fields", async () => {
      const results = await model.groupBy({
        by: ["name", "email"],
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should group by with where clause", async () => {
      const results = await model.groupBy({
        by: ["age"],
        where: { age: { gte: 18 } },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should group by with count", async () => {
      const results = await model.groupBy({
        by: ["name"],
        having: { _count: { gte: 2 } },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should group by with orderBy", async () => {
      const results = await model.groupBy({
        by: ["name"],
        orderBy: { name: "asc" },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should group by with pagination", async () => {
      const results = await model.groupBy({
        by: ["name"],
        skip: 0,
        take: 10,
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should group by with complex having conditions", async () => {
      const results = await model.groupBy({
        by: ["age"],
        having: { age: { gte: 18, lt: 65 } },
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("Model constructor", () => {
    it("should initialize with schema, shape, name, and adapter", () => {
      expect(model.$schema).toBe(schema);
      expect(model.$shape).toBe(shape);
      expect(model.$name).toBe("User");
      expect(model.$adapter).toBe(adapter);
    });

    it("should be instantiable with different names", () => {
      const postModel = new Model(schema, shape, "Post", adapter);
      expect(postModel.$name).toBe("Post");
    });
  });
});
