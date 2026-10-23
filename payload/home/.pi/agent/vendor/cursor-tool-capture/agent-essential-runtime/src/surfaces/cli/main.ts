#!/usr/bin/env node
import { createRuntime } from "../../index.js";
import type { ToolId } from "../../core/types.js";
import { runMcpServer } from "../mcp/server.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    printHelp();
    process.exit(0);
  }

  if (cmd === "mcp") {
    await runMcpServer();
    return;
  }

  const runtime = createRuntime();

  if (cmd === "list") {
    console.log(JSON.stringify(runtime.listTools(), null, 2));
    return;
  }

  if (cmd === "call") {
    const toolId = argv[1] as ToolId | undefined;
    const jsonArg = argv[2];
    if (!toolId || !jsonArg) {
      console.error("Usage: agent-essential call <ToolId> '<json>'");
      process.exit(1);
    }
    let args: unknown;
    try {
      args = JSON.parse(jsonArg);
    } catch {
      console.error("Invalid JSON for tool arguments");
      process.exit(1);
    }
    const result = await runtime.call(toolId, args);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}

function printHelp(): void {
  console.log(`agent-essential-runtime

Commands:
  mcp                    Start MCP server (stdio)
  list                   List tools and schemas
  call <ToolId> '<json>' Invoke a tool
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
