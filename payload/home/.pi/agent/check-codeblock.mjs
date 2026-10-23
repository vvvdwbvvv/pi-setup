import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = "@@PI_MIGRATION_HOME@@/.pi/agent/pi-runtime/node_modules/@earendil-works/pi-coding-agent";
const require = createRequire(`${root}/package.json`);
const { createJiti } = require("jiti");
const jiti = createJiti(import.meta.url, {
  alias: Object.fromEntries(["pi-ai", "pi-coding-agent", "pi-tui"].map(name => {
    const id = `@earendil-works/${name}`;
    return [id, name === "pi-coding-agent" ? `${root}/dist/index.js` : `${root}/node_modules/${id}/dist/index.js`];
  })),
});
const { default: extension } = await jiti.import(fileURLToPath(new URL("./extensions/codeblock.ts", import.meta.url)));
let tool;
let command;
extension({
  registerTool(value) { tool = value; },
  registerCommand(name, value) { assert.equal(name, "copy-code"); command = value; },
});
assert.equal(tool.renderShell, "self");
const code = 'printf "%s\\n" "中文"\n  echo "preserve indent"\n';
const result = await tool.execute("test", { code, language: "bash" });
assert.equal(result.details.code, code);
const theme = { fg: (_token, text) => text };
for (const width of [12, 40, 100]) {
  const lines = tool.renderResult(result, {}, theme).render(width);
  const plain = lines.map(line => line.replace(/\x1b\[[0-9;]*m/g, ""));
  assert(plain.every(line => !line.startsWith("┃") && !line.startsWith("│")));
  assert(plain.join("\n").includes("printf"));
}
const notices = [];
const ctx = {
  sessionManager: { getBranch: () => [] },
  ui: {
    notify: (text, severity) => notices.push({ text, severity }),
    select: async (_title, labels) => labels[0],
  },
};
await command.handler("", ctx);
assert.equal(notices.at(-1).severity, "warning");
ctx.sessionManager.getBranch = () => [{
  type: "message",
  message: { role: "toolResult", toolName: "display_codeblock", details: result.details },
}];
const previous = execFileSync("/usr/bin/pbpaste");
try {
  await command.handler("", ctx);
  assert.equal(notices.at(-1).severity, "info");
  assert.equal(execFileSync("/usr/bin/pbpaste", { encoding: "utf8" }), code);
  const newer = { type: "message", message: {
    role: "toolResult", toolName: "display_codeblock", details: { code: "echo newer\n", language: "bash" },
  } };
  const older = ctx.sessionManager.getBranch()[0];
  const failed = { type: "message", message: {
    role: "toolResult", toolName: "display_codeblock", isError: true, details: { code: "ignore me" },
  } };
  ctx.sessionManager.getBranch = () => [older, newer, failed];
  ctx.ui.select = async (_title, labels) => {
    assert.equal(labels.length, 2);
    assert.equal(labels[0], "1. bash · echo newer");
    assert.equal(labels[1], '2. bash · printf "%s\\n" "中文"');
    return labels[1];
  };
  await command.handler("", ctx);
  assert.equal(execFileSync("/usr/bin/pbpaste", { encoding: "utf8" }), code);
  ctx.ui.select = async (_title, labels) => labels[0];
  await command.handler("", ctx);
  assert.equal(execFileSync("/usr/bin/pbpaste", { encoding: "utf8" }), "echo newer\n");
  ctx.ui.select = async () => undefined;
  await command.handler("", ctx);
  assert.equal(execFileSync("/usr/bin/pbpaste", { encoding: "utf8" }), "echo newer\n");
} finally {
  execFileSync("/usr/bin/pbcopy", [], { input: previous });
}
console.log("PASS: extension loads, borderless rendering, newest-first menu previews, older/newer selection, failed-result filtering, cancel leaves clipboard unchanged, exact clipboard round trip. Previous clipboard text restored.");
