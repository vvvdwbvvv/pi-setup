#!/usr/bin/env python3
"""Copy bundled pstack skills and agents into estack, then apply multi-host rewrites."""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from rewrite_pstack_models_port import collect_estack_markdown, rewrite_file

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PSTACK = (
    Path.home()
    / ".cursor/plugins/cache/cursor-public/pstack/850d7f2e9f5e55dff7eb00a0a479337fe79eb22f"
)

SKIP_AGENTS = frozenset(
    {
        "v-agent.md",
        "thermo-nuclear-review-subagent.md",
        "thermo-nuclear-code-quality-review-subagent.md",
    }
)


def copy_tree(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns(".DS_Store"))


def port_skills(pstack_root: Path, estack_root: Path) -> list[str]:
    copied: list[str] = []
    src_skills = pstack_root / "skills"
    dst_skills = estack_root / "skills"
    if not src_skills.is_dir():
        raise SystemExit(f"Missing pstack skills dir: {src_skills}")
    dst_skills.mkdir(parents=True, exist_ok=True)
    for child in sorted(src_skills.iterdir()):
        if not child.is_dir():
            continue
        copy_tree(child, dst_skills / child.name)
        copied.append(child.name)
    return copied


def port_agents(pstack_root: Path, estack_root: Path) -> list[str]:
    copied: list[str] = []
    src_agents = pstack_root / "agents"
    dst_agents = estack_root / "agents"
    if not src_agents.is_dir():
        return copied
    dst_agents.mkdir(parents=True, exist_ok=True)
    for path in sorted(src_agents.glob("*.md")):
        if path.name in SKIP_AGENTS:
            continue
        shutil.copy2(path, dst_agents / path.name)
        copied.append(path.name)
    return copied


def rewrite_estack(estack_root: Path) -> list[Path]:
    changed: list[Path] = []
    for path in collect_estack_markdown(estack_root):
        if rewrite_file(path, estack=True):
            changed.append(path)
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "pstack_root",
        type=Path,
        nargs="?",
        default=DEFAULT_PSTACK,
        help=f"pstack plugin root (default: {DEFAULT_PSTACK})",
    )
    parser.add_argument(
        "--estack-root",
        type=Path,
        default=ROOT,
        help="estack repo root",
    )
    parser.add_argument(
        "--rewrite-only",
        action="store_true",
        help="Skip copy; only run multi-host rewrites on existing estack tree",
    )
    args = parser.parse_args()
    pstack_root = args.pstack_root.resolve()
    estack_root = args.estack_root.resolve()

    if not args.rewrite_only:
        if not pstack_root.is_dir():
            print(f"pstack root not found: {pstack_root}", file=sys.stderr)
            return 2
        skills = port_skills(pstack_root, estack_root)
        agents = port_agents(pstack_root, estack_root)
        print(f"Copied {len(skills)} skill dirs and {len(agents)} agent files from {pstack_root}")
        for name in skills:
            print(f"  skill  {name}")
        for name in agents:
            print(f"  agent  {name}")

    changed = rewrite_estack(estack_root)
    print(f"Rewrote {len(changed)} markdown file(s) under {estack_root}")
    for path in changed[:20]:
        print(f"  {path.relative_to(estack_root)}")
    if len(changed) > 20:
        print(f"  ... and {len(changed) - 20} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
