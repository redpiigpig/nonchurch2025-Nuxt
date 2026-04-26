# 龐君華數位典藏 — 講道集輸入規則手冊

> 本文件供 NotebookLM 讀取，作為輸入講道資料的完整參考。
> 凡輸入新講道，均照此規則處理。

---

## 一、資料儲存位置

- **資料表**：`pong_sermons`（Supabase PostgreSQL）
- **輸入方式**：執行 Node.js seed 腳本（`scripts/` 資料夾）
- **範本腳本**：`scripts/seed_pong_sermon_20240317.mjs`（已完成的第一筆，格式標準）

---

## 二、資料表欄位說明

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | SERIAL | 自動 | 主鍵，系統自動產生 |
| `title` | TEXT | 否 | 講道標題（部分舊資料無題可留空） |
| `title_en` | TEXT | 否 | 英文標題（選填） |
| `church_year` | SMALLINT | **是** | 教會年起始年份（見下方說明） |
| `liturgical_season` | TEXT | **是** | 節期名稱（見下方說明） |
| `sermon_date` | DATE | 否 | 講道日期，格式 `YYYY-MM-DD` |
| `occasion` | TEXT | 否 | 場合，例如「主日崇拜」「退修會」「奮興會」 |
| `location` | TEXT | 否 | 地點，例如「台北衛理堂」「成中教會」 |
| `preacher` | TEXT | 否 | 證道者姓名，例如「龐君華」 |
| `worship_leader` | TEXT | 否 | 司會姓名 |
| `worship_team` | TEXT | 否 | 敬拜團隊，例如「林雅惠、榮恩敬拜團」 |
| `scripture_readings` | JSONB | 否 | 經課（見下方格式） |
| `worship_songs` | JSONB | 否 | 詩歌清單（字串陣列） |
| `content` | TEXT | 否 | 講道逐字稿（純文字，見下方格式） |
| `youtube_url` | TEXT | 否 | YouTube 完整連結，例如 `https://www.youtube.com/watch?v=xxxxx` |
| `has_recording` | BOOLEAN | 否 | 是否有錄音/錄影（預設 false） |
| `is_published` | BOOLEAN | 否 | 是否公開顯示（預設 true） |
| `footnotes` | JSONB | 否 | 腳注，格式 `[{"id":1,"text":"..."}]`（通常講道不用） |

---

## 三、church_year 教會年計算規則

**定義**：`church_year` = 將臨期（Advent）起始年份。

| church_year | 教會年範圍 | Advent 1 大約日期 |
|-------------|-----------|-----------------|
| 2000 | 2000/12 ─ 2001/11 | 2000-12-03 |
| 2023 | 2023/12 ─ 2024/11 | 2023-12-03 |
| 2024 | 2024/12 ─ 2025/11 | 2024-12-01 |
| 2025 | 2025/11/30 ─ 2026/01/31 | 2025-11-30 |

**判斷方法**：
- 講道日期在 11 月底（Advent 1）到隔年 11 月底之前 → `church_year` = Advent 起始年
- 例如：2024-03-17（大齋期）→ Advent 起始於 2023-12-03 → `church_year = 2023`
- 例如：2025-03-02（顯現期）→ Advent 起始於 2024-12-01 → `church_year = 2024`
- 例如：2025-11-30（將臨期第一主日）→ Advent 起始於 2025-11-30 → `church_year = 2025`

---

## 四、liturgical_season 節期寫法

此欄位填**中文描述**，前端用來判斷顏色。可用下列格式：

| 節期 | 推薦寫法 | 關鍵字（前端偵測用） |
|------|---------|-----------------|
| 將臨期 | `將臨期第N主日` | 將臨 |
| 聖誕期 | `聖誕期第N主日` / `聖誕節主日` | 聖誕 |
| 顯現期 | `顯現期第N主日` / `耶穌受洗主日` | 顯現、主顯、耶穌受洗 |
| 大齋期 | `大齋期第N主日` / `棕枝主日` / `聖灰日` / `受難日` | 大齋、受難、棕枝、聖灰 |
| 復活期 | `復活節主日` / `復活期第N主日` / `聖靈降臨節` | 復活、聖靈降臨節 |
| 聖靈降臨後 | `三一主日` / `聖靈降臨後第N主日` / `基督普世君王日` | 聖靈降臨後、三一、常年 |

> 前端不是直接比對此字串，而是用 regex 偵測關鍵字，所以描述自由但要包含上表關鍵字。

---

## 五、scripture_readings 經課格式

JSONB 陣列，每筆為一段讀經。

```json
[
  {
    "display_label": "經課一",
    "book": "耶利米書",
    "reference": "31:31–34",
    "text": "31 耶和華說：「看哪，日子將到…\n32 不像我拉著…"
  },
  {
    "display_label": "啟應文",
    "book": "詩篇",
    "reference": "51:1–12",
    "text": "1 上帝啊，求你按你的慈愛憐恤我！…"
  },
  {
    "display_label": "經課二",
    "book": "希伯來書",
    "reference": "5:5–10",
    "text": "5 基督也是這樣…"
  },
  {
    "display_label": "福音書",
    "book": "約翰福音",
    "reference": "12:20–33",
    "text": "20 那時，上來過節拜祭的人中…"
  }
]
```

**規則**：
- `display_label`：顯示用標籤，常見值：`經課一`、`經課二`、`啟應文`、`福音書`、`詩篇`
- `book`：書名（中文），例如「哥林多後書」
- `reference`：章節，例如 `4:1–12`（破折號用 `–` 全形短橫）
- `text`：每節用換行 `\n` 分隔，節碼在行首，例如 `31 耶和華說：…`
- 版本：和合本修訂版 2010（RCUVSS），前端固定顯示此版本，不需寫入欄位

