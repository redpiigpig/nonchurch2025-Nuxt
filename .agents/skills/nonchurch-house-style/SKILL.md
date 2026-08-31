---
name: nonchurch-house-style
description: 《無境界者》全刊通用體例規範 — articles 表每個欄位怎麼填、content 能用哪些 HTML class（有 CSS 撐腰的完整清單＋禁用清單）、腳注的兩套語法、標點與中英夾字、副標命名法、category×section 對照與篇幅基準。Use when 要寫／改／上架任何一篇《無境界者》文章，或要決定分類、排版、腳注、關鍵字、摘要，或想確認某個 class 到底能不能用。
---

# 《無境界者》體例規範（全刊通用）

> 這是**參考型** skill，不是流程 skill。`upload-article` / `interview-article` / `chenwei-essay` / `issue-frontmatter` 都以這份為格式的唯一權威來源；那幾支只寫各自的流程，格式有衝突時**以本篇為準**。
> 依據：第 1–9 期全 165 篇實際內容的普查（2026-08-25），不是憑印象。

| 我要做的事 | 去哪 |
|---|---|
| 判斷某位作者的口吻 | [`references/authors.md`](references/authors.md) |
| 判斷某個文類的體例與骨架 | [`references/genres.md`](references/genres.md) |
| 別人交完整文章＋照片要上架 | [`upload-article`](../upload-article/SKILL.md) |
| 人物專訪音檔 → 文章 | [`interview-article`](../interview-article/SKILL.md) |
| 張辰瑋的稿／他丟概念要你生成 | [`chenwei-essay`](../chenwei-essay/SKILL.md) |
| 編輯室報告／作者簡介／投稿資訊／編輯資訊／目次 | [`issue-frontmatter`](../issue-frontmatter/SKILL.md) |
| SEO 與五語翻譯 | [`seo-multilang`](../seo-multilang/SKILL.md) |
| 寫作者頁的簡介（`authors.bio`） | [第十節](#十authorsbio作者頁簡介怎麼寫) |

---

## 一、articles 欄位速查

前台渲染在 `pages/articles/[id].vue`。「前台行為」欄是實際程式行為，不是慣例。

| 欄位 | 怎麼填 | 前台行為 |
|------|--------|----------|
| `id` | `{issue}-{sort_order}{title}`，中文照打、不加空格。例 `9-13從敬虔到公義` | 網址 `/articles/{id}` |
| `title` | 主標，7–15 字 | `<h1 class="main-title">` |
| `subtitle` | 副標，**不要自己加破折號**——前台自動加 `──` 前綴 | `<h1 class="sub-title">`，渲染成 `──副標` |
| `issue` | 期數整數 | |
| `sort_order` | 該期序號，與 id 前綴一致 | 目次排序 |
| `category` | 見第六節。**空字串／null 是舊資料遺留，新稿一律填** | 標題上方彩色 `.featured-box` |
| `section` | `主題介紹` / `特稿專區` / `主題廣場` / `多元講堂` / `編輯資訊` | 目次分隔線標籤 |
| `author` | 顯示用作者字串。可含 `<br>`、頓號多作者、或「文：X｜圖：Y｜台文翻譯：Z」複合掛名 | `.author-line` |
| `author_display` | 目次／列表用的短名 | |
| `author_title` | 作者頭銜（例「龐君華牧師之子」）。沒有就留空 | `.author-title-line` |
| `remark` | 補充資訊，用 `<br>` 或多個 `<p>` 分行。訪談放「訪問時間／地點」；轉載放出處與授權 | 每行一條 `.author-remark-line` |
| `keyword` | **正規格式 `🌿關鍵字：A、B、C、D、E`**（🌿 後**不空格**、頓號分隔、5 個） | `.keyword-section` |
| `summary` | 100–220 字前台簡介。**不要用「本期《無境界者》以「X」為題」開場** | 列表卡片、SEO |
| `content` | HTML 字串，見第二節 | `.markdown-body` |
| `footnotes` | JSONB 陣列，見第三節 | 文末 `.footnotes` |
| `article_type` | `regular`（一般）/ `toc` / `submission_info` / `editorial_info` | 決定走哪套渲染與哪個編輯器 |
| `type` | `text` | |
| `is_published` | 初稿一律 `false`，校完再開 | |
| `linked_author_ids` | 既有作者填 `[id]`，用來連作者頁 | |
| `seo` / `translations` / `media_data` | JSONB，見 [`seo-multilang`](../seo-multilang/SKILL.md) | |

**普查實測**：138 篇 regular 中 17 篇沒有 summary（都是結構頁或極短的封面故事）；summary 長度中位數 142 字。

---

## 二、content 的 HTML

原則：**全 HTML、零 Markdown**。標楷體 `<span class="kaiti">`、外文書名 `<i>`、粗體 `<strong>`、中文書名 `《》`、篇名 `〈〉`。

舊稿相容：`**text**`→標楷體、`*text*`→粗體、`<em>`→標楷體。`<em>` 仍有 CSS 撐著且庫內 50 篇在用，**不必回頭批改**，但新稿一律寫 `.kaiti`。

### 2.1 段落

- 一般敘事段**不加 class**，CSS 預設 `text-indent: 2em`（段首空兩格）。
- `class="no-indent"` **只用在**：Q&A 問答的首段、圖說類、方塊內文字。

⚠️ 訪談簡介／受訪者簡介／後記這些敘事段**要縮排**，不要 `no-indent`。

### 2.2 圖片

```html
<figure class="img-bottom px-600">
  <img src="…" alt="…">
  <figcaption>主要敘述<br>（日期或來源）</figcaption>
</figure>
```

| 浮動 class | 用途 | 庫內用量 |
|---|---|---|
| `img-bottom` | 置中、獨佔一行（最常用） | 292 |
| `img-right` | 右浮動（大頭照、小配圖） | 100 |
| `img-left` | 左浮動 | 21 |
| `w-full` | 滿版 | 3 |

寬度 class：`px-150` ~ `px-800`。
⚠️ `px-900` 在 1-7 與 3-11 各用過一次但原本 CSS 沒定義（已於 2026-08-25 補上 `px-850` / `px-900`）。要用超過 800 的先確認 `assets/article.css` 有那一格。

圖說授權標註：`（照片由XXX提供）`、`（圖片來源：XXX）`、`（Gemini 生成圖）`、`（ChatGPT 生成圖）`。外部圖走維基共享資源時標「（攝影：X，授權，圖片來源：維基圖庫連結）」，PD 寫「公有領域」。

大頭照專用外框（**只用在受訪者／作者簡介的大頭照**）：

```html
style="border: 1px solid #000; outline: 4.5px solid #000; outline-offset: 1px;"
```

### 2.3 引文

| 寫法 | 用途 | 用量 |
|---|---|---|
| `<div class="book-quote">…<div class="book-quote-rel">──出處</div></div>` | 開篇題辭／整段名句（編輯室報告固定用它開場） | 20 |
| `<blockquote>` | 一般引文 | 96 |
| `<div class="indented-quote">` | 經文整段縮排引用（詩體直接換行，不需 `<br>`） | 10 |

### 2.4 方塊

| Class | 用途 | 結構 |
|---|---|---|
| `book-box` | **書評／影評的書籍資訊卡**（13 篇在用，是書評標配） | `book-box > book-info（【書名】【原書名】【作者】【譯者】【出版資訊】）+ book-image > img` |
| `reference-box` | 參考書目／延伸閱讀（8 篇） | `reference-box > strong + ul > li` |
| `special-box` | 詩歌／歌詞卡 | `special-box > h3（歌名連結）+ p.meta（詞曲）+ p（歌詞，`<br>` 換行）` |
| `info-card` | 團體／組織資訊卡 | `info-card > info-card-inner > img + div > h3 + info-card-links > a` |
| `custom-divider` | 段落分隔線 | `<div class="custom-divider"></div>` |
| `theme-image` | 編輯室報告的本期主題圖 | `<div class="theme-image"><img …></div>` |

`book-box` 範例（6-14）：

```html
<div class="book-box">
  <div class="book-info">
    <strong>書籍資訊</strong><br />
    【書名】生命中不能承受之輕<br />
    【原書名】Nesnesitelná lehkost bytí (Paris: Gallimard, 1986)<br />
    【作者】米蘭・昆德拉（Milan Kundera, 1929-2023）｜捷克人｜小說家<br />
    【譯者】尉遲秀<br />
    【出版資訊】台北：皇冠，2018年10月
  </div>
  <div class="book-image"><img src="…" alt="…封面" /></div>
</div>
```

### 2.5 表格

| Class | 用途 |
|---|---|
| `data-table` | 一般資料表（財務徵信、宗派對照表）。第一欄窄 |
| `timeline-table` | **年表**（生平大事、雙線對照）。**必須寫 `<colgroup><col><col><col></colgroup>`**，CSS 靠 `col:nth-child(N)` 給寬度 |

年表不要用 `data-table`——它會把第 3 欄壓成 4rem，字擠成一團。

TipTap 編輯器用 `RawBlock` 把 `<table>` 當不可分割整段，能保留但無法視覺化編輯儲存格。表格 HTML 直接寫進 content 字串。

### 2.6 ⚠️ 禁用 / 沒有 CSS 的 class

這些在庫裡出現過但**前台完全沒有樣式**，等於白寫：

| Class | 出現處 | 該怎麼寫 |
|---|---|---|
| `creed` | 4-11 | 改 `indented-quote` 或 `blockquote` |
| `dialogue` | 4-11、5-4 | 改一般 `<p>` |
| `special-text` | 1-6 | 改 `<strong>` 或 `.kaiti` |
| `MsoNormal` | 8-16、9-7 | Word 貼上的殘留，整個 class 拿掉 |
| `<mark>` 螢光筆 | — | **禁止**。畫重點一律 `<strong>`，不要為此改編輯器（memory `feedback_no_new_editor_features`） |

---

## 三、腳注：兩套語法，不要搞混

### 3.1 content 內 → 寫完整 HTML

```html
…需要註解處<sup class="footnote-ref"><a href="#footnote-1" id="footnote-ref-1">1</a></sup>。
```

### 3.2 title / subtitle / author / author_title / remark → 寫 `[^N]` 簡寫

這幾個欄位**不能塞 HTML `<sup>`**，要寫 markdown 式的 `[^1]`。前台 `formatTextWithFootnote()` 會轉成上標並連到同一個腳注（`pages/articles/[id].vue:532`）。

實例：`9-8念君華` 的 subtitle `十二載香港足印（1987-1999）[^1]`、`9-4我是在修的人` 的 remark `本文曾刊登在衛理神學院網站上[^1]`。

**看到這些欄位裡的 `[^N]` 不要當成沒轉乾淨的 Markdown 去「修掉」——那是正確寫法。**

### 3.3 JSONB 結構

```json
[{"id": "1", "text": "作者，〈篇名〉，《書名》（出版地：出版社，YYYY），頁X-Y。"}]
```

- `id`：新稿一律**字串**（`"1"`）。庫內舊稿字串／數字各半，讀取時 `Number(fn.id)` 正規化（見 CLAUDE.md 腳注編號 bug）。
- `refId`：**前台不讀它**（渲染只用 `note.id`）。既有資料 156/804 筆有、其餘沒有，兩種都能跑。要填就填 `ref-{id}`，不填也完全正常。
- 內含網址：`<a href="…" target="_blank" rel="noopener noreferrer">…</a>`。
- 徵引體例：文史類依《國史館館刊》、社科類依《臺灣宗教研究》（這也是對投稿者的公告要求）。

---

## 四、標點、夾字、結尾

1. **破折號一律 `──`（U+2500 ×2）**，不要 `——`（em dash）。全站已於 2026-08-25 統一過一次。單一 `—` 當連接號（「穀物—農業—國家」）維持原樣。
2. **中英之間加半形空格**：「台北的 YMCA」「（ChatGPT 生成圖）」。只在漢字↔拉丁字母之間加；**數字不加**（「1987年」不改）；全形標點旁不加。
3. **每篇最後一個字後面接 🌏**（地球，象徵無境界）。這是**全刊規則、不是張辰瑋個人習慣**——普查 138 篇 regular 有 130 篇都收 🌏。庫內混用 `🌏` / `🌏️`（帶 VS16）/ 早期的 `🌍`，前台顯示相同，不必回頭統一；新稿寫 `🌏`。
4. **小標不編號**（不要「一、」「（一）」）、**不寫結構預告句**（「接下來我要分七步」「稍後會回來談」）。詳見 memory `feedback_writing_style`。
5. 人名首次出現加生卒年：`彭明敏（1923-2022）`。年份寫 `1987年`，不寫「西元 1987 年」。
6. 學位用中文全稱：道學學士 / 道學碩士 / 神學碩士，不用 B.D. / M.Div. 簡寫。

---

## 五、副標（subtitle）怎麼取

普查 91 個副標，就這幾種句型，照抄不要另創：

| 文類 | 句型 | 實例 |
|---|---|---|
| 書評 | `簡評{作者}《{書}》` / `《{書}》評介` | `簡評米蘭‧昆德拉《生命中不能承受之輕》`、`矢內原忠雄《日本帝國主義下之臺灣》評介` |
| 影評／劇評 | `從《{片}》看{主題}` | `從電影《世外》看信仰、抗爭與行動的重量` |
| 回應文 | `回應{作者}〈{篇}〉` / `評{作者}〈{篇}〉兼論…` | `回應張辰瑋〈尼西亞基督教的形成〉` |
| 人物專訪 | `{受訪者}訪談記` / `專訪{受訪者}` | `昭慧法師訪談記`、`專訪田孟淑長老（田媽媽）` |
| 紀念專輯的訪問 | `{受訪者}追憶{紀念對象}` | `楊肇悅師母追憶龐君華會督` |
| 系列連載 | `{系列名}（{中文數字}）` | `我的信仰史（六）`、`野橄欖神學社與後現代神學（四）`、`基督宗教宗派譜系學初探（二）`、`內村鑑三與宣教士的糾葛（一）` |
| 一般專題 | 一句話點出角度 | `從性別與群體觀出發的感恩禮拜實踐` |

**系列編號要先查前一集**：`SELECT id,subtitle FROM articles WHERE subtitle LIKE '%系列名%'`，不要憑印象接號。庫內現行系列見 [`references/genres.md`](references/genres.md)。

---

## 六、category × section 對照

`category`（文類，決定標題上方色塊）：
`封面故事`、`專題文章`、`評論與回應`、`生命故事`、`時事評論`、`人物專訪`、`文藝創作`、`文獻與翻譯`、`公告與剪影`、`編輯資訊`

`section`（版面區塊，決定目次分段）：
`主題介紹`、`特稿專區`、`主題廣場`、`多元講堂`、`編輯資訊`

慣用組合：

| 情境 | category | section |
|---|---|---|
| 封面故事（一張照片＋短文） | `封面故事` | `主題介紹` |
| 目次 / 編輯室報告 / 本期作者簡介 | `編輯資訊` | `主題介紹` |
| 特邀作者、人物專訪 | `專題文章`／`人物專訪`／`時事評論` | `特稿專區` |
| 專欄作者扣本期主題 | `專題文章`／`生命故事`／`評論與回應` | `主題廣場` |
| 跨界、非本期主題、理論性 | `專題文章`／`評論與回應`／`時事評論` | `多元講堂` |
| 投稿資訊 / 編輯資訊 | `編輯資訊` | `編輯資訊` |

拿不準就 `SELECT id,category,section FROM articles WHERE issue=N ORDER BY sort_order` 看同期慣例。

---

## 七、篇幅基準（1–9 期普查值，純文字字數）

| 文類 | 字數 | 腳注 | h3 小節 | 配圖 |
|---|---|---|---|---|
| 封面故事短文 | 250–800 | 0 | 0 | 1 |
| 生命故事 | 1,700–3,000 | 0–2 | 2–4 | 1–3 |
| 評論與回應（書／影評） | 3,000–5,000 | 0–8 | 4–6 | 2–4 |
| 專題文章（一般） | 4,000–6,000 | 3–10 | 5–7 | 2–5 |
| 專題文章（學術型） | 4,000–8,000 | **12–28** | 5–6 | 3–6 |
| 人物專訪 | 8,000–20,000 | 2–15 | 5–8 | 6–8 |
| 編輯室報告 | 5,500–12,000 | 0–4 | 6–9 | 1–2 |

---

## 八、上架前自檢

- [ ] 段落沒有多餘 `no-indent`；Q&A 首段有 `no-indent`
- [ ] 所有 `class=` 都在第二節清單裡（沒有 `creed` / `dialogue` / `MsoNormal` / `<mark>`）
- [ ] `px-` 寬度在 CSS 有定義
- [ ] 破折號是 `──`，中英之間有空格
- [ ] 收尾有 🌏
- [ ] `keyword` 是 `🌿關鍵字：A、B、C、D、E`（🌿 後不空格）
- [ ] `summary` 沒有以「本期《無境界者》以…為題」開場
- [ ] subtitle 沒有自己加 `──`
- [ ] 腳注：content 內用 `<sup>`，title/subtitle/remark 用 `[^N]`
- [ ] 年表用 `timeline-table` 且有 `<colgroup>`
- [ ] **跑一次 `�`（U+FFFD）掃描**——Word 匯入路徑會壞字，每期上架後都要掃（memory `project_import_mojibake`）
- [ ] `is_published=false` → 預覽 `/articles/{id}` → 校對 → 才開 `true`

一鍵掃 class / 標點 / 🌏（走 REST，不用 pg 直連）：

```bash
node -e "require('dotenv').config({quiet:true});const u=process.env.VITE_SUPABASE_URL,k=process.env.SUPABASE_SECRET_KEY;fetch(u+'/rest/v1/articles?select=id,content,keyword&issue=eq.'+process.argv[1],{headers:{apikey:k,Authorization:'Bearer '+k}}).then(r=>r.json()).then(d=>{for(const a of d){const c=a.content||'',bad=[];for(const x of ['creed','dialogue','special-text','MsoNormal','<mark','px-900','——','�'])if(c.includes(x))bad.push(x);if(!/🌏|🌍/.test(c))bad.push('缺🌏');if(a.keyword&&!/^🌿關鍵字：/.test(a.keyword))bad.push('keyword前綴');if(bad.length)console.log(a.id,'→',bad.join(', '))}})" 9
```

---

## 九、庫內已知的不一致（新稿別跟著學）

普查 1–9 期發現，**這些是歷史遺留，不是規範**：

| 現象 | 實況 | 新稿怎麼做 |
|---|---|---|
| `keyword` 前綴四種寫法 | `🌿關鍵字：` 59 篇、`🌿 關鍵字：` 29 篇、無前綴 16 篇、空 30 篇（另有帶前導空白／`\r\n` 的） | 一律 `🌿關鍵字：` |
| `category` / `section` 空字串或 null | 第 1–6 期的編輯室報告、作者簡介大量留空 | 一律填 `編輯資訊` + `主題介紹` |
| 編輯室報告的 `author` 有三種 | `主編　張辰瑋`（1–6 期）、`編輯室`（7–8 期）、空（9 期） | 見 [`issue-frontmatter`](../issue-frontmatter/SKILL.md) |
| 腳注 `id` 字串／數字混用、`refId` 有無混用 | 四種組合都有 | 新稿 `{"id":"N","text":"…"}` |
| `<em>` 當標楷體 | 50 篇在用，CSS 仍相容 | 新稿寫 `<span class="kaiti">` |
| 7-6 用 `——`（em dash）9 處 | 台文稿，未納入 2026-08-25 統一 | 新稿一律 `──` |

---

## 十、`authors.bio`（作者頁簡介）怎麼寫

前台：`pages/authors/[name].vue` 用 `<p style="white-space: pre-line">` 直出，**純文字、不吃 HTML**。
`authors/index.vue` 同一份 bio 也會在列表卡片上出現，所以**寫一段就好**，別分段。

**字數：zh_TW 150–190 字，一段。** 基準樣本：黃春生牧師（id 50）176 字、鄭仰恩牧師（id 49）187 字。

**三句結構**（照這個順序，不要打散）：

| 句 | 寫什麼 | 例（黃春生） |
|---|---|---|
| ① 身分 | **一句**交代學歷＋現職，各挑一個關鍵年份就好 | 1998年畢業於台灣神學院，2015年起擔任濟南長老教會第十二任主任牧師。 |
| ② 主張 | 他自己的核心信念，可用引號短語＋破折號補一句他的原話 | 他主張教會是「道成肉身的群體」，必須在具體處境中面對不公不義——信仰若沒有落實在處境裡，就失去了生命。 |
| ③ 事蹟 | 一到兩件**有年份、有動作、有結果**的具體事，分號連接 | 2019年反送中運動之後，他長年接待來台的香港政治庇護者；2024年5月青鳥行動期間，他打開濟南教會的門，組織義工、分發物資，讓這座立法院旁的百年教堂成為民眾口中的「回血站」。 |

**不要寫**：

- 出生年、出生地（除非那是他的重點）
- 完整學位清單、歷任職務與兼職一路列到底（董事長、理事長、教務長、主任……挑 0–1 個）
- 頭銜堆疊與抽象讚美——「長期關注…」「深耕…」「重要的一代學者」這種**沒有動作**的句子一律刪
- 他的方法論／學說整套摘要（那是文章的事，不是簡介的事）

**素材哪裡來**：優先用該作者在本刊的**專訪逐字稿**（受訪者簡介＋內文他自己講的事），不要憑外部履歷拼。

**五語**：照精簡後的 zh_TW 翻，**不准在譯文裡補中文版沒有的資訊**（舊資料常有這個病）。
`zh_HK` 直接等於 zh_TW；`name` 欄照 [`seo-multilang`](../seo-multilang/SKILL.md) 的姓名規則，改 bio 時**不要動 name**。
自然長度：ja/ko 約中文字數的 1.4–1.8 倍，en 約 650–850 字元。
