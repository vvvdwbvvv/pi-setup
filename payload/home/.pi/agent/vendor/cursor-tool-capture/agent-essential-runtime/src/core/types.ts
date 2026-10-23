export type ToolId =
  | "AwaitShell"
  | "CreateGoal"
  | "Delete"
  | "EditNotebook"
  | "FetchMcpResource"
  | "GenerateImage"
  | "ReadLints"
  | "SwitchMode"
  | "Task"
  | "TodoWrite"
  | "UpdateGoal"
  | "WebFetch"
  | "WebSearch";

export type Parity = "native" | "adapted" | "unsupported";

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; code: string; message: string; details?: unknown };

export interface RuntimeContext {
  workspaceRoot: string;
  stateDir: string;
  allowOutsideWorkspace: boolean;
  fetchMaxBytes: number;
  fetchTimeoutMs: number;
  searchApiKey?: string;
  searchProvider?: string;
  imageApiKey?: string;
  mcpServersJson?: string;
  taskExecutorCommand?: string;
}

export interface ToolHandler {
  implemented: boolean;
  handle(args: unknown, ctx: RuntimeContext): Promise<ToolResult>;
}

export interface ToolDefinition {
  toolId: ToolId;
  parity: Parity;
  description: string;
  inputSchema: Record<string, unknown>;
  mcpName: string;
}

export interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
}
