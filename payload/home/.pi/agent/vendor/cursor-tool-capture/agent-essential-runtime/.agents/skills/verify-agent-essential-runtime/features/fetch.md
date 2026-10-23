# HTTP fetching

Users fetch HTTP content, read cleaned HTML text, and receive a bounded response body through `WebFetch`.

## Sub-features

- `fetch-html` removes script and style bodies and HTML tags.
- `fetch-limit` truncates response bytes at the configured maximum.
- `fetch-status` returns the response status and body for a missing route.
- `fetch-reject` rejects malformed URLs and non-HTTP protocols.

## How to get to it (user POV)

Run `node dist/src/surfaces/cli/main.js call WebFetch '{"url":"http://..."}'`, or call `essential_WebFetch` through MCP.

## Driving it with verify.mjs

- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs fetch cli`.
- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs fetch mcp` for the MCP entry point.
- The helper starts a local HTTP fixture before launching the runtime. The fixture serves HTML, a 256-byte text body, and a 404 route.
- Fetch `/html`. Require status 200, text `Fixture guide Visible proof`, and `truncated:false`.
- Fetch `/large` with the isolated 128-byte limit. Require exactly 128 `x` characters and `truncated:true`.
- Fetch `/missing`. Require status 404 and text `fixture missing`.
- Submit an invalid URL and a `file:` URL. Require `validation_error` and `security_denied`.
- Inspect `http-receipts.jsonl`, `fetch-results.json`, `transcript.json`, and `report.json` after cleanup.

## Gotchas

- The fixture process binds only to loopback on an operating-system-selected port and exits during cleanup.
- The runtime reads the complete HTTP body before truncating it to the configured maximum.
- The recipe verifies local HTTP behavior. It does not test internet access or remote server behavior.
