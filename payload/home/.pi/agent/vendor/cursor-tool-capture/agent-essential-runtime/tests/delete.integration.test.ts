import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createRuntime } from "../src/index.js";

test("Delete removes file inside workspace", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "aer-ws-"));
  const stateDir = mkdtempSync(join(tmpdir(), "aer-st-"));
  const file = join(workspace, "remove-me.txt");
  writeFileSync(file, "x", "utf8");
  const rt = createRuntime({ workspaceRoot: workspace, stateDir });
  const result = await rt.call("Delete", { path: file });
  assert.equal(result.ok, true);
  assert.equal(existsSync(file), false);
});

test("Delete graceful when missing", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "aer-ws2-"));
  const stateDir = mkdtempSync(join(tmpdir(), "aer-st2-"));
  const rt = createRuntime({ workspaceRoot: workspace, stateDir });
  const missing = join(workspace, "nope.txt");
  const result = await rt.call("Delete", { path: missing });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "not_found");
  }
});
