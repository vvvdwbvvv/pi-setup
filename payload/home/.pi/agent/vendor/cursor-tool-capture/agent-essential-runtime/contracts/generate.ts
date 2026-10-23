import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type Parity = "native" | "adapted" | "unsupported";

const PARITY_BY_TOOL: Record<string, Parity> = {
  Delete: "native",
  TodoWrite: "native",
  WebFetch: "adapted",
  EditNotebook: "adapted",
  ReadLints: "adapted",
  WebSearch: "adapted",
  AwaitShell: "adapted",
  FetchMcpResource: "adapted",
  GenerateImage: "adapted",
  Task: "unsupported",
  SwitchMode: "adapted",
  CreateGoal: "adapted",
  UpdateGoal: "adapted",
};

export interface ToolContract {
  toolId: string;
  parity: Parity;
  description: string;
  inputSchema: Record<string, unknown>;
  mcpName: string;
}

export interface ToolsManifest {
  generatedFrom: string;
  toolPrefix: string;
  tools: ToolContract[];
}

const TOOL_PREFIX = "essential_";

interface SourceFile {
  tools: Array<{
    tool: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
}

function main(): void {
  const sourcePath = join(
    __dirname,
    "../../cursor-essential/references/native-schemas-runtime-discovered.json",
  );
  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as SourceFile;

  const tools: ToolContract[] = source.tools.map((entry) => {
    const parity = PARITY_BY_TOOL[entry.tool];
    if (!parity) {
      throw new Error(`Missing parity mapping for tool: ${entry.tool}`);
    }
    return {
      toolId: entry.tool,
      parity,
      description: entry.description,
      inputSchema: entry.inputSchema,
      mcpName: `${TOOL_PREFIX}${entry.tool}`,
    };
  });

  const manifest: ToolsManifest = {
    generatedFrom: "cursor-essential/references/native-schemas-runtime-discovered.json",
    toolPrefix: TOOL_PREFIX,
    tools,
  };

  const outPath = join(__dirname, "tools.json");
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${tools.length} tools to ${outPath}`);
}

main();
