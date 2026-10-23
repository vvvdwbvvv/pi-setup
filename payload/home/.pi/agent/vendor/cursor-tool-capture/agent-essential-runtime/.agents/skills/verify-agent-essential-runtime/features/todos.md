# Todo persistence

Users replace or merge task lists and retain them between separate tool calls.

## Sub-features

- `todos-replace`: save two complete task objects.
- `todos-merge`: update an existing ID, retain an untouched ID, and add a third ID.
- `todos-invalid`: reject a one-item request without changing saved tasks.

## How to get to it (user POV)

- CLI: `node dist/src/surfaces/cli/main.js call TodoWrite '<json>'`.
- MCP: call `essential_TodoWrite` with the same JSON arguments.

## Driving it with verify.mjs

Preconditions: built runtime, installed dependencies, fresh isolated state supplied by the helper.

- **CLI:** run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs todos cli`.
- **MCP:** run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs todos mcp`.
- **Replace:** the harness calls `TodoWrite` with `merge:false` and tasks `{id:"first",content:"Inspect runtime",status:"pending"}` and `{id:"second",content:"Capture proof",status:"pending"}`. Observe both tasks persisted in `todos-before.json`.
- **Merge:** it calls with `merge:true`, first task changed to `completed`, plus `{id:"third",content:"Retain evidence",status:"in_progress"}`. The response and independently read `todos.json` must contain updated first, untouched second, and new third tasks in that order.
- **Reject invalid input:** it submits only the first task with `merge:false`; expect `validation_error` (CLI exit 1 or MCP `isError:true`) and identical persisted merged state.
- **Proof:** inspect `transcript.json`, `todos-before.json`, `todos.json`, and `report.json` at the printed evidence path after scratch cleanup.

## Gotchas

- The schema requires at least two tasks and every task's `id`, `content`, and `status`, even for merge. Do not follow the schema description's suggestion that fields can be omitted.
- CLI invocations are separate processes: the stored file proves cross-process persistence, not an in-memory echo.
- Never point these replacement operations at real user state. A CLI pass does not verify the MCP entry point.
