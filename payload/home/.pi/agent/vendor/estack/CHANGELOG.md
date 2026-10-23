# Changelog

## 0.2.0

Version 0.2.0 bundles **poteto-mode** and the pstack workflow skills in one plugin.

**Added**

- **v-agent** and **go** for communication and routing.
- **82** skills under `skills/`, including **54** vendored from [Cursor pstack](https://github.com/cursor/plugins/tree/main/pstack) (playbooks under `skills/poteto-mode/playbooks/`).
- **poteto-agent** and **comment-sicko** under `agents/`.
- Per-role subagent models via [`.agents/pstack-models.md`](.agents/pstack-models.md) (see [HOST-COMPAT.md](HOST-COMPAT.md)).

**Upgrade from 0.1.0**

Remove or disable the standalone **pstack** plugin on each host. Two copies of **poteto-mode** break routing. Reload **estack** after you upgrade.

**Host manifests**

- **pi / omp:** `package.json` with `pi.skills`, `pi.agents`, and matching `omp.*` paths.
- **Codex:** `.codex-plugin/plugin.json`, root `plugin.json`, and `.agents/plugins/marketplace.json` (marketplace entry version **0.2.0**).
- **omp catalog mirror:** root `marketplace.json`.

Reinstall or link on each host after you pull so the version string refreshes.

**Maintainers**

Sync upstream pstack with `python3 scripts/port_pstack.py`. Regenerate entry skills with `python3 scripts/build_entry_skills.py` when `agents/references/poteto-gate.md` changes.

## 0.1.0

Initial release: v-agent entry, tool fallback skills, curated review and PR skills, thermos. **poteto-mode** required a separate pstack plugin.
