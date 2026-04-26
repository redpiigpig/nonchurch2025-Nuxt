# AI 助理操作手冊 — nonchurch-nuxt 專案

> 適用於 Claude、Cursor、Copilot 等任何 AI 編輯工具。
> 每次開始工作前請先讀完本文件，避免重複踩坑。

---

## 一、必讀參考檔案

| 檔案 | 內容 |
|------|------|
| `project_info.txt` | Supabase 資料表結構 + Cloudinary 資料夾結構，了解 schema 時先讀 |
| `stores/word_to_sql.md` | 文章格式規範完整版（HTML 標籤、腳注格式、標楷體等） |
| `tree.txt` | 專案目錄樹（新增/刪除檔案後必須同步更新） |

---

## 二、大檔案索引（修改前必看）

### `components/EditorView.vue`（文章編輯器，~2500 行）
**修改前先看 ~L.66 的大型區塊注釋**，裡面有：
- 所有 TipTap Extension 說明（KaiTi / FootnoteRef / RawBlock / ItalicI 等）
- 所有主要函數區塊與行號

| 函數區塊 | 大約行號 | 說明 |
|----------|----------|------|
| TipTap Extensions | ~L.134 | KaiTi、FootnoteRef、RawBlock 等自訂節點 |
| `loadArticle` / `saveArticle` | ~L.659 / ~L.820 | 文章讀取與儲存 |
| `exportToWord` | ~L.1003 | 呼叫 `/api/export-word` 下載 Word |
| `insertFootnoteRef` | ~L.1249 | 主內文插入腳注引用 |
| `wrapMiniTag` | ~L.1394 | 腳注欄標楷體/斜體包裹（使用 Range API） |
| ProseMirror 樣式 | ~L.2513 | 主編輯器字型、行距 |
| `.mini-editor-field` 樣式 | ~L.2818 | 腳注輸入欄樣式（與文章顯示一致） |

### `server/api/export-word.post.js`（Word 匯出 API，Node.js 版）
- **純 Node.js 實作，使用 `docx` npm 套件，不需要 Python**
- 處理邏輯：讀取文章 JSON → 解析 HTML 內容 → 建立 Word 文件 → 回傳 base64
- 支援格式：`<p>` / `<h2>` / `<h3>` / `<blockquote>` / `.book-quote` / `.reference-box` / `.special-box` / `.custom-divider` / `<figure>` / inline 格式
- 圖片：顯示「【圖片】」佔位符（不下載遠端圖片）
- 腳注：文末列表（非 Word 原生腳注）

### `scripts/generate_docx.py`（舊版 Python 腳本，~1800 行）
> ⚠️ **此腳本目前未被使用**（部署平台無 Python 環境）。
> 僅做為格式參考保留，不要在 server API 中呼叫它。
> 若未來要移回 Python，需自架有 Python 的伺服器（如 Railway + Dockerfile）。

---

## 三、格式規範（HTML 優先）

- 所有文章內文格式**全面使用 HTML 標籤**，不用 Markdown
- 標楷體：`<span class="kaiti">` ← 不用 `<em>` 或 `*斜體*`
- 斜體（外文書名）：`<i>` ← 不用 `*斜體*`
- 粗體：`<strong>` ← 不用 `**粗體**`
- 腳注引用：正文用 `[^N]`，文末為 JSONB 陣列 `[{"id":1,"text":"..."}]`
- 詳細規範見 `stores/word_to_sql.md`

### Markdown 舊稿相容規則（歷史資料）
- 舊資料若有 `**text**`，視為**標楷體**，轉換成 `<span class="kaiti">text</span>`
- 舊資料若有 `*text*`，視為**粗體**，轉換成 `<strong>text</strong>`
- 舊資料若有 `<em>text</em>`，視為**標楷體**，轉換成 `<span class="kaiti">text</span>`

---

## 四、強制工作流程

### 新增或刪除任何檔案後，必須更新 tree.txt
每次 Write/Edit 新增或刪除頁面、元件、API、工具檔時，
立即更新 `tree.txt`，保持目錄結構與實際一致。

