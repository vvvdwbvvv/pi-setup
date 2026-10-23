import type { RuntimeContext, ToolResult } from "../core/types.js";
import { fail, ok } from "../core/errors.js";
import { readSession, writeSession } from "../infra/stateStore.js";

export async function handleSwitchMode(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const { target_mode_id } = args as {
    target_mode_id: string;
    explanation?: string;
  };
  if (target_mode_id !== "plan" && target_mode_id !== "agent") {
    return fail("validation_error", "target_mode_id must be plan or agent");
  }
  const previous = readSession(ctx);
  writeSession(ctx, { mode: target_mode_id });
  return ok({
    mode: target_mode_id,
    previous: previous.mode,
    note: "Session flag only; does not change host IDE mode",
  });
}
