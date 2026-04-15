# 資料庫轉換與排版工作流（AI 處理參考指南）

未來在將 Word/Text 文章轉換為 Supabase SQL 寫入格式時，請嚴格遵循以下工作流與格式規範。

---

## Step 1: 解析 MetaData（詮釋資料）

- **ID 命名規則**：`{期數}-{篇序}{標題前2-4字}`
  - 例如：`8-7拆解神聖的帷幕`
- **準確抓取**：
  - 主標題
  - 副標題（需移除前綴的 `──`）
  - 作者
  - 作者頭銜
  - 關鍵字（需移除前綴的 `🌿`）
  - 文章分類（如：評論與回應）

---

## Step 2: 正文 Markdown 轉換與特殊字體標記

### 標題層級
- 段落小標題使用 `### (H3)`

### 粗體 / 標楷體對應
- 使用 `**文字**`
- 在系統規範中，`**` 代表文章中的**標楷體段落**或需特別強調的重點

### 外文與專有名詞斜體規則（🚨 核心易錯區）

❌ **絕對不可**使用 Markdown 的單星號 `*斜體*`（會與系統解析標楷體的規則混淆）

✅ **必須**使用 HTML 的原生標籤 `<i>斜體內容</i>`

#### ✅ 需要加上 `<i>` 的對象
- 外文書籍名稱、宣言、刊物名
  - 例：`<i>The Sacred Canopy</i>`
- 非英文的外文專有詞彙與概念（拉丁文、希臘文、德文、法文等）
  - 例：德文 `<i>Entzauberung</i>`、希臘文 `<i>hairesis</i>`、法文 `<i>Laïcité</i>`

#### ❌ 不需要加上 `<i>` 的對象
- 人名（不論英文、德文或其他語言）
  - 例：Ludwig Feuerbach, Max Weber
- 一般的英文名詞與英文專有名詞
  - 例：Social Constructionism, Secularization, Pluralism

---

## Step 3: 圖片與排版元素轉換

- **圖片佔位符**：將原本的圖片替換為 `[[圖片N]]`
- **圖片 HTML 結構**：依照系統 figure 格式
- **引文區塊**：使用 `<blockquote>...</blockquote>` 包覆大段的獨立引用文字

---

## Step 4: 腳註（Footnotes）處理

- 正文中的註腳標記保留 Markdown 格式：`[^1]`、`[^2]`
- 將文末的註腳內容提取出來，轉換為 **JSONB 陣列格式**
- 腳註陣列中的文字內容，若遇到外文書名或非英文專有詞彙，一樣必須套用 `<i>...</i>` 規則

**格式範例：**
```sql
'[{"id": 1, "text": "腳註內容包含 <i>Book Title</i>"}]'::jsonb
```

---

## Step 5: 產出 SQL Upsert 語法

必須使用 **Upsert 語法**，確保重複寫入不報錯：

```sql
INSERT INTO articles (...)
VALUES (...)
ON CONFLICT (id) DO UPDATE SET ...
```

- 確保 `footnotes`、`seo` 等 JSON 欄位在 SQL 語法中加上 `::jsonb` 轉型標記
- 避免 `ERROR: 23505: duplicate key value violates unique constraint`
