import { unlinkSync, existsSync, lstatSync } from "node:fs";
import type { RuntimeContext } from "../core/types.js";
import { fail, ok } from "../core/errors.js";
import { resolveWorkspacePath } from "../infra/paths.js";

export async function handleDelete(
  args: unknown,
  ctx: RuntimeContext,
): Promise<import("../core/types.js").ToolResult> {
  const { path } = args as { path: string };
  const resolved = resolveWorkspacePath(ctx, path);
  if (!resolved.ok) {
    return resolved.result;
  }
  const target = resolved.path;
  if (!existsSync(target)) {
    return fail("not_found", "File does not exist", { path: target });
  }
  try {
    const stat = lstatSync(target);
    if (stat.isDirectory()) {
      return fail("execution_failed", "Path is a directory, not a file", {
        path: target,
      });
    }
    unlinkSync(target);
    return ok({ deleted: true, path: target });
  } catch (err) {
    return fail("execution_failed", "Could not delete file", {
      path: target,
      error: String(err),
    });
  }
}
