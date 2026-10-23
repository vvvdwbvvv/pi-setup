import { realpathSync } from "node:fs";
import { isAbsolute, normalize, relative, resolve } from "node:path";
import type { RuntimeContext } from "../core/types.js";
import { fail } from "../core/errors.js";
import type { ToolResult } from "../core/types.js";

export type ResolvedPath =
  | { ok: true; path: string }
  | { ok: false; result: ToolResult };

export function resolveWorkspacePath(
  ctx: RuntimeContext,
  inputPath: string,
): ResolvedPath {
  const absolute = isAbsolute(inputPath)
    ? normalize(inputPath)
    : resolve(ctx.workspaceRoot, inputPath);

  if (!ctx.allowOutsideWorkspace) {
    let workspaceReal: string;
    let targetReal: string;
    try {
      workspaceReal = realpathSync(ctx.workspaceRoot);
      targetReal = realpathSync(absolute);
    } catch {
      const rel = relative(ctx.workspaceRoot, absolute);
      if (rel.startsWith("..") || isAbsolute(rel)) {
        return {
          ok: false,
          result: fail(
            "security_denied",
            "Path is outside the configured workspace root",
            { path: inputPath },
          ),
        };
      }
      return { ok: true, path: absolute };
    }
    const rel = relative(workspaceReal, targetReal);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      return {
        ok: false,
        result: fail(
          "security_denied",
          "Path is outside the configured workspace root",
          { path: inputPath },
        ),
      };
    }
  }
  return { ok: true, path: absolute };
}
