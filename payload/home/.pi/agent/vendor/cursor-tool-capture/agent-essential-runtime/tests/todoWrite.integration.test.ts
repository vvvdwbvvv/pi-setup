import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createRuntime } from "../src/index.js";

test("TodoWrite merge by id", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "aer-ws-todo-"));
  const stateDir = mkdtempSync(join(tmpdir(), "aer-st-todo-"));
  const rt = createRuntime({ workspaceRoot: workspace, stateDir });
  const initial = await rt.call("TodoWrite", {
    merge: false,
    todos: [
      { id: "1", content: "a", status: "pending" },
      { id: "2", content: "b", status: "pending" },
    ],
  });
  assert.equal(initial.ok, true);
  const merged = await rt.call("TodoWrite", {
    merge: true,
    todos: [
      { id: "1", content: "a2", status: "in_progress" },
      { id: "2", content: "b", status: "pending" },
    ],
  });
  assert.equal(merged.ok, true);
  if (merged.ok) {
    const data = merged.data as { todos: Array<{ id: string; content: string }> };
    const one = data.todos.find((t) => t.id === "1");
    assert.equal(one?.content, "a2");
    assert.equal(data.todos.length, 2);
  }
});
