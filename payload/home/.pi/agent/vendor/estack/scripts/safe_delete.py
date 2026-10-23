#!/usr/bin/env python3
"""Delete a single file or symlink. Never recursive directory deletion."""

from __future__ import annotations

import os
import sys


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: safe_delete.py <path>", file=sys.stderr)
        return 2

    path = sys.argv[1]
    if not os.path.lexists(path):
        print(f"Error: File does not exist: {path}", file=sys.stderr)
        return 1
    if os.path.isdir(path) and not os.path.islink(path):
        print(
            f"Error: Path is a directory (recursive delete forbidden): {path}",
            file=sys.stderr,
        )
        return 1

    os.unlink(path)
    print(f"Deleted: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
