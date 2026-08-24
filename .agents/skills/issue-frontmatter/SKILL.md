---
name: issue-frontmatter
description: 維護《無境界者》每期的五張「結構頁」——目次、編輯室報告、本期作者簡介、投稿資訊、編輯資訊。每一張的欄位怎麼填、content 骨架長怎樣、哪些是後台一鍵生成的（投稿資訊吃 issues.cfp_*、編輯資訊吃 finance_periods）、哪些必須手寫（編輯室報告、作者簡介）。Use when 使用者說「更新編輯室報告／本期作者簡介／投稿資訊／編輯資訊」「這期的結構頁補一補」「下期主題改了」「財務分錄改完要重生成」。
---

# 每期結構頁維護

> 格式規範以 [`nonchurch-house-style`](../nonchurch-house-style/SKILL.md) 為準，這裡只寫這五張頁的專屬做法。
> 依據：第 1–9 期實際內容普查（2026-08-25）。

每期固定五張，`sort_order` 位置固定：

| 位置 | 頁 | `article_type` | 誰產生 | 編輯介面 |
|---|---|---|---|---|
| `{N}-0` | 目次 | `toc` | 自動（依該期文章） | `/admin/toc-editor/{id}` |
| `{N}-1` | 編輯室報告 | `regular` | **手寫** | `/admin/editor/{id}` |
| `{N}-2` | 本期作者簡介 | `regular` | **手寫** | `/admin/editor/{id}` |
| 倒數第二 | 投稿資訊 | `submission_info` | 一鍵生成（吃 `issues.cfp_*`） | `/admin/meta-article/{id}` |
| 最後 | 編輯資訊 | `editorial_info` | 一鍵生成（吃 `finance_*`） | `/admin/meta-article/{id}` |

五張共同 metadata：`category=編輯資訊`、`section` 見上表（`{N}-0/1/2` 用 `主題介紹`，後兩張用 `編輯資訊`）。
⚠️ 第 1–6 期這些欄位大量留空或 null，那是遺留；**新期一律填滿**。

---

## 一、編輯室報告（`{N}-1`）— 手寫

全刊結構最固定的一篇。1–9 期九篇骨架完全一致，照抄。

> **骨架照這裡，文氣照 [`chenwei-essay`](../chenwei-essay/SKILL.md) 第二節**——編輯室報告署名「編輯室」，但實際上一直是主編張辰瑋寫的，是他的第四種寫作模式（第一人稱主編位置、交代本期生成過程、兼具宣言性）。

### 欄位

| 欄位 | 值 |
|---|---|
| `id` / `title` | `{N}-1編輯室報告` / `編輯室報告` |
| `author` | **`編輯室`**（1–6 期寫 `主編　張辰瑋`、9 期留空，都是遺留；統一用 `編輯室`） |
| `category` / `section` | `編輯資訊` / `主題介紹` |
| `keyword` | 留空 |
| `summary` | **留空**（結構頁不放 summary，只維護 `seo`；見 memory `feedback_writing_style` 第 5 點） |
| `is_published` | 跟該期一起開 |

### content 骨架

```html
<!-- ① 題辭：一段與本期主題呼應的名句 -->
<div class="book-quote">引文全文<div class="book-quote-rel">──出處<sup class="footnote-ref"><a href="#footnote-1" id="footnote-ref-1">1</a></sup></div></div>

<!-- ② 刊務報告：本期的編輯部近況 -->
<h3>刊務報告｜{一句話小標}</h3>
<p>…</p>
<div class="custom-divider"></div>

<!-- ③ 本期主題：h2 + 主題圖 + 3-5 段主題闡釋 -->
<h2><span class="kaiti">本期主題：「{主題}」</span></h2>
<div class="theme-image"><img src="{issues.cfp_image 或本期主題圖}" alt="{主題}"></div>
<p>…</p>
<div class="custom-divider"></div>

<!-- ④ 各專區導覽：每個 section 一個 h3，內含逐篇 bullet -->
<h3>特稿專區｜{一句話小標}</h3>
<p>（一兩句話交代這一區的共同性格）</p>
<p>●&nbsp;&nbsp;<a target="_blank" rel="noopener noreferrer nofollow" href="/articles/{id}">〈{標題}〉</a>，{2-4 句摘要}</p>
<p>●&nbsp;&nbsp;…</p>
<div class="custom-divider"></div>
<h3>主題廣場（一）｜…</h3>
…
<div class="custom-divider"></div>
<h3>多元講堂｜…</h3>
…
<div class="custom-divider"></div>

<!-- ⑤ 小結：回到本期主題，最後一字接 🌏 -->
<h3>小結｜{意象化標題}</h3>
<p>…🌏</p>
```

