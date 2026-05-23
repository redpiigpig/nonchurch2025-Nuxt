---
name: interview-article
description: 把《無境界者》本期人物專訪的「音檔 + 訪綱 docx」整理成可直接寫進 Supabase articles 表的 HTML 內容（category=人物專訪、section=特稿專區）。Gemini 2.5 Flash 轉錄 → Claude 對話中整理 Q&A、補簡介/受訪者簡介/後記、套用 HTML class 與腳注 → 寫入資料庫（並可選擇上傳 Cloudinary）。Use when 使用者拿本期人物專訪的音檔（m4a/mp3）+ 訪綱 docx 過來，要轉成可上架的文章。
---

# 《無境界者》人物專訪 — 音檔到上架文章 Pipeline

> 目標：把使用者交付的「訪問音檔 + 訪綱 docx」整理成符合 [`pages/articles/[id].vue`](../../../pages/articles/[id].vue) 預期格式的 HTML，寫進 Supabase `articles` 表，category=`人物專訪`、section=`特稿專區`。

格式參考自第 4-8 期已上架的 6 篇人物專訪（id 前綴 `4-4`、`4-5`、`6-4`、`6-5`、`7-5`、`8-4`）。要重新撈一遍當參照時跑 [`scripts/query_interviews.cjs`](../../../scripts/query_interviews.cjs)。

---

## 一、Supabase 欄位填法（articles 表）

| 欄位 | 寫入規則 | 範例 |
|------|----------|------|
| `id` | `{issue}-{order}{title}` — order 是該期專訪序號（看上一期延續編號） | `8-4從苦難生發出的公義之光` |
| `title` | 主標題，7-14 字濃縮訪談核心精神 | `從苦難生發出的公義之光` |
| `subtitle` | 副標題，固定句型「**XXX訪談記**」或「**專訪XXX**」 | `專訪田孟淑長老（田媽媽）` |
| `issue` | 期數整數 | `8` |
| `category` | 固定 `人物專訪` | |
| `section` | 固定 `特稿專區` | |
| `author` | `受訪者：[全名+稱謂] <br>訪問者：[姓名]`（多訪問者用頓號） | `受訪者：田孟淑長老（田媽媽）<br>訪問者：曾加力傳道師、張辰瑋` |
| `author_display` | 受訪者主要顯示名 | `田孟淑長老` |
| `keyword` | `🌿關鍵字：A、B、C、D、E`（5 個） | `🌿關鍵字：田孟淑、林宅血案、義光教會、長老教會、轉型正義` |
| `summary` | 一段 150-220 字摘要，說明主題、受訪者貢獻、訪談價值 | 見 4-5 範本 |
| `remark` | `訪問時間：YYYY年MM月DD日HH:MM-HH:MM <br>訪問地點：[精確到房間/堂]` | `訪問時間：2026年04月06日10:00-12:00<br>訪問地點：台北市中山區田宅` |
| `content` | HTML 字串（見「二、content HTML 結構」） | |
| `footnotes` | JSONB `[{id, text, refId}]` | 見「四、腳注」 |
| `article_type` | 預設 `regular` | |
| `type` | 預設 `text` | |
| `is_published` | 整理初稿時設 `false`，校稿後再開 | |
| `sort_order` | 沿用該期序號（與 id 開頭一致） | `4` |

不需填的欄位：`author_title`（留 NULL）、`linked_author_ids` 用 `'[]'`、`media_data` 用 `'{}'`、`translations` 用 `'{}'`、`seo` 用 `'{}'`。

---

## 二、content HTML 結構（必照順序）

```html
<h3>訪談簡介</h3>
<p class="no-indent">[1-2 段：說明本期主題、為何選這位受訪者、研究/採訪背景，
最後一段可說明資料來源與授權狀況（若是論文訪談轉刊登）。]</p>
<p>...</p>
<p style="text-align: right; margin-top: -1rem">
──[訪問者]<br>YYYY.MM.DD
</p>

<figure class="img-bottom px-600">
  <img src="https://res.cloudinary.com/nonchurch2025/image/upload/issue{X}_{Y}-1.jpg" alt="訪談合照">
  <figcaption>[受訪者] 與 [訪問者] 的訪談合照<br>（YYYY.MM.DD拍攝於[地點]）</figcaption>
</figure>

<div class="custom-divider"></div>

<h3>受訪者簡介</h3>
<figure class="img-right px-300">
  <img src="https://res.cloudinary.com/nonchurch2025/image/upload/issue{X}_{Y}-2.jpg" alt="[受訪者]大頭照"
       style="border: 1px solid #000; outline: 4.5px solid #000; outline-offset: 1px;">
</figure>

<p><strong>[受訪者全名]</strong>，[生年]年生於[籍貫]，[2-4 段生平：學經歷、職業、與本期主題的連結、代表事蹟]</p>
<p>...</p>

<div class="custom-divider"></div>

<!-- 可選：當受訪者有特定作品/組織/事件需先介紹 -->
<h3>[作品/組織/事件]簡介</h3>
<p>...</p>
<div class="custom-divider"></div>

<!-- 訪談主體：依訪綱分 3-5 個 h3 小節，小節間「不放」分隔線 -->
<h3>[主題一小標]</h3>
<p class="no-indent"><strong>[訪問者簡稱]：</strong>[問題]</p>
<p class="no-indent"><strong>[受訪者簡稱]：</strong>[回答第一段]</p>
<p>[回答第二段，自然縮排，不再貼說話者標籤]</p>
<p>[回答第三段...，可含 <strong>重點句加粗</strong>、<i>外文書名</i>、
   腳注 <sup class="footnote-ref"><a href="#footnote-1" id="footnote-ref-1">1</a></sup>]</p>

<p class="no-indent"><strong>[訪問者簡稱]：</strong>[下一題]</p>
<p class="no-indent"><strong>[受訪者簡稱]：</strong>[回答...]</p>

<!-- 中間視需要穿插圖 -->
<figure class="img-left px-450">
  <img src="...issue{X}_{Y}-3.jpg" alt="...">
  <figcaption>[圖說]<br>（[來源/日期]）</figcaption>
</figure>

<h3>[主題二小標]</h3>
...

<h3>訪談後記：[7-12 字精神標題]</h3>
<p class="no-indent">[1-2 段總結這場訪談的價值與感受，最後一個字後接 🌏]</p>

<figure class="img-bottom px-600">
  <img src="...issue{X}_{Y}-N.jpg" alt="末尾合照">
  <figcaption>...</figcaption>
</figure>
```

