import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { RuntimeContext, TodoItem } from "../core/types.js";

export interface SessionState {
  mode: "agent" | "plan";
}

export interface GoalState {
  goalId: string;
  objective: string;
  status: "active" | "complete";
}

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function todosPath(ctx: RuntimeContext): string {
  return join(ctx.stateDir, "todos.json");
}

export function sessionPath(ctx: RuntimeContext): string {
  return join(ctx.stateDir, "session.json");
}

export function goalPath(ctx: RuntimeContext): string {
  return join(ctx.stateDir, "goal.json");
}

export function readTodos(ctx: RuntimeContext): TodoItem[] {
  return readJson<TodoItem[]>(todosPath(ctx), []);
}

export function writeTodos(ctx: RuntimeContext, todos: TodoItem[]): void {
  writeJson(todosPath(ctx), todos);
}

export function readSession(ctx: RuntimeContext): SessionState {
  return readJson<SessionState>(sessionPath(ctx), { mode: "agent" });
}

export function writeSession(ctx: RuntimeContext, session: SessionState): void {
  writeJson(sessionPath(ctx), session);
}

export function readGoal(ctx: RuntimeContext): GoalState | null {
  return readJson<GoalState | null>(goalPath(ctx), null);
}

export function writeGoal(ctx: RuntimeContext, goal: GoalState | null): void {
  if (goal === null) {
    writeJson(goalPath(ctx), null);
    return;
  }
  writeJson(goalPath(ctx), goal);
}
