import type {
  FieldChange,
  MigrationOp,
  RelationChange,
  SchemaDiff,
} from "@/schema";

export type BreakingLevel = "safe" | "breaking" | "destructive";

export function hasBreakingChanges(
  diff: SchemaDiff | BreakingChange[],
  level: BreakingLevel = "destructive",
): boolean {
  return (Array.isArray(diff) ? diff : getBreakingChanges(diff)).some(
    (change) => change.levels.some((l) => l === level),
  );
}

export interface BreakingChange {
  levels: BreakingLevel[];
  kind: Extract<MigrationOp["kind"], string>;
}

export function getBreakingChanges(diff: SchemaDiff): BreakingChange[] {
  return diff.operations.map(getBreakingLevels);
}

function getBreakingLevels(op: MigrationOp): BreakingChange {
  switch (op.kind) {
    case "create_model":
      return { levels: ["safe"], kind: op.kind };

    case "drop_model":
      return { levels: ["destructive"], kind: op.kind };

    case "add_field":
      // adding required fields can break existing records
      return {
        levels: [op.field.required ? "breaking" : "safe"],
        kind: op.kind,
      };

    case "drop_field":
      return { levels: ["destructive"], kind: op.kind };

    case "alter_field":
      return { levels: op.changes.map(getFieldChangeLevel), kind: op.kind };

    case "add_relation":
      return { levels: ["safe"], kind: op.kind };

    case "drop_relation":
      return { levels: ["destructive"], kind: op.kind };

    case "alter_relation":
      return { levels: op.changes.map(getRelationChangeLevel), kind: op.kind };

    case "add_index":
    case "drop_index":
    case "alter_index":
      return { levels: ["safe"], kind: op.kind };

    default: {
      const exhaustive: never = op;
      return exhaustive;
    }
  }
}

function getFieldChangeLevel(change: FieldChange): BreakingLevel {
  switch (change.kind) {
    case "type":
      return "breaking";

    case "required":
      // optional -> required
      return !change.from && change.to ? "breaking" : "safe";

    case "many":
      return change.from !== change.to ? "breaking" : "safe";

    case "id":
      return change.from !== change.to ? "breaking" : "safe";

    case "validator":
      // impossible to safely determine compatibility
      return "safe";

    default: {
      const exhaustive: never = change;
      return exhaustive;
    }
  }
}

function getRelationChangeLevel(change: RelationChange): BreakingLevel {
  switch (change.kind) {
    case "target":
      return "breaking";

    case "cardinality":
      return change.from !== change.to ? "breaking" : "safe";

    case "virtual":
      return change.from !== change.to ? "breaking" : "safe";

    case "fields":
      return "breaking";

    case "refs":
      return "breaking";

    default: {
      const exhaustive: never = change;
      return exhaustive;
    }
  }
}