### 結構檢查清單

- [ ] **三大區塊順序固定**：`訪談簡介` → `受訪者簡介` → 〔可選作品/組織簡介〕→ 訪談主體（多個 h3）→ `訪談後記`
- [ ] `<div class="custom-divider"></div>` **只在以下三類交界處放**，其他地方都不放：
  - 訪談簡介 → 受訪者簡介
  - 受訪者簡介（或作品/組織簡介）→ 第一個訪談主體 h3
  - 最後一個訪談主體段落 → 訪談後記
  
  **訪談主體內部多個 h3 之間「絕對」不放 hr**（這是新手最容易犯的錯）。換句話說：「簡介類 h3 後面」+「訪談後記前面」放 hr，其他都不放。
- [ ] 訪談主體 **3-5 個 h3 小節**，依訪綱主題分類（不要全部塞一個 h3）
- [ ] 每節 **2-5 個獨立的 `<strong>訪問者：</strong>` 問句**，回答每 1-3 段一斷
- [ ] **段落間不重貼說話者標籤**（只在新發言才貼）
- [ ] 末尾「訪談後記」最後一段尾字接 🌏（地球 emoji，象徵無境界）
- [ ] 第一張圖 = 訪談合照（`img-bottom px-600`）；第二張 = 受訪者大頭照（`img-right px-300` 帶 outline 黑框）

---

## 三、CSS class 與圖片慣例

### 段落 class
| Class | 用途 |
|-------|------|
| `class="no-indent"` | 每節第一段 / 問答的「問」與「答」首段 |
| 不加 class | 一般段落（CSS 預設縮排兩字） |

### figure class
| Class | 適用 | 寬度語意 |
|-------|------|---------|
| `img-bottom px-500` | 中等的橫式照片 | 500px 寬 |
| `img-bottom px-600` | 一般訪談合照 | 600px 寬 |
| `img-bottom px-700` | 末尾大合照 / 重要場景 | 700px 寬 |
| `img-right px-300` | 受訪者大頭照（右浮動） | 300px 寬 |
| `img-right px-NNN` | 一般右浮動配圖 | |
| `img-left px-450` | 左浮動配圖 | 450px 寬 |

### 大頭照特殊樣式
```html
<img src="..." alt="..." style="border: 1px solid #000; outline: 4.5px solid #000; outline-offset: 1px;">
```
**只用在「受訪者簡介」的大頭照**，黑色外框+留白的雜誌感。

### Cloudinary URL 規則
```
https://res.cloudinary.com/nonchurch2025/image/upload/issue{X}_{Y}-{N}.jpg
```
- `X` = 期數，`Y` = 該期序號（與 id 開頭一致）
- `N` 由 1 開始：1=合照、2=大頭照、3+=內文配圖
- 副檔名常見 `.jpg`，偶有 `.JPG`、`.png`，比照原檔名
- **圖片還沒上傳時用 `[[圖片N]]` 佔位符**，例如 8-4 範例稿就用 `<img src="[[圖片1]]" alt="...">`，後續上傳完再批次替換

### 圖說格式
```
<figcaption>[主要敘述]<br>（[日期或來源]）</figcaption>
```
- 引用他人提供照片要註明：`（照片由XXX提供）`、`（圖片來源：XXX）`、`（照片由XXX提供，YYYY.MM.DD拍攝於XXX）`

---

## 四、腳注（footnotes）格式

### 引用點（content 內）
```html
...內容中需要註解處<sup class="footnote-ref"><a href="#footnote-1" id="footnote-ref-1">1</a></sup>。
```

### JSONB 結構
```json
[
  {"id": "1", "text": "參：作者，〈文章名〉，《期刊》第N期（YYYY.MM.DD），頁X-Y。", "refId": "ref-1"},
  {"id": "2", "text": "說明性註解...", "refId": "ref-2"},
  {"id": "3", "text": "釋XX演講，記錄：陳XX，〈題目〉，《刊物》。網址：<a href=\"https://...\" target=\"_blank\" rel=\"noopener noreferrer\">https://...</a>。", "refId": "ref-3"}
]
```

**規則**：
- `id` 用字串型整數（`"1"`, `"2"`...，舊資料偶有用數字型 `1`，新稿一律字串）
- 順序按出現順序由 1 開始
- `refId` 一律 `ref-{id}`
- 腳注內：書名用 `<i>外文書名</i>`、`《中文書名》`、〈文章名〉
- 含網址用 `<a href="..." target="_blank" rel="noopener noreferrer">完整網址</a>`
- 內容多為「徵引文獻」或「補充說明性註腳」，不要把訪談內容塞進去
- 數量參考：6 篇範本各 2-15 個腳注，平均 8-10 個。短訪談（< 1 萬字）可少於 5 個

---

## 五、Q&A 整理規則（從逐字稿到 HTML）

### 說話者標籤
| 角色 | content 內顯示 | 「author 欄位」全稱 |
|------|---------------|--------------------|
| 訪問者（張辰瑋） | `<strong>辰瑋：</strong>` | `張辰瑋` |
| 訪問者（曾加力） | `<strong>加力：</strong>` | `曾加力傳道師` |
| 法師 | `<strong>[法名]法師：</strong>`（如 `昭慧法師：`） | `釋昭慧法師` / `昭慧法師` |
| 牧師 | `<strong>[姓]牧師：</strong>`（如 `盧牧師：`） | `[全名]牧師` |
| 教授 | `<strong>[姓]教授：</strong>` 或 `<strong>[全名]教授：</strong>` | |
| 居士 / 老師 / 女士 / 先生 / 導演 / 長老 | 對應稱謂 | |

