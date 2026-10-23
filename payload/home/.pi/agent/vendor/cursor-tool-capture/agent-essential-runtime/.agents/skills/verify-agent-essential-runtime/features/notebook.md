# Notebook editing

Users create a notebook, insert a cell, and replace an existing cell using its exact old text.

## Sub-features

- `notebook-create` creates a Python cell in a new notebook.
- `notebook-insert` appends a markdown cell.
- `notebook-replace` changes the Python source while preserving the markdown cell.
- `notebook-reject` rejects mismatched old text, missing indices, and outside-workspace paths.

## How to get to it (user POV)

Run `node dist/src/surfaces/cli/main.js call EditNotebook '<json>'`, or call `essential_EditNotebook` through MCP. Arguments are `target_notebook`, `cell_idx`, `is_new_cell`, `cell_language`, `old_string`, and `new_string`.

## Driving it with verify.mjs

Preconditions: build the runtime and use the helper's fresh workspace.

- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs notebook cli`.
- Run `node .agents/skills/verify-agent-essential-runtime/scripts/verify.mjs notebook mcp` for the MCP entry point.
- Create `proof.ipynb` with index 0, `is_new_cell:true`, language `python`, and source `print("before")\n`. Parse the file independently and require notebook format 4 and that exact cell source.
- Insert index 1 with language `markdown` and source `# Fixture proof`. Replace index 0 with `print("after")\n`, supplying its exact original source as `old_string`. Require the code cell followed by the unchanged markdown cell.
- Submit mismatched old text and require `execution_failed`. Submit index 99 and require `not_found`. Submit an outside-workspace target and require `security_denied`. Require unchanged notebook bytes and no outside file.
- Inspect `notebook-before.json`, `notebook-after.json`, `transcript.json`, and `report.json` at the printed evidence directory after cleanup.

## Gotchas

- This recipe edits actual JSON notebook files. It does not execute notebook cells.
- Replacement requires the full exact source, including its trailing newline.
- Scratch notebook files are removed after their parsed state has been retained as evidence.
