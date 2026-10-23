# Pi 整合遷移包

## GitHub 工作流程（clone 即可用）

`migrate.py export --repo` 會產生一個可直接上傳 GitHub 的目錄（預設輸出 `~/pi-migration/repo`），包含 Pi 本體鎖定檔、插件、自訂 extension、skills、主題、本機套件與 MCP runtime 原始碼、`migrate.py`、`README.md`、`install.sh`，以及 `.gitignore`。**不含任何憑證、sessions 或快取。**

```sh
cd ~/pi-migration/repo
# 推上 GitHub（第一次）
git init && git add -A && git commit -m "pi setup"
# 建立遠端（gh cli），或先在 github.com 建好空 repo 再 git remote add
gh repo create <你/pi-setup> --public --source . --push
```

新機器只需要：

```sh
git clone https://github.com/<你>/pi-setup.git
cd pi-setup
./install.sh
```

`install.sh` 會先 `verify`（SHA-256 + 路徑檢查）再執行 `restore --allow-install-scripts`。前置需求與還原後的 `/login`、環境變數設定與 `bundle` 流程**，詳見下方。不想在 GitHub 暴露內容可改用私有 repo（`--private`）。

> **注意** `repo` 模式是「可重現的**」：所有本機套件原始碼與 lock 檔都放進 repo，clone 下來即可重建，不需再存取原機器。

這份工具將目前電腦的 Pi 安裝版本、插件、skills、主題、自訂 extension 與本機 MCP runtime 整合成一份可搬移的快照。**不修改來源 Pi，也不讀取或搬移 `~/.ssh`。**

## 新電腦快速還原（macOS / Linux）

1. 安裝 **Python 3.9+、Node.js 22.19+（建議沿用來源 Node 24）與 npm**。如果需要 always-on worker，另裝 `tmux`；搜尋功能建議裝 `ripgrep`（`rg`）。Pi Lens 的各語言 LSP／分析器仍依專案需求安裝。
2. 將 `bundle.tar.gz` 搬到新電腦並解壓：`tar -xzf bundle.tar.gz`。
3. 進入解壓後的 `bundle/`，依序執行：

```sh
python3 migrate.py verify
python3 migrate.py restore --dry-run
python3 migrate.py restore --allow-install-scripts
export PATH="$HOME/.local/bin:$PATH"
python3 migrate.py doctor
pi
```

在 Pi 裡重新 `/login`，並重新設定 `INCEPTION_API_KEY` 等必要環境變數。請用密碼管理器或作業系統的安全儲存機制傳遞金鑰，不要放進這份資料夾。

還原程式會在 `~/.pi/agent/pi-runtime/` 安裝鎖定的 Pi，建立 `~/.local/bin/pi` 啟動器，不需要 `sudo`，也不改動全域 npm 安裝或 shell 設定。請自行把 `~/.local/bin` 加到 shell 的 PATH。**既有 shell alias/function 若攔截 `pi`，請調整它，或直接執行 `~/.local/bin/pi`。**

完整還原需要網路下載 npm 相依套件，且必須明確加上 `--allow-install-scripts` 表示你信任套件程式碼。Pi 使用 `npm ci --ignore-scripts`；插件使用 `npm ci --legacy-peer-deps`，保留 Pi 不另裝 host peer dependency 的策略，避免重複安裝另一版 Pi。插件與本機 runtime **會執行套件安裝／編譯腳本**。只使用你信任來源的遷移包。

## 包含什麼

- Pi 的來源版本，以及新產生的完整 npm 相依鎖定檔。
- 已安裝的 6 個 npm 套件及其原有 `package-lock.json`：`pi-web-access`、`pi-lens`、`context-mode`、`pi-simplify`、`@plannotator/pi-extension`、`@sting8k/pi-droid-styling`。設定中的套件宣告鎖定為實際安裝版本。
- Git 主題套件 `pi-themes` 的工作目錄快照與來源 commit 記錄，不需要再存取原 Git 倉庫。
- 本機套件 `pi-grok-ask-user-question`、`cursor-essential`、`estack` 的原始碼快照。
- `agent-essential-runtime` 的原始碼和鎖定檔；還原時重新編譯，並保留與 `cursor-essential` 的相鄰目錄關係。
- `~/.pi/agent/extensions/` 的自訂 extension、全域 `~/.agents/skills/`、`~/.pi/subagents/`。
- Pi 設定、追加指令、樣式設定、statusline／starship 設定及其他 agent 根目錄的小型文字設定。若有 `skills/`、`prompts/`、`themes/` 也會帶走。

