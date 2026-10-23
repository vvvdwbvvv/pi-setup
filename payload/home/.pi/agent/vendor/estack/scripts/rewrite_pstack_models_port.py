#!/usr/bin/env python3
"""Rewrite pstack OpenAI-port copies: Cursor .mdc paths → project .agents/pstack-models.md."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

PROJECT_MODELS = ".agents/pstack-models.md"
CURSOR_RULE = "~/.cursor/rules/pstack-models.mdc"
PROJECT_SKILLS = ".agents/skills"
CURSOR_SKILLS = ".cursor/skills"

REASONING_SUFFIX = (
    " On hosts that expose `reasoning_effort` separately from `model`, map the file's "
    "`# budget:` line to effort (`unlimited` → `max`, `large` → `xhigh`, `medium` → `high`, "
    "`small` → `medium`) and pass it with `model`."
)

SETUP_PSTACK_STEP5 = """### 5. Write the configuration

Write **`.agents/pstack-models.md`** in the project root (SSOT for pstack subagent spawns). Include a `# budget:` line with the chosen label and target effort, then one `role: model` line per role using poteto-mode labels. Overwrite the whole file so re-runs stay idempotent. Do not embed reasoning in model slugs when the host accepts `reasoning_effort` separately; store base slugs plus budget instead. Shape:

