#!/usr/bin/env python3
"""Poll a background shell job until exit, regex match, or timeout."""

from __future__ import annotations

import os
import re
import sys
import time


def main() -> int:
    if len(sys.argv) != 5:
        print(
            "Usage: await_poll.py <log_path> <pid> <timeout_seconds> <pattern_or_empty>",
            file=sys.stderr,
        )
        return 2

    log_path, pid_s, timeout_s, pat = sys.argv[1:5]
    try:
        pid = int(pid_s)
        timeout = float(timeout_s)
    except ValueError as exc:
        print(f"Error: invalid pid or timeout: {exc}", file=sys.stderr)
        return 2

    deadline = time.time() + timeout
    rx = re.compile(pat, re.M) if pat else None

    while time.time() < deadline:
        text = ""
        if os.path.exists(log_path):
            with open(log_path, errors="replace") as f:
                text = f.read()
        if rx and rx.search(text):
            print("MATCHED")
            return 0
        try:
            os.kill(pid, 0)
        except OSError:
            print("EXITED")
            return 0
        time.sleep(1.0)

    print("TIMEOUT")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
