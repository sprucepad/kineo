import { describe, test, expect, vi, beforeEach } from "vitest";
import { kineoAdapter } from "@/index";

// mock emitter and schema
vi.mock("@/emitter", () => ({
  emit: vi.fn(),
}));

vi.mock("@/schema", () => ({
  createSchema: vi.fn(),
}));

import { emit } from "@/emitter";

describe("kineoAdapter", () => {
  let client: any;
  let execResult: any;

  beforeEach(() => {
    execResult = {
      entryCount: 5,
      entries: [{ id: 1 }, { id: 2 }],
    };

    client = {
      $adapter: {
        emit: vi.fn().mockResolvedValue("emitted-ir"),
        exec: vi.fn().mockResolvedValue(execResult),
      },
    };

    (emit as any).mockReturnValue("ir");
  });

  test("creates adapter with correct adapterId", () => {
    const factory = kineoAdapter(client);
    expect(factory({}).id).toBe("@kineojs/better-auth");
  });

  test("count returns entryCount", async () => {
    const adapter = kineoAdapter(client)({});
    const result = await adapter.count({ where: [], model: "user" });

    expect(emit).toHaveBeenCalledWith("count", {
      model: "user",
      where: [],
    });

    expect(client.$adapter.emit).toHaveBeenCalledWith("ir");
    expect(client.$adapter.exec).toHaveBeenCalledWith("emitted-ir");
    expect(result).toBe(5);
  });

  test("create returns first entry", async () => {
    const adapter = kineoAdapter(client)({});
    const result = await adapter.create({ model: "user", data: {} });

    expect(emit).toHaveBeenCalledWith(
      "create",
      expect.objectContaining({
        model: "user",
        data: expect.objectContaining({
          id: expect.any(String),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: "1",
      }),
    );
  });

  test("delete returns first entry", async () => {
    const adapter = kineoAdapter(client)({});

    await adapter.delete({
      model: "user",
      where: [{ field: "id", value: 1 }],
    });

    expect(emit).toHaveBeenLastCalledWith("delete", {
      model: "user",
      where: [
        {
          field: "id",
          value: 1,
          operator: "eq",
          connector: "AND",
        },
      ],
    });
  });

  test("deleteMany returns entries", async () => {
    const adapter = kineoAdapter(client)({});

    const result = await adapter.deleteMany({
      model: "user",
      where: [],
    });

    expect(emit).toHaveBeenLastCalledWith("deleteMany", {
      model: "user",
      where: [],
    });

    expect(result).toEqual(execResult.entryCount);
  });

  test("findOne returns first entry", async () => {
    const adapter = kineoAdapter(client)({});

    const result = await adapter.findOne({
      model: "user",
      where: [{ field: "id", value: 1 }],
    });

    expect(emit).toHaveBeenLastCalledWith("findOne", {
      model: "user",
      where: [
        {
          field: "id",
          value: 1,
          operator: "eq",
          connector: "AND",
        },
      ],
    });

    expect(result).toMatchObject({
      id: "1",
    });
  });

  test("findMany returns entries", async () => {
    const adapter = kineoAdapter(client)({});

    const result = await adapter.findMany({
      model: "user",
      where: [],
    });

    expect(emit).toHaveBeenLastCalledWith("findMany", {
      model: "user",
      where: [],
      limit: 100,
      offset: undefined,
      sortBy: undefined,
      join: undefined,
    });

    expect(result).toEqual([
      expect.objectContaining({ id: "1" }),
      expect.objectContaining({ id: "2" }),
    ]);
  });

  test("update returns first entry", async () => {
    const adapter = kineoAdapter(client)({});

    const result = await adapter.update({
      model: "user",
      where: [{ field: "id", value: 1 }],
      update: {},
    });

    expect(emit).toHaveBeenLastCalledWith(
      "update",
      expect.objectContaining({
        model: "user",
        where: [
          {
            field: "id",
            value: 1,
            operator: "eq",
            connector: "AND",
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      id: "1",
    });
  });

  test("updateMany returns entries", async () => {
    const adapter = kineoAdapter(client)({});

    const result = await adapter.updateMany({
      model: "user",
      where: [],
      update: {},
    });

    expect(emit).toHaveBeenLastCalledWith(
      "updateMany",
      expect.objectContaining({
        model: "user",
        where: [],
        update: expect.any(Object),
      }),
    );

    expect(result).toEqual(execResult.entryCount);
  });
});
