---
name: upload-article
description: 把別人的完整投稿（網站投稿系統來稿，或使用者丟在專案根目錄的 docx + 照片）編輯成可上架的文章並發佈到《無境界者》。圖片上 Cloudinary、upsert articles、建/連作者、寫 media_assets，並且★每次都把「投稿管理」那筆更新成 converted、連回文章。Use when 使用者給文章內容和照片、或說「把網站上的某某投稿轉成文章／改成編輯」，要你上傳 / 上架 / 建文章與作者頁（非音檔訪談；訪談用 interview-article）。
---

# 投稿 → 編輯 → 上架 Pipeline

> 使用者每次「幫我把這篇上架」「把網站上的投稿改成編輯」都先讀這份 skill。
> 格式規範一律以 [`nonchurch-house-style`](../nonchurch-house-style/SKILL.md) 為準（class 清單、腳注兩套語法、標點、副標命名、category×section、篇幅）。
> 核心工具：[`scripts/publish_article.mjs`](../../../scripts/publish_article.mjs)（純函式有測試：[`scripts/publish_article.test.mjs`](../../../scripts/publish_article.test.mjs)）。

## ⭐ 定位：你是編輯，不是代筆

**除了張辰瑋以外，所有作者都交完整稿**（走 [`chenwei-essay`](../chenwei-essay/SKILL.md) 的只有他）。
你的工作是**編輯**：錯字、標點統一、HTML class 套用、腳注格式正規化、圖說補齊、決定分類與 id。
**不要重寫別人的論點、結構或用詞習慣**——本刊對投稿者的承諾就是「原則上維持作品原貌」。哪些能動哪些不能動，見 [`nonchurch-house-style/references/authors.md`](../nonchurch-house-style/references/authors.md) 的「編輯任何人的稿」。

## ⭐ 鐵則：每次上架，「投稿管理」都要有對應的一筆

**不論文章是不是從投稿系統來的，每次上架都要在 `submissions` 表留一筆（`status=converted`、`article_id` 連回文章）、原始檔也上一份到 `submissions/issue-{n}/`。**
`publish_article.mjs` 第 6 步已內建。**不要手動只寫 articles 而跳過這步。**

---

## 零、接件：兩條路

### A. 網站投稿系統來稿（最常見）

作者從 `/submit` 投稿 → `submissions` 表多一筆（`status=submitted`）→ 你把它編輯成文章。

1. 撈待處理的來稿：

```bash
node -e "require('dotenv').config({quiet:true});const u=process.env.VITE_SUPABASE_URL,k=process.env.SUPABASE_SECRET_KEY;fetch(u+'/rest/v1/submissions?select=id,status,real_name,display_name,issue_number,title,category,keywords,article_summary,author_intro,avatar_url,word_url,pdf_url,images,notes,article_id&status=neq.converted&order=id.desc',{headers:{apikey:k,Authorization:'Bearer '+k}}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d,null,1)))"
```

2. 那一筆已經帶著**大部分你需要的東西**：

| submissions 欄位 | 對應到文章 | 注意 |
|---|---|---|
| `parsed_html` | `content` | 投稿系統用 mammoth 把 docx 轉的 HTML。**要重新校一遍 class**（見 house-style 第二節），常見要補 `figure`/`no-indent`/`kaiti`，要清掉 `MsoNormal` |
| `title` | `title` | |
| `category` | `category` | 作者自選，編輯部可改；`section` 作者沒填，你要決定 |
| `issue_number` | `issue` | **常填錯**（作者按下拉選單挑到別期）。以稿件抬頭與編輯部排程為準，改掉的話在 `notes` 記一筆 |
| `keywords`（陣列） | `keyword` | 要組成 `🌿關鍵字：A、B、C、D、E` |
| `article_summary` | `summary` | 可直接用或修短到 100–220 字 |
| `author_intro` | 作者 bio / 本期作者簡介 | 首次投稿者才會有 |
| `avatar_url` | 作者大頭貼 | |
| `images[]` | 內文圖 | 已經在 Cloudinary `submissions/issue-{n}/images/`，但**要另外複製一份到 `images/articles/issue-{n}/` 正規命名**（`publish_article.mjs` 會做） |
| `word_url` / `pdf_url` | 原始檔 | 已在 Cloudinary，不用重上 |

