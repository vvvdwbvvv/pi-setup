import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ToolDefinition, ToolId } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ToolsManifestFile {
  generatedFrom: string;
  toolPrefix: string;
  tools: Array<{
    toolId: string;
    parity: ToolDefinition["parity"];
    description: string;
    inputSchema: Record<string, unknown>;
    mcpName: string;
  }>;
}

let cached: ToolsManifestFile | undefined;

export function loadManifest(): ToolsManifestFile {
  if (cached) {
    return cached;
  }
  const path = join(__dirname, "../../../contracts/tools.json");
  cached = JSON.parse(readFileSync(path, "utf8")) as ToolsManifestFile;
  return cached;
}

export function listToolDefinitions(): ToolDefinition[] {
  return loadManifest().tools.map((t) => ({
    toolId: t.toolId as ToolId,
    parity: t.parity,
    description: t.description,
    inputSchema: t.inputSchema,
    mcpName: t.mcpName,
  }));
}

export function getToolDefinition(toolId: ToolId): ToolDefinition | undefined {
  return listToolDefinitions().find((t) => t.toolId === toolId);
}

export function mcpNameToToolId(mcpName: string): ToolId | undefined {
  const entry = loadManifest().tools.find((t) => t.mcpName === mcpName);
  return entry ? (entry.toolId as ToolId) : undefined;
}
