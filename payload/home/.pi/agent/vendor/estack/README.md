# estack

**estack** is a multi-host agent plugin for **Cursor**, **Codex**, **pi**, and **omp**. Claude Code manifests are included. Version **0.2.0** bundles **poteto-mode** and the pstack workflow skills, so you do not install pstack separately.

Day-to-day validation covers **Codex**, **pi**, and **omp**. Install commands and host gaps are in [HOST-COMPAT.md](HOST-COMPAT.md).

## What you get

One install provides:

- **go** and **v-agent** for tone and routing.
- **thermos** and related review skills.
- **poteto-mode** with playbooks for bugs, features, PR babysitting, shipping, and long autonomous runs.

Route non-trivial engineering work to **`/poteto-mode`**.

## Install

Replace `/absolute/path/to/estack` with your clone path.

**pi**

```bash
pi install "/absolute/path/to/estack"
```

**omp**

```bash
omp plugin install "/absolute/path/to/estack"
```

**Codex**

```bash
codex plugin marketplace add "/absolute/path/to/estack"
codex plugin add estack@estack-local
```

**Cursor**

Use **/add-plugin** with this repository (manifest at `.cursor-plugin/plugin.json`).

**Full-session entry**

Select **v-agent** in Cursor or Claude Code. On Codex, pi, and omp, invoke the **go** skill when you need the same gate.

## Repo layout

Each host reads one manifest. Shared files live at the repo root.

| Path | Role |
|------|------|
| `agents/` | **v-agent**, **poteto-agent**, thermo subagents, `references/` (source for **go**) |
| `skills/` | All skills (**70** directories at 0.2.0) |
| `scripts/` | `build_entry_skills.py`, `port_pstack.py`, `host_smoke.sh`, optional CLI helpers |
| `rules/` | Cursor-only rules such as `no-inline-imports` |
| `.agents/` | Codex marketplace stub and [`.agents/pstack-models.md`](.agents/pstack-models.md) for per-role subagent models |
| `assets/` | Logo and avatar |

| Host | Manifest | Loads |
|------|----------|--------|
| Portable | `plugin.json` | `skills/` |
| Cursor | `.cursor-plugin/plugin.json` | `skills/`, `agents/`, `rules/` |
| Claude Code | `.claude-plugin/plugin.json` | `skills/`, `agents/` |
| Codex | `.codex-plugin/plugin.json`, `marketplace.json` | `skills/` |
| pi / omp | `package.json` (`pi.skills`) | `skills/` |

To recount skill directories after you change the tree:

```bash
find skills -mindepth 1 -maxdepth 1 -type d | wc -l
```

## Edit the entry gate

**go** and **v-agent** are generated. Edit only:

- `agents/references/communication-system-prompt.md`
- `agents/references/poteto-gate.md`

Then run:

```bash
python3 scripts/build_entry_skills.py
```

The script writes `skills/go/SKILL.md` and `agents/v-agent.md`. Do not edit those outputs by hand.

## Smoke tests

```bash
python3 scripts/test_fallbacks.py
./scripts/host_smoke.sh
```

## Refresh vendored pstack skills

Poteto skills come from upstream pstack. To copy a newer drop and apply estack rewrites:

```bash
python3 scripts/port_pstack.py
python3 scripts/rewrite_pstack_models_port.py . --estack
```

If you change `poteto-gate.md`, run `python3 scripts/build_entry_skills.py` again.

## Version history

See [CHANGELOG.md](CHANGELOG.md).
