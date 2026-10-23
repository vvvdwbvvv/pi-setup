# pstack model configuration (project SSOT)

Per-role overrides for estack **poteto-mode** skills that spawn subagents. Delete a line to fall back to that skill's inline default.

- **`inherit-parent` or `auto`:** omit the subagent `model` field (parent chat model).
- **Panel roles** (`arena runners`, `architect runners`, `interrogate reviewers`, `arena cross-judge pool`): comma-separated list; one subagent per entry.
- **Budget → reasoning:** on hosts that expose `reasoning_effort` separately from `model`, use the budget line below for every concrete model (do not rely on effort baked into Cursor-only slugs).

# budget: large (xhigh)

feature, refactoring: composer-2.5
bug-fix: composer-2.5
perf-issue: composer-2.5
hillclimb: composer-2.5
judgment and prose: claude-opus-5-5-low
hardest tasks: claude-opus-5-5-medium
how explorer: gemini-3.8-flash-medium
how explainer: cursor-grok-4.6-low
why investigators: gemini-3.8-flash-medium
why synthesizer: cursor-grok-4.6-low
reflect tooling: cursor-grok-4.6-low
reflect judgment, divergent, synthesizer: grok-4.7-xhigh
arena runners: claude-opus-5-5-low, composer-2.5
arena cross-judge pool: claude-opus-5-5-medium, gpt-5.6-sol-medium
swarm workers: gpt-5.6-luna-max
architect runners: claude-opus-5-5-medium, composer-2.5
interrogate reviewers: claude-opus-5-5-medium, composer-2.5
