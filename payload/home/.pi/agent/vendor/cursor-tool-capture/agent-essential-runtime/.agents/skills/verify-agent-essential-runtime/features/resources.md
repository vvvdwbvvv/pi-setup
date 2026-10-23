# MCP resource fetching

Users read an MCP resource as text or save it to a workspace file.

## Sub-features

- `resource-read` returns a text resource and MIME type from a configured server.
- `resource-download` writes the same resource to a workspace path.
- `resource-missing` reports an error for an unknown URI.
- `resource-sandbox` rejects an outside-workspace download and preserves the target file.

## How to get to it (user POV)

Run `node dist/src/surfaces/cli/main.js call FetchMcpResource '<json>'`, or call `essential_FetchMcpResource` through MCP. Provide the configured server name and resource URI. Add `downloadPath` to save the resource.

## Driving it with verify.mjs

- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs resources cli`.
- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs resources mcp` for the outer MCP entry point.
- The verifier configures `AGENT_ESSENTIAL_MCP_SERVERS` with a local SDK stdio fixture. The fixture writes receipts outside protocol stdout.
- Read `fixture://proof`. Require contents `Resource fixture proof\n` and MIME type `text/plain`.
- Save the resource to `downloads/proof.txt`. Read the file independently and require the exact fixture bytes.
- Request `fixture://missing` and require `execution_failed`.
- Seed an outside-workspace file, request a download to its path, require `security_denied`, and compare its contents afterward.
- Inspect `resource-receipts.jsonl`, `resource-results.json`, `transcript.json`, and `report.json` after cleanup.

## Gotchas

- The external resource server is a real local MCP process. It is a fixture for the configured production boundary.
- The handler reads the resource before it validates the optional download path. The denied-path case therefore records a resource read while preserving the outside file.
- This recipe does not verify a user's configured remote MCP server.