3. 寫描述檔時**一定要帶 `"submissionId": {那筆的 id}`**——這樣腳本會把原本那筆更新成 `converted` 並連回文章，而**不會另外開一筆重複的**。投稿者自己填的 email、自介、是否首投、notes 都會原樣保留。

4. 上架後回 `/admin/submissions_manager` 確認狀態變成「已轉文章」、點得到文章連結。

### B. 使用者把檔案丟在專案根目錄

**把要上架的檔案直接放在專案根目錄**（docx / txt / md 內文 + jpg/png 照片），然後說「幫我上架」。照下面順序做，每一步都不要跳：

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
  "keyword": "🌿關鍵字：龐亮軒、龐君華會督、版畫、信念與實踐、紀念",
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
  "submissionId": null,
  "submission": { "real_name": "龐亮軒", "email": "redpiigpig@gmail.com" }
}
```

欄位說明：
- `images[]`：`src`＝本機圖片路徑，`seq`＝序號（對應 content 內 `[[圖片1]]`）。**內文用 `[[圖片N]]` 佔位符**，腳本上傳後自動換成正規 URL `…/issue-{n}/{issue}-{order}-{seq}.jpg`。也可直接寫死 URL（不寫佔位符）。
- `newAuthor`：要建新作者才填。`id` 取目前最大 author id + 1（先 `SELECT max(id) FROM authors`）。`avatar` 是大頭貼本機路徑，上傳到 `images/authors/author_{id}.jpg`。腳本會 upsert 作者並把 `id` 加進文章 `linked_author_ids`。已存在的作者改用 `"linked_author_ids": [id]`、不要 `newAuthor`。
- `sourceDocs[]`：原始 Word/PDF 路徑。會上到 `submissions/issue-{n}/`，`.pdf`→`pdf_url`、其餘→`word_url`。網站來稿已經有 `word_url`/`pdf_url` 就留 `[]`。
- **`submissionId`：網站投稿轉文章時填那筆的 id**（路線 A）。腳本會改更新那一筆而不是新增，並保留投稿者填的 email / 自介 / 是否首投 / notes / keywords / images。路線 B（編輯部直接上架）留 `null` 或整個省略。
- `submission`：投稿備份的 `real_name` / `email` 等覆寫值（可省，會用合理預設；email 缺省給 placeholder）。有 `submissionId` 時，投稿者原本填的值優先。

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

## 四、編輯稿件（把來稿整成合格的 content）

格式規範的完整版在 [`nonchurch-house-style`](../nonchurch-house-style/SKILL.md)——class 清單、腳注兩套語法、標點、副標命名、category×section、篇幅基準全在那裡。**這裡只列編輯來稿時最常要動的幾件事：**

1. **清 Word 殘留**：`MsoNormal`、`<span style="...">`、`&nbsp;` 連發、空 `<p>`。
2. **段落 class**：一般敘事段**不要** `no-indent`（CSS 預設縮排兩字）；`no-indent` 只用在 Q&A 問答首段、圖說、方塊內文字。
3. **圖片包成 `<figure>`**：mammoth 轉出來多半是裸 `<img>`，要補 `<figure class="img-bottom px-600">` + `<figcaption>`（含來源／授權）。
4. **腳注**：content 內 `<sup class="footnote-ref">`、JSONB `[{"id":"1","text":"…"}]`；title/subtitle/remark 用 `[^N]` 簡寫。學術稿的出處**一個都不能掉**。
5. **標點**：破折號改 `──`、中英之間補半形空格。
6. **收尾補 🌏**（全刊規則）。
7. **`keyword`** 從 `keywords` 陣列組成 `🌿關鍵字：A、B、C、D、E`。
8. **副標**照 house-style 第五節的句型；系列文要先查前一集的編號。
9. 圖正規命名 `{issue}-{order}-{seq}`（memory `project_media_assets`：編輯器顯示圖靠 media_assets 表，不靠 `folder=` 搜尋）。

**不要動作者的論點、結構、用詞習慣**（港式詞彙、日文漢字、「臺」vs「台」都保留）。動幅超過錯字與格式時先問使用者。各作者的文氣見 [`references/authors.md`](../nonchurch-house-style/references/authors.md)、各文類的骨架見 [`references/genres.md`](../nonchurch-house-style/references/genres.md)。

| 用途 | category | section |
|------|----------|---------|
| 封面故事 | 封面故事 | 主題介紹 |
| 人物專訪 | 人物專訪 | 特稿專區 |
| 一般專題 | 專題文章 / 評論與回應 / 生命故事 … | 主題廣場 / 多元講堂 |

（拿不準就 `SELECT category,section FROM articles WHERE issue=N` 看同期其他篇）

---

## 五、上架後驗證

```bash
node -e "require('dotenv').config();const u=process.env.VITE_SUPABASE_URL,k=process.env.SUPABASE_SECRET_KEY,h={apikey:k,Authorization:'Bearer '+k};(async()=>{const id=encodeURIComponent(process.argv[1]);for(const t of ['articles?id=eq.','media_assets?article_id=eq.','submissions?article_id=eq.']){const r=await fetch(u+'/rest/v1/'+t+id,{headers:h});console.log(t.split('?')[0],(await r.json()).length)}})()" "9-3父親的祈禱"
```

三個都該 ≥1（articles=1、media_assets=圖片數、submissions=1）。前台預覽 `npm run dev` → `http://localhost:3000/articles/{id}`，確認段首縮排、圖片浮動、腳注連結。

