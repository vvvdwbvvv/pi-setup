import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("tools.json has 13 tools with essential_ prefix", () => {
  const path = join(__dirname, "../../contracts/tools.json");
  const manifest = JSON.parse(readFileSync(path, "utf8")) as {
    tools: Array<{ toolId: string; mcpName: string; parity: string }>;
  };
  assert.equal(manifest.tools.length, 13);
  for (const t of manifest.tools) {
    assert.ok(t.mcpName.startsWith("essential_"));
    assert.ok(["native", "adapted", "unsupported"].includes(t.parity));
  }
});