---

## 六、worship_songs 詩歌格式

JSONB 字串陣列，每首一個字串：

```json
["詩歌標題一", "詩歌標題二", "詩歌標題三"]
```

若無詩歌記錄，填 `[]` 即可。

---

## 七、content 講道逐字稿格式

純文字（TEXT），遵循以下規則：

### 說話者標記（開場問安、司會主持等）
格式：`姓名 職稱：` 接著內容，放在同一行。

```
龐君華 牧師： 李信政牧師還有各位弟兄姐妹，大家平安！…
```

- 前端偵測到 `xxx牧師：` / `xxx會督：` 等格式，自動以粗體顯示為說話者標籤
- **李牧師**一律寫全名 **李信政牧師**（前端有自動轉換，但建議原始資料就寫全名）

### 段落
每段用空白行（`\n\n`）隔開，一般段落有首行縮排 2 字（前端樣式控制，不需在文字裡加空格）。

### 無特殊格式
講道逐字稿不用 HTML 標籤，純文字即可。

---

## 八、YouTube 連結規則

- 欄位：`youtube_url`
- 填完整 URL，例如：`https://www.youtube.com/watch?v=uTYicIP3aeQ&t=1s`
- 若有開始秒數，直接附在 URL 的 `&t=Ns` 參數
- 前端會在「服事團隊」之後、「經課」之前顯示紅底 YouTube 按鈕

---

## 九、完整輸入範例（seed 腳本格式）

```js
await client.query(
  `INSERT INTO pong_sermons (
    title, church_year, liturgical_season, sermon_date, occasion, location,
    preacher, worship_leader, worship_team,
    scripture_readings, worship_songs, content, youtube_url, is_published
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
  [
    '講道標題',           // title
    2023,                 // church_year（Advent 起始年）
    '大齋期第五主日',     // liturgical_season
    '2024-03-17',         // sermon_date
    '主日崇拜',           // occasion
    '台北衛理堂',         // location
    '龐君華',             // preacher
    '牟維丹',             // worship_leader
    '林雅惠、榮恩敬拜團', // worship_team
    JSON.stringify([      // scripture_readings（陣列）
      { display_label: '經課一', book: '書名', reference: '1:1–5', text: '1 …' },
    ]),
    JSON.stringify([]),   // worship_songs（如無則空陣列）
    `逐字稿內容…`,        // content
    'https://www.youtube.com/watch?v=xxxxx', // youtube_url（如無則 null）
    true,                 // is_published
  ]
)
```

---

## 十、已輸入講道清單

| id | 日期 | 標題 | church_year | 地點 | YouTube |
|----|------|------|-------------|------|---------|
| 1 | 2024-03-17 | 讓心靈活過來 | 2023 | 台北衛理堂 | ✓ |
| 2 | 2025-11-30 | （待補） | 2025 | 台北衛理堂 | ✓ |
| 3 | 2024-05-26 | （待補） | 2023 | 台北衛理堂 | ✓ |
| 4 | 2025-03-02 | （待補） | 2024 | 台北衛理堂 | ✓ |

---

## 十一、講道曆算背景知識

### 教會年節期順序
1. **將臨期**（Advent）：11月底 Advent 1 起，共 4 個主日，顏色 `#5B3F8A` 紫
2. **聖誕期**（Christmastide）：12/25 起至 1/6 前，顏色 `#A07828` 金
3. **顯現期**（Epiphanytide）：1/6 起至大齋期前，顏色 `#2A6E3A` 綠
4. **大齋期**（Lent）：聖灰日起 6 週，顏色 `#7B2D6E` 紫紅
5. **復活期**（Eastertide）：復活節起至聖靈降臨節（復活後第 49 天），顏色 `#A07828` 金
6. **聖靈降臨後**（Ordinary Time）：三一主日起至 Advent 前，顏色 `#2A6E3A` 綠

### 特殊日期（非主日）
- **平安夜**（12/24 非主日時）→ 單獨顯示，`isSpecial: true`
- **聖灰日**（復活節前 46 天，週三）→ 單獨顯示
- **受難日**（Good Friday，復活節前 2 天）→ 單獨顯示
- **龐會督就任禮拜**（2019-05-25）→ 2018 教會年特殊日期
- **龐會督告別式**（2026-01-31）→ 2025 教會年最後一天

### 典藏截止日
2026 年 1 月 31 日（龐會督告別式當天），系統不顯示此日期之後的主日。

---

## 十二、前端路由結構

| URL | 頁面 | 說明 |
|-----|------|------|
| `/pong-archive/sermons` | `sermons/index.vue` | 2000–2025 年份格狀選單 |
| `/pong-archive/sermons/year/2023` | `sermons/year/[year].vue` | 2023 教會年曆（節期 + 主日列表） |
| `/pong-archive/sermons/1` | `sermons/[year].vue` | sermon id=1 詳情頁 |

> 注意：`sermons/[year].vue` 的 URL 參數雖命名為 `year`，實際是 **sermon 的 id**（整數）。

---

## 十三、編輯模式

詳情頁右上角有隱藏的編輯按鈕（需登入典藏帳號）。

- **可直接編輯**：標題、地點、證道者、司會、敬拜、YouTube 連結、詩歌、逐字稿
- **不可在前端編輯**：日期、church_year、liturgical_season、scripture_readings → 需用 seed 腳本或直接修改 DB
- **存檔 API**：`POST /api/pong-save`，欄位 `table=pong_sermons, id=N, field=xxx, value=yyy`
