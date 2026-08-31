---
name: seo-multilang
description: 《無境界者》的 SEO 與五語（en/ja/ko/zh_CN/zh_HK）資料維護準則——新文章/作者/期刊要怎麼自動補齊 SEO 與多語翻譯、資料存在哪些欄位、前台怎麼吃、以及維持全站多語一致的鐵則。Use when 要為文章/作者/期刊補 SEO、加多語翻譯、稽核或修翻譯、或問「SEO 要放哪」「多語欄位長怎樣」。
---

# 《無境界者》SEO ＋ 多語維護準則

> 每次要「補 SEO」「加五語簡介」「稽核/修翻譯」都先讀這份。
> 全站內容語言：**原文 zh_TW（繁中）** ＋ 五種翻譯 **en、ja、ko、zh_CN（簡中）、zh_HK（港式書面語）**。
> DB 操作走 REST API（`VITE_SUPABASE_URL` + `SUPABASE_SECRET_KEY`），詳見 [[project_db]]；**任何 key 值都不准寫進程式碼或回報**。

---

## 一、SEO 與翻譯資料存在哪裡

| 內容 | 欄位 / 表 | 形狀 |
|------|-----------|------|
| 文章 SEO | `articles.seo`（jsonb） | 見下方「文章 seo 結構」 |
| 文章多語 | `articles.translations`（jsonb） | `{ <locale>: { title, subtitle, author_display, summary } }` |
| 文章多語 SEO | `article_seo_translations`（表） | 每篇 **6 個 locale** × `{ og_title, og_description, keywords, description }` |
| 作者多語 | `authors.translations`（jsonb） | `{ <locale>: { name, bio } }` |
| 期刊多語 | `issues.translations`（jsonb） | `{ <locale>: { title, date, intro_home, intro_cfp, cfp_title, cfp_theme } }` |

`article_seo_translations` 的 locale 用 **6 個**：`zh_TW, zh_HK, zh_CN, en, ja, ko`（含原文 zh_TW）。
`translations` jsonb 用 **5 個**（不含 zh_TW，因原文即 base）：`en, ja, ko, zh_CN, zh_HK`。

### 文章 `seo` 結構（★新文章一律用「新結構」）

```jsonc
// 新結構（issue 9 起，往後都用這個）
{
  "image": "https://res.cloudinary.com/.../9-3-1.jpg",   // 該篇專屬圖；沒有才退回封面/topic.jpg
  "pdf": "",
  "seo_data": {
    "category": "封面故事",                 // 用文章自己的 category
    "url_slug": "a-fathers-prayer-...",     // 英文 kebab，3–7 字，全站唯一
    "focus_keywords": ["無境界者雜誌", "..."],// 8–10 個，中英/專名混用
    "image_alt_text": "繁中一句，描述首圖",
    "meta_description": "繁中 SEO 描述 ~80–120 字，提《無境界者》第N期＋文章核心"
  },
  "article_summary": "繁中 100–180 字，SEO 品質的完整段落"
}
```

> **舊結構（issues 1–8 遺留）**：`{ og, pdf, image, keywords, description }`——其中 `seo.description` 才是「SEO 文章簡介」。維護舊文時改 `seo.description`；新文一律用新結構。

### 前台怎麼吃（`pages/articles/[id].vue` 的 `useSeoMeta`）
- `ogImage` / `twitterImage` ← `article.seo.image`
- `og:description` / `description` ← **base `summary`**（目前不吃翻譯版 summary）
- `keywords` ← `keyword` 欄（可被 `translations[locale].keyword` 覆寫）
- `title` / `author` ← `translations[locale].{title, author_display}`
- 分頁 favicon（地球 logo，`web_Logo.png`）**只用於 `<link rel=icon>`，禁止塞進任何 og:image**；預設 og:image 用 `.../topic.jpg`。詳見 [[feedback_seo_image]]。

---

## 二、★鐵則

1. **SEO 簡介 ≠ 文章 summary。** `seo_data.meta_description`／`article_summary`（或舊結構 `seo.description`）是**搜尋導向**的文案，不能是 `summary`（讀者導向摘要）的改寫或濃縮。判斷法：把兩者做 char-bigram Dice 相似度，**≥ 0.35 就算太像、要重寫**（目標 < 0.3）。重寫時換切角：用 hook／問句／專名開頭，帶《無境界者》第N期＋期主題＋可搜尋關鍵詞。
2. **每篇新文章、新作者、新期刊，發布前都要補齊五語。** 缺語言＝未完成。
3. **`author_display` 的英文名以 `authors` 表為單一真相來源。** 寫文章 `translations.en.author_display` 前先查該作者 `authors.translations.en.name`，兩邊要一致（例：廖本恩→Liao Pen-en、金子煥→Jin Zi-huan、張辰瑋→Thomas Chang）。不要在文章端自己另拼一個。
4. **is_published 不要順手打開。** 補資料時只動內容欄位，發布與否由使用者決定。
5. **結構頁**（目次 `toc`／投稿資訊 `submission_info`／編輯資訊 `editorial_info`）給輕量 SEO＋只翻標題即可，不必做 6-locale `article_seo_translations`。

---

## 三、author_display / 姓名 各語渲染規則

