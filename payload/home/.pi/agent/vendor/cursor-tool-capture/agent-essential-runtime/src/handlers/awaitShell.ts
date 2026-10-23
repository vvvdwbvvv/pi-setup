import type { RuntimeContext, ToolResult } from "../core/types.js";
import { fail, ok } from "../core/errors.js";
import { getShellJob, sleepMs } from "../infra/shellJobs.js";

export async function handleAwaitShell(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const input = (args ?? {}) as {
    shell_id?: string;
    block_until_ms?: number;
    pattern?: string;
  };
  const blockMs = input.block_until_ms ?? 30_000;

  if (!input.shell_id) {
    await sleepMs(Math.min(blockMs, 7_140_000));
    return ok({ completed: false, sleptMs: blockMs });
  }

  const deadline = Date.now() + blockMs;
  while (Date.now() < deadline) {
    const job = getShellJob(ctx, input.shell_id);
    if (!job) {
      return fail("not_found", "Unknown shell_id", { shell_id: input.shell_id });
    }
    if (input.pattern) {
      try {
        const re = new RegExp(input.pattern, "m");
        if (re.test(job.output)) {
          return ok({
            completed: job.completed,
            exitCode: job.exitCode,
            output: job.output,
            matched: true,
          });
        }
      } catch (err) {
        return fail("validation_error", "Invalid regex pattern", {
          error: String(err),
        });
      }
    }
    if (job.completed) {
      return ok({
        completed: true,
        exitCode: job.exitCode,
        output: job.output,
      });
    }
    await sleepMs(Math.min(500, deadline - Date.now()));
  }

  const job = getShellJob(ctx, input.shell_id);
  return ok({
    completed: job?.completed ?? false,
    exitCode: job?.exitCode,
    output: job?.output ?? "",
    timedOut: true,
  });
}