### 寫作要點

- **小標一律 `{區塊名}｜{一句話}`**，中間用全形直線 `｜`。區塊名照該期實際 section；同一區太多篇就拆 `（一）（二）（三）`。
- **每篇文章一個 `●&nbsp;&nbsp;` bullet**，內含指向 `/articles/{id}` 的內部連結、標題用〈〉包住，後面接 2–4 句摘要（說這篇在幹嘛、為什麼收進這一區）。連結屬性照抄 `target="_blank" rel="noopener noreferrer nofollow"`。
- **刊務報告可以寫主編個人的事**（升學、修課、心境、做的夢），但**這些不准進 summary 或 SEO description**（memory `feedback_writing_style` 第 6 點）。
- 主題圖用 `.theme-image`（不是 `<figure>`）。
- 小標**不編號、不寫結構預告句**。
- 5,500–12,000 字，6–9 個 h3。
- 紀念專輯可在最後加附錄：`<h2>附錄：{對象}生平略歷與事奉年表</h2>` + `<h3>生平略歷</h3>` + `<h3>事奉年表</h3>` + `timeline-table`（範例 9-1）。年表**必須寫 `<colgroup>`**。

### 開工前先撈上一期對照

```bash
node -e "require('dotenv').config({quiet:true});const u=process.env.VITE_SUPABASE_URL,k=process.env.SUPABASE_SECRET_KEY;fetch(u+'/rest/v1/articles?select=id,content&id=eq.'+encodeURIComponent(process.argv[1]),{headers:{apikey:k,Authorization:'Bearer '+k}}).then(r=>r.json()).then(d=>console.log(d[0].content))" "8-1編輯室報告"
```

### 更新流程

1. 先確認本期目次已定稿（每篇的 id、category、section、sort_order）——bullet 要連過去，id 之後再改就會連壞。
2. 逐篇讀 content 或 summary，寫 2–4 句摘要。**不要照抄 summary**，要用編輯室的口吻重寫，並點出它與本期主題／與同區其他篇的關係。
3. 寫刊務報告與小結。
4. 寫進 DB（`is_published=false`）→ 預覽 `/articles/{N}-1編輯室報告` → 逐個 bullet 點過去確認連結沒壞 → 開 `true`。

---

## 二、本期作者簡介（`{N}-2`）— 手寫

固定兩段：`☆ 本期特邀作者／受訪者`（外部邀稿與受訪者）＋ `◇ 本期專欄作者`（編輯群與固定專欄）。
第 1 期只有後者；有特稿或專訪的期別才有前者。

### 欄位

同編輯室報告：`author=編輯室`、`category=編輯資訊`、`section=主題介紹`、`keyword` 與 `summary` **留空**。

### content 骨架

```html
<h3>☆ 本期特邀作者／受訪者</h3>
<div class="author-profile"><img src="{大頭貼 URL}" alt="{全名}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.1); flex-shrink: 0; margin: 0 auto;"><div style="flex: 1; min-width: 250px;"><h3 style="margin-top: 0; margin-bottom: 0.5rem; border-bottom: none;">{全名}</h3><p style="margin: 0; text-indent: 0;">{bio}</p></div></div>
<!-- 每位一個 .author-profile，重複 -->

<h3>◇ 本期專欄作者</h3>
<div class="author-profile">…</div>

<p style="text-align: right;">（作者依照文章先後順序排列）</p>
```

