import ajvModule from "ajv";
import type { ToolId } from "./types.js";
import { getToolDefinition } from "./loadManifest.js";
import { fail } from "./errors.js";
import type { ToolResult } from "./types.js";

type ValidateFn = ((data: unknown) => boolean) & { errors?: unknown[] | null };

type AjvConstructor = new (opts?: object) => {
  compile(schema: object): ValidateFn;
};

const Ajv = (ajvModule as unknown as { default: AjvConstructor }).default ??
  (ajvModule as unknown as AjvConstructor);

const ajv = new Ajv({ allErrors: true, strict: false });

export function validateToolArgs(toolId: ToolId, args: unknown): ToolResult | null {
  const def = getToolDefinition(toolId);
  if (!def) {
    return fail("validation_error", `Unknown tool: ${toolId}`);
  }
  const validate = ajv.compile(def.inputSchema);
  if (validate(args)) {
    return null;
  }
  return fail("validation_error", "Arguments failed schema validation", {
    errors: validate.errors ?? null,
  });
}
