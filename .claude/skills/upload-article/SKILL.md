---
name: upload-article
description: 把使用者交付的「文章內文 + 照片（內文圖 / 作者大頭貼 / 原始 docx）」上架到《無境界者》。圖片上 Cloudinary、upsert articles、建/連作者、寫 media_assets，並且★每次都同步備份一份到「投稿管理」（submissions 表 + submissions/ 資料夾）。Use when 使用者給文章內容和照片，要你上傳 / 上架 / 建文章與作者頁（非音檔訪談；訪談用 interview-article）。
---

# 文章 + 照片 上架 Pipeline（含投稿管理備份）

> 使用者每次「給我文章和照片，幫我上傳」都先讀這份 skill。
> 核心工具：[`scripts/publish_article.mjs`](../../../scripts/publish_article.mjs)（純函式有測試：[`scripts/publish_article.test.mjs`](../../../scripts/publish_article.test.mjs)）。

## ⭐ 鐵則：每次上傳都要有一份進「投稿管理」

使用者明確要求——**不論文章是不是從投稿來的，每次上架都要在 `submissions` 表留一筆備份、原始檔也上一份到 `submissions/issue-{n}/`**。
`publish_article.mjs` 第 6 步已內建這件事（`status=converted`、`article_id` 連回文章、同一篇只留一筆、重跑會更新不會重複）。**不要手動只寫 articles 而跳過這步。**

---

## 零、接件流程（使用者把檔案丟在專案根目錄）

使用者的固定交付方式：**把要上架的檔案直接放在專案根目錄**（docx / txt / md 內文 + jpg/png 照片），然後說「幫我上架」。照下面順序做，每一步都不要跳：

1. **盤點根目錄新檔案**：`ls` 根目錄，找出非專案檔的 docx/txt/md/jpg/png。docx 用 `npx mammoth 檔名.docx` 或 python-docx 讀出內文；分不清哪張圖是內文圖、哪張是大頭貼時**直接問使用者一次**問清全部。
2. **辨識作者（常見作者對照表，先比對這張，不確定再查 DB）**：

   | 作者 | author_id | 慣用 category/section |
   |------|-----------|----------------------|
   | 張辰瑋 | 2 | 生命故事 或 評論與回應 / 主題廣場（他的稿改用 [chenwei-essay](../chenwei-essay/SKILL.md)）|
   | 金子煥 | 5 | 公告與剪影 或 專題文章 / 多元講堂 |
   | 毛毛 | 10 | 評論與回應 / 多元講堂 |
   | 廖本恩 | 1 | 專題文章 / 主題廣場 |
   | Sunny Leung | 8 | 生命故事 / 主題廣場 |
   | 奧斯定 | 4 | 評論與回應 / 主題廣場 |
   | 邱詠恩 | 3 | 專題文章 / 主題廣場 |
   | 淨智 | 14 | 時事評論 / 多元講堂 |
   | 王微儂 | 47 | 生命故事 或 文藝創作 / 主題廣場 |

   - 表上沒有的名字 → 查 DB：`SELECT id,name FROM authors`（走 REST，見第六節）。DB 也沒有才視為**新作者**（需要大頭貼與 bio，走 `newAuthor`）。
   - 表是 2026-07 的快照，同名不同人或有疑慮時以 DB 為準。
   - 既有作者一律填 `"linked_author_ids": [id]`，**不要**再建 `newAuthor`。
3. **定分類**：先套上表該作者的慣用 category/section；主題與該期封面故事直接相關時改「封面故事/主題介紹」。拿不準跑 `SELECT id,category,section FROM articles WHERE issue=N` 看同期慣例。
4. **定 id 與序號**：`SELECT id FROM articles WHERE issue=N` 看已佔用的 `{issue}-{order}`，取下一個空號（或依使用者指定的目次位置）。
5. 之後照本 skill 一 → 二 → 三 → 五 執行（寫描述檔 → dry-run → 正式跑 → 驗證）。
6. **收尾**：上架成功後把根目錄的交付檔案移到 `temp/`（已 gitignore）或問使用者是否可刪，**不要 commit 這些原始檔**。

---

## 一、開工 checklist

- [ ] 先跑測試確認工具沒壞：`node scripts/publish_article.test.mjs`
- [ ] 確認 id（`{issue}-{order}{標題}`，例 `9-3父親的祈禱`）。同期 id 衝突先 `SELECT id FROM articles WHERE issue=N` 查
- [ ] 釐清：內文圖有幾張、順序；要不要建新作者（大頭貼）；有沒有原始 docx/pdf
- [ ] 確認 category / section（照同期其他文章；見下表）
- [ ] 圖片放在可讀路徑（專案根目錄或絕對路徑），中文檔名 OK

---

## 二、寫描述檔 `scripts/_pub_{id}.json`

`scripts/_pub_*.json` 已在 `.gitignore`（不會 push，內含路徑而非 secret）。範例（9-3 父親的祈禱）：

```json
{
  "id": "9-3父親的祈禱",
  "title": "父親的祈禱",
  "subtitle": "",
  "issue": 9,
  "category": "封面故事",
  "section": "主題介紹",
  "author": "龐亮軒",
  "author_display": "龐亮軒",
  "author_title": "龐君華會督之子",
  "keyword": "🌿 關鍵字：龐亮軒、龐君華會督、版畫、信念與實踐、紀念",
  "summary": "一段 80-220 字前台簡介…",
  "seo": {
    "keywords": "逗號分隔, 7 個以內",
    "description": "分享/搜尋用一段描述（與 summary 可不同）"
  },
  "content": "<figure class=\"img-bottom px-450\"><img src=\"[[圖片1]]\" alt=\"…\"><figcaption>…</figcaption></figure>\n<p>內文（段首會自動縮排兩字）…</p>",
  "footnotes": [],
  "sort_order": 3,
  "is_published": false,

  "images": [{ "src": "父親版畫簽名檔.jpg", "seq": 1 }],
  "newAuthor": {
    "id": 44,
    "name": "龐亮軒",
    "bio": "龐君華牧師之子，藝術工作者。",
    "avatar": "龐亮軒大頭貼.jpg",
    "years": [2026]
  },
  "sourceDocs": [],
  "submission": { "real_name": "龐亮軒", "email": "redpiigpig@gmail.com" }
}
```

