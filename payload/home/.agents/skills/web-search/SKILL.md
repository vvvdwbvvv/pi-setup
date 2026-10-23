---
name: web-search
description: "Search for current information and external facts through a configured service. Execution is not implemented."
---

# WebSearch

## Original definition

Source: `native-schemas-runtime-discovered.json`, tool `WebSearch`. Read [the preserved definition](references/original-definition.json) for the complete original description and runtime inputSchema before use. The frontmatter description is package discovery metadata; the captured description below is unchanged.

### Captured description

Search web for real-time info on any topic; use for up-to-date facts not in training data, like current events or tech updates. Results include snippets and URLs.

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

Use for current information and external facts. Include specific keywords and relevant versions or dates. Treat search snippets as leads; read the supporting sources before relying on important claims.

### Compatibility notes and execution status

**Package status: execution unavailable.** This Skill contains instructions and preserved definitions. No bundled execution program or adapter has been implemented. Do not invent an executable command or report an operation as completed.

Results depend on the configured search service. A successful search does not verify the returned claims or their freshness.

The original definition is captured evidence. Package usage describes package decisions and intended behavior. Host-dependent capabilities require actual support from the current host or an implemented adapter; their mention in the original description does not establish availability.
