import { randomUUID } from "node:crypto";
import type { RuntimeContext, ToolResult } from "../core/types.js";
import { ok } from "../core/errors.js";
import { readGoal, writeGoal } from "../infra/stateStore.js";

export async function handleCreateGoal(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const { objective } = args as { objective: string };
  const goal = {
    goalId: randomUUID(),
    objective,
    status: "active" as const,
  };
  writeGoal(ctx, goal);
  return ok(goal);
}

export async function handleUpdateGoal(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const { status } = args as { status: "active" | "complete" };
  const goal = readGoal(ctx);
  if (!goal) {
    return { ok: false, code: "not_found", message: "No active goal exists" };
  }
  const updated = { ...goal, status };
  writeGoal(ctx, updated);
  return ok({ status: updated.status, goalId: updated.goalId });
}
