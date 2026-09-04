# AI 助理操作手冊 — nonchurch-nuxt 專案

> 適用於 Claude、Cursor、Copilot 等任何 AI 編輯工具。
> 每次開始工作前請先讀完本文件，避免重複踩坑。

---

## ⚠️ 絕對禁止：不得將 .env 或任何 secret 提交進 Git

- **絕對不能**把 `.env` 裡的任何值（API key、密碼、token）硬編碼進任何腳本或程式碼
- 所有 secret 一律從 `process.env.XXX` 讀取，腳本本身只寫變數名稱，不寫值
- 提交前必須確認沒有任何 key 字串（`AIzaSy...`、`sk-...` 等格式）出現在程式碼中
- 違反此規則會導致 GitHub secret scanning 警報、key 洩漏，必須立即 rotate 所有受影響的 key
- **這不是玩笑，也不是選項！** 此規則已於 2026-05-01 因硬編碼 Supabase 密碼而被 GitGuardian 觸發，必須立即旋轉所有受影響的憑證

### 授權操作：Supabase / Cloudinary 直連

AI 獲得**明確授權**可以直接讀取 `.env` 並操作下列資源（登入、寫入、修改、刪除）：

| 服務 | 權限 | 使用方式 |
|------|------|--------|
| **Supabase** | 讀取表格、執行 DDL、INSERT/UPDATE/DELETE | Node.js `pg` 模組 + `.env` 中的 `SUPABASE_DB_*` 變數 |
| **Cloudinary** | 上傳、刪除、改名、列表檔案 | `cloudinary` npm 套件 + `.env` 中的 `CLOUDINARY_*` 變數 |

**但是千萬不要把這些 secret 值洩漏出去！** 操作完畢後，驗證結果但不要在回報或代碼中摻帶任何 key 值、密碼、token。

---

## 專案範疇

本專案是 **無境界者雜誌**（nonchurch Magazine）：
- 路由：`/`、`/issues/`、`/articles/`、`/submit/`
- 核心頁面：期刊瀏覽、文章閱讀、投稿系統
- 管理後台：`/admin/`、`/admin/editor/`、`/admin/submissions_manager/` 等

---

## 一、必讀參考檔案

| 檔案 | 內容 |
|------|------|
| `project_info.txt` | Supabase 資料表結構 + Cloudinary 資料夾結構，了解 schema 時先讀 |
| `stores/word_to_sql.md` | 文章格式規範完整版（HTML 標籤、腳注格式、標楷體等） |
| `tree.txt` | 專案目錄樹（新增/刪除檔案後必須同步更新） |

### Skills（動任何文章、任何一期之前先挑一支讀）

| Skill | 什麼時候用 |
|-------|-----------|
| `nonchurch-house-style` | **格式規範的唯一權威來源**：欄位怎麼填、能用哪些 class、腳注兩套語法、標點、副標命名、分類與篇幅。其他 skill 的格式描述若與它衝突，以它為準 |
| `upload-article` | 別人的完整投稿（網站來稿或 docx）→ 編輯 → 上架。**除了張辰瑋，所有作者都走這條，你是編輯不是代筆** |
| `interview-article` | 人物專訪音檔 → 文章 |
| `chenwei-essay` | 張辰瑋丟素材／概念要你生成草稿（**全刊只有他是這樣接件**）。★2026-09-03 起改為：你備料、查證、擬大綱，**正文交給 Gemini 寫** |
| `issue-frontmatter` | 目次／編輯室報告／本期作者簡介／投稿資訊／編輯資訊 這五張結構頁 |
| `seo-multilang` | SEO 與五語翻譯 |

逐位作者的聲線檔在 `.agents/skills/preserve-nonchurch-author-voice/references/`（48 位，含證據等級），
動別人的稿之前先查——用途是**避免改壞他的聲音**，不是拿來模仿。

**兩棵 skill 樹**：`.claude/skills/`（Claude 用）與 `.agents/skills/`（Codex 等用）內容互為鏡像，
`preserve-nonchurch-author-voice` 只放在 `.agents/`。**改了其中一棵的 SKILL.md，要同步另一棵。**

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

### `server/api/export-word.post.js` / `export-issue-word.post.js`（Word 匯出 API）
- **三模式**，由 `WORD_EXPORT_MODE` 環境變數切換：
  - `disabled`（線上預設）：直接回 503
  - `local_python`：用 `child_process.exec` 跑本機 `python3 scripts/generate_docx.py`
    （production 強制禁止）
  - `remote_python`：把 body 轉送到外部 Python 微服務（`word-export-service/`）
- 線上要能下載：必須部署 `word-export-service/` 到 Render（或其他支援
  Python 的平台），並在 Vercel 設定：
  ```
  WORD_EXPORT_MODE=remote_python
  WORD_EXPORT_SERVICE_URL=https://<render-service>.onrender.com
  WORD_EXPORT_SERVICE_TOKEN=<與服務一致的 token>
  ```

