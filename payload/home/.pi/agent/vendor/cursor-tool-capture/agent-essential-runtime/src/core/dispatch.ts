import type { ToolId, RuntimeContext, ToolResult } from "./types.js";
import { validateToolArgs } from "./validate.js";
import { getHandler } from "./registry.js";
import { fail } from "./errors.js";
import { getToolDefinition } from "./loadManifest.js";

export async function dispatch(
  toolId: ToolId,
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  if (!getToolDefinition(toolId)) {
    return fail("validation_error", `Unknown tool: ${toolId}`);
  }
  const validationError = validateToolArgs(toolId, args);
  if (validationError) {
    return validationError;
  }
  const handler = getHandler(toolId);
  return handler.handle(args, ctx);
}