**規則**：
- 對話 turn 之間 **不要重貼說話者標籤**（同一發言人多段時，第二段起去掉前綴，自然縮排）
- 採訪者一律用「**名字後兩字**」當簡稱（張辰瑋→辰瑋、曾加力→加力），與 `author` 欄位的全稱不同
- 「嗯／是／對」等短促確認 **直接刪掉**，不獨立成 turn

### 分節邏輯
- 對照訪綱的 3-5 個主題分小節
- 每節 h3 標題 7-15 字，提煉該節主軸（不是直接用訪綱原問題）
- 不要強行重排對話順序——按實際對話流向歸位
- 若一個主題反覆穿插，集中放到最相關的那節

### 篇幅參考
| 訪談時長 | 整理後 content 字數 | 範本 |
|---------|--------------------|------|
| ~60 分鐘 | 8K-12K | 8-4 田媽媽（8881 字） |
| ~90 分鐘 | 11K-15K | 4-4 昭慧（12987 字）、6-5 艾琳達（11481 字） |
| ~120 分鐘 | 14K-20K | 4-5 盧俊義（14939 字）、7-5 許明淳（20224 字） |

輸出 < 8K 而音檔 > 60 分鐘多半過度精簡——回去補回細節、典故、年份、人名。

### 排版細節
- **重點句加粗**：每節挑 1-3 個關鍵句子用 `<strong>` 包裹（受訪者的關鍵主張、震撼話語）。整段不要全粗體
- **外文書名**：`<i>A Beautiful View From the Brink</i>`
- **中文書名/雜誌名/紀錄片名**：用 `《...》`
- **文章/章節**：〈...〉
- **人名生卒年**：第一次出現時加 `（YYYY-YYYY）` 或 `（YYYY-）`，例：`彭明敏（1923-2022）`
- **年份格式**：`1989年`（不用「西元 1989 年」）

---

## 六、Pipeline（完整步驟）

### Step 0 — 確認材料
使用者通常會交付：
- 訪問音檔（m4a / mp3）— 或多段
- 訪綱 docx — 給 Gemini 當人名/專有名詞 context（重要）
- 訪問合照 / 受訪者大頭照（jpg）— 之後上 Cloudinary
- 受訪者基本資料（生年、學經歷）— 或請使用者口頭補

開工前確認：
- 本期是第幾期？該期人物專訪是第幾篇（推 id 用）
- 受訪者完整稱謂（**全稱用在 author 欄位、簡稱用在對話**）
- 訪問者是誰、訪問日期、地點

### Step 1 — 用 Gemini Audio 轉錄
腳本：[`scripts/transcribe_interview_gemini.py`](../../../scripts/transcribe_interview_gemini.py)（已包含此 skill 對應的訪綱 context prompt）。

```bash
# 短音檔（≤25 min）直接整檔
python scripts/transcribe_interview_gemini.py \
  "/path/to/audio.m4a" \
  --outline "/path/to/訪綱.docx" \
  --interviewee "釋XX法師" \
  --interviewer "辰瑋" \
  --out "_tmp_audio/iv_{YYYY-MM-DD}_raw.txt"

# 超過 30 分鐘要先用 ffmpeg 切片（避免 Gemini 後半段重複迴圈）
ffprobe -v error -show_entries format=duration "/path/to/audio.m4a"

mkdir -p _tmp_audio/{slug}_split
for i in 0 1 2 3; do
  start=$((i * 1300)) # 21.6 min 一段
  ffmpeg -y -i "/path/to/audio.m4a" -ss $start -t 1320 -c copy \
    "_tmp_audio/{slug}_split/part$((i+1)).m4a"
done
# 每段個別轉錄後再合併
```

**注意**：
- `.env` 用 `GEMINI_API_KEYS`（複數，逗號分隔多把 key），轉錄腳本自動讀取並 fallback
- 不要把 key 寫死在腳本裡（CLAUDE.md 規則）
- Free-tier 每 key 一天 20 次 request，平行多段時自動 fallback 到下一把 key

### Step 2 — Claude 整理成 HTML
讀 `_tmp_audio/iv_{date}_raw.txt`，做：

1. **辨識並修正說話者標籤**（Gemini 偶爾標錯）
2. **刪掉「嗯／是／對／喔」短確認**
3. **按訪綱分 3-5 節，定 h3 小標**
4. **每節 2-5 個獨立問句、每答 1-3 段**
5. **寫「訪談簡介」**：1-2 段。模板：
   > 本期《無境界者》以「[本期主題]」為題，旨在探討[主題核心]。/ 本篇原為筆者碩士論文「印順導師人間佛教思想的傳承與實踐：以昭慧法師、性廣法師為核心」中的訪談記錄...
   >
   > [說明為什麼訪問這位、訪談價值]
   >
   > [若有授權聲明：「經 XXX 同意，我們將此篇訪談略經修飾後刊登，期盼...」]
   >
   > ──[訪問者]<br>YYYY.MM.DD
6. **寫「受訪者簡介」**：2-4 段 bio（從訪綱、Wikipedia、訪談本身整合）。第一段開頭：`<p><strong>[全名]</strong>，[生年]年生於[地]，...</p>`
7. **（可選）寫「作品/組織簡介」**：若主題是電影（7-5 許明淳）、教會（8-4 義光教會）等需先介紹背景時加
8. **寫「訪談後記」**：1-2 段，h3 標題格式 `訪談後記：[精神標題]`（如「為公義發聲的牧者心腸」、「自由的信念與無畏的勇氣」）。**最後一個字加 🌏**
9. **挑腳注**：受訪者提到的書目、未交代的歷史事件、生卒年、補充說明，全部抽出來成 footnotes JSONB
10. **挑重點句加粗**：每節 1-3 句