為了讓乾淨安裝能載入全部自訂 extension，快照內的 `inception/index.ts` 與 `subagents/runner.ts` 會把 `calculateCost` 的匯入改用 Pi 提供的根 compat 入口，避開 Pi 1.3 的子路徑 alias 問題；函式本身不變，原機檔案也不變。修改清單記於 `manifest.json` 的 `compatibilityPatches`。

本機套件集中至 `~/.pi/agent/vendor/`，設定自動改指這些路徑。MCP 的 Node 指令改為從 PATH 找 `node`；來源 home 及 Node 全域套件的絕對路徑會改指新位置。來源 `Personal`／`personal` 大小寫差異也會統一，避免 Linux 找不到檔案。

快照涵蓋**這台機器的使用者層級設定**，不是任意 Pi 安裝的通用備份器。專案各自的 `.pi/`、`.agents/`、shell 設定、外部語言伺服器、其他 IDE 設定不在範圍內。

## 不包含什麼

- `auth.json`、`mcp-auth.json`、`.env*`、`.npmrc`、私鑰檔。
- 對話、sessions、worker 執行狀態、專案信任記錄、模型目錄快取。
- Context Mode 的知識庫／記憶、Pi Lens 的索引／日誌／快取。
- `node_modules`、Git 歷史、原機器的原生執行檔；在目的機重新安裝／編譯，避免 CPU 或作業系統不相容。

匯出時會遮蔽 JSON 中常見的憑證欄位、目前環境／Pi auth 中辨識到的金鑰，以及部分高辨識度的 API token 格式。已知短憑證（少於 12 字元）若出現在非憑證欄位的文字中，會停止匯出，避免直接取代短字串而破壞程式；不會默默漏掉它。需要重填的欄位會出現 `__PI_MIGRATION_SECRET_REQUIRED__`，清單在 `manifest.json` 的 `redactions`。`environmentNames` 只記錄可能需要的環境變數**名稱**，沒有值，也不代表每個名稱都是 Pi 必需。

**這不是通用機密掃描器。** 本機原始碼、指令範本、文件中可能有未辨識的敏感資訊；不要把遷移包公開。SHA-256 只能偵測意外損壞，不能證明下載來源可信，也不是數位簽章。

## 安全還原、備份與測試

已有 `~/.pi/agent`、`~/.pi/subagents`、`~/.agents/skills` 或 `~/.local/bin/pi` 時，預設拒絕覆蓋。

```sh
# 明確同意取代；衝突目錄／啟動器先完整備份
python3 migrate.py restore --replace --allow-install-scripts
```

備份在 `~/.pi/migration-backups/<UTC時間>/`，保留相對 home 的目錄結構。**這是取代，不是合併。** 舊的其他 skills、登入與對話留在備份，不會自動匯入新設定；尤其 `~/.agents/skills` 可能也供其他 agent 使用，請先確認。安裝失敗會嘗試移除本次寫入的目錄並回復原備份。

匯出的檔案權限限制為使用者可讀寫（`0600`），原本有執行權限的檔案為 `0700`，不保留 group/other 權限。遷移包是個人使用，不適用共用帳號部署。

也可先還原到隔離目錄，不安裝任何套件：

```sh
python3 migrate.py restore --home /tmp/pi-migration-check --skip-install
```

`--skip-install` 只還原設定與原始碼，**不會產生可用的 Pi 啟動器**；`doctor` 此時回報缺少 runtime 是預期行為。不要對包含 symlink 的目的路徑還原；程式會拒絕這種目標。

`doctor` 檢查 Node 版本、套件路徑、可執行入口與啟動器權限，並執行 `pi --version`，但不會呼叫模型或驗證登入。真實機器還應檢查 `pi --version`、`pi list`、`pi mcp list`、`/subagent`，並做一次模型請求、搜尋與 worker 啟動測試。macOS 到 Linux 的實際還原仍需在 Linux 機器驗證。

## 來源機重新匯出

工具位於 `~/pi-migration/`。每次使用新的輸出名稱：

```sh
python3 ~/pi-migration/migrate.py export --output ~/pi-migration/bundle-next
```

會產生 `bundle-next/` 和 `bundle-next.tar.gz`。輸出目錄不得放進來源設定目錄，也不會覆寫已存在的輸出。

匯出會使用 PATH 中的 `pi`、`npm`、`node` 記錄來源版本，並需要 npm registry 產生 Pi 的完整相依鎖定檔；請在來源機原本的執行環境操作。這份工具針對標準 `~/.pi/agent` 位置；使用自訂 `PI_CODING_AGENT_DIR` 的安裝請先另行調整映射。

## 工具開發測試

```sh
cd ~/pi-migration
python3 -m unittest -v test_migrate.py
```

測試使用暫存目錄與假指令，不會呼叫真實模型、改動 Pi 設定或讀取 SSH 金鑰。
