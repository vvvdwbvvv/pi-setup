# Standalone runtime（agent-essential-runtime）

[cursor-essential](../) 保存工具契約；實際執行由同 repo 的 [agent-essential-runtime](../../agent-essential-runtime/) 提供（MCP + CLI），**不依賴 Cursor IDE**。

完整操作步驟見 [agent-essential-runtime/docs/usage-manual.md](../../agent-essential-runtime/docs/usage-manual.md)（CLI、`call` 範例、MCP 註冊、ToolResult、選用 env）。

## 安裝

```bash
cd ../agent-essential-runtime
npm install
npm run build
```

## MCP

```json
{
  "mcpServers": {
    "agent-essential": {
      "command": "node",
      "args": ["ABS_PATH/agent-essential-runtime/dist/src/surfaces/cli/main.js", "mcp"],
      "env": {
        "AGENT_ESSENTIAL_WORKSPACE_ROOT": "/your/project",
        "AGENT_ESSENTIAL_STATE_DIR": "/your/state"
      }
    }
  }
}
```

MCP 工具名稱前綴為 `essential_`（例如 `essential_Delete`）。

## CLI

```bash
node ABS_PATH/agent-essential-runtime/dist/src/surfaces/cli/main.js list
node ABS_PATH/agent-essential-runtime/dist/src/surfaces/cli/main.js call Delete '{"path":"/abs/file"}'
```

## 環境變數

| 變數 | 用途 |
|------|------|
| `AGENT_ESSENTIAL_WORKSPACE_ROOT` | 工作區沙箱根目錄 |
| `AGENT_ESSENTIAL_STATE_DIR` | todos、goals、session、shell job 狀態 |
| `AGENT_ESSENTIAL_ALLOW_OUTSIDE_WORKSPACE` | 設為 `true` 允許 workspace 外路徑 |
| `AGENT_ESSENTIAL_SEARCH_API_KEY` | WebSearch（Brave） |
| `AGENT_ESSENTIAL_IMAGE_API_KEY` | GenerateImage（OpenAI Images API） |
| `AGENT_ESSENTIAL_MCP_SERVERS` | FetchMcpResource 的 JSON server 對照表 |
| `AGENT_ESSENTIAL_TASK_EXECUTOR` | Task 的外部 CLI 指令 |

## 工具 parity 與 Cursor 差異

| ToolId | parity | Cursor 差異摘要 |
|--------|--------|-----------------|
| Delete | native | 無 IDE 確認對話框 |
| TodoWrite | native | 無 UI 面板，狀態在 state 目錄 |
| WebFetch | adapted | 無 JS 渲染、無 Smart Mode approval |
| EditNotebook | adapted | 不執行 kernel |
| ReadLints | adapted | 執行 eslint（若設定存在），非 LSP |
| WebSearch | adapted | 需 Brave API key |
| GenerateImage | adapted | 需 image API key，無 client 內建預覽 |
| AwaitShell | adapted | 本 runtime 的 job 模型，非 Cursor terminal 檔 |
| FetchMcpResource | adapted | 使用 `AGENT_ESSENTIAL_MCP_SERVERS` |
| SwitchMode | adapted | 僅 session 旗標，不改 IDE mode |
| CreateGoal / UpdateGoal | adapted | 無 Cursor Goal UI |
| Task | unsupported* | 需設定 `AGENT_ESSENTIAL_TASK_EXECUTOR` |

在 Cursor 內仍建議使用原生 `cursor` 命名空間工具（若可用）。
