# Sandboxed file deletion

Users delete a single workspace file and receive explicit errors for missing or out-of-workspace targets.

## Sub-features

- `delete-file`: unlink a disposable workspace file.
- `delete-missing`: report `not_found` for a second deletion.
- `delete-outside`: report `security_denied` and preserve an outside file.

## How to get to it (user POV)

- CLI: `node dist/src/surfaces/cli/main.js call Delete '{"path":"..."}'` with an actual file path.
- MCP: call `essential_Delete` with the same `path` argument.

## Driving it with verify.mjs

Preconditions: built runtime; helper-created workspace with outside-workspace permission explicitly disabled.

- **CLI:** run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs delete cli`.
- **MCP:** run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs delete mcp`.
- **Seed:** the harness writes `delete-me.txt` containing `disposable fixture` inside its workspace and `outside.txt` containing `must survive denied deletion` beside that workspace. Absolute paths and initial contents are in `delete-before.json`.
- **Delete:** call `Delete` on the inside file, require success, then independently assert the file no longer exists.
- **Repeat:** call the same path, require `not_found` and CLI exit 1 or MCP error.
- **Boundary:** call `Delete` on `outside.txt`, require `security_denied`, then read the file and require its exact original contents.
- **Proof:** inspect `transcript.json`, `delete-before.json`, `delete-after.json` and passing `report.json` after cleanup.

## Gotchas

- This is real destructive execution, not dry-run. Only helper-owned fixtures may be deleted.
- Both files are inside the invocation's scratch directory, so cleanup removes the preserved outside fixture only after recording its survival.
- Directory deletion, symlink semantics, and every possible path traversal case are not proven by this recipe; add targeted paths when those behaviors change.
