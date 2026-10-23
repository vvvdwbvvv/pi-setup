import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { RuntimeContext, ToolResult } from "../core/types.js";
import { fail, ok } from "../core/errors.js";
import { resolveWorkspacePath } from "../infra/paths.js";

interface NotebookCell {
  cell_type: string;
  metadata: Record<string, unknown>;
  source: string[] | string;
}

interface NotebookFile {
  cells: NotebookCell[];
  metadata: Record<string, unknown>;
  nbformat: number;
  nbformat_minor: number;
}

function cellSourceToString(source: string[] | string): string {
  return Array.isArray(source) ? source.join("") : source;
}

function stringToCellSource(text: string): string[] {
  return text.split("\n").map((line, i, arr) =>
    i < arr.length - 1 ? `${line}\n` : line,
  );
}

function languageToCellType(lang: string): string {
  return lang === "markdown" || lang === "raw" ? "markdown" : "code";
}

export async function handleEditNotebook(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const input = args as {
    target_notebook: string;
    cell_idx: number;
    is_new_cell: boolean;
    cell_language: string;
    old_string: string;
    new_string: string;
  };
  const resolved = resolveWorkspacePath(ctx, input.target_notebook);
  if (!resolved.ok) {
    return resolved.result;
  }
  const path = resolved.path;
  let notebook: NotebookFile;
  if (input.is_new_cell && input.cell_idx === 0 && !existsSync(path)) {
    notebook = {
      cells: [],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 5,
    };
  } else {
    if (!existsSync(path)) {
      return fail("not_found", "Notebook file not found", { path });
    }
    notebook = JSON.parse(readFileSync(path, "utf8")) as NotebookFile;
  }
  if (input.is_new_cell) {
    const cell: NotebookCell = {
      cell_type: languageToCellType(input.cell_language),
      metadata: { language: input.cell_language },
      source: stringToCellSource(input.new_string),
    };
    notebook.cells.splice(input.cell_idx, 0, cell);
  } else {
    const cell = notebook.cells[input.cell_idx];
    if (!cell) {
      return fail("not_found", "Cell index out of range", {
        cell_idx: input.cell_idx,
      });
    }
    const content = cellSourceToString(cell.source);
    if (content !== input.old_string) {
      return fail("execution_failed", "old_string does not match cell content");
    }
    cell.source = stringToCellSource(input.new_string);
    cell.metadata = { ...cell.metadata, language: input.cell_language };
  }
  writeFileSync(path, `${JSON.stringify(notebook, null, 1)}\n`, "utf8");
  return ok({
    notebook: path,
    cell_idx: input.cell_idx,
    cells: notebook.cells.length,
  });
}
