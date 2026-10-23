import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, "../skills");

const DIR_TO_TOOL = {
  "tool-await-shell": "AwaitShell",
  "tool-create-goal": "CreateGoal",
  "tool-delete": "Delete",
  "tool-edit-notebook": "EditNotebook",
  "tool-fetch-mcp-resource": "FetchMcpResource",
  "tool-generate-image": "GenerateImage",
  "tool-read-lints": "ReadLints",
  "tool-switch-mode": "SwitchMode",
  "tool-task": "Task",
  "tool-todo-write": "TodoWrite",
  "tool-update-goal": "UpdateGoal",
  "tool-web-fetch": "WebFetch",
  "tool-web-search": "WebSearch",
};

const OLD =
  "**Package status: execution unavailable.** This Skill contains instructions and preserved definitions. No bundled execution program or adapter has been implemented. Do not invent an executable command or report an operation as completed.";

for (const dir of readdirSync(skillsDir)) {
  const toolId = DIR_TO_TOOL[dir];
  if (!toolId) continue;
  const path = join(skillsDir, dir, "SKILL.md");
  let text = readFileSync(path, "utf8");
  const replacement =
    "**Standalone runtime:** MCP `essential_" +
    toolId +
    "` or CLI `agent-essential call " +
    toolId +
    " '<json>'`. See [docs/runtime.md](../../docs/runtime.md) and [agent-essential-runtime](../../../agent-essential-runtime). **Cursor host:** prefer native `cursor` tools when available.";
  if (text.includes(OLD)) {
    text = text.replace(OLD, replacement);
    writeFileSync(path, text, "utf8");
    console.log("updated", dir);
  }
}