### `scripts/generate_docx.py` + `scripts/render_meta_docx.py`（Python 排版引擎）
- 真正的排版邏輯都在這兩支 Python 腳本（~2000 行）
- 支援格式：`<p>` / `<h2>` / `<h3>` / `<blockquote>` / `.book-quote` /
  `.reference-box` / `.special-box` / `.custom-divider` / `<figure>` / inline 格式
- 圖片：實際下載 Cloudinary 圖片並嵌入 Word
- 腳注：Word 原生 footnote.xml（頁底）
- 本地與線上**共用同一份程式碼**，`word-export-service/app.py` 透過
  `sys.path` 加 repo 根目錄後直接 import，不複製

### `word-export-service/`（Render 微服務）
- Flask wrapper（`app.py`）+ `requirements.txt` + `render.yaml`
- 部署指南見 `word-export-service/README.md`
- 修改 `scripts/*.py` 後 push 即會觸發 Render 自動重新部署

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
- **媒體檔一律不要放進 `public/`**：`public/` 會整包進建置產物，2026-08-25 就是因為 `public/images`（400 MB）＋`public/magazines`（154 MB）把 `.output` 撐到 845 MB，Zeabur 建置卡住、網站 502 近 10 小時。`public/` 只放 favicon、robots.txt 這類小檔。

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
SUPABASE_SECRET_KEY
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

### ✅ Word 下載分拆 Python 微服務（線上也能下載）
- **問題**：原本想用純 Node.js (`docx` npm) 取代 Python，但圖片佔位符跟
  腳注用文末清單呈現都不符合排版需求；改回 Python 後線上又因為
  Vercel 沒有 Python runtime 而壞掉，導致長期只剩本地能下載。
- **修復**：把 `scripts/generate_docx.py` 包成獨立的 Flask 微服務
  （`word-export-service/`），部署到 Render，Vercel 端用
  `WORD_EXPORT_MODE=remote_python` 轉送請求。本地照舊用
  `local_python` 模式直接 exec。
- **限制**：Render 免費版有 15 分鐘冷啟動（第一次下載要等 ~30 秒）。

### ✅ 內文圖片一律用 `[[圖片N]]` 佔位符，不要寫死 URL（2026-08-31）
- **問題**：`publish_article.mjs` 上架時會把 `[[圖片N]]` 換成真實 Cloudinary URL 寫進
  `content`。結果換一張圖就得回頭改內文 HTML，刪掉舊圖後內文還會留死連結。
- **修復**：`publish_article.mjs` 預設**保留佔位符**（要寫死才在 job JSON 加
  `"bakeImageUrls": true`）。`[[圖片N]]` 的 `N` 對應 `media_assets.sort_order`，
  前台 `pages/articles/[id].vue`、`EditorView.vue` 的 RawBlock 預覽、
  `scripts/generate_docx.py` 三邊都會即時解析。
- **換圖流程**：上新圖 → 改 `media_assets` 那一列的 `cloudinary_id`/`image_url` →
  Cloudinary 刪舊圖。內文完全不用動。

### ✅ 腳注上標與下方清單雙向同步（2026-08-31）
- **問題**：在編輯器內文刪掉 `<sup>` 引用，下方腳注清單那一條還在（孤兒）；
  編號也不會自動收斂，重新整理後仍是 1、3、7 這種斷號。
- **修復**（`components/EditorView.vue`）：
  - `syncFootnotesFromDoc()` 掛在主編輯器 `onUpdate`：內文引用變少時，依文件順序
    重建 footnotes 陣列並把上標重編為 1..N。用 `fnSyncing` 旗標擋
    dispatch → onUpdate 的遞迴，用 `queueMicrotask` 避免在 dispatch 中再 dispatch。
  - `renumberFootnotesOnLoad()` 在 `loadArticle` 灌完內文後跑一次，重新整理即重排編號。
  - 安全閥：`title`/`subtitle`/`author`/`author_title`/`remark` 有 `[^N]` 簡寫時整個不動
    （那些編號不歸編輯器管）；還帶文字的孤兒腳註不靜默刪除，只在 console 提示按
    「🔢 重新編號並對齊」；Word 匯入整批換內文期間停用同步。

### ✅ 腳注編號 bug（`fix(editor)` bd19122）
- **問題 1**：`insertFootnoteRef` 內 `fn.id += 1` 在 id 是字串時做拼接
  → 6 → 61 → 611 → 6111。
- **問題 2**：`removeFootnote` 重編陣列 id 但沒同步改寫 `form.content`
  裡的 `<sup>` 引用，刪除後內外編號對不上。
- **問題 3**：Python 端對「空字串內容」直接寫進 Word，產生看不見的
  空腳注。
- **修復**：
  - `loadArticle` 載入時強制 `id: Number(fn.id)`
  - 所有 `fn.id += 1` 改成 `fn.id = Number(fn.id) + 1`
  - `removeFootnote` 補上 HTML 編號位移
  - Python 端對空內容改顯示 `[腳注 N 內容未填]` 佔位符

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
2. 確認 `CLOUDINARY_*` 和 `SUPABASE_SECRET_KEY` 沒有加 `VITE_` 前綴（這些只給後端用）
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
