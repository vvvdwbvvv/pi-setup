# Goal lifecycle

Users create a persistent objective and mark the same goal complete.

## Sub-features

- `goal-missing`: updating absent state returns `not_found`.
- `goal-create`: persist a new active goal with an ID and objective.
- `goal-complete`: preserve ID and objective while changing status to complete.

## How to get to it (user POV)

- CLI: `node dist/src/surfaces/cli/main.js call CreateGoal '{"objective":"Prove isolated runtime behavior"}'`, then `call UpdateGoal '{"status":"complete"}'` using the same state directory.
- MCP: invoke `essential_CreateGoal` and `essential_UpdateGoal` with those arguments in the same isolated server.

## Driving it with verify.mjs

Preconditions: built runtime and a fresh state directory; the harness provides both.

- **CLI:** run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs goals cli`.
- **MCP:** run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs goals mcp`.
- **Missing goal:** before creation, call `UpdateGoal` with `status:complete`; require `not_found` (CLI exit 1 or MCP error).
- **Create:** call `CreateGoal` with objective `Prove isolated runtime behavior`; require active status, a UUID-shaped ID, and independently read `goal.json` matching the response. The initial snapshot is retained as `goal-before.json`.
- **Complete:** call `UpdateGoal` with `status:complete`; require the original ID in the response and stored state with unchanged objective and ID, only status changed.
- **Proof:** inspect `transcript.json`, `goal-before.json`, final `goal.json`, and `report.json` at the printed path after cleanup.

## Gotchas

- Creating another goal overwrites the single stored goal; this recipe never uses a user's state directory.
- Goal state is persistence, not a background scheduler. Do not claim that objective execution or durable automation has started.
- CLI and MCP are distinct entry points and need separate runs when both are in scope.
