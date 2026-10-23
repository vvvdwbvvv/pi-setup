#!/usr/bin/env python3
"""Edit or insert a Jupyter notebook cell by 0-based index."""

from __future__ import annotations

import json
import os
import sys
import uuid


def to_source_lines(text: str) -> list[str]:
    if not text:
        return []
    return text.splitlines(True)


def cell_type_for(lang: str) -> str:
    if lang == "markdown":
        return "markdown"
    if lang == "raw":
        return "raw"
    return "code"


def strip_code_fields(cell: dict) -> None:
    cell.pop("execution_count", None)
    cell.pop("outputs", None)


def main() -> int:
    if len(sys.argv) != 7:
        print(
            "Usage: edit_notebook.py <notebook> <cell_idx> <is_new_cell> "
            "<cell_language> <old_string> <new_string>",
            file=sys.stderr,
        )
        return 2

    nb_path = sys.argv[1]
    cell_idx = int(sys.argv[2])
    is_new = sys.argv[3].lower() == "true"
    lang = sys.argv[4]
    old_str = sys.argv[5]
    new_str = sys.argv[6]
    cell_type = cell_type_for(lang)

    if not os.path.exists(nb_path):
        if not (is_new and cell_idx == 0):
            print(f"Error: Notebook {nb_path} does not exist.", file=sys.stderr)
            return 1
        nb = {
            "cells": [],
            "metadata": {
                "language_info": {
                    "name": lang if lang not in ("markdown", "raw") else "python"
                }
            },
            "nbformat": 4,
            "nbformat_minor": 5,
        }
    else:
        with open(nb_path, encoding="utf-8") as f:
            nb = json.load(f)

    cells = nb.setdefault("cells", [])

    if is_new:
        if cell_idx < 0 or cell_idx > len(cells):
            print(
                f"Error: cell_idx {cell_idx} out of bounds for insertion "
                f"(len={len(cells)}).",
                file=sys.stderr,
            )
            return 1
        new_cell: dict = {
            "id": uuid.uuid4().hex[:8],
            "cell_type": cell_type,
            "metadata": {},
            "source": to_source_lines(new_str),
        }
        if cell_type == "code":
            new_cell["execution_count"] = None
            new_cell["outputs"] = []
        cells.insert(cell_idx, new_cell)
    else:
        if cell_idx < 0 or cell_idx >= len(cells):
            print(
                f"Error: cell_idx {cell_idx} out of bounds (len={len(cells)}).",
                file=sys.stderr,
            )
            return 1
        cell = cells[cell_idx]
        src = "".join(cell.get("source", []))
        count = src.count(old_str)
        if count == 0:
            print("Error: old_string not found in target cell.", file=sys.stderr)
            return 1
        if count > 1:
            print(
                f"Error: old_string is not unique in target cell ({count} matches).",
                file=sys.stderr,
            )
            return 1
        cell["source"] = to_source_lines(src.replace(old_str, new_str, 1))
        cell["cell_type"] = cell_type
        if cell_type == "code":
            cell["execution_count"] = None
            cell["outputs"] = []
        else:
            strip_code_fields(cell)

    with open(nb_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"Successfully updated {nb_path} at cell {cell_idx}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
