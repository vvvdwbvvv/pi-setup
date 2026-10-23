---
name: tool-task
description: "Delegate complex independent work through a configured Agent executor. Standalone execution via agent-essential-runtime (MCP/CLI)."
---

# Task

## Original definition

Source: `native-schemas-runtime-discovered.json`, tool `Task`. Read [the preserved definition](references/original-definition.json) for the complete original description and runtime inputSchema before use. The frontmatter description is package discovery metadata; the captured description below is unchanged.

### Captured description

Launch a new agent to handle complex, multi-step tasks autonomously.

The Task tool launches specialized subagents (subprocesses) that autonomously handle complex tasks. Each subagent_type has specific capabilities and tools available to it.

When using the Task tool, you must specify a subagent_type parameter to select which agent type to use.

If the query is a narrow or specific question, you should NOT use the Task and instead address the query directly using the other tools available to you.

Examples:
- user: "Where is the ClientError class defined?" assistant: [Uses Grep directly - this is a needle query for a specific class]
- user: "Run this query using my database API" assistant: [Calls the MCP directly - this is not a broad exploration task]
- user: "What is the codebase structure?" assistant: [Uses the Task tool with subagent_type="explore"]

If it is possible to explore different areas of the codebase in parallel, you should launch multiple agents concurrently.

When NOT to use the Task tool:
- Simple, single or few-step tasks that can be performed by a single agent (using parallel or sequential tool calls) -- just call the tools directly instead.
- For example:
  - If you want to read a specific file path, use the Read or Glob tool instead of the Task tool, to find the match more quickly
  - If you are searching for code within a specific file or set of 2-3 files, use the Read tool instead of the Task tool, to find the match more quickly
  - If you are searching for a specific class definition like "class Foo", use the Glob tool instead, to find the match more quickly

Usage notes:
- Always include a short description (3-5 words) summarizing what the agent will do
- Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses.
- When the agent is done, it will return a single message back to you. Specify exactly what information the agent should return back in its final response to you.
- Agents can be resumed using the `resume` parameter by passing the agent ID from a previous invocation. This sends a follow-up message after the agent has completed, preserving existing context. If the agent is still running, the request fails unless `interrupt` is true. Set `interrupt` to true only when the user explicitly wants to interrupt the running agent. You can also set `resume` to "self" to fork the current parent agent into a new child subagent. When NOT resuming, each invocation starts fresh and you should provide a detailed task description with all necessary context.
- If you mention an agent or subagent in your response, link it with the `[Name](id)` Don't use generic label such as `[agent]`, `[worker]`, or `[subagent]`. For cloud subagents, when the agent has edited code, link to `[Review](bc-id#changes)`, or, if you know the exact added and deleted line counts, `[Review +A −D](bc-id#changes)`, replacing A and D with those counts. Never write A or D literally. Use `[Try Live](bc-id#desktop)` only when the agent used computer use.
- When using the Task tool, the subagent invocation does not have access to the user's message or prior assistant steps. Therefore, you should provide a highly detailed task description with all necessary context for the agent to perform its task autonomously.
- The subagent's outputs should generally be trusted
- Clearly tell the subagent which tasks you want it to perform, since it is not aware of the user's intent or your prior assistant steps (tool calls, thinking, or messages).
- If the subagent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first. Use your judgement.
- If the user specifies that they want you to run subagents "in parallel", you MUST send a single message with multiple Task tool use content blocks. For example, if you need to launch both a code-reviewer subagent and a test-runner subagent in parallel, send a single message with both tool calls.
- Avoid delegating the full query to the Task tool and returning the result. In these cases, you should address the query using the other tools available to you.

Available subagent_types and descriptions are listed in <available_subagent_types> in the initial user-info message at the start of this conversation.

Available model slugs for subagents are listed in <available_subagent_models> in the initial user-info message at the start of this conversation.

When an agent runs in the background, you will be automatically notified when it completes after you end your own turn - do NOT AwaitShell, poll, or proactively check on its progress. Continue with other work or end your turn instead. Don't mention this to the user.

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

Delegate complex, independent, multi-step work. Handle narrow questions and simple file lookups directly when suitable host tools are available. Provide sufficient context, a clear scope, and the expected result. Resolve the agent type from arguments or explicit configuration. When resuming an agent, retain its previous model and omit model.

### Compatibility notes and execution status

**Standalone runtime:** MCP `essential_Task` or CLI `agent-essential call Task '<json>'`. See [docs/runtime.md](../../docs/runtime.md) and [agent-essential-runtime](../../../agent-essential-runtime). **Cursor host:** prefer native `cursor` tools when available.

Agent execution, model inheritance, attachments, resumption, and interruption require explicit executor support. Cursor UI links, cloud agents, Multitask Mode, and completion notifications are not supplied by these instructions.

The original definition is captured evidence. Package usage describes package decisions and intended behavior. Host-dependent capabilities require actual support from the current host or an implemented adapter; their mention in the original description does not establish availability.
