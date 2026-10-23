# Tool discovery

Users inspect available tool IDs, argument schemas, descriptions, and advertised compatibility before calling tools.

## Sub-features

- `discovery-cli`: list the generated contract catalog as JSON.
- `discovery-mcp`: advertise corresponding `essential_` names after an MCP handshake.

## How to get to it (user POV)

- CLI: `node dist/src/surfaces/cli/main.js list`.
- MCP: launch `node dist/src/surfaces/cli/main.js mcp` as a stdio server and request `tools/list` from the host's MCP client.

## Driving it with verify.mjs

Preconditions: Node 20+, installed dependencies, successfully built runtime.

- **CLI:** run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs discovery cli`. The helper runs the exact `list` command and requires exit 0, valid JSON matching `contracts/tools.json`, and `TodoWrite` mapped to `essential_TodoWrite`.
- **MCP:** run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs discovery mcp`. After the same CLI doctor, the SDK launches its own server, initializes the protocol and requests `tools/list`; advertised names must match the CLI catalog in order.
- **Proof:** inspect full returned catalogs in `transcript.json`, runtime identity in `doctor.json`, and `report.json` with `passed:true` and `scratchRemoved:true`. MCP teardown closes only the server transport created by this run.

## Gotchas

- Catalog parity values describe compatibility, not proof that external services are configured or tools execute successfully.
- Doctor compares generated contracts with the build, not with every source file. Rebuild after source changes.
- MCP listings prefix descriptions with parity and truncate them; this recipe compares MCP names, not description equality or complete protocol/schema parity.
- This is a noninteractive JSON CLI. Do not wait for a terminal prompt or HTTP readiness port.
