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
- [ ] `<div class="custom-divider"></div>` **只在「大區塊之間」用**，訪談主體的 h3 之間不放
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
用 [`scripts/insert_interview_article.cjs`](../../../scripts/insert_interview_article.cjs)（如不存在則建立，連線方式同 [project_db](../../../../C:/Users/user/.claude/projects/c--Users-user-Desktop-nonchurch-nuxt/memory/project_db.md)）：

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

## 九、不適用此 Skill 的情況

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