### Step 3 — 寫進 Supabase

**優先用 REST 版**：[`scripts/insert_interview_article.mjs`](../../../scripts/insert_interview_article.mjs)（走 supabase-js + `SUPABASE_SERVICE_KEY`，不需直連 DB）：

```bash
node scripts/insert_interview_article.mjs scripts/_iv_9-6.json
```

**為什麼用 REST 不用 pg 直連**：Supabase 的直連 DB（`db.{ref}.supabase.co`）已只解析 IPv6 位址；本機 ISP 若無 IPv6 出口，Node `pg` 會出 `ENOTFOUND`。`insert_interview_article.cjs`（pg 版）保留供有 IPv6 環境 / pgcli debug 使用。

JSON 描述檔放在 `scripts/_iv_{id}.json`（已在 `.gitignore`，不會 push）：

```json
{
  "id": "9-6循道精神的同行者",
  "title": "循道精神的同行者",
  "subtitle": "吳昶興教授追憶龐君華會督",
  "issue": 9,
  "author": "受訪者：吳昶興副教授<br>訪問者：張辰瑋",
  "author_display": "吳昶興副教授",
  "keyword": "🌿關鍵字：...",
  "summary": "...",
  "remark": "訪問時間：YYYY年MM月DD日<br>訪問地點：XXX",
  "content": "<h3>訪談簡介</h3>...🌏</p>",
  "footnotes": [{"id":"1","text":"...","refId":"ref-1"}],
  "sort_order": 6
}
```

腳本自動填 `category=人物專訪`、`section=特稿專區`、`article_type=regular`、`is_published=false`。

如要直連 pg（pg 版）：

```js
require('dotenv').config();
const { Client } = require('pg');
const client = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: 5432,
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

await client.query(
  `INSERT INTO articles (
     id, title, subtitle, issue, category, section, author, author_display,
     keyword, summary, remark, content, footnotes,
     article_type, type, is_published, sort_order
   ) VALUES (
     $1, $2, $3, $4, '人物專訪', '特稿專區', $5, $6,
     $7, $8, $9, $10, $11::jsonb,
     'regular', 'text', false, $12
   )
   ON CONFLICT (id) DO UPDATE SET
     title = EXCLUDED.title, subtitle = EXCLUDED.subtitle,
     content = EXCLUDED.content, footnotes = EXCLUDED.footnotes,
     summary = EXCLUDED.summary, keyword = EXCLUDED.keyword,
     remark = EXCLUDED.remark, updated_at = now();`,
  [id, title, subtitle, issue, author, authorDisplay,
   keyword, summary, remark, content, JSON.stringify(footnotes), sortOrder]
);

// 驗證
const { rows } = await client.query(
  'SELECT id, title, length(content) AS n, jsonb_array_length(footnotes) AS f FROM articles WHERE id = $1',
  [id]
);
console.log(rows[0]);
```

**禁忌**：寫完務必 SELECT 驗證，**不要回貼任何 secret 值**。

### Step 4 — 圖片上 Cloudinary（之後再做）
- 資料夾：`images/articles/issue-{N}/`
- 命名：`issue{X}_{Y}-{N}.jpg`（與 content 中 URL 對齊）
- 用 `/api/media` POST 或 `cloudinary` npm 套件直傳
- 上傳完，content 內 `[[圖片N]]` 佔位符批次替換為真實 URL

### Step 5 — 預覽 & 校稿
1. 本地 dev 跑 `npm run dev`，開 `http://localhost:3000/articles/{id}`
2. 確認：
   - 段落縮排正確（`no-indent` 該不縮的不縮）
   - 圖片浮動方向對、寬度合適
   - 腳注上標連結可點、文末腳注區可回跳
   - 大頭照黑框 outline 有渲染出來
3. 進 `/admin/proofread/{id}` 校稿
4. OK 後 `is_published = true`

### Step 6 — Commit
依專案規則（CLAUDE.md「每次 AI 修改後，必須提交並上傳 Git」），但根據使用者偏好 [feedback_git_push](../../../../C:/Users/user/.claude/projects/c--Users-user-Desktop-nonchurch-nuxt/memory/feedback_git_push.md)，**等使用者確認後再 push**。

---

## 七、範本對照（撈最近 6 篇當參考）

跑下面這條重新撈：
```bash
node scripts/query_interviews.cjs
```
輸出 `scripts/_interview_dump.json`（不要 commit，只給整稿時參考）。

| id | 期 | 受訪者 | 訪問者 | 適合對照的情境 |
|----|----|--------|--------|----------------|
| `4-4拆毀信仰與性別的藩籬` | 4 | 昭慧法師 | 張辰瑋、邱詠恩 | 法師、多訪問者 |
| `4-5建立在愛與公義中的跨界友誼` | 4 | 盧俊義牧師 | 張辰瑋 | 牧師、論文轉刊登 |
| `6-4布施無畏的勇者` | 6 | 葉菊蘭女士 | 張辰瑋 | 女士、政治背景 |
| `6-5跨海來台的人權勇士` | 6 | 艾琳達教授 | 張辰瑋 | 學者、論文轉刊登 |
| `7-5聆聽被遺忘的苦難` | 7 | 許明淳導演 | 張辰瑋 | 導演、含「作品簡介」 |
| `8-4從苦難生發出的公義之光` | 8 | 田孟淑長老 | 曾加力、張辰瑋 | 長老、含「教會簡介」、台語訪談 |

要看完整 content 取一篇對照時，用 [`scripts/query_interviews.cjs`](../../../scripts/query_interviews.cjs) 撈 dump 後讀對應 id。

---

## 八、常見聽錯修正（佛教 / 長老教會 / 黨外領域）

