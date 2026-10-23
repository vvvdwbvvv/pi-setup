import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { RuntimeContext } from "../core/types.js";

export interface Diagnostic {
  path: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
}

export function runLinters(
  ctx: RuntimeContext,
  paths: string[] | undefined,
): { diagnostics: Diagnostic[]; warning?: string } {
  const targetPaths = paths?.length
    ? paths
    : [ctx.workspaceRoot];
  const diagnostics: Diagnostic[] = [];
  const eslintConfig = join(ctx.workspaceRoot, "eslint.config.js");
  const eslintLegacy = join(ctx.workspaceRoot, ".eslintrc.cjs");
  if (existsSync(eslintConfig) || existsSync(eslintLegacy)) {
    const args = ["eslint", "--format", "json", ...targetPaths];
    const result = spawnSync("npx", args, {
      cwd: ctx.workspaceRoot,
      encoding: "utf8",
    });
    if (result.stdout) {
      try {
        const parsed = JSON.parse(result.stdout) as Array<{
          filePath: string;
          messages: Array<{
            line: number;
            column: number;
            message: string;
            severity: number;
          }>;
        }>;
        for (const file of parsed) {
          for (const msg of file.messages) {
            diagnostics.push({
              path: file.filePath,
              line: msg.line,
              column: msg.column,
              message: msg.message,
              severity: msg.severity === 2 ? "error" : "warning",
            });
          }
        }
      } catch {
        /* ignore parse errors */
      }
    }
    return { diagnostics };
  }
  return {
    diagnostics: [],
    warning: "No eslint configuration found in workspace; returning empty diagnostics",
  };
}