**那串 inline style 是必要的**，不要簡化——`.author-profile` 的 CSS 只管外層 flex 排版，圓形頭像、150px、陰影都靠 inline style；Word 匯出（`generate_docx.py` 2007 行起）也依賴這個結構做「左圖右文表格」。

### 寫作要點

- **順序 = 文章在本期出現的先後**，最後那行括號就是在講這件事。
- bio 長度 100–150 字（跟投稿辦法對首次投稿者的要求一致）。特邀作者寫學經歷與本期主題的關聯；專欄作者用他們自己給的自我介紹（張辰瑋、邱詠恩、金子煥的 bio 多期沿用，**直接沿用不要重寫**）。
- 大頭貼來源優先序：
  1. `images/authors/author_{id}.jpg`（作者表既有大頭貼，跨期共用）
  2. `images/articles/issue-{N}/{N}-2-{seq}.jpg`（該期專用，早期做法）
  3. 沒有大頭貼 → 用該篇文章內的人物照裁切；再沒有就跟使用者要
- `alt` 填全名。
- 撈作者既有 bio：`SELECT id,name,bio,avatar FROM authors WHERE id IN (…)`。
- 上一期已有的人**直接沿用該期的 `.author-profile` 區塊**，只換新面孔——不要每期重寫所有人。

---

## 三、投稿資訊（倒數第二篇）— 一鍵生成

`article_type=submission_info`。內容 = 固定樣板 + 本期的下期徵稿資訊。

### 資料來源：`issues` 表

| 欄位 | 內容 | 在文中的位置 |
|---|---|---|
| `cfp_title` | 下期主題名 | `<p><strong>下期主題：「…」</strong></p>` |
| `cfp_image` | 下期主題圖 URL | `<figure><img …alt="下期主題"></figure>` |
| `cfp_theme` | 徵稿說明（多段用換行分隔） | 主題圖之後的數段 `<p>` |
| `cfp_deadline` | 截稿日 | `<p>📌截稿期限：…</p>` |

其餘（開場白、9 種投稿類型、9 條投稿方式）是**全刊不變的樣板**，寫死在 [`utils/metaTemplates.js`](../../../utils/metaTemplates.js) 的 `SUBMIT_INTRO` / `SUBMIT_TYPES` / `SUBMIT_RULES`。

### 更新流程

1. 到 `/admin/issues_manager` 把**本期**的 `cfp_title` / `cfp_theme` / `cfp_deadline` / `cfp_image` 填好（這幾欄描述的是**下一期**要徵什麼稿）。
2. 開 `/admin/meta-article/{N}-{x}投稿資訊`，選要同步的期次（預設選上一期），按同步 → 確認 → 存檔。
3. 或直接用程式重生成：

```js
import { buildSubmissionInfoHtml } from "~/utils/metaTemplates";
const html = buildSubmissionInfoHtml(issueRow); // issueRow 要含 cfp_title/cfp_theme/cfp_deadline/cfp_image
```

### 坑

- **投稿類型／投稿方式那兩大段不要手改**——要改是改 `metaTemplates.js` 的常數，改完全刊重生成才會一致。
- `cfp_theme` 的換行會被切成多個 `<p>`，**寫的時候用空行分段**，不要塞 HTML（`buildSubmissionInfoHtml` 會 escape）。
- 徵稿說明 3–5 段：破題（這一期要沿著什麼線索走）→ 每條線索一段 → 收在「我們誠摯邀請您就以下方向踴躍投稿：…」列舉具體方向。範例見 9-19。
- 前台這一頁**不顯示作者區與關鍵字**（`isSubmissionInfo` 會擋掉），所以 `author` / `keyword` 填不填都不影響。

---

