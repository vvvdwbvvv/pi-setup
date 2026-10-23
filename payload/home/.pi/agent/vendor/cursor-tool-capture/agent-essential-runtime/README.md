# agent-essential-runtime

Standalone TypeScript runtime for cursor-essential tool contracts. MCP and CLI surfaces call a single `dispatch` core.

**Usage manual (繁體中文 how-to):** [docs/usage-manual.md](docs/usage-manual.md)

## Behavioral verification

Use the project-local [verification skill](.agents/skills/verify-agent-essential-runtime/SKILL.md)
for isolated CLI and MCP drives of 12 tools with retained fixture evidence. The skill
excludes `GenerateImage` and states which external service behavior remains unverified.
The [feature map](.agents/skills/verify-agent-essential-runtime/features/README.md)
contains one recipe for each included tool.

After `npm install && npm run build`, run the full matrix:

```sh
node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs all both
```

## Install

```bash
cd agent-essential-runtime
npm install
npm run build
```

## CLI

```bash
npx agent-essential list
npx agent-essential call Delete '{"path":"/absolute/path/to/file"}'
npx agent-essential mcp
```

## MCP config

```json
{
  "mcpServers": {
    "agent-essential": {
      "command": "node",
      "args": ["/path/to/agent-essential-runtime/dist/src/surfaces/cli/main.js", "mcp"],
      "env": {
        "AGENT_ESSENTIAL_WORKSPACE_ROOT": "/path/to/project",
        "AGENT_ESSENTIAL_STATE_DIR": "/path/to/state"
      }
    }
  }
}
```

Tool names use the `essential_<ToolId>` prefix (for example `essential_Delete`).

## Environment and parity

See [cursor-essential/docs/runtime.md](../cursor-essential/docs/runtime.md). For step-by-step CLI, MCP, and env setup, use [docs/usage-manual.md](docs/usage-manual.md).
