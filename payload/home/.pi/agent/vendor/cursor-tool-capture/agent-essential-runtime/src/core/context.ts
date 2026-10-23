import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { RuntimeContext } from "./types.js";

export function createContextFromEnv(
  overrides: Partial<RuntimeContext> = {},
): RuntimeContext {
  const workspaceRoot = resolve(
    overrides.workspaceRoot ??
      process.env.AGENT_ESSENTIAL_WORKSPACE_ROOT ??
      process.cwd(),
  );
  const stateDir = resolve(
    overrides.stateDir ??
      process.env.AGENT_ESSENTIAL_STATE_DIR ??
      joinStateDefault(workspaceRoot),
  );
  mkdirSync(stateDir, { recursive: true });

  const ctx: RuntimeContext = {
    workspaceRoot,
    stateDir,
    allowOutsideWorkspace:
      overrides.allowOutsideWorkspace ??
      process.env.AGENT_ESSENTIAL_ALLOW_OUTSIDE_WORKSPACE === "true",
    fetchMaxBytes:
      overrides.fetchMaxBytes ??
      parseInt(process.env.AGENT_ESSENTIAL_FETCH_MAX_BYTES ?? "2097152", 10),
    fetchTimeoutMs:
      overrides.fetchTimeoutMs ??
      parseInt(process.env.AGENT_ESSENTIAL_FETCH_TIMEOUT_MS ?? "30000", 10),
    searchApiKey:
      overrides.searchApiKey ?? process.env.AGENT_ESSENTIAL_SEARCH_API_KEY,
    searchProvider:
      overrides.searchProvider ??
      process.env.AGENT_ESSENTIAL_SEARCH_PROVIDER ??
      "brave",
    imageApiKey:
      overrides.imageApiKey ?? process.env.AGENT_ESSENTIAL_IMAGE_API_KEY,
    mcpServersJson:
      overrides.mcpServersJson ?? process.env.AGENT_ESSENTIAL_MCP_SERVERS,
    taskExecutorCommand:
      overrides.taskExecutorCommand ??
      process.env.AGENT_ESSENTIAL_TASK_EXECUTOR,
  };
  return ctx;
}

function joinStateDefault(workspaceRoot: string): string {
  return resolve(workspaceRoot, ".agent-essential-state");
}
