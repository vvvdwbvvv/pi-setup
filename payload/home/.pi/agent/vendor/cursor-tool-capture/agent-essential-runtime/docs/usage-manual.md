# 使用手冊（agent-essential-runtime）

本文件說明如何在 Cursor 以外（或搭配 Cursor）執行 [cursor-essential](../../cursor-essential/) 所保存的 13 個工具契約。若你已在 Cursor 內且可使用原生 `cursor` 命名空間，優先使用原生工具；本 runtime 供 MCP、CLI、CI 與其他 agent 宿主使用。

## 前置條件

你需要 Node.js 20 或以上，以及本 repo 內的 `agent-essential-runtime` 目錄。

## 建置 runtime

在 `agent-essential-runtime` 目錄執行：

```bash
npm install
npm run build
```

建置會執行 `npm run generate`，從 `cursor-essential/references/native-schemas-runtime-discovered.json` 重新產生 `contracts/tools.json`。若你更新了 capture JSON，請再跑一次 `npm run build`。

建置成功後，CLI 入口為：

`dist/src/surfaces/cli/main.js`

## 設定工作區與狀態目錄

多數工具會讀寫檔案或 session 狀態。請設定下列環境變數（CLI 與 MCP 皆適用）。

| 變數 | 建議值 | 說明 |
|------|--------|------|
| `AGENT_ESSENTIAL_WORKSPACE_ROOT` | 你的專案根目錄 | 路徑沙箱預設只允許此目錄內的檔案 |
| `AGENT_ESSENTIAL_STATE_DIR` | 例如 `~/.cache/agent-essential-state` | 存放 `todos.json`、`goal.json`、`session.json`、shell job 紀錄 |

若未設定，`workspaceRoot` 預設為目前工作目錄，`stateDir` 預設為 `<workspaceRoot>/.agent-essential-state`。

若要允許刪除或寫入 workspace 外的絕對路徑，將 `AGENT_ESSENTIAL_ALLOW_OUTSIDE_WORKSPACE` 設為 `true`。預設為 `false`。

## 使用 CLI

CLI 子命令有三個：`list`、`call`、`mcp`。

### 列出工具與 schema

```bash
export AGENT_ESSENTIAL_WORKSPACE_ROOT="/path/to/your/project"
export AGENT_ESSENTIAL_STATE_DIR="/path/to/state"

node dist/src/surfaces/cli/main.js list
```

輸出為 JSON 陣列，每項含 `toolId`、`parity`、`description`、`inputSchema`、`mcpName`。

### 呼叫單一工具

語法：

```bash
node dist/src/surfaces/cli/main.js call <ToolId> '<json-args>'
```

`<ToolId>` 必須與契約一致（例如 `Delete`、`TodoWrite`），大小寫敏感。`<json-args>` 為單行 JSON，需符合該工具的 `inputSchema`。

**Delete 範例**

```bash
node dist/src/surfaces/cli/main.js call Delete '{"path":"/path/to/your/project/tmp.txt"}'
```

成功時 stdout 為：

```json
{ "ok": true, "data": { "deleted": true, "path": "..." } }
```

檔案不存在時仍為合法回應，`ok` 為 `false`，`code` 為 `not_found`。

**TodoWrite 範例**

契約要求 `todos` 至少 2 筆，且必填 `merge`。

```bash
node dist/src/surfaces/cli/main.js call TodoWrite '{
  "merge": false,
  "todos": [
    { "id": "1", "content": "first", "status": "pending" },
    { "id": "2", "content": "second", "status": "pending" }
  ]
}'
```

合併更新時設 `merge` 為 `true`，以 `id` 覆寫或新增項目。

**WebFetch 範例**

```bash
node dist/src/surfaces/cli/main.js call WebFetch '{"url":"https://example.com"}'
```

本 runtime 不做 JavaScript 渲染，也不處理 Cursor 的 Smart Mode approval 欄位（可傳入，但為 no-op）。

### 結束碼

`call` 在 `ok: true` 時結束碼為 0，否則為 1。腳本可依結束碼判斷是否繼續。

## 註冊 MCP（stdio）

在宿主（Cursor、Claude Desktop 等）的 MCP 設定加入：

