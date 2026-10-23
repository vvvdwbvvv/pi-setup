# Session mode

Users persist the runtime's session mode as `plan` or `agent`.

## Sub-features

- `mode-plan` changes the default agent session to plan.
- `mode-agent` changes plan back to agent.
- `mode-invalid` rejects an unknown mode and preserves state.

## How to get to it (user POV)

Run `node dist/src/surfaces/cli/main.js call SwitchMode '{"target_mode_id":"plan"}'`, or call `essential_SwitchMode` through MCP.

## Driving it with verify.mjs

Preconditions: use a built runtime and the helper's new state directory.

- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs mode cli`.
- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs mode mcp` for the MCP entry point.
- Switch to `plan` and require returned `previous:agent` and `mode:plan`. Independently read `session.json` and require `{ "mode": "plan" }`.
- Switch to `agent` and require returned `previous:plan` and `mode:agent`.
- Submit `invalid-fixture-mode`, require `validation_error`, and independently require saved mode `agent`.
- Inspect `session-before.json`, final `session.json`, `transcript.json`, and `report.json` after cleanup.

## Gotchas

- This tool changes a persisted runtime flag. It does not control the host IDE or the assistant's execution permissions.
- CLI calls share only their isolated state directory. Each invocation is a separate process.
