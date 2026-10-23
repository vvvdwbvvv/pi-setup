# Shell job observation

Users wait for a registered shell job, inspect completion and output, or match an output pattern.

## Sub-features

- `shell-sleep` exercises a short bounded wait without a job ID.
- `shell-missing` rejects an unknown job ID.
- `shell-success` returns a real job's successful output and exit code.
- `shell-failure` returns a real job's nonzero exit code and output.
- `shell-pattern` matches completed output and rejects an invalid regex.

## How to get to it (user POV)

Run `node dist/src/surfaces/cli/main.js call AwaitShell '<json>'`, or call `essential_AwaitShell`. Use `shell_id` for a registered job, `block_until_ms` for the wait bound, and optional `pattern` for matching.

## Driving it with verify.mjs

Preconditions: build the runtime. The fixture starts its own process and registers real Node subprocesses using the existing shell-job infrastructure.

- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs shell cli`.
- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs shell mcp` for the MCP entry point.
- The owner registers one process producing `shell fixture success\n` with exit 0 and another producing `shell fixture failure\n` with exit 7. It publishes readiness only after actual completion records exist.
- Call without a job ID and `block_until_ms:1`. Require `completed:false` and `sleptMs:1`. This checks the wait branch without making a timing-performance claim.
- Call an unknown ID with a positive wait bound and require `not_found`.
- Call both fixture job IDs. Require exact output, `completed:true`, and their respective exit codes. Independently compare persisted records and actual job log contents.
- Match `^shell fixture success$` and require `matched:true`. Submit `[` against the known completed job and require `validation_error`.
- Inspect `shell-receipts.jsonl`, `shell-jobs.json`, `shell-results.json`, owner process logs, `transcript.json`, and `report.json` after cleanup.

## Gotchas

- Job creation is fixture setup. Every observation goes through the public CLI or MCP tool. The fixture never fabricates a job record.
- The owning CLI exits immediately after a tool call. This recipe uses a dedicated live owner and does not claim that CLI background Task completion works.
- These cases observe completed jobs. Live streaming, pending-job transitions, and zero-duration polling are outside this recipe.
- The owner is stopped and reaped by its exact process handle after the runtime closes.
