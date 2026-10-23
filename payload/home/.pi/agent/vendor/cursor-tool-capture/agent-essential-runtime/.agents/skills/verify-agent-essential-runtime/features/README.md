# agent-essential-runtime verification map

This index is the maintained source for user-path verification. Read the matching recipe before driving. It covers 12 of the 13 runtime tools through the CLI and MCP with local fixtures; `GenerateImage` is intentionally excluded.

## Baseline preconditions

- From the repository root, run `npm install && npm run build` once. The build requires Node 20+ and the sibling capture JSON required by `contracts/generate.ts`.
- The `lints` feature also requires Node `^20.19.0 || ^22.13.0 || >=24`, which supports the pinned ESLint 10.13.0 development dependency.
- Use `scripts/verify.mjs` through the root-relative commands in each recipe. Each feature uses a fresh workspace, state directory, and evidence directory.
- Feature fixtures use local HTTP, MCP, and executable processes. No external API credentials or live provider requests are used.

## Driving conventions

- Harness name: `verify.mjs`. `cli` means real `list`/`call` processes; `mcp` means a separate stdio server, initialized and driven through the MCP SDK.
- All paths below are relative to the repository root. Each invocation starts a new isolated baseline.
- The CLI tool IDs and MCP `essential_` names are separate entry points. Run both variants when both are affected; never infer MCP coverage from CLI success.
- Capture responses and independent filesystem state. Preserve proof after cleanup.

## Proof and skip reporting

Report feature ID, surface, exact command, exit status, evidence directory, and `report.json` result. Read `transcript.json` for the actions and results. State and boundary snapshots remain after scratch cleanup. The `all both` command requires every included feature to pass on both entry points and compares the successful tool-ID ledger with the catalog minus `GenerateImage`.

## Features

- [Tool discovery](discovery.md): CLI catalog and MCP tools/list.
- [Todo persistence](todos.md): replace, merge across calls, and rejected-input preservation.
- [Sandboxed file deletion](delete.md): successful unlink, missing-file error, and denied outside-workspace deletion.
- [Goal lifecycle](goals.md): no-goal error, create, complete, and preserved identity/objective.

- [Notebook editing](notebook.md): create, insert, replace, and reject unsafe or stale edits.
- [Lint diagnostics](lints.md): run pinned ESLint against configured fixture files.
- [Session mode](mode.md): switch the persisted mode and preserve it across calls.
- [Shell job observation](shell.md): inspect actual completed shell jobs and output.
- [HTTP fetching](fetch.md): clean HTML, bound returned bytes, and report status.
- [Web search](search.md): route Brave-shaped requests to a local fixture and verify result mapping.
- [MCP resource fetching](resources.md): read or download a local stdio resource.
- [Task executor](task.md): run a local executable and verify payload and output.

Each feature uses the four required H2 sections. Keep the full entry-point list honest as the app evolves; a convenient subset is not complete coverage.
