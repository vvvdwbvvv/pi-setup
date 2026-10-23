import type { RuntimeContext, ToolResult } from "../core/types.js";
import { fail } from "../core/errors.js";
import type { Parity, ToolId } from "../core/types.js";
import { getToolDefinition } from "../core/loadManifest.js";

export function stubHandler(toolId: ToolId): (
  _args: unknown,
  _ctx: RuntimeContext,
) => Promise<ToolResult> {
  return async () => {
    const def = getToolDefinition(toolId);
    const parity: Parity = def?.parity ?? "unsupported";
    if (parity === "unsupported") {
      return fail(
        "unsupported",
        `${toolId} requires host capabilities not available in standalone runtime.`,
      );
    }
    return fail(
      "not_implemented",
      `${toolId} is not yet implemented in this runtime build.`,
    );
  };
}
