import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { RuntimeContext } from "../core/types.js";

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export function parseMcpServers(ctx: RuntimeContext): Record<string, McpServerConfig> {
  if (!ctx.mcpServersJson) {
    return {};
  }
  try {
    return JSON.parse(ctx.mcpServersJson) as Record<string, McpServerConfig>;
  } catch {
    return {};
  }
}

export async function readMcpResource(
  ctx: RuntimeContext,
  serverName: string,
  uri: string,
): Promise<{ contents: unknown; mimeType?: string }> {
  const servers = parseMcpServers(ctx);
  const cfg = servers[serverName];
  if (!cfg) {
    throw new Error(`MCP server not configured: ${serverName}`);
  }
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  if (cfg.env) {
    Object.assign(env, cfg.env);
  }
  const transport = new StdioClientTransport({
    command: cfg.command,
    args: cfg.args ?? [],
    env,
  });
  const client = new Client({ name: "agent-essential-runtime", version: "0.1.0" });
  await client.connect(transport);
  try {
    const result = await client.readResource({ uri });
    const first = result.contents[0];
    if (!first) {
      return { contents: "" };
    }
    if ("text" in first) {
      return { contents: first.text, mimeType: first.mimeType };
    }
    if ("blob" in first) {
      return { contents: first.blob, mimeType: first.mimeType };
    }
    return { contents: first };
  } finally {
    await client.close();
  }
}
