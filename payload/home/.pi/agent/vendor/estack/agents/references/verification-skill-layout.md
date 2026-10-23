# Project verification skills

Project-local **verify-*** skills drive the real app and capture proof. Put them under **`.agents/skills/`**, not only under `.cursor/`.

## Directory layout

```text
.agents/skills/verify-<app>/
├── SKILL.md       # Launch, Doctor, Drive, Evidence, Cleanup, Helpers
├── features/      # README plus one file per user-facing feature
├── scripts/       # Harness helpers (executable; invoked from SKILL.md)
├── artifacts/     # Proof output (screenshots, transcripts, responses)
└── runs/          # Optional run logs (host-local)
```

Use a short slug for `<app>` (`exchange-api`, `web-admin`). Set frontmatter `name` to `verify-<app>`.

## Where to look

1. **`.agents/skills/verify-*/`** — create and edit skills here. Every host reads this path explicitly.
2. **Legacy `.cursor/skills/`** — if a `verify-*` directory exists only there, move the whole tree to `.agents/skills/` (keep `artifacts/`, `features/`, `scripts/`, `runs/`). Remove the empty legacy directory. Do not keep two copies.

## Optional Cursor stub

Cursor discovers project skills under `.cursor/skills/`. Codex, pi, and omp do not auto-discover that path.

If you want a Cursor slash command without duplicating the harness, add a stub `SKILL.md` under `.cursor/skills/` in a directory named `verify-<app>`. The stub body tells the agent to read and follow `.agents/skills/verify-<app>/SKILL.md` verbatim. Skip the stub if you invoke verification by path or plugin skill name.

## Relation to verify-this

**verify-this** (estack plugin) proves one falsifiable claim in a session. A project **verify-*** skill is the long-lived harness and feature map. Prefer the project skill when it exists; use **verify-this** for ad-hoc claims.
