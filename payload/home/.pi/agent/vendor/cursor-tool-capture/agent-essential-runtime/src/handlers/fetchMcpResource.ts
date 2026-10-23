import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { RuntimeContext, ToolResult } from "../core/types.js";
import { fail, ok } from "../core/errors.js";
import { readMcpResource } from "../infra/mcpClient.js";
import { resolveWorkspacePath } from "../infra/paths.js";

export async function handleFetchMcpResource(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const input = args as {
    server: string;
    uri: string;
    downloadPath?: string;
  };
  if (!ctx.mcpServersJson) {
    return fail(
      "not_configured",
      "Set AGENT_ESSENTIAL_MCP_SERVERS JSON to enable FetchMcpResource",
    );
  }
  try {
    const resource = await readMcpResource(ctx, input.server, input.uri);
    if (input.downloadPath) {
      const resolved = resolveWorkspacePath(ctx, input.downloadPath);
      if (!resolved.ok) {
        return resolved.result;
      }
      mkdirSync(dirname(resolved.path), { recursive: true });
      const text =
        typeof resource.contents === "string"
          ? resource.contents
          : JSON.stringify(resource.contents);
      writeFileSync(resolved.path, text, "utf8");
      return ok({ savedPath: resolved.path });
    }
    return ok({
      contents: resource.contents,
      mimeType: resource.mimeType,
    });
  } catch (err) {
    return fail("execution_failed", "MCP resource read failed", {
      error: String(err),
    });
  }
}