| Gemini 可能聽錯 | 正確 |
|----------------|------|
| 紅誓 / 宏誓 | 弘誓 |
| 印盾 / 印孫 | 印順 |
| 招會 / 朝會 | 昭慧 |
| 性光 / 醒光 | 性廣 |
| 嵐園 / 蘭園 | 嵐園（弘誓學院招待所） |
| 慈基 / 自即 | 慈濟 |
| 玄裝 / 玄藏 | 玄奘 |
| 普嚴 / 福源 | 福嚴（佛學院） |
| 香光寺 / 香港寺 | 香光寺 |
| 慈安精舍 / 慈恩經舍 | 慈恩精舍 |
| 高峰禪靈 | 高峰禪林 |
| 觀音事件 | 大安森林公園觀音像事件 / 「觀音不要走」運動 |
| 千里苦行 | 反核四千里苦行 |
| 美麗道 / 美麗島事件 | 美麗島事件 |
| 林宅血案 / 林宅命案 | 林宅血案 |
| 義光教會 / 義光長老教會 | 義光長老教會 |
| 鄭南融 / 鄭難容 | 鄭南榕 |
| 高俊明 / 高俊命 | 高俊明牧師 |
| 鄭仰恩 / 鄭養恩 | 鄭仰恩 |
| 彭明敏 / 彭明明 | 彭明敏（1923-2022） |
| 田孟叔 / 田夢淑 | 田孟淑 |
| 田秋謹 / 田秋進 | 田秋堇 |
| 林義雄 / 林一雄 | 林義雄 |
| 艾琳達 / 愛琳達 | 艾琳達（Linda Gail Arrigo） |
| 施明德 / 史明德 | 施明德（1941-2024） |
| 葉菊蘭 / 葉竹蘭 | 葉菊蘭 |
| 印順導師 / 印順法師 | 印順導師（人間佛教傳承用「導師」） |
| 人間佛教 / 人間佛敎 | 人間佛教（簡體相同，但要繁體） |

---

## 九、坑與應對（Lessons learned）

> 從 9-6 / 9-7 吳昶興教授兩篇訪談整理時踩過的坑歸納而來。下次接 Job 前先掃一遍。

### 9.1 找不到音檔 → Google Drive File Stream 串流模式

Drive 預設只在雲端、本地是 stub。`find` / `ls` 看得到名稱，但 `ffprobe` / `cat` 會回「檔案大小 0」或讀不到內容。

**對策**：請使用者在檔案總管選取要用的音檔 → 右鍵 → 「**永遠保留在這部裝置上**」，等檔名前出現綠色勾勾（已下載到本地）再開工。`ls -la` 看到實際 size > 0 才算 OK。

### 9.2 Gemini free-tier 配額耗盡 → 多重 fallback

`.env` 的 `GEMINI_API_KEYS` 即使逗號分隔放多把，**每 key 仍各自每天 20 req**（per-key per-day per-model）。平行 7 段轉錄會把 5 把活 key 全部跑光。

- **過期 key 要清掉**：腳本會逐 key 嘗試，若某 key 已 expired 會白白浪費 fallback 嘗試（看到「API key expired」就該從 `.env` 移除那把）
- **24 小時滑動窗口**：reset 不是 calendar day，是 24h sliding window。隔天再跑會通
- **付費版替代**：升級到付費 tier 一次 ~$0.5 內跑完一場訪談的音檔
- **本地 Whisper 替代**（見 9.3）

### 9.3 Whisper fallback：本地 GPU 跑 faster-whisper

當 Gemini 配額耗光、需要立刻跑時，用 [`scripts/transcribe_interview_whisper.py`](../../../scripts/transcribe_interview_whisper.py)：

```bash
python scripts/transcribe_interview_whisper.py "_tmp_audio/iv_wu/83_part1.m4a" \
  --out "_tmp_audio/iv_wu/raw_83_p1.txt" \
  --model large-v3 --device cuda --compute-type float16
```

**設置坑**：
- 缺 `cublas64_12.dll` → `pip install nvidia-cublas-cu12 nvidia-cudnn-cu12`
- pip 裝完 DLL 還是找不到 → 要設 `PATH` 環境變數，**不只 `os.add_dll_directory`**（CTranslate2 是 C++ 模組，`add_dll_directory` 對它無效）。腳本已內建 PATH 注入
- `nvidia.cublas.__file__` 是 `None`（namespace package），改用 `mod.__path__` list
- 沒有 NVIDIA GPU → `--device cpu --compute-type int8`，但 large-v3 在 CPU 約 5-10x realtime（70 分鐘音檔要 6-12 小時，難等）

**Whisper 輸出特性**：
- **沒有說話者標籤**（faster-whisper 沒 diarization）→ Claude 整理時靠語意分辨「辰瑋（問問題）」vs「吳教授（長段敘述）」
- **可能 hallucinate**：尾段有大量「嗯，嗯，嗯，嗯……」重複（VAD/silence 觸發迴圈），整理時整段刪
- 大致準確度跟 Gemini 2.5 Flash 差不多，但 Gemini 配上訪綱 docx context 時對人名/專名辨識較強

### 9.4 Supabase 直連 DB IPv6-only → 改用 REST API

`db.{ref}.supabase.co` 只解析到 IPv6 位址。本機 ISP 若無 IPv6 出口，Node `pg` 直連會 `ENOTFOUND`。

**對策**：用 `supabase-js` + `SUPABASE_SERVICE_KEY` 走 HTTPS REST：
```js
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
await supabase.from("articles").upsert(row, { onConflict: "id" }).select(...);
```

[`scripts/insert_interview_article.mjs`](../../../scripts/insert_interview_article.mjs) 是此版本。pg 版（cjs）保留供 IPv6 環境用。

### 9.5 多訪談同場：一位受訪者跨主題穿插

若一位受訪者一次回答了兩個主題（分屬不同訪綱），對話內容會「混著聊」——主題切換沒有明確邊界，受訪者可能在 B 主題講到一半跳回 A 主題。

**對策**：
1. **開工前先讀兩份訪綱**，整理「關鍵字差異表」：
   - A 主題關鍵字：龐君華、城中教會、循道精神、義務傳道……
   - B 主題關鍵字：1970年代、自立、唐培禮、方大林、東吳大學……
