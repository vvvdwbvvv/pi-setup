import type { ToolResult } from "./types.js";

export function fail(
  code: string,
  message: string,
  details?: unknown,
): ToolResult {
  return { ok: false, code, message, details };
}

export function ok(data: unknown): ToolResult {
  return { ok: true, data };
}
