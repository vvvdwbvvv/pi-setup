import { dispatch } from "./core/dispatch.js";
import { createContextFromEnv } from "./core/context.js";
import { listToolDefinitions } from "./core/loadManifest.js";
import type { RuntimeContext, ToolId, ToolResult, ToolDefinition } from "./core/types.js";

export type { RuntimeContext, ToolId, ToolResult, ToolDefinition, Parity, TodoItem } from "./core/types.js";

export function createRuntime(config: Partial<RuntimeContext> = {}): {
  call(toolId: ToolId, args: unknown): Promise<ToolResult>;
  listTools(): ReadonlyArray<ToolDefinition>;
  context: RuntimeContext;
} {
  const context = createContextFromEnv(config);
  return {
    context,
    listTools: listToolDefinitions,
    call: (toolId, args) => dispatch(toolId, args, context),
  };
}

export { createContextFromEnv, dispatch, listToolDefinitions };