---

## 六、坑

- **Supabase 直連 DB `ENOTFOUND`**：`db.{ref}.supabase.co` 只解析 IPv6，本機無 IPv6 出口會掛。本腳本一律走 REST（`@supabase/supabase-js` + `SUPABASE_SECRET_KEY`），不要改回 `pg` 直連。
- **Cloudinary 10MB 上限**：免費版單檔上限 10MB，腳本用 ffmpeg 自動縮。ffmpeg 輸出路徑用 `process.env.TEMP`（Windows）。
- **`/tmp` 在 Git Bash 與 node 不同**：node 的 `/tmp` → `C:\tmp`；要在 node 用就寫 `C:/tmp/...` 絕對路徑。
- **重跑安全**：articles / authors 用 `upsert(onConflict:id)`、media_assets 先 delete 再 insert、submissions 依 `submissionId`（優先）或 `article_id` 找舊筆更新——重跑同一篇不會產生重複。
- **⚠️ 網站來稿沒帶 `submissionId` 會生出重複的投稿紀錄**：原本那筆 `article_id` 是 null，腳本找不到就會另開一筆，網站上那筆還卡在「待審核」。轉來稿一定要填 `submissionId`。
- **改純函式後一定重跑** `node scripts/publish_article.test.mjs`。
- **secret 鐵則**：只從 `process.env` / `.env` 讀，回報絕不貼出 key 值（CLAUDE.md）。

---

## 七、不適用此 skill

- 音檔人物專訪 → 用 [`interview-article`](../interview-article/SKILL.md)
- **張辰瑋要你從概念／對話素材生成草稿** → 用 [`chenwei-essay`](../chenwei-essay/SKILL.md)（全刊只有他是這樣接件）
- 編輯室報告 / 本期作者簡介 / 投稿資訊 / 編輯資訊 / 目次 → 用 [`issue-frontmatter`](../issue-frontmatter/SKILL.md)
- 只改既有文章文字、不涉新圖/新作者 → 直接 `/admin/editor/{id}` 或單條 PATCH 即可
