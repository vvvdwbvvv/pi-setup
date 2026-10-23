#!/usr/bin/env python3
"""Create or update a session goal in a temp-dir state file (never the repo root)."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def default_goal_path() -> Path:
    store = os.environ.get("ESTACK_AGENT_STORE")
    if store:
        return Path(store) / "session-goal.json"
    return Path(tempfile.gettempdir()) / f"estack-goal-{os.environ.get('USER', 'user')}.json"


def create_goal(objective: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    now = utc_now()
    state = {
        "objective": objective,
        "status": "active",
        "createdAt": now,
        "updatedAt": now,
    }
    path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    print(f"Created goal at {path}")
    print(json.dumps(state, indent=2))


def update_goal(status: str, path: Path, stopped_by_user: bool) -> None:
    if not path.exists():
        raise SystemExit(f"Error: goal file not found: {path}")
    state = json.loads(path.read_text(encoding="utf-8"))
    state["status"] = status
    state["updatedAt"] = utc_now()
    if status == "complete":
        state["resolution"] = "stopped_by_user" if stopped_by_user else "achieved"
        state["stoppedByUser"] = bool(stopped_by_user)
    path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    print(f"Updated goal at {path}")
    print(json.dumps(state, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    create = sub.add_parser("create")
    create.add_argument("--objective", required=True)
    create.add_argument("--path", default=None)

    update = sub.add_parser("update")
    update.add_argument("--status", choices=("active", "complete"), required=True)
    update.add_argument("--path", default=None)
    update.add_argument("--stopped-by-user", action="store_true")

    args = parser.parse_args()
    path = Path(args.path) if args.path else default_goal_path()

    if args.cmd == "create":
        create_goal(args.objective, path)
    else:
        update_goal(args.status, path, args.stopped_by_user)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
