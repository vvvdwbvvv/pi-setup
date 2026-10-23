import type { RuntimeContext, TodoItem, ToolResult } from "../core/types.js";
import { ok } from "../core/errors.js";
import { readTodos, writeTodos } from "../infra/stateStore.js";

export async function handleTodoWrite(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const { todos, merge } = args as { todos: TodoItem[]; merge: boolean };
  if (!merge) {
    writeTodos(ctx, todos);
    return ok({ todos });
  }
  const existing = readTodos(ctx);
  const byId = new Map(existing.map((t) => [t.id, { ...t }]));
  for (const item of todos) {
    const prev = byId.get(item.id);
    byId.set(item.id, {
      id: item.id,
      content: item.content ?? prev?.content ?? "",
      status: item.status ?? prev?.status ?? "pending",
    });
  }
  const merged = [...byId.values()];
  writeTodos(ctx, merged);
  return ok({ todos: merged });
}