```json
{
  "mcpServers": {
    "agent-essential": {
      "command": "node",
      "args": [
        "/absolute/path/to/agent-essential-runtime/dist/src/surfaces/cli/main.js",
        "mcp"
      ],
      "env": {
        "AGENT_ESSENTIAL_WORKSPACE_ROOT": "/path/to/your/project",
        "AGENT_ESSENTIAL_STATE_DIR": "/path/to/state"
      }
    }
  }
}
```

將 `args` 中的路徑改為你機器上的絕對路徑。

MCP 對外工具名稱帶前綴 `essential_`，例如 `essential_Delete`、`essential_TodoWrite`。參數 schema 與 CLI 的 `ToolId` 相同，只是名稱不同。

Agent 呼叫 MCP 工具後，回傳為 JSON 字串，結構與 CLI 的 `call` 相同（`ok` / `data` 或 `code` / `message`）。

## 解讀 ToolResult

所有工具回傳同一形狀：

- 成功：`{ "ok": true, "data": { ... } }`
- 失敗：`{ "ok": false, "code": "<code>", "message": "...", "details": { ... } }`（`details` 可省略）

常見 `code`：

| code | 意義 |
|------|------|
| `validation_error` | 參數不符合 JSON Schema |
| `security_denied` | 路徑超出 workspace 沙箱等 |
| `not_found` | 檔案、goal、shell job 不存在 |
| `not_configured` | 缺少 API key 或 MCP 設定 |
| `unsupported` | 需宿主能力（例如未設定 Task executor） |
| `execution_failed` | 執行錯誤（HTTP、檔案系統、外部命令） |

`contracts/tools.json` 中每工具的 `parity` 標示與 Cursor 原生的接近程度：`native`、`adapted`、`unsupported`（契約層級）。詳細差異見 [cursor-essential/docs/runtime.md](../../cursor-essential/docs/runtime.md) 的 parity 表。

## 選用功能與環境變數

下列工具需要額外設定。

**WebSearch**

- 設定 `AGENT_ESSENTIAL_SEARCH_API_KEY`（Brave Search API）。
- 可選 `AGENT_ESSENTIAL_SEARCH_PROVIDER`，預設為 `brave`。

**GenerateImage**

- 設定 `AGENT_ESSENTIAL_IMAGE_API_KEY`（目前實作使用 OpenAI Images API）。

**FetchMcpResource**

- 設定 `AGENT_ESSENTIAL_MCP_SERVERS` 為 JSON 物件，鍵為 server 名稱，值含 `command` 與可選 `args`、`env`。handler 會以 stdio 連線並讀取 resource URI。

**Task**

- 設定 `AGENT_ESSENTIAL_TASK_EXECUTOR` 為可執行檔路徑。runtime 會以單一 JSON 字串參數呼叫該命令。未設定時回傳 `unsupported`。

**WebFetch 限制**

- `AGENT_ESSENTIAL_FETCH_MAX_BYTES` 預設 2097152（2 MiB）。
- `AGENT_ESSENTIAL_FETCH_TIMEOUT_MS` 預設 30000。

## 在程式中嵌入

若你使用 Node ESM，可 import 公開 API：

```typescript
import { createRuntime } from "agent-essential-runtime";

const rt = createRuntime({
  workspaceRoot: "/path/to/project",
  stateDir: "/path/to/state",
});

const result = await rt.call("Delete", { path: "/path/to/file" });
```

`package.json` 的 `exports` 僅暴露 `createRuntime` 與型別；請勿依賴 `handlers/` 或 `infra/` 內部模組。

## 驗證安裝

在 `agent-essential-runtime` 目錄執行：

```bash
npm test
```

測試包含契約 snapshot、Delete 與 TodoWrite 整合案例。通過表示 `dispatch` 與契約載入正常。

## 相關文件

- [README.md](../README.md)：簡短安裝與 MCP 片段
- [cursor-essential/docs/runtime.md](../../cursor-essential/docs/runtime.md)：parity 與 Cursor 差異對照
- [cursor-essential/skills/](../../cursor-essential/skills/)：各工具 SKILL 與原始 schema 說明
