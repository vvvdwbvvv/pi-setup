import type { RuntimeContext, ToolResult } from "../core/types.js";
import { ok } from "../core/errors.js";
import { runLinters } from "../infra/lintRunner.js";

export async function handleReadLints(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const { paths } = (args ?? {}) as { paths?: string[] };
  const result = runLinters(ctx, paths);
  return ok({
    diagnostics: result.diagnostics,
    ...(result.warning ? { warning: result.warning } : {}),
  });
}
