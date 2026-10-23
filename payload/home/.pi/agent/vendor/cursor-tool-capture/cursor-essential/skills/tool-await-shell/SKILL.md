---
name: tool-await-shell
description: "Wait for package-registered shell jobs or a specified duration. Standalone execution via agent-essential-runtime (MCP/CLI)."
---

# AwaitShell

## Original definition

Source: `native-schemas-runtime-discovered.json`, tool `AwaitShell`. Read [the preserved definition](references/original-definition.json) for the complete original description and runtime inputSchema before use. The frontmatter description is package discovery metadata; the captured description below is unchanged.

### Captured description

Check or poll a backgrounded shell job. For work that does not have a shell id, you can omit the shell_id arg to sleep for the full `block_until_ms` duration (prefer this over sleeping in the shell, because it renders nicely to the user). At the end of your turn, you will be notified about any unawaited jobs that completed. If you think a job completed (e.g. because you killed it), observe it with AwaitShell to skip the notification, because stale notifications can confuse the user.

Prefer NOT to poll reflexively with AwaitShell. Multitask on independent work while backgrounded jobs run, or finish your turn and rely on the end-of-turn completion notification. Poll with AwaitShell only when one of the following is true:
- Your very next step is blocked on this specific job's result and you have no other productive work to do, OR
- The task requires close monitoring (see shell guidance below).
- Never poll a task whose tool result says it was "manually backgrounded by the user".
- NEVER USE THIS TO POLL OR WAIT VACUOUSLY FOR A SUBAGENT LAUNCHED WITH THE Task TOOL — rely on the end-of-turn completion notification instead (it is delivered as soon as the subagent finishes; guessing a wait time is inefficient).
- Shell: only poll with AwaitShell when the command requires close monitoring. Close monitoring means a long-running job that can silently hang, degrade, or need a course correction before it completes — e.g. training runs, eval runs, deployments, long builds, datagen pipelines, DB migrations, large data transfers. For fire-and-forget commands (tests, installs, dev servers/watchers, short scripts, etc.) the completion notification is enough — start them, keep working, and only poll with AwaitShell later if you end up blocked on the result.
- Shell sanity check (regardless of close monitoring): when you spawn a command directly into the background (`block_until_ms: 0`), do a single status check by reading the output file to confirm the command didn't fail to start. This is a one-shot smoke check, not a polling loop.
- Shell close-monitoring guidance (only applies in the close-monitoring case above):
  - HARD STOPPING CONSTRAINT: once you've decided to actively poll, don't stop until (a) the job terminates, (b) the command reaches a healthy steady state (only for non-terminating commands, e.g. dev server/watcher), or (c) the command is hung — follow the hang guidance below.
  - Waiting until a regex matches the output can be useful for e.g. known startup/status/error logs.
  - Size `block_until_ms` to the command's expected runtime. When waiting further, avoid waiting 1h or more: prefer slices of 60s-59m (keeps prompt cache warm). Size slices based on expected progress; when progress is unclear, exponential backoff is useful.
  - Output file header has `pid` and `running_for_ms` (updated every 5000ms).
  - When finished, footer with `exit_code` and `elapsed_ms` appears (regex only matches the body, not header/footer).
  - If the command is taking longer than expected and appears hung (use judgment based on command type), kill the process if safe to do so using the pid in the header. If possible, fix the hang and proceed.

## Package usage

### Behavioral reference

Read the tool’s complete original description before using the Skill. Follow its guidance on when to use the tool, what its parameters mean, and how the operation should proceed. Use the preserved runtime inputSchema as the input contract.

References to Cursor interfaces, notifications, modes, or agent capabilities apply only when the current host or bundled program provides those capabilities. Follow the Skill’s compatibility notes when behavior differs.

### Execution procedure

1. Confirm that the current task matches the tool’s intended use.
2. Build JSON arguments that satisfy the preserved schema. Obtain session information, credentials, and storage locations from package configuration or the execution environment.
3. Confirm that the bundled program and required dependencies are available, then execute it through the host’s command-line capability.
4. Read the returned result. Distinguish whether the call succeeded, whether a background job is still running, and whether any partial effects occurred.
5. Continue based on the result. Report unsupported options, failures, and uncertain outcomes clearly.

### Capabilities and results

A readable Skill does not guarantee an executable capability. If the program or a required dependency is unavailable, report that limitation without claiming the operation completed.

Do not silently ignore unsupported arguments or substitute an operation with different semantics. Explain any proposed alternative and its behavioral differences.

The package defines its own output format. Distinguish successful execution, job completion, and achievement of the user’s objective. When an operation may have produced effects but its outcome is unknown, avoid automatic retries unless retry safety has been established.

### Tool-specific guidance

Wait only for shell jobs registered by the package. Wait when the next step depends on the result or the job needs close monitoring; avoid repeated checks without a purpose. Do not use this Skill to wait for Task agents. A wait timeout leaves the background job running. Without shell_id, wait for the specified duration and reject pattern.

### Compatibility notes and execution status

**Standalone runtime:** MCP `essential_AwaitShell` or CLI `agent-essential call AwaitShell '<json>'`. See [docs/runtime.md](../../docs/runtime.md) and [agent-essential-runtime](../../../agent-essential-runtime). **Cursor host:** prefer native `cursor` tools when available.

Host shell IDs are not package job IDs. RE2 matching requires a compatible engine. Host completion notifications are not supplied by these instructions.

The original definition is captured evidence. Package usage describes package decisions and intended behavior. Host-dependent capabilities require actual support from the current host or an implemented adapter; their mention in the original description does not establish availability.
