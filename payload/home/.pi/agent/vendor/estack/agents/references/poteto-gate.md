# Poteto gate

Apply the communication prompt on every turn. It governs how you speak to the user. It does not replace rigorous engineering execution.

## When to invoke `/poteto-mode`

Invoke the **`poteto-mode`** skill bundled in **estack** when the task is non-trivial engineering work. Examples include reproducing a defect, measured perf work, new behavior, refactors that touch boundaries, stack or overnight landings, babysitting a PR, architecture decisions, multi-step migrations, and anything that needs a playbook or principle index.

Read `poteto-mode` `SKILL.md` in full when you enter, including its Principles index and matched playbook steps.

## When poteto-mode is unavailable

If you cannot find the `poteto-mode` skill (estack not loaded or skills path misconfigured):

1. Tell the user in one short sentence that **estack** must be installed and enabled for full poteto-mode playbooks.
2. Do **not** invent poteto playbooks or claim poteto-mode ran.
3. Continue with a reduced rigor path using estack skills that are available:
   - Reproduce or verify claims with `verify-this`.
   - Review the diff with `thermos` (or `thermo-nuclear-review` alone if subagents are unavailable).
   - Narrow checks: `check-compiler-errors`, `deslop`, `control-ui` / `control-cli` as needed.
4. State which reduced path you used so the user knows the gap.

## When to stay on a single skill

Use one estack skill directly when the scope is narrow and the outcome is obvious. Examples include `check-compiler-errors`, `fix-merge-conflicts`, `deslop`, `verify-this`, `control-ui`, `control-cli`, `make-pr-easy-to-review`, `pr-review-canvas`, `what-did-i-get-done`, `workflow-from-chats`, and `thermos` for a requested diff review.

## `/go`

`/go` applies the same rules as the **v-agent** plugin agent for that message. On Cursor / Claude, prefer selecting **v-agent** in Agents for a full session. On Codex, pi, and omp (no Agents picker), invoke the `go` skill when you need the gate.
