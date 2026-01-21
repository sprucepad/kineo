import type { CleanedWhere, JoinConfig } from "better-auth/adapters";
import * as IR from "kineo/ir";

export interface EmitOpts {
  model: string;
  where?: CleanedWhere[];
  select?: string[];
  limit?: number;
  sortBy?: {
    field: string;
    direction: "asc" | "desc";
  };
  offset?: number;
  data?: Record<string, any>;
  join?: JoinConfig;
}

function emitWhere(where?: CleanedWhere[]): Record<string, any> | undefined {
  if (!where || where.length === 0) return undefined;

  const clauses = where.map((w) => {
    switch (w.operator) {
      case "eq":
        return { [w.field]: w.value };
      case "ne":
        return { [w.field]: { not: w.value } };
      case "in":
        return { [w.field]: { in: w.value } };
      case "not_in":
        return { [w.field]: { notIn: w.value } };
      case "lt":
        return { [w.field]: { lt: w.value } };
      case "lte":
        return { [w.field]: { lte: w.value } };
      case "gt":
        return { [w.field]: { gt: w.value } };
      case "gte":
        return { [w.field]: { gte: w.value } };
      case "contains":
        return { [w.field]: { contains: w.value } };
      default:
        throw new Error(`Unsupported operator: ${w.operator}`);
    }
  });

  return clauses.length === 1 ? clauses[0] : { AND: clauses };
}

function emitJoin(join?: JoinConfig): Record<string, any> | undefined {
  if (!join) return undefined;

  const include: Record<string, any> = {};

  for (const [model, cfg] of Object.entries(join)) {
    include[model] = {
      take: cfg.limit,
    };
  }

  return include;
}

export function emit(mode: string, opts: EmitOpts): IR.IR {
  const where = emitWhere(opts.where);
  const include = emitJoin(opts.join);

  switch (mode) {
    case "findOne":
    case "findMany": {
      return IR.makeIR(
        IR.emitFindStatement(opts.model, {
          where,
          select: opts.select
            ? Object.fromEntries(opts.select.map((f) => [f, true]))
            : undefined,
          include,
          orderBy: opts.sortBy
            ? [{ [opts.sortBy.field]: opts.sortBy.direction }]
            : undefined,
          skip: opts.offset,
          take: opts.limit,
        }),
      );
    }

    case "count": {
      return IR.makeIR(IR.emitCountStatement(opts.model, { where }));
    }

    case "create": {
      return IR.makeIR(
        IR.emitCreateStatement(opts.model, {
          data: opts.data ?? {},
        }),
      );
    }

    case "update":
    case "upsert": {
      return IR.makeIR(
        IR.emitUpsertStatement(opts.model, {
          where: where ?? {},
          create: opts.data ?? {},
          update: opts.data ?? {},
        }),
      );
    }

    case "delete": {
      return IR.makeIR(
        IR.emitDeleteStatement(opts.model, {
          where: where ?? {},
        }),
      );
    }

    default:
      throw new Error(`Unsupported adapter mode: ${mode}`);
  }
}