2. **切音檔做 Gemini 轉錄時，依預判每段大致屬哪個主題，選對應訪綱當 context**（避免 Gemini 用錯主題的訪綱措辭）
3. **整理時純按主題拆，不照音檔順序**——同一個 Q 可能拆給兩篇
4. **「個人自述」如何拆**：若整期專輯有特定主題（如紀念某位前輩），則「受訪者自述 + 對該前輩的描述」全部歸到紀念那篇，其他純歷史內容歸另一篇
5. **每篇都要有完整訪談簡介、受訪者簡介、訪談後記**，不能因兩篇共用受訪者就省略一篇的簡介

### 9.6 ⚠️ Subagent 整理 bio 時會捏造事實

委派 subagent 整理 HTML 時，**subagent 會把訪談沒提的細節（生卒年、學歷系所、書名、過世年）當「合理推測」寫進 bio 和 footnotes**。常見假事實類型：

| 類型 | 範例 |
|------|------|
| 生卒年捏造 | 龐君華「1958-2026」（實 1957/10/3 生）；Thornberry「2025」（實 2017） |
| 中間名捏造 | Thornberry「Milo **Lynn**」（實 Milo **Lancaster**） |
| 系所捏造 | 「東吳大學**物理系**」（吳老師只說讀東吳，沒提系所） |
| 書名捏造 | 「《從中國到日本：早期景教東傳研究》」（博客來無此書） |
| 漢字音轉錯 | 「曾紀一」（實 誠靜怡）、「戴文俊」（實 戴俊男）、「王崔濤」（實 王翠濤）、「史彌迪」（實 彌迪理 Daniel Beeby）、「Donald Wilson」（實 H. Daniel Beeby）|
| 機構錯位 | 「新加坡善醫神學院」（吳老師口誤，實 新加坡三一神學院 TTC）；「《國事宣言》」（實〈國是聲明〉）|
| 術語誤聽未修 | 「進神」「進科講道」（實「浸神」「經課講道」）|

**對策**（每次接 Job 一定要做的 fact-check 階段）：
1. **bio 預設保守**：只寫訪談原話明確提到的內容；其他用「現任 X」「任教於 Y」這類可驗證敘述
2. **所有人名 / 書名 / 機構名 / 年份**逐項 WebSearch 查證：
   - 受訪者本人：機構官網、博客來作者頁
   - 提及的歷史人物：維基百科、新使者雜誌、教會官網
   - 提及的書：博客來、Google Books、機構出版品
   - 提及的機構：官網「歷史沿革」「歷任」頁
3. **腳注中 subagent 寫「按：受訪者口誤」「按音譯」「（暫名）」**這類引導語，全部刪除——這些是 subagent 在掩飾不確定。要嘛直接用確定的版本，要嘛整段重寫成保守敘述
4. **過世年特別小心**：Brueggemann 2025、Thornberry 2017、Beeby 2017 都很容易混淆
5. **發布前讓使用者預覽**：請使用者開 `/admin/proofread/{id}` 逐項核對 bio 和 footnotes，主動列出「我用 WebSearch 查不到的人事物」請使用者口頭確認

### 9.8 hr（custom-divider）位置：只放三處

新手最常犯的錯：把訪談主體每個 h3 之間都塞 `<div class="custom-divider"></div>`。實際上現有 6 篇範本（4-4 / 4-5 / 6-4 / 6-5 / 7-5 / 8-4）的 hr **只放三處**：

1. 訪談簡介結束 → 受訪者簡介 之前
2. 受訪者簡介（或作品/組織簡介）結束 → 第一個訪談主體 h3 之前
3. 最後一個訪談主體段落結束 → 訪談後記 之前

訪談主體內部多個 h3（小節）之間「**絕對不放**」hr。連結兩節靠 h3 標題本身就足夠視覺分隔。

整理時若 subagent 亂塞，用這段 JS 一鍵清理：
```js
let c = article.content;
c = c.replace(/<div class=\"custom-divider\"><\/div>\s*/g, '');
const parts = c.split(/(?=<h3>)/);
const out = [parts[0] || ''];
for (let i = 1; i < parts.length; i++) {
  const prevH3 = (parts[i-1].match(/^<h3>([^<]+)<\/h3>/)||[])[1] || '';
  const curH3 = (parts[i].match(/^<h3>([^<]+)<\/h3>/)||[])[1] || '';
  if (/簡介$/.test(prevH3) || /^(訪談後記|結語|採訪後記)/.test(curH3)) {
    out.push('\n<div class="custom-divider"></div>\n\n' + parts[i]);
  } else {
    out.push(parts[i]);
  }
}
article.content = out.join('');
```

### 9.7 教會 / 神學領域常見聽錯修正（吳昶興訪談新增）

接續第八節的修正表，補：

| 錯（Gemini/Whisper/subagent）| 對 |
|---|---|
| 進神（中華浸信會神學院簡稱）| **浸神** |
| 進科講道 / 進科式講道 | **經課講道 / 經課式講道**（Lectionary preaching）|
| 國事宣言 / 國是宣言 | **〈國是聲明〉**（1971/12/29 長老教會發表，文件非書名所以用〈〉）|
| 史彌迪 / Donald Wilson | **彌迪理（H. Daniel Beeby, 1920-2017）**，英國循道公會宣教士，1972/3 被驅逐 |
| 善醫神學院（新加坡）| **新加坡三一神學院（Trinity Theological College, Singapore）**，1948 成立，聖公會 / 衛理 / 長老 / 信義 四宗派聯合 |
| 王崔濤 | **王翠濤**（草頭翠、三點水濤）|
| 戴文俊 | **戴俊男**（衛理神學研究院創院院長，1999/9/1 開學）|
| 曾紀一 | **誠靜怡（1881-1939）** |
| 留亭坊 / 劉廷方 | **劉廷芳（1891-1947）** |
| 魁建華 | **蕢建華**（第一任華人會督，1987-1992 / 2004-2010）|
| 黃寬玉 / 黃冠玉 | **黃寬裕**（現任會督，2022-）|
| Milo Lynn Thornberry, 1937-2025 | **Milo Lancaster Thornberry, 1937-2017**（唐培禮）|
| 1972 年正式自立 | **1972/4 中止隸屬、1973 年完成自立**（依《衛理重大記事》）|
| 1987 改會督制 | 對的；蕢建華為第一任華人會督 |