### 每次 AI 修改後，必須提交並上傳 Git
- 只要 AI 完成可運行的修正，就要執行：`git add` → `git commit` → `git push`
- commit 訊息需清楚描述修正目的（例如：修復 Word 匯出、修正 401、調整腳注規則）
- 若 push 失敗，需在回報中明確說明原因（權限、網路、遠端衝突）與下一步處理方式

### 主動操作 Supabase 資料庫（含 DDL）
- 需要查詢、建表、修改 schema 時，**直接讀取 `.env` 取得連線資訊**，不要問使用者
- 連線方式：Node.js `pg` 模組 + `.env` 中的 `SUPABASE_DB_*` 變數：
  ```js
  const { Client } = require('pg');
  const client = new Client({
    host:     process.env.SUPABASE_DB_HOST,
    port:     5432,
    user:     process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl:      { rejectUnauthorized: false }
  });
  ```
- 執行完畢後驗證結果（SELECT 確認筆數或欄位）
- **嚴禁** DROP TABLE / TRUNCATE / DELETE 大範圍資料，執行前必須與使用者確認

### 主動操作 Cloudinary 媒體庫
- 需要查詢圖片、上傳、重新命名時，**直接讀取 `.env`** 取得 `CLOUDINARY_*` 變數
- 使用 `cloudinary` npm 套件或 `/api/media` 後端 API
- 上傳前確認資料夾命名慣例（見下方「Cloudinary 資料夾命名慣例」）
- 刪除操作前必須與使用者確認，不可靜默刪除

### 檔案儲存：一律用 Cloudinary，不用 Supabase Storage
- 使用者使用 Supabase **免費版**，Storage 空間受限
- 所有媒體檔案（圖片、PDF、Word、音訊）**必須上傳 Cloudinary**
- 後端 API：`/api/media`（支援 GET 列表、POST 上傳、PUT 刪除/改名）
- Supabase 僅用於**資料庫**（存 URL、metadata、文章 JSON 等）

### Cloudinary 資料夾命名慣例
```
images/articles/issue-{n}/    ← 文章內文圖片
images/authors/               ← 作者大頭貼
images/covers/                ← 封面圖
images/topics/                ← 徵稿主題圖
covers/                       ← 封面/封底 PDF
submissions/issue-{n}/        ← 投稿的 Word、PDF
submissions/issue-{n}/images/ ← 投稿附圖
magazines/                    ← 合刊 PDF
```

---

## 五、技術架構

| 層次 | 技術 | 說明 |
|------|------|------|
| 框架 | Nuxt 4（Vue 3 Composition API） | SSR + 靜態頁面混合 |
| 資料庫 | Supabase（PostgreSQL） | 文章、作者、投稿等資料 |
| 檔案儲存 | Cloudinary | 所有媒體檔案 |
| 富文字編輯器 | TipTap v3 | 含自訂 Extension |
| Word 匯出 | `docx` npm 套件（Node.js） | 純 server-side，不需 Python |
| Word 解析（投稿輸入） | `mammoth`（client-side，動態 import） | 投稿 Word → HTML |
| AI 分類 | Gemini 2.5 Flash（`/api/classify-article`） | 文章自動分類 |
| 樣式 | 原生 CSS（scoped），全域樣式在 `assets/` | |

---

## 六、環境變數（.env）

```
VITE_SUPABASE_URL
VITE_SUPABASE_KEY
SUPABASE_SERVICE_KEY
VITE_GEMINI_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
GMAIL_USER
GMAIL_APP_PASSWORD
SITE_URL
```

> **注意**：`VITE_` 前綴的變數會暴露到前端 bundle，
> 純後端用的 key（如 Cloudinary、Gmail）不加 `VITE_` 前綴。

