---
name: update-goal
description: "Update the current session goal using the preserved UpdateGoal contract. Execution is not implemented."
---

# UpdateGoal

## Original definition

Source: `native-schemas-runtime-discovered.json`, tool `UpdateGoal`. Read [the preserved definition](references/original-definition.json) for the complete original description and runtime inputSchema before use. The frontmatter description is package discovery metadata; the captured description below is unchanged.

### Captured description

Update the existing goal's status. Set status to `complete` only when the objective has actually been achieved and no required work remains, unless the user explicitly requests to stop the goal. You cannot use this tool to pause a goal; that is controlled by the user. However, if the user paused and asks you to resume, you can set it to `active`.

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

Mark a goal complete only when the objective has been achieved and no required work remains, or when the user explicitly requests that the goal stop. The program records the Agent’s judgment; it does not independently verify achievement.

### Compatibility notes and execution status

**Package status: execution unavailable.** This Skill contains instructions and preserved definitions. No bundled execution program or adapter has been implemented. Do not invent an executable command or report an operation as completed.

If the user requests that a goal stop, report it as stopped at the user’s request rather than claiming the objective was achieved. This is a package interpretation of the captured active/complete status contract.

The original definition is captured evidence. Package usage describes package decisions and intended behavior. Host-dependent capabilities require actual support from the current host or an implemented adapter; their mention in the original description does not establish availability.
