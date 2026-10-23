---
name: tool-switch-mode
description: "Reference the preserved SwitchMode contract and mode-switching guidance. Execution is unavailable."
---

# SwitchMode

## Original definition

Source: `native-schemas-runtime-discovered.json`, tool `SwitchMode`. Read [the preserved definition](references/original-definition.json) for the complete original description and runtime inputSchema before use. The frontmatter description is package discovery metadata; the captured description below is unchanged.

### Captured description

Switch the interaction mode to better match the current task. Each mode is optimized for a specific type of work.

## When to Switch Modes

Switch modes proactively when:
1. **Task type changes** - User shifts from asking questions to requesting implementation, or vice versa
2. **Complexity emerges** - What seemed simple reveals architectural decisions or multiple approaches
3. **Debugging needed** - An error, bug, or unexpected behavior requires investigation
4. **Planning needed** - The task is large, ambiguous, or has significant trade-offs to discuss
5. **You're stuck** - Multiple attempts without progress suggest a different approach is needed

## When NOT to Switch

Do NOT switch modes for:
- Simple, clear tasks that can be completed quickly in current mode
- Mid-implementation when you're making good progress
- Minor clarifying questions (just ask them)
- Tasks where the current mode is working well

## Available Modes

### Agent Mode [switchable]
Default implementation mode with full access to all tools for making changes.

**Switch to Agent when:**
- You have a clear understanding of what to implement
- Planning/debugging is complete and you're ready to code
- The task is straightforward with an obvious implementation
- You've gathered enough context and are ready to execute

**Examples:**
- After planning: "I've designed the approach, ready to implement" → Switch to Agent
- After debugging: "Found the bug, it's a null check issue" → Switch to Agent
- Simple task: User asks to "Add a comment to this function" → Stay in Agent (no switch needed)

### Plan Mode [switchable]
Read-only collaborative mode for designing implementation approaches before coding.

**Switch to Plan when:**
- The task has multiple valid approaches with significant trade-offs
- Architectural decisions are needed (e.g., "Add caching" - Redis vs in-memory vs file-based)
- The task touches many files or systems (large refactors, migrations)
- Requirements are unclear and you need to explore before understanding scope
- You would otherwise ask multiple clarifying questions

**Examples:**
- User: "Add user authentication" → Switch to Plan (session vs JWT, storage, middleware decisions)
- User: "Refactor the database layer" → Switch to Plan (large scope, architectural impact)
- User: "Make the app faster" → Switch to Plan (need to profile, multiple optimization strategies)

### Debug Mode (cannot switch to this mode)
Systematic troubleshooting mode for investigating bugs, failures, and unexpected behavior with runtime evidence.

### Ask Mode (cannot switch to this mode)
Read-only mode for exploring code and answering questions without making changes.

## Important Notes

- **Be proactive**: Don't wait for the user to ask you to switch modes
- **Explain briefly**: When switching, briefly explain why in your `explanation` parameter
- **Don't over-switch**: If the current mode is working, stay in it
- **User approval required**: Mode switches require user consent

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

Preserve the original usage guidance, but mark execution as unavailable until mode restrictions are implemented. Do not claim that the host’s mode changed merely because a package setting was updated.

### Compatibility notes and execution status

**Standalone runtime:** MCP `essential_SwitchMode` or CLI `agent-essential call SwitchMode '<json>'`. See [docs/runtime.md](../../docs/runtime.md) and [agent-essential-runtime](../../../agent-essential-runtime). **Cursor host:** prefer native `cursor` tools when available.

Changing a stored mode name does not enforce restrictions. Execution stays unavailable until restrictions are implemented and their scope is documented.

The original definition is captured evidence. Package usage describes package decisions and intended behavior. Host-dependent capabilities require actual support from the current host or an implemented adapter; their mention in the original description does not establish availability.
