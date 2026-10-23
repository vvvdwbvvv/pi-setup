---
name: verify-agent-essential-runtime
description: Verify 12 agent-essential-runtime tools through isolated CLI and MCP drives with retained fixture evidence. Use when changing runtime behavior or checking tool integration. `GenerateImage` is intentionally excluded.
---

# Verify agent-essential-runtime

Read [features/README.md](features/README.md) first. This is a Node 20+ TypeScript runtime with a JSON CLI, MCP stdio server, and exported Node API. The verification skill exercises 12 of 13 tools through the real CLI and MCP dispatch paths. `GenerateImage` is intentionally excluded because it can incur external costs. The embedded `createRuntime` API is not covered by these runs.

## Launch

From the repository root, install dependencies and build once:

```sh
npm install
npm run build
```

The build runs `tsx contracts/generate.ts` and `tsc`. It requires the sibling file `../cursor-essential/references/native-schemas-runtime-discovered.json`. The package alone cannot regenerate its contracts. The build writes `contracts/tools.json`; preserve any existing source changes there.

Run one feature through both entry points:

```sh
node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs todos cli
node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs todos mcp
```

Run the full matrix:

```sh
node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs all both
```

The full command starts one isolated run per feature and surface. It exits nonzero if any run fails or if the successful tool-ID ledger does not match the catalog minus `GenerateImage`. It retains a suite report and each feature's separate evidence directory.

The linter recipe uses pinned ESLint 10.13.0, which requires Node `^20.19.0 || ^22.13.0 || >=24`. Other runtime features require Node 20+. Run the linter recipe with a compatible Node version.

## Doctor

Run a read-only catalog check when a feature looks unhealthy:

```sh
node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs doctor cli
node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs doctor mcp
```

Doctor compares `list` with `contracts/tools.json`, checks the Node version, records the package version and executable hash, and verifies MCP tool names after initialization. Each feature run repeats these checks. Doctor does not prove every source file is reflected in the build; run `npm run build` after code changes.

## Drive

The maintained recipes live in [features/](features/README.md). They cover `TodoWrite`, `Delete`, `CreateGoal`, `UpdateGoal`, `EditNotebook`, `ReadLints`, `SwitchMode`, `AwaitShell`, `WebFetch`, `WebSearch`, `FetchMcpResource`, and `Task`.

| Feature | Command selector |
|---|---|
| Tool discovery | `discovery` |
| Todo persistence | `todos` |
| Sandboxed file deletion | `delete` |
| Goal lifecycle | `goals` |
| Notebook editing | `notebook` |
| Lint diagnostics | `lints` |
| Session mode | `mode` |
| Shell job observation | `shell` |
| HTTP fetching | `fetch` |
| Web search | `search` |
| MCP resource fetching | `resources` |
| Task executor | `task` |

Use this syntax for an individual run:

```sh
node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs <feature> <cli|mcp>
```

Each feature creates a unique OS temporary evidence directory and an isolated workspace and state directory. The helper strips inherited `AGENT_ESSENTIAL_*`, `VERIFY_*`, `NODE_OPTIONS`, and proxy variables, then sets only the fixture environment. Network tools use a local HTTP server and a child-only fetch preload. Resource reads use a local MCP stdio server. Task execution uses a local executable. Linting invokes the pinned ESLint binary through a restricted `npx` adapter. No recipe contacts a live provider.

HTTP servers and shell-job owners run in separate processes because CLI tool calls use `spawnSync`. Fixtures publish a readiness record before the verifier starts the CLI or MCP runtime. Cleanup closes the runtime, stops only owned fixtures, captures their logs, and removes only the invocation's scratch tree.

## Evidence

Every run prints the evidence directory. Retain that exact path with the feature and surface in the verification result.

- `transcript.json` records CLI arguments and outputs or MCP requests and replies.
- `doctor.json` records the executable, build hash, catalog, isolated paths, and child Node arguments.
- Feature snapshots record persisted values, fixture requests, subprocess inputs, and output files.
- `report.json` records passing tool IDs, calls, failures, and scratch cleanup.
- `suite-report.json` records each feature and surface, the catalog-derived expected tool IDs, and actual coverage for `all both`.

Require the real public call and an independent observation of its result. Persistent values must match the tool response. Error cases must preserve protected files or state. Fixtures may replace dependencies only at existing production boundaries. The local search fixture proves Brave request construction and response mapping, not Brave availability or authentication. The task executable proves process invocation and output handling, not model delegation. `GenerateImage` is never called, and its absence is recorded in reports.

## Cleanup

The verifier closes only its own MCP client and fixture child processes. It records fixture logs before deleting each run's scratch tree. Evidence files sit outside scratch and remain after success or caught failures. Never kill processes by name.

If a run is forcibly terminated before cleanup, use the printed evidence directory to identify that run's child process records. Stop only those child processes and remove only that run's `scratch` directory. OS temporary files can expire; copy evidence to a durable location if long-term retention is needed.

## Helpers

The executable helper accepts `verify.mjs <doctor|discovery|todos|delete|goals|notebook|lints|mode|shell|fetch|search|resources|task|all> <cli|mcp|both>`. The `both` surface is valid with `all` only. The default is `todos cli`.

For `all both`, run:

```sh
.agents/skills/verify-agent-essential-runtime/scripts/verify.mjs all both
```

To maintain the feature map as runtime behavior changes, invoke the installed `maintain-verification-skill` through the host skill picker. The upstream `/maintain-verification-skill` shorthand is not a registered CLI command.