## 四、編輯資訊（最後一篇）— 一鍵生成

`article_type=editorial_info`。四段：編輯群 → 線上資訊 → 財務徵信 → 版權頁。全部由 [`buildEditorialInfoHtml()`](../../../utils/metaTemplates.js) 產生。

### 資料來源

| 段 | 來源 |
|---|---|
| 編輯群 | `metaTemplates.js` 的 `EDITORIAL_GROUP` 常數（主編/美術/文字/封面/網站/FB/IG＋Threads） |
| 線上資訊 | `ONLINE_INFO` 常數 |
| 財務徵信 | `finance_periods` / `finance_entries` 表，經 [`utils/financeDb.js`](../../../utils/financeDb.js) `loadPeriodWithBalance()` |
| 版權頁 | `issues.id`（→ 中文期數）、`issues.title`、`issues.date`（→ 出版年月） |

### 更新流程

1. 財務分錄有變動 → 先到 `/admin/finance` 改 `finance_entries`。
2. 開 `/admin/meta-article/{N}-{x}編輯資訊` → 按「從財務明細同步」→ 存檔。
3. **改完分錄一定要回來重生成**，否則文章裡是舊表格（memory `project_finance`）。

### 要知道的規則

- **編號（display_seq）不存 DB**，由 `computeDisplaySeqs()` 依「期次發刊年後兩位＋跨期累積流水」算出來（2025 年 → 25xx、2026 年 → 26xx，跨年才 reset）。不要手填編號。
- **結餘（balance）也不存 DB**，依 `sort_order` 累計，跨期相連。紙本已刊出的結餘可用 `balance_override` 鎖住，之後的列以它為起點續算。
- 版權頁 canonical（2026-07 全刊已統一）：英文名 `Faith Without Borders`、官網 `http://nonchurch2025.com`、出版日期用該期雙月 span 的首月。**Word 舊稿裡的 `The Non-Boundary`、定價、出版地、byethost 網址都是過時的，不要拿回來**（memory `project_import_mojibake`）。
- 財務徵信**第 4 期起才有**；第 1–3 期沒有這一段是正常的。
- 編輯群名單有變動 → 改 `metaTemplates.js` 的 `EDITORIAL_GROUP`，然後**所有期都重生成一次**。

---

## 五、目次（`{N}-0`）

`article_type=toc`，`content` 是空的——前台 `pages/articles/[id].vue` 的 `isToc` 分支直接依該期 articles 的 `sort_order` / `section` / `category` 即時渲染。

- 要調整順序或分區 → 改各篇文章的 `sort_order` / `section`，不是改目次的 content。
- 專用編輯介面 `/admin/toc-editor/{id}`。
- `page_start`（紙本頁碼）在 meta-article 介面填。

---

## 六、開新一期時的建置順序

1. `issues` 表新增一列（`id`、`title`、`date`、`is_published=false`）。
2. 建五張結構頁的 placeholder（`{N}-0` 目次、`{N}-1` 編輯室報告、`{N}-2` 本期作者簡介、投稿資訊、編輯資訊），`article_type` 照第一節的表填對。
3. 內容文章逐篇進來（`{N}-3` 起）。
4. 目次定稿後才寫編輯室報告（bullet 要連 id）。
5. 作者到齊後才寫本期作者簡介。
6. 下期主題定了 → 填 `issues.cfp_*` → 生成投稿資訊。
7. 該期財務期間結算 → 生成編輯資訊。
8. 全部 `is_published=true`，並跑 `nonchurch-house-style` 第八節的自檢＋`�` 掃描。

---

## 七、不適用

- 一般文章 → [`upload-article`](../upload-article/SKILL.md) / [`interview-article`](../interview-article/SKILL.md) / [`chenwei-essay`](../chenwei-essay/SKILL.md)
- 這五張頁的 SEO 與多語 → [`seo-multilang`](../seo-multilang/SKILL.md)（結構頁只維護 `seo`，`summary` 留空）
