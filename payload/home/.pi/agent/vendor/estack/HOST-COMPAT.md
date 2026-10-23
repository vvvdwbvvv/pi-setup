# Host compatibility

**estack** runs on **Cursor**, **Codex**, **pi**, and **omp**. Claude Code manifests are included for completeness. Use this page for install commands and capability gaps.

## Install by host

| Host | Command |
|------|---------|
| **pi** | `pi install "/absolute/path/to/estack"` |
| **omp** | `omp plugin install "/absolute/path/to/estack"` or `omp plugin link "/absolute/path/to/estack"` |
| **Codex** | `codex plugin marketplace add "/absolute/path/to/estack"` then `codex plugin add estack@estack-local` (requires `.agents/plugins/marketplace.json`) |
| **Copilot** | `copilot plugin marketplace add "/absolute/path/to/estack"` then `copilot plugin install estack@estack-local` (requires `.github/plugin/marketplace.json`) |
| **Cursor** | **/add-plugin** with this repo (`.cursor-plugin/plugin.json`) |

**pi** and **omp** load skills from `package.json` → `"pi.skills": ["./skills"]`. **Codex** uses `plugin.json`, `.codex-plugin/plugin.json`, and the marketplace file under `.agents/plugins/`.

## poteto-mode in 0.2.0

**poteto-mode** ships inside estack. Do not install the standalone **pstack** plugin on the same host. Two copies break routing.

If **poteto-mode** does not load, **go** falls back to **verify-this** and **thermos**. See `agents/references/poteto-gate.md`.

## Capability matrix

| Capability | Codex | pi | omp | Notes |
|------------|:-----:|:--:|:---:|-------|
| Skills (`go`, `poteto-mode`, thermos, …) | yes | yes | yes | Plugin or package skill dirs |
| `scripts/*.py` helpers | yes | yes | yes | Manual or host-native tooling; not routed via skills |
| **v-agent** in Agents picker | no | no | no | Use **go** |
| Native Cursor **Task** / shell wait | no | no | partial | Use host tools (Cursor **Task**, **Await**, shell) |
| `rules/*.mdc` auto-apply | no | no | no | Cursor only |
| Per-role subagent models | read project file | same | same | [`.agents/pstack-models.md`](.agents/pstack-models.md) |
| Project verify skills | `.agents/skills/verify-*/` | same | same | [Layout](agents/references/verification-skill-layout.md). Legacy: `scripts/migrate_verify_skill_to_agents.sh`. |

## Per-role subagent models

**Single source of truth:** [`.agents/pstack-models.md`](.agents/pstack-models.md). Role labels match **poteto-mode** (`how explorer`, `arena runners`, and the rest).

| Host | Behavior |
|------|----------|
| **Cursor** | Delegating skills read the project file when they spawn subagents. **setup-pstack** can write the project file and optionally mirror the same lines in `~/.cursor/rules/pstack-models.mdc` with `alwaysApply: true`. Prefer the project file when both exist. |
| **Codex** | No always-applied rules. Delegating skills read `.agents/pstack-models.md` on each run. Pass `model` when the host lists the slug. Pass `reasoning_effort` when the host exposes it (map `# budget:` to effort, for example `large` → `xhigh`). Omit `model` for `inherit-parent` or `auto`. |
| **pi / omp** | Same explicit read as Codex unless the host adds injection later. |

Slugs must match the host API for the session. A slug that works on Cursor may fail on Codex. Run **setup-pstack** or edit the project file after you check the host model list.

## Maintainer rewrite (estack repo only)

After you import or edit files under `skills/` or `agents/`, run:

```bash
python3 scripts/rewrite_pstack_models_port.py . --estack
```

The script updates estack copies only: paths for `.agents/pstack-models.md`, `.agents/skills/verify-*`, and bundled **deslop** / **control-*** references. Use `--check` in CI. Do not point it at external pstack or Codex port trees unless you maintain those trees yourself.

## Regenerate entry skills

Edit only:

- `agents/references/communication-system-prompt.md`
- `agents/references/poteto-gate.md`

Then:

```bash
python3 scripts/build_entry_skills.py
```

Outputs are `skills/go/SKILL.md` and `agents/v-agent.md`. Do not edit those files by hand.

## Smoke test

```bash
python3 scripts/test_fallbacks.py
./scripts/host_smoke.sh
```
