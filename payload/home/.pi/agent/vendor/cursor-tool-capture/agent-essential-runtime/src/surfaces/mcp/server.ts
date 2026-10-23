import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createRuntime } from "../../index.js";
import { mcpNameToToolId } from "../../core/loadManifest.js";

export async function runMcpServer(): Promise<void> {
  const runtime = createRuntime();
  const server = new Server(
    { name: "agent-essential", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: runtime.listTools().map((t) => ({
      name: t.mcpName,
      description: `[${t.parity}] ${t.description.slice(0, 500)}`,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolId = mcpNameToToolId(request.params.name);
    if (!toolId) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: false,
              code: "validation_error",
              message: `Unknown MCP tool: ${request.params.name}`,
            }),
          },
        ],
        isError: true,
      };
    }
    const result = await runtime.call(
      toolId,
      request.params.arguments ?? {},
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
