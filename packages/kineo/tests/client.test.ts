import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { kineo } from "@/client";
import { ModelDef } from "@/schema/model";
import type { Adapter } from "@/adapter";
import { Model } from "@/model";

describe("kineo()", () => {
  class MockModel extends Model<any, any> {}

  let ModelSpy: Mock<typeof MockModel>;
  let adapter: Adapter<typeof ModelSpy>;

  beforeEach(() => {
    ModelSpy = vi.fn(MockModel);
    adapter = {
      Model: ModelSpy,
      emit: vi.fn(),
      exec: vi.fn(),
      close: vi.fn(),
    };
  });

  it("creates a model instance for each schema entry", () => {
    const userDef = new ModelDef({});
    const postDef = new ModelDef({});

    const schema = {
      user: userDef,
      post: postDef,
    };

    const client = kineo(adapter, schema);

    expect(ModelSpy).toHaveBeenCalledTimes(2);

    expect(client.user).toBeInstanceOf(ModelSpy);
    expect(client.post).toBeInstanceOf(ModelSpy);
  });

  it("calls update before instantiating models", () => {
    const userDef = new ModelDef({});
    const updateSpy = vi.spyOn(userDef, "update");

    class MockModel extends Model<any, any> {
      constructor(def: any, name: any, adapter: any) {
        super(def, name, adapter);
        expect(updateSpy).toHaveBeenCalled();
      }
    }
    const ModelSpy = vi.fn(MockModel);

    const adapter: Adapter<typeof ModelSpy, any> = {
      Model: ModelSpy,
      emit: vi.fn(),
      exec: vi.fn(),
      close: vi.fn(),
    };

    kineo(adapter, { user: userDef });
  });

  it("passes modelDef, resolved name, and adapter to Model constructor", () => {
    const userDef = new ModelDef({});

    const schema = { user: userDef };

    kineo(adapter, schema);

    expect(ModelSpy).toHaveBeenCalledWith(
      userDef,
      "user", // fallback to key
      adapter,
    );
  });

  it("uses ModelDef.$name if defined instead of schema key", () => {
    const userDef = new ModelDef({}, "CustomUserName");

    const schema = { user: userDef };

    kineo(adapter, schema);

    expect(ModelSpy).toHaveBeenCalledWith(userDef, "CustomUserName", adapter);
  });

  it("returns $adapter and $schema on the client", () => {
    const userDef = new ModelDef({});
    const schema = { user: userDef };

    const client = kineo(adapter, schema);

    expect(client.$adapter).toBe(adapter);
    expect(client.$schema).toBe(schema);
  });

  it("does not mutate the original schema object", () => {
    const userDef = new ModelDef({});
    const schema = { user: userDef };

    const originalKeys = Object.keys(schema);

    kineo(adapter, schema);

    expect(Object.keys(schema)).toEqual(originalKeys);
    expect(schema.user).toBe(userDef);
  });

  it("returns distinct model instances for different keys", () => {
    const userDef = new ModelDef({});
    const postDef = new ModelDef({});

    const schema = { user: userDef, post: postDef };

    const client = kineo(adapter, schema);

    expect(client.user).not.toBe(client.post);
  });
});
