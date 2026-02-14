import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphModel } from "@/model";

describe("GraphModel", () => {
  let graphModel: GraphModel<any, any>;
  let mockAdapter: any;
  let mockSchema: any;

  beforeEach(() => {
    mockSchema = { $schemas: new Map() };

    mockAdapter = {
      emit: vi.fn().mockImplementation(async (ir) => ir),
      exec: vi.fn().mockResolvedValue({
        entries: [{ id: 1 }, { id: 2 }],
        edges: [{ type: "REL", direction: "outgoing" }],
        summary: true,
      }),
    };

    graphModel = new GraphModel(mockSchema, "User", mockAdapter);
  });

  it("findPath returns nodes + edges", async () => {
    const result = await graphModel.findPath({
      from: { where: { id: 1 } },
      to: { where: { id: 2 } },
    } as any);

    expect(result.nodes.length).toBe(2);
    expect(result.edges.length).toBe(1);
  });

  it("connect returns success", async () => {
    const result = await graphModel.connect({
      from: { where: { id: 1 } },
      to: { where: { id: 2 } },
      relation: "FRIEND",
    } as any);

    expect(result.success).toBe(true);
  });

  // TODO fix below
  it("traverse maps edges to nodes", async () => {
    const result = await graphModel.traverse({
      start: { where: { id: 1 } },
    } as any);

    expect(result.path[0]).toHaveProperty("node");
  });
});
