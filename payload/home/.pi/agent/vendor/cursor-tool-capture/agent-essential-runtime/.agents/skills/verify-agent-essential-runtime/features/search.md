# Web search

Users send a search term to the configured Brave-compatible request path and receive mapped result titles, URLs, and snippets.

## Sub-features

- `search-mapping` maps titles, URLs, and descriptions into results.
- `search-empty-snippet` maps a missing description to an empty snippet.
- `search-provider-error` returns `execution_failed` for a provider error response.

## How to get to it (user POV)

Run `node dist/src/surfaces/cli/main.js call WebSearch '{"search_term":"..."}'`, or call `essential_WebSearch` through MCP.

## Driving it with verify.mjs

- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs search cli`.
- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs search mcp` for MCP.
- The helper supplies a synthetic key and installs a child-only fetch preload. It routes only the exact Brave search endpoint to its local HTTP fixture and blocks other external fetch requests.
- Search for `fixture guide`. Require two exact results. The second result must have an empty snippet because its fixture omits `description`.
- Search for `fail fixture`. Require `execution_failed` from the fixture's HTTP 503 response.
- Inspect `fetch-receipts.jsonl` to verify the original Brave URL was routed locally. Inspect `http-receipts.jsonl` to verify the query and synthetic token reached only the fixture server.
- Retain `search-results.json`, both request logs, `transcript.json`, and `report.json` after cleanup.

## Gotchas

- The fixture checks request construction and response mapping. It does not contact Brave or prove API credentials.
- The key is synthetic and exists only in the isolated child environment.
- `WebFetch` and `WebSearch` run in separate verifier processes, each with its own local server and request log.