### 9.9 紀念專輯：同期多訪問的去重與 cross-reference

當本期是某位重要人物的紀念專輯（如第 9 期是龐君華會督紀念專輯，有 9-5 楊師母、9-6 邱牧師、9-7 吳老師三篇追憶訪問），多篇訪談之間的內容會大量重疊：

**Summary 與訪談簡介的去重原則**：
- **整本期都在紀念這個人，summary 與訪談簡介就不要再重述紀念對象的事蹟**（生平、死因、會督任期），那已在編輯室報告與生平略歷講過
- summary 與訪談簡介只講「本篇受訪者是誰、與紀念對象的關係、本篇記錄的特殊角度」
- 不同篇的 summary 之間用「本篇」「本訪問」「以 X 視角」這類用語區分

**主體內容重複的處理**：
- 同一事件（如龐君華 1999 回台、衛蘭團契成立）在多篇訪問中都有提到時，**以最早講述且最詳盡的那篇為主**（通常是最親近受訪者，如師母篇），**其他篇章該段落簡化**、加 cross-reference：「（衛蘭團契的開拓過程詳見前一篇對 XXX 的訪問）」
- 反過來說：每篇還是要有完整的訪談簡介、受訪者簡介、訪談後記——不能因為其他篇有就省略

**Subtitle 統一格式**：
- 同期紀念性訪問，subtitle 用統一句型：`[受訪者]追憶[紀念對象]`
- 範例（第 9 期）：「楊肇悅師母追憶龐君華會督」、「邱泰耀牧師追憶龐君華會督」、「吳昶興教授追憶龐君華會督」
- 與一般訪問的「專訪 XXX」/「XXX訪談記」格式區分

### 9.10 同期 id 衝突：placeholder 卡位 + cascade UPDATE

接 job 前先跑 `query_interviews.cjs` 或直接 `SELECT id, title FROM articles WHERE issue = N`，**確認你預定要用的 id 是否已被其他文章佔住**。第 9 期實際接 job 時，使用者口頭說「9-5 是龐師母」，但 DB 裡 `9-5` 已經被「改革到合一的插曲」（文獻翻譯類文章）佔住——這時需要：

**動 id 前的安全檢查**：
- `SELECT id, prev_id, next_id, prev_article, next_article FROM articles WHERE prev_id IN (...) OR next_id IN (...)`——確認沒有其他文章用 prev_id/next_id 引用它（articles 表的 FK 是 logical 不是 hard，但仍要避免懸空指向）

**cascade UPDATE 順序**：
- 把要動的 id 排成依賴鏈，**從鏈尾往前搬**：先把目標位置上的舊文挪到空 id，再把要進來的搬到目標位置
- 範例：A→B、B→C、C→D 三步串聯時，先 C→D（清出 C 位置），再 B→C（清出 B 位置），最後 A→B
- 用 supabase-js 走 REST 的話：先 `upsert(newRow with new id)` 再 `delete(old id)`，不要直接 UPDATE id（PostgREST 不允許）

**Placeholder 卡位**：
- 接 job 時使用者通常已經有整期 9-1 到 9-N 的編排心智圖。**主動詢問本期完整目次**，把該佔的編號都用 placeholder INSERT 預留：
  ```js
  { id: '9-X待擬標題', title: '待擬', content: '<p>【內容待補】</p>',
    category: '...', section: '...', sort_order: X, is_published: false }
  ```
- 這避免後續再進來新訪問時又要做一輪 cascade rename

### 9.11 訪問者問句的長輩敬語

對長輩受訪者的訪問，問句不能像 chat 一樣口語化。**整理時主動加敬語**：

| 不夠禮貌 | 修飾後 |
|---|---|
| 那在崇基的五年，最大的衝擊是什麼？ | 那**請問龐牧師**在崇基的五年，最大的衝擊是什麼？ |
| 為什麼取名叫做衛蘭團契呢？ | **請問**為什麼龐牧師會取名叫做「衛蘭團契」呢？ |
| 那 2013 年那一次中風的具體情形是什麼？ | **那請問龐牧師** 2013 年那一次中風的具體情形是什麼？ |
| 聽說崇基的面試是一段很特別的經驗？ | 聽說龐牧師當時崇基的面試是一段很特別的經驗，**能請師母分享一下嗎？** |

**規則**：
- 問句缺主詞時，補上紀念對象的稱謂（「龐牧師」「會督」）或受訪者稱謂（「邱牧師」「師母」），不要省略
- 加引導詞：「請問」「想請問」「能請 X 分享一下嗎」「能否」
- 第二人稱用「您」「您們」**不用「你」「你們」**——這要全篇 sweep 一次

**Sweep 腳本範例**：
```js
// 只對 <p><strong>丞譽：</strong>...</p> 這類訪問者段落做 你→您
content.replace(
  /(<p[^>]*>)(\s*<strong>\s*(?:丞譽|辰瑋|張辰瑋)\s*[:：][^<]*<\/strong>)([\s\S]*?)(<\/p>)/g,
  (m, open, label, body, close) => open + label + body.replace(/你們/g, '您們').replace(/你/g, '您') + close
);
```

### 9.12 Q&A 整合密度：3-4 組對話而非 8-10 組短問短答

每節 h3 下面**不要 8-10 個短問短答**（「是嗎？」「對」、「幾年？」「1985」）。要 **3-4 組整合過的對話**，每組答覆 1-3 段、每段都有實質內容。

