import { describe, it, expect, vi, beforeEach } from "vitest";
import { Model } from "@/model";

describe("Model", () => {
  let mockAdapter: any;
  let mockSchema: any;
  let model: Model<any, any>;

  beforeEach(() => {
    mockSchema = {
      $schemas: new Map([
        [
          "id",
          {
            "~standard": {
              validate: vi.fn().mockResolvedValue(true),
            },
          },
        ],
      ]),
    };

    mockAdapter = {
      emit: vi.fn().mockImplementation(async (ir) => ir),
      exec: vi.fn().mockResolvedValue({
        entries: [{ id: 1 }],
        entryCount: 1,
      }),
    };

    model = new Model(mockSchema, "User", mockAdapter);
  });

  it("findFirst executes full pipeline", async () => {
    const result = await model.findFirst({
      where: { id: 1 },
    } as any);

    expect(mockAdapter.emit).toHaveBeenCalled();
    expect(mockAdapter.exec).toHaveBeenCalled();
    expect(result).toEqual({ id: 1 });
  });

  it("count returns entryCount", async () => {
    const result = await model.count({} as any);
    expect(result).toBe(1);
  });

  it("create returns first entry", async () => {
    const result = await model.create({
      data: { id: 1 },
    } as any);

    expect(result).toEqual({ id: 1 });
  });

  it("validates fields via schema", async () => {
    await model.findMany({} as any);

    const validator = mockSchema.$schemas.get("id")["~standard"].validate;

    expect(validator).toHaveBeenCalledWith(1);
  });
});
