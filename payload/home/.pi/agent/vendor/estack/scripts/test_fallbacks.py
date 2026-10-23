#!/usr/bin/env python3
"""Smoke tests for estack fallback scripts (no network required)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PASS = 0
FAIL = 0


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, **kwargs)


def check(name: str, ok: bool, detail: str = "") -> None:
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"PASS  {name}")
    else:
        FAIL += 1
        print(f"FAIL  {name}: {detail}")


def test_safe_delete() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_p = Path(tmp)
        target = tmp_p / "file.txt"
        target.write_text("x\n", encoding="utf-8")
        link = tmp_p / "link"
        link.symlink_to(target)
        directory = tmp_p / "dir"
        directory.mkdir()

        r = run([sys.executable, str(ROOT / "safe_delete.py"), str(directory)])
        check("safe_delete rejects directory", r.returncode != 0)

        r = run([sys.executable, str(ROOT / "safe_delete.py"), str(link)])
        check(
            "safe_delete unlinks symlink only",
            r.returncode == 0 and target.exists() and not link.exists(),
            r.stderr,
        )

        r = run([sys.executable, str(ROOT / "safe_delete.py"), str(tmp_p / "missing")])
        check("safe_delete missing file", r.returncode != 0)


def test_edit_notebook() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        nb = Path(tmp) / "n.ipynb"
        script = ROOT / "edit_notebook.py"

        r = run(
            [
                sys.executable,
                str(script),
                str(nb),
                "0",
                "true",
                "python",
                "",
                'print("a")\nx=1',
            ]
        )
        check("edit_notebook create", r.returncode == 0, r.stderr)

        r = run(
            [
                sys.executable,
                str(script),
                str(nb),
                "0",
                "false",
                "markdown",
                "x=1",
                "hello",
            ]
        )
        data = json.loads(nb.read_text(encoding="utf-8"))
        cell = data["cells"][0]
        check(
            "edit_notebook code→markdown strips outputs",
            r.returncode == 0
            and cell["cell_type"] == "markdown"
            and "outputs" not in cell
            and "execution_count" not in cell,
            f"cell={cell} err={r.stderr}",
        )


def test_await_poll() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        log = Path(tmp) / "log.txt"
        log.write_text("", encoding="utf-8")
        # Dead PID: use an unused high pid that is almost certainly not running.
        r = run(
            [
                sys.executable,
                str(ROOT / "await_poll.py"),
                str(log),
                "999999",
                "1",
                "",
            ]
        )
        check(
            "await_poll EXITED for dead pid",
            r.returncode == 0 and "EXITED" in r.stdout,
            r.stdout + r.stderr,
        )

        log.write_text("ready\n", encoding="utf-8")
        # Use current process pid so os.kill succeeds, with pattern matching immediately.
        r = run(
            [
                sys.executable,
                str(ROOT / "await_poll.py"),
                str(log),
                str(os.getpid()),
                "2",
                "^ready$",
            ]
        )
        check(
            "await_poll MATCHED",
            r.returncode == 0 and "MATCHED" in r.stdout,
            r.stdout + r.stderr,
        )


def test_session_goal() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "session-goal.json"
        script = ROOT / "session_goal.py"
        r = run(
            [
                sys.executable,
                str(script),
                "create",
                "--objective",
                "ship estack",
                "--path",
                str(path),
            ]
        )
        check("session_goal create", r.returncode == 0 and path.exists(), r.stderr)

        r = run(
            [
                sys.executable,
                str(script),
                "update",
                "--status",
                "complete",
                "--path",
                str(path),
                "--stopped-by-user",
            ]
        )
        state = json.loads(path.read_text(encoding="utf-8"))
        check(
            "session_goal update stopped_by_user",
            r.returncode == 0
            and state["status"] == "complete"
            and state.get("resolution") == "stopped_by_user",
            str(state),
        )


def test_script_import_syntax() -> None:
    import ast

    for name in (
        "await_poll.py",
        "safe_delete.py",
        "edit_notebook.py",
        "web_fetch.py",
        "web_search.py",
        "session_goal.py",
    ):
        path = ROOT / name
        try:
            ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
            check(f"syntax {name}", True)
        except SyntaxError as exc:
            check(f"syntax {name}", False, str(exc))


def main() -> int:
    test_script_import_syntax()
    test_safe_delete()
    test_edit_notebook()
    test_await_poll()
    test_session_goal()
    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