**整合方式**：
- 把訪問者「補問細節」（年份、人名核對）併入受訪者的長答中——讓答覆自帶這些事實
- 把受訪者拆散的短句（中間穿插「對、是的、嗯」）併回去成完整段落
- 訪問者短促確認語（「是嗎？」「所以...」）刪掉或併入下一個正式問句

**對比參考**（同一段訪談）：
- ❌ 一問一答型：8 個 Q&A 組，每組 1-2 句
- ✅ 整合型：3 組 Q&A，每組答覆 2-3 段，把事實補述全部塞進長答

第 9 期 9-7 吳老師訪問是好的整合範本。9-5 v1（短問短答）被使用者退回；v2 整合到 13-14 組對話組才過。

### 9.13 附錄表格：用 `.timeline-table` class

當編輯室報告 / 紀念文 / 訪問需要附加年表（如生平大事年表），不要用 `.data-table`（會強制 col 3 寬度為 4rem，文字會擠成一團）。**用 `.timeline-table`**（已在 `assets/article.css` line 712 起定義），三欄不等寬：年份 5rem、左欄 47%、右欄 47%，含 mobile media query。

HTML 寫法：
```html
<table class="timeline-table">
  <colgroup>
    <col>
    <col>
    <col>
  </colgroup>
  <thead>
    <tr><th>年份</th><th>個人大事</th><th>背景事件</th></tr>
  </thead>
  <tbody>
    <tr><td>1958年</td><td>10月3日生於香港</td><td></td></tr>
    ...
  </tbody>
</table>
```

`<colgroup>` 是必要的，因為 CSS 是用 `col:nth-child(N)` 設寬度。

**TipTap 編輯器限制**：EditorView 用 `RawBlock` extension 把 `<table>` 當「不可分割整段」處理——能保留結構但無法視覺化編輯儲存格。如果要在編輯器內視覺化插入/編輯表格，需要新增 `@tiptap/extension-table` 系列（目前未裝）。**現階段把表格 HTML 直接寫進 content 字串、或在外部編好後貼進去**。

### 9.14 隱私與「請消音」內容的處理

訪談中受訪者可能會說某些「不能寫出來」的話：

**明確刪除（受訪者直接說了「不要寫」「消音」「不可錄」）**：
- 邱牧師訪談中關於「龐牧師退休後堅持被叫會督」「邱牧師被 K 兩次」、聖光神學院的批評——邱牧師明確說「記得消掉、不可以放進去」
- 這類**完全跳過**，連暗示都不留

**隱私資訊（即使受訪者主動講，仍要刪）**：
- 第三方住家地址：師母提到「邱牧師住南昌路牧宅」——刪掉「南昌路」三字，改成「在家裡」
- 涉及在世他人未確認的批評
- 醫療細節中具體醫院科別、主治醫師全名（除非有公益脈絡）

**「斟酌用詞」訊號**：
- 訪談中受訪者說「以下你們錄音沒關係，但發表時請斟酌用詞」——這段可以寫，但**用中性、不批判性語言改寫**（如「歷史傷痕」「傳統斷裂」取代「牧者牧養不盡心、宣教士被驅逐」）

**「斟酌一下都先轉出來」原則**：
- 使用者有時會說「先盡量轉出來、我自己改」——這時不要過度自我審查，可以保留訪談中有張力的真實面（如龐牧師家中分析政論節目、被會友誤會綠色布幔等小細節）
- 但這原則**不能凌駕**受訪者明確說「不要寫」的內容

### 9.15 學位/稱謂的本地化

英文簡寫在台灣讀者中接受度不一，**盡量用中文全稱**：
- B.D. / 神道學士 → **道學學士**
- M.Theol. / 神學碩士 → **神學碩士**（簡寫不寫）
- M.Div. → **道學碩士**
- BD / MA / MPhil / PhD 直接用中文「碩士」「博士」帶過，避免簡寫

例外：
- `<i>Lectio Divina</i>`、Walk to Emmaus 等專有名詞無中文標準翻譯時，保留外文 + 中文音譯
- 受訪者原話自己用 BD 時，可在 footnote 補譯「即道學學士」

### 9.16 「神道學士 / 道學學士」是兩個翻譯，都是 Bachelor of Divinity；台灣慣用「道學學士」。

---

## 十、不適用此 Skill 的情況

- 一般文章稿（非訪談） → 用 [`/admin/editor`](../../../pages/admin/editor.vue) 直接編輯
- 投稿轉文章 → 走投稿管理流程（`/admin/submissions_manager` → 轉文章）
- 訪談是其他媒體做的、《無境界者》只是轉載 → 仍可用，但「訪談簡介」要明確標註原始出處與授權，footnotes 第一條放原始連結
- 訪綱還沒寫的訪談 → 那是訪前準備，請使用者先寫訪綱再來

---

## 十、開工 checklist（每次接 Job 都對一遍）

- [ ] 取得：音檔路徑、訪綱 docx、訪問日期/地點、受訪者全稱、訪問者
- [ ] 確認期數 + 該期序號（推 id）
- [ ] `.env` 有 `GEMINI_API_KEYS`（複數，逗號分隔可放多把 fallback）
- [ ] 跑 `query_interviews.cjs` 撈最近一篇當對照樣板
- [ ] Gemini 轉錄成 `_tmp_audio/iv_{date}_raw.txt`
- [ ] Claude 整理：簡介 / 受訪者簡介 / 〔作品簡介〕/ Q&A 分節 / 後記 / 腳注
- [ ] 圖片用 `[[圖片N]]` 佔位符（之後上 Cloudinary 再替換）
- [ ] INSERT Supabase（`is_published=false`）並 SELECT 驗證
- [ ] dev server 預覽 `/articles/{id}`
- [ ] 與使用者確認後再 git commit + push（[feedback_git_push](../../../../C:/Users/user/.claude/projects/c--Users-user-Desktop-nonchurch-nuxt/memory/feedback_git_push.md)）
- [ ] 上 Cloudinary、替換圖片 URL、`is_published=true`
