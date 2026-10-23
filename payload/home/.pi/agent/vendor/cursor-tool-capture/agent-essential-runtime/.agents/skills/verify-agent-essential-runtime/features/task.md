# Task executor

Users submit a task to the standalone runtime's configured executable and receive its result or an execution error.

## Sub-features

- `task-success` passes the task payload to the configured executable and persists stdout.
- `task-failure` reports a nonzero executor exit and persists stderr.

## How to get to it (user POV)

Run `node dist/src/surfaces/cli/main.js call Task '<json>'`, or call `essential_Task` through MCP. The standalone runtime requires `AGENT_ESSENTIAL_TASK_EXECUTOR` to name an executable file.

## Driving it with verify.mjs

- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs task cli`.
- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs task mcp` for MCP.
- The helper points the runtime at its local executable fixture. Submit description `Verify fixture execution`, prompt `complete fixture`, and type `fixture`.
- Require complete status, exact fixture stdout, and an independently read `task-outputs/<agentId>.txt` matching the returned output path.
- Submit prompt `fail fixture`. Require `execution_failed` and exit code 7 in the response details.
- Read `executor-receipts.jsonl` and require the actual child process received each JSON payload and ran with the isolated workspace as its current directory. Read task output files and require exact stdout and stderr contents.
- Inspect `task-results.json`, `transcript.json`, and `report.json` after cleanup.

## Gotchas

- The executable fixture proves argument delivery, process execution, exit handling, and output persistence. It does not run a model or delegate work to an agent.
- The recipe uses synchronous tasks on both entry points. The CLI exits after each call, so it does not claim that the CLI can persist a background task's completion.
- No network service or user credentials are used.