欄位說明：
- `images[]`：`src`＝本機圖片路徑，`seq`＝序號（對應 content 內 `[[圖片1]]`）。**內文用 `[[圖片N]]` 佔位符**，腳本上傳後自動換成正規 URL `…/issue-{n}/{issue}-{order}-{seq}.jpg`。也可直接寫死 URL（不寫佔位符）。
- `newAuthor`：要建新作者才填。`id` 取目前最大 author id + 1（先 `SELECT max(id) FROM authors`）。`avatar` 是大頭貼本機路徑，上傳到 `images/authors/author_{id}.jpg`。腳本會 upsert 作者並把 `id` 加進文章 `linked_author_ids`。已存在的作者改用 `"linked_author_ids": [id]`、不要 `newAuthor`。
- `sourceDocs[]`：原始 Word/PDF 路徑（投稿來的稿）。會上到 `submissions/issue-{n}/`，`.pdf`→`pdf_url`、其餘→`word_url`。沒有就 `[]`。
- `submission`：投稿備份的 `real_name` / `email` 等覆寫值（可省，會用合理預設；email 缺省給 placeholder）。

---

## 三、執行

```bash
# 先 dry-run 看會組出什麼（不碰網路、不寫 DB）
node scripts/publish_article.mjs scripts/_pub_9-3.json --dry-run

# 確認無誤後正式上架
node scripts/publish_article.mjs scripts/_pub_9-3.json
```

腳本依序做：① 內文圖上 Cloudinary（>10MB 自動 ffmpeg 縮到寬 ≤2200）→ ② 換掉 `[[圖片N]]` → ③ upsert 作者 + 連結 → ④ upsert articles → ⑤ 重寫 media_assets → ⑥ **投稿管理備份**。

---

## 四、格式規範（照 CLAUDE.md / interview-article）

- 全 HTML，不用 Markdown：標楷體 `<span class="kaiti">`、外文書名 `<i>`、粗體 `<strong>`
- 段落：一般敘事段 **不要加 `no-indent`**（CSS 預設 `text-indent: 2em`＝段首空兩格）。`no-indent` 只用在圖說、Q&A 問答首段、特殊區塊
- figure：`img-bottom px-450/600`（置中）、`img-right px-300`（右浮動大頭照）。class 定義見 [`assets/article.css`](../../../assets/article.css) line 390 起
- 腳注：content 內 `<sup class="footnote-ref">…`、`footnotes` JSONB `[{id,text,refId}]`（細節見 interview-article skill 第四節）
- 圖正規命名 `{issue}-{order}-{seq}`（memory: media_assets 動態資料夾，靠這張表，不靠 folder= 搜尋）

| 用途 | category | section |
|------|----------|---------|
| 封面故事 | 封面故事 | 主題介紹 |
| 人物專訪 | 人物專訪 | 特稿專區 |
| 一般專題 | 專題文章 / 評論與回應 / 生命故事 … | 主題廣場 / 多元講堂 |

（拿不準就 `SELECT category,section FROM articles WHERE issue=N` 看同期其他篇）

---

## 五、上架後驗證

```bash
node -e "require('dotenv').config();const u=process.env.VITE_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_KEY,h={apikey:k,Authorization:'Bearer '+k};(async()=>{const id=encodeURIComponent(process.argv[1]);for(const t of ['articles?id=eq.','media_assets?article_id=eq.','submissions?article_id=eq.']){const r=await fetch(u+'/rest/v1/'+t+id,{headers:h});console.log(t.split('?')[0],(await r.json()).length)}})()" "9-3父親的祈禱"
```

三個都該 ≥1（articles=1、media_assets=圖片數、submissions=1）。前台預覽 `npm run dev` → `http://localhost:3000/articles/{id}`，確認段首縮排、圖片浮動、腳注連結。

---

## 六、坑

- **Supabase 直連 DB `ENOTFOUND`**：`db.{ref}.supabase.co` 只解析 IPv6，本機無 IPv6 出口會掛。本腳本一律走 REST（`@supabase/supabase-js` + `SUPABASE_SERVICE_KEY`），不要改回 `pg` 直連。
- **Cloudinary 10MB 上限**：免費版單檔上限 10MB，腳本用 ffmpeg 自動縮。ffmpeg 輸出路徑用 `process.env.TEMP`（Windows）。
- **`/tmp` 在 Git Bash 與 node 不同**：node 的 `/tmp` → `C:\tmp`；要在 node 用就寫 `C:/tmp/...` 絕對路徑。
- **重跑安全**：articles / authors 用 `upsert(onConflict:id)`、media_assets 先 delete 再 insert、submissions 依 `article_id` 找舊筆更新——重跑同一篇不會產生重複。
- **改純函式後一定重跑** `node scripts/publish_article.test.mjs`。
- **secret 鐵則**：只從 `process.env` / `.env` 讀，回報絕不貼出 key 值（CLAUDE.md）。

---

## 七、不適用此 skill

- 音檔人物專訪 → 用 [`interview-article`](../interview-article/SKILL.md)
- 只改既有文章文字、不涉新圖/新作者 → 直接 `/admin/editor/{id}` 或單條 PATCH 即可
