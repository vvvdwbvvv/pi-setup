import type { ToolId, ToolHandler } from "./types.js";
import { handleDelete } from "../handlers/delete.js";
import { handleWebFetch } from "../handlers/webFetch.js";
import { handleTodoWrite } from "../handlers/todoWrite.js";
import { handleEditNotebook } from "../handlers/editNotebook.js";
import { handleReadLints } from "../handlers/readLints.js";
import { handleWebSearch } from "../handlers/webSearch.js";
import { handleGenerateImage } from "../handlers/generateImage.js";
import { handleAwaitShell } from "../handlers/awaitShell.js";
import { handleFetchMcpResource } from "../handlers/fetchMcpResource.js";
import { handleSwitchMode } from "../handlers/switchMode.js";
import { handleCreateGoal, handleUpdateGoal } from "../handlers/createGoal.js";
import { handleTask } from "../handlers/task.js";
import { stubHandler } from "../handlers/stub.js";

function wrap(fn: ToolHandler["handle"]): ToolHandler {
  return { implemented: true, handle: fn };
}

const HANDLERS: Record<ToolId, ToolHandler> = {
  Delete: wrap(handleDelete),
  WebFetch: wrap(handleWebFetch),
  TodoWrite: wrap(handleTodoWrite),
  EditNotebook: wrap(handleEditNotebook),
  ReadLints: wrap(handleReadLints),
  WebSearch: wrap(handleWebSearch),
  GenerateImage: wrap(handleGenerateImage),
  AwaitShell: wrap(handleAwaitShell),
  FetchMcpResource: wrap(handleFetchMcpResource),
  SwitchMode: wrap(handleSwitchMode),
  CreateGoal: wrap(handleCreateGoal),
  UpdateGoal: wrap(handleUpdateGoal),
  Task: wrap(handleTask),
};

export function getHandler(toolId: ToolId): ToolHandler {
  return HANDLERS[toolId] ?? { implemented: false, handle: stubHandler(toolId) };
}