```
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto`: omit Task `model` (parent chat model). Panel lists fan out one subagent per entry.
# budget: large (xhigh)
feature, refactoring: grok-4.7-xhigh-fast
bug-fix: grok-4.7-xhigh-fast
...
```

On **Cursor**, after writing the project file, optionally mirror the same role lines into `~/.cursor/rules/pstack-models.mdc` with `alwaysApply: true` so new sessions inherit without an explicit read. Codex and other hosts rely on the project file only."""

SETUP_INTRO = (
    "Configure per-role models in the project's `.agents/pstack-models.md`. "
    "Skills read that file when spawning subagents."
)


def _is_legacy_verify_migration_section(text: str) -> bool:
    return "Legacy layout" in text or "Locate the target" in text


def _replace_verification_paths(text: str) -> str:
    if _is_legacy_verify_migration_section(text):
        return text
    text = text.replace(f"{CURSOR_SKILLS}/verify-", f"{PROJECT_SKILLS}/verify-")
    text = text.replace(
        f"usually `{CURSOR_SKILLS}/verify-*/`",
        f"under `{PROJECT_SKILLS}/verify-*/`",
    )
    text = text.replace(
        f"(`{CURSOR_SKILLS}/verify-<app>/`)",
        f"(`{PROJECT_SKILLS}/verify-<app>/`)",
    )
    return text


def _replace_common(text: str) -> str:
    text = _replace_verification_paths(text)
    text = text.replace(CURSOR_RULE, PROJECT_MODELS)
    text = text.replace("`pstack-models.mdc` rule", PROJECT_MODELS)
    text = text.replace("the `pstack-models.mdc` rule", PROJECT_MODELS)
    text = text.replace("in the `pstack-models.mdc` rule", f"in {PROJECT_MODELS}")
    for old in (
        f"No `{CURSOR_RULE}` means `/setup-pstack` hasn't run for this user, so every role uses its default model.",
        f"No `{PROJECT_MODELS}` means `/setup-pstack` hasn't run for this user, so every role uses its default model.",
    ):
        text = text.replace(
            old,
            "No `.agents/pstack-models.md` in the project means `/setup-pstack` hasn't run, "
            "so every role uses its skill default.",
        )
    if REASONING_SUFFIX.strip() not in text and "Set `model` to that line's value" in text:
        text = text.replace(
            "Leave `model` unset when the value is `auto` or `inherit-parent`.",
            "Leave `model` unset when the value is `auto` or `inherit-parent`."
            + REASONING_SUFFIX,
        )
    return text


def _replace_setup_pstack(text: str) -> str:
    if "name: setup-pstack" not in text and "# Setup pstack" not in text:
        return text
    text = re.sub(
        r"Write `~/.cursor/rules/pstack-models\.mdc`, an always-applied rule that sets pstack's model per role\.",
        SETUP_INTRO,
        text,
        count=1,
    )
    text = re.sub(
        r"### 5\. Write the rule\n\nWrite.*?```\n(?:.*\n)*?```",
        SETUP_PSTACK_STEP5,
        text,
        flags=re.DOTALL,
        count=1,
    )
    text = text.replace(
        "Tell the user the rule was written and that it applies to new sessions.",
        "Tell the user `.agents/pstack-models.md` was written and that pstack skills read it when delegating. "
        "On Cursor, note the optional always-applied mirror rule if you wrote one.",
    )
    return text


def apply_estack_bundle_refs(text: str) -> str:
    text = text.replace(
        "Before commit → the `deslop` skill from the `cursor-team-kit` plugin (`/deslop`).",
        "Before commit → the **deslop** skill bundled in estack (`/deslop`).",
    )
    text = text.replace(
        "the `deslop` skill from the `cursor-team-kit` plugin (`/deslop`)",
        "the **deslop** skill bundled in estack (`/deslop`)",
    )
    text = text.replace(
        "Shipping UI / IDE / CLI → the matching control skill. `cursor-team-kit` publishes "
        "`control-cli` (CLIs and TUIs) and `control-ui` (browser / Electron / web UIs).",
        "Shipping UI / IDE / CLI → the matching control skill. estack bundles **control-cli** "
        "(CLIs and TUIs) and **control-ui** (browser / Electron / web UIs).",
    )
    text = text.replace(
        "Run `/deslop` from `cursor-team-kit` over the diff before commit",
        "Run `/deslop` (estack) over the diff before commit",
    )
    text = text.replace(
        "`control-ui` or `control-cli` from `cursor-team-kit`",
        "estack **control-ui** or **control-cli**",
    )
    text = text.replace(
        "`control-ui` from `cursor-team-kit`",
        "**control-ui** bundled in estack",
    )
    text = text.replace(
        "`control-cli` from `cursor-team-kit`",
        "**control-cli** bundled in estack",
    )
    text = text.replace(
        "such as `control-ui` or `control-cli` from `cursor-team-kit`",
        "such as estack **control-ui** or **control-cli**",
    )
    text = text.replace(
        "Drive through `control-ui` or `control-cli` from `cursor-team-kit`.",
        "Drive through estack **control-ui** or **control-cli**.",
    )
    text = text.replace(
        "`control-ui` or `control-cli` runtime verification (from `cursor-team-kit`)",
        "estack **control-ui** or **control-cli** runtime verification",
    )
    text = text.replace(
        "- `/deslop`, `control-cli`, and `control-ui` ship in the `cursor-team-kit` plugin.",
        "- `/deslop`, **control-cli**, and **control-ui** ship in estack.",
    )
    text = text.replace(
        "that pstack skills read it when delegating",
        "that estack poteto skills read it when delegating",
    )
    return text


def rewrite_file(path: Path, *, estack: bool = False) -> bool:
    original = path.read_text(encoding="utf-8")
    updated = _replace_common(original)
    updated = _replace_setup_pstack(updated)
    if estack:
        updated = apply_estack_bundle_refs(updated)
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def collect_estack_markdown(estack_root: Path) -> list[Path]:
    files: list[Path] = []
    for base in (estack_root / "skills", estack_root / "agents"):
        if base.is_dir():
            files.extend(sorted(base.rglob("*.md")))
    return files


def collect_targets(port_root: Path) -> list[Path]:
    patterns = [
        port_root / "upstream",
        port_root / "skills",
        port_root / "docs",
    ]
    files: list[Path] = []
    for base in patterns:
        if not base.is_dir():
            continue
        files.extend(sorted(base.rglob("*.md")))
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "port_root",
        type=Path,
        help="OpenAI-adapted pstack port root (contains upstream/ and skills/)",
    )
    parser.add_argument("--check", action="store_true", help="Exit 1 if any file would change")
    parser.add_argument(
        "--estack",
        action="store_true",
        help="Rewrite estack repo (skills/ + agents/) instead of an OpenAI port tree",
    )
    args = parser.parse_args()
    port_root = args.port_root.resolve()
    estack_mode = args.estack or not (port_root / "upstream").is_dir()
    if not estack_mode and not (port_root / "upstream").is_dir():
        print(f"Not a pstack port root (missing upstream/): {port_root}", file=sys.stderr)
        return 2

    changed: list[Path] = []
    targets = (
        collect_estack_markdown(port_root)
        if estack_mode
        else collect_targets(port_root)
    )
    for path in targets:
        if rewrite_file(path, estack=estack_mode):
            changed.append(path)

    if args.check:
        if changed:
            print(f"{len(changed)} file(s) need rewrite", file=sys.stderr)
            for p in changed:
                print(f"  {p.relative_to(port_root)}", file=sys.stderr)
            return 1
        print("OK: no pstack-models Cursor references remain to rewrite")
        return 0

    print(f"Rewrote {len(changed)} file(s) under {port_root}")
    for p in changed:
        print(f"  {p.relative_to(port_root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
