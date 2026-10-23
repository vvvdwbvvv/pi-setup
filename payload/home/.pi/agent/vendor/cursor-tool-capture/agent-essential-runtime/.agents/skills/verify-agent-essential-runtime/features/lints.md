# Lint diagnostics

Users obtain diagnostics for a file or the whole workspace through a real ESLint process.

## Sub-features

- `lints-unconfigured` returns the documented warning when no config exists.
- `lints-bad-file` reports an exact diagnostic for a fixture violation.
- `lints-clean-file` returns no diagnostics for a clean fixture.
- `lints-workspace` finds the bad file when paths are omitted.

## How to get to it (user POV)

Run `node dist/src/surfaces/cli/main.js call ReadLints '{"paths":["/absolute/file.js"]}'`, or call `essential_ReadLints`. Omit `paths` to scan the workspace.

## Driving it with verify.mjs

Preconditions: install development dependencies, including pinned ESLint 10.13.0. Its supported Node versions are `^20.19.0 || ^22.13.0 || >=24`.

- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs lints cli`.
- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs lints mcp` for the MCP entry point.
- Call with no configuration and require empty diagnostics plus the no-configuration warning. Require no lint subprocess receipt.
- Create a flat ESLint config enabling `no-debugger:error`, `bad.js` containing `debugger;\n`, and `clean.js` containing `const proof = 1;\n`.
- Call with the bad file and require its exact absolute path, line 1, column 1, message `Unexpected 'debugger' statement.`, and severity `error`.
- Call with the clean file and require no diagnostics. Call without paths and require the bad-file diagnostic again.
- Read subprocess receipts and require ESLint exit codes 1, 0, and 1. Require both source files to remain byte-for-byte unchanged.
- Inspect `lint-results.json`, `lint-receipts.jsonl`, `transcript.json`, and `report.json` after cleanup.

## Gotchas

- A scratch `npx` adapter invokes the installed ESLint executable directly and rejects unrelated commands. It performs no package download and fabricates no diagnostics.
- `ReadLints` returns tool success even when ESLint exits 1 for a violation. Check diagnostics and receipts together.
- The recipe verifies the runtime's ESLint integration. Other lint engines and host IDE diagnostics are outside this recipe.
