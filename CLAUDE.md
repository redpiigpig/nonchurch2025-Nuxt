# Claude Code 工作規範（nonchurch-nuxt 專案）

## 必讀參考檔案
- `project_info.txt` — Supabase 資料表結構 + Cloudinary 資料夾結構，每次需要了解 schema 時先讀此檔

## 大檔案索引（修改前必看）

### `scripts/generate_docx.py`（Word 匯出腳本，~1800 行）
**修改前先看檔案頂部 docstring**，裡面有完整中文函數索引：
- 每個函數名、行號、中文功能說明一覽
- 常見需求對照：書籍簡介框→`_add_book_box`、引言→`_add_blockquote`、inline 格式→`_add_inline`、h3 小標題→`_add_section_title`

### `components/EditorView.vue`（文章編輯器，~2500 行）
**修改前先看 ~L.66 的大型區塊注釋**，裡面有：
- 所有 TipTap Extension 說明（KaiTi / FootnoteRef / RawBlock 等）
- 所有主要函數區塊與行號（loadArticle / saveArticle / remarkEditor / ProseMirror 樣式等）

## 格式規範（HTML 優先）
- 所有文章內文格式**全面使用 HTML 標籤**，不用 Markdown
- 標楷體：`<span class="kaiti">` ← 不用 `<em>` 或 `**`
- 斜體（外文書名）：`<i>` ← 不用 `*斜體*`
- 粗體：`<strong>` ← 不用 `**粗體**`
- 腳注引用正文用 `[^N]`，文末 JSONB 陣列格式
- 詳細規範見 `stores/word_to_sql.md`

## 強制工作流程

### 新增或刪除任何檔案後，必須更新 tree.txt
每次 Write/Edit 新增或刪除頁面、元件、API、工具檔時，
立即更新 `tree.txt`，保持目錄結構與實際一致。

### 檔案儲存規則：一律用 Cloudinary，不用 Supabase Storage
- 使用者使用 Supabase **免費版**，Storage 空間受限
- 所有媒體檔案（圖片、PDF、Word、音訊）**必須上傳 Cloudinary**
- 後端 API：`/api/media`（支援 GET 列表、POST 上傳、PUT 刪除/改名）
- Cloudinary 環境變數：`CLOUDINARY_CLOUD_NAME`、`CLOUDINARY_API_KEY`、`CLOUDINARY_API_SECRET`
- Supabase 僅用於**資料庫**（存 URL、metadata、文章 JSON 等）

### Cloudinary 資料夾命名慣例
```
images/articles/issue-{n}/   ← 文章內文圖片
images/authors/              ← 作者大頭貼
images/covers/               ← 封面圖
images/topics/               ← 徵稿主題圖
covers/                      ← 封面/封底 PDF
submissions/issue-{n}/       ← 投稿的 Word、PDF
submissions/issue-{n}/images/ ← 投稿附圖
magazines/                   ← 合刊 PDF
```

## 技術架構

- **框架**：Nuxt 3（Vue 3 Composition API）
- **資料庫**：Supabase（PostgreSQL）
- **檔案儲存**：Cloudinary（`resource_type: "auto"` 支援任何格式）
- **AI 分類**：Gemini 2.5 Flash（`/api/classify-article`）
- **Word 解析**：mammoth（client-side，動態 import）
- **樣式**：原生 CSS（scoped），全域樣式在 `assets/`

## 環境變數（.env）
```
VITE_SUPABASE_URL
VITE_SUPABASE_KEY
VITE_GEMINI_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

## Admin 後台頁面對應
| 路由 | 功能 |
|------|------|
| `/admin` | 期刊發布狀態（+ tab：主題設定） |
| `/admin/issues_manager` | 期刊主題設定（+ tab：發布狀態） |
| `/admin/authors_manager` | 作者管理 |
| `/admin/articles_manager` | 文章管理（含投稿轉文章） |
| `/admin/media_manager` | 媒體庫（Cloudinary 瀏覽/上傳） |
| `/admin/submissions_manager` | 投稿管理 |
| `/admin/editor` | 新增文章（Word 上傳 + Gemini 分類） |
