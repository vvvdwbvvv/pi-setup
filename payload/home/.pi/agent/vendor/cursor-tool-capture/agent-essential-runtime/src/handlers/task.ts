import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { RuntimeContext, ToolResult } from "../core/types.js";
import { fail, ok } from "../core/errors.js";
import { registerShellJob } from "../infra/shellJobs.js";

export async function handleTask(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const input = args as {
    description: string;
    prompt: string;
    run_in_background?: boolean;
    subagent_type?: string;
  };
  if (!ctx.taskExecutorCommand) {
    return fail(
      "unsupported",
      "Task requires AGENT_ESSENTIAL_TASK_EXECUTOR (shell command) in standalone runtime",
    );
  }
  const agentId = randomUUID();
  const outputDir = join(ctx.stateDir, "task-outputs");
  mkdirSync(outputDir, { recursive: true });
  const outputFile = join(outputDir, `${agentId}.txt`);
  const payload = JSON.stringify({
    description: input.description,
    prompt: input.prompt,
    subagent_type: input.subagent_type,
  });

  if (input.run_in_background) {
    const shellId = registerShellJob(
      ctx,
      ctx.taskExecutorCommand,
      [payload],
      ctx.workspaceRoot,
    );
    return ok({
      agentId,
      status: "running",
      shellId,
      outputFile,
    });
  }

  const result = spawnSync(ctx.taskExecutorCommand, [payload], {
    cwd: ctx.workspaceRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const text = result.stdout || result.stderr || "";
  writeFileSync(outputFile, text, "utf8");
  if (result.error || result.status !== 0) {
    return fail("execution_failed", "Task executor failed", {
      agentId,
      outputFile,
      exitCode: result.status,
      error: result.error ? String(result.error) : undefined,
    });
  }
  return ok({
    agentId,
    status: "complete",
    resultText: text,
    outputFile,
  });
}