| locale | 姓名處理 |
|--------|---------|
| zh_HK | 保留原繁體漢字（例 楊肇悅師母、邱泰耀牧師） |
| ja | 保留原漢字 |
| zh_CN | 簡體 |
| ko | 諺文音譯 |
| en | 有既定英文名就用；否則用羅馬拼音。**一律對齊 `authors` 表的 en.name** |

`編輯室` → en「The Editors」。訪談類文章的 `author_display` 用受訪者姓名。

---

## 四、固定詞彙表（Glossary，翻譯必須一致）

| 中文 | en | ja | ko |
|---|---|---|---|
| 無境界者（誌名） | Faith Without Boundary | 境界なき者 | 경계 없는 자 |
| 龐君華會督 / 牧師 | Bishop / Rev. Pang Chun-hua | 龐君華監督／牧師 | 팡쥔화 감독/목사 |
| 城中教會 / 城中牧區 | Chengzhong Methodist Church | 城中教会 | 청중교회 |
| 衛理公會 | the Methodist Church | メソジスト教会 | 감리교회 |
| 循道 / 衛斯理 | Methodist / Wesleyan | ウェスレー | 웨슬리 / 감리교 |
| 約翰‧衛斯理 | John Wesley | ジョン・ウェスレー | 존 웨슬리 |
| 世界是我的牧區 | The world is my parish | 世界は私の牧区 | 세계는 나의 교구 |
| 崇基學院神學院 | Chung Chi Divinity School | 崇基神学院 | 충치신학원 |
| 大齋期 / 禁食 | Lent / fasting | 四旬節 / 断食 | 사순절 / 금식 |
| 濟南教會 | Chi-nan Presbyterian Church | 済南教会 | 지난교회 |
| 台灣基督長老教會 | the Presbyterian Church in Taiwan | 台湾基督長老教会 | 대만기독장로교회 |
| 青鳥行動 | the Bluebird Movement | 青鳥運動 | 블루버드 운동 |
| 太陽花學運 | the Sunflower Movement | ひまわり学生運動 | 해바라기 학생운동 |
| 反送中 | the anti-extradition protests | 逃亡犯条例改正案反対デモ（反送中） | 반송중 시위 |

> 新增固定譯名時補進本表，讓後續一致。

---

## 五、標準流程：為一批文章自動補 SEO ＋五語

適合用**平行 subagent** 產資料、再由主流程集中寫 DB（避免併發寫與 key 外洩）。

1. **抓 metadata**：`articles?issue=eq.{N}&select=id,title,subtitle,category,section,author,author_display,summary,seo` ＋ `media_assets`（取每篇首圖當 `seo.image`；已有就保留原值）。
2. **分批派 subagent**：每批 5–6 篇，給它們（a）本 skill 的 glossary 與 JSON 形狀、（b）該批文章 metadata、（c）一個真實範例校準語氣。要求輸出**純 JSON 陣列**寫到檔案（不要貼進對話）。每篇產：
   - `seo_data`（category/url_slug/focus_keywords/image_alt_text/meta_description）
   - `article_summary`
   - `translations`（en/ja/ko/zh_CN/zh_HK 各 title＋summary＋author_display）
   - `seo_translations`（6 locale 各 og_title/og_description/keywords/description）
3. **驗證後集中寫回**：
   - `PATCH articles` 設 `seo`（保留原 image/pdf）＋ `translations`。
   - `article_seo_translations`：先 `DELETE` 該批 id 舊列，再分塊 `INSERT` 6×N 列。
   - 期刊層級：`PATCH issues` 設 `translations`。
4. **收尾稽核**（見下）＋回報缺口（空內文的文章跳過並標記）。

DB 連線用一個帶重試的 helper（REST，偶爾會 401/ECONNRESET，要 retry）：直接讀專案 `.env` 的鍵名、**不落任何值**。

---

## 六、稽核查詢（回頭檢查全站）

- **SEO 簡介與 summary 太像**：對每篇非結構文章算 `dice(seo有效描述, summary)`，`>=0.35` 列出重寫。「有效描述」＝新結構取 `seo_data.meta_description`、舊結構取 `seo.description`。
- **翻譯缺語言/亂碼**：檢查 `translations` 是否 5 語齊、有沒有數字 key（`0,1…` 代表被存成陣列＝壞掉要重寫）、有沒有空字串欄位（但空的 base summary 對應空翻譯是正常）。
- **誌名一致性**：en summary 內不該出現「無境界者 / Boundaryless / Wujingjie」等非標準寫法，統一為 Faith Without Boundary。
- **author_display 英文名殘留中文**：掃 `translations.en.author_display` 是否含 CJK，有就用 `authors` 表 en.name 修掉。

> 相似度 Dice（char bigram）：把字串去空白切成相鄰兩字集合，`2*交集/(|A|+|B|)`。

---

## 七、注意
- 這是**參考型 skill**，不是上架流程 skill；跟 [[project_skills_scope]]（上架 skill 只維持 interview/chenwei/upload）不衝突。
- 相關：[[project_issue9]]（第九期實作紀錄）、[[project_media_assets]]（圖片與 media_assets）、[[project_db]]（DB 存取）、[[feedback_seo_image]]（favicon vs og:image）。