### AI 操作規則（環境變數）
- AI 進行 debug 時，**先自行讀取專案根目錄 `.env` 的鍵名是否存在**，不要第一時間回問使用者「有沒有設」。
- 若 shell 內 `process.env` 讀不到，不代表檔案不存在；Nuxt 開發環境會自行載入 `.env`，CLI 子程序可能拿不到。
- 回報時只描述「是否存在/缺少哪個鍵」，**不要回貼任何 secret 值**。
- 只有在 `.env` 鍵名缺失或命名錯誤時，才請使用者補值。

---

## 七、Admin 後台頁面對應

| 路由 | 功能 |
|------|------|
| `/admin` | 期刊發布狀態（+ tab：主題設定） |
| `/admin/issues_manager` | 期刊主題設定（+ tab：發布狀態） |
| `/admin/authors_manager` | 作者管理 |
| `/admin/articles_manager` | 文章管理（含投稿轉文章、Word 下載） |
| `/admin/media_manager` | 媒體庫（Cloudinary 瀏覽/上傳） |
| `/admin/submissions_manager` | 投稿管理 |
| `/admin/editor` | 新增文章（Word 上傳 + Gemini 分類） |
| `/admin/editor/[id]` | 編輯文章（EditorView） |
| `/admin/proofread/[id]` | 校對頁面 |
| `/admin/meta-article/[id]` | 文章 metadata 編輯 + Word 下載 |

---

## 八、已知問題與修復紀錄

### ✅ Word 下載改用 Node.js（原 Python 腳本無法部署）
- **問題**：`generate_docx.py` 依賴 Python + python-docx + Pillow，serverless 平台（Vercel、Render 等）無法執行。
- **修復**：`server/api/export-word.post.js` 完全改用 `docx` npm 套件。
- **限制**：目前圖片顯示為「【圖片】」佔位符；腳注為文末列表（非 Word 原生頁底腳注）。
- **未來強化方向**：可在 `convertBlock('figure')` 段落加入從 Cloudinary 下載圖片並嵌入的邏輯（需加 `https` fetch）。

### ✅ 腳注輸入欄字型與前台顯示不一致
- **問題**：`.mini-editor-field` 使用 `font-size: inherit`（繼承 body 的 1.2rem），前台 `articles/[id]` 腳注顯示為 1rem，視覺落差大。
- **修復**：明確設定 `font-family: "Times New Roman", serif; font-size: 1rem; color: #444`。

### ✅ 腳注欄標楷體按鈕無作用
- **問題**：`wrapMiniTag` 使用已廢棄的 `document.execCommand("insertHTML", ...)` API，在現代瀏覽器不可靠。
- **修復**：改用原生 Range API（`range.extractContents()` + `range.insertNode(el)`）。

---

## 九、常見 Debug 方向

### 部署後 API 報錯
1. 確認 `.env` 變數都已設定在部署平台的環境設定中
2. 確認 `CLOUDINARY_*` 和 `SUPABASE_SERVICE_KEY` 沒有加 `VITE_` 前綴（這些只給後端用）
3. Nuxt 4 server API 放在 `server/api/`，nitro 自動掃描，不需手動註冊

### TipTap 編輯器行為異常
- 自訂 Extension 在 `EditorView.vue` ~L.134 定義
- `FootnoteRef` 節點有特殊的 parseHTML / renderHTML，修改時注意前後一致
- `v-safe-html` directive 在元素有 focus 時不更新 DOM（防止游標跳位），這是正確行為

### 腳注功能
- **主內文**：用 TipTap `FootnoteRef` 節點，`insertFootnoteRef()` 函數處理
- **腳注文字欄**：`contenteditable` div，用 `wrapMiniTag` / `applyMiniFormat` 處理格式
- **前台顯示**：`pages/articles/[id].vue` 的 `footnotesHtml` computed，樣式在 `assets/article.css` `.footnotes` 段落

### Supabase JSONB 欄位
- `footnotes`、`seo`、`proofread_annotations`、`media_data` 都是 JSONB
- 寫入時確保是 JS 物件（Supabase client 自動序列化），讀取時直接用
