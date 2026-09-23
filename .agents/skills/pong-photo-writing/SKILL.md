---
name: pong-photo-writing
description: Transcribe photos of printed 龐君華會督 articles (periodical / 紀念特刊 / 書章 etc.) into pong_writings rows, end-to-end. Use when the user uploads images of book/magazine pages and says something like "把這幾張的內容放到刊物文章中" or "新增一篇某某特刊的文章". Handles vertical traditional Chinese OCR, colophon (版權頁) extraction, and all DB + UI plumbing.
---

> ⚙️ **引擎政策（2026-06-04 統一）**：所有 LLM 工作一律 **Gemini（主，4 keys 輪流）→ NVIDIA（輝達 `https://integrate.api.nvidia.com/v1`，文字模型 `deepseek-ai/deepseek-v4-flash`，4 把 key 輪流＋間隔節流避 429）→ Haiku（最後救急；前兩個免費池都用罄才動）**。`translate_ebook_to_zh.py --engine auto` 預設即此鏈。視覺／OCR 類仍走 Gemini Vision／Haiku Vision（NVIDIA vision 尚未驗證）。例外：/coach 互動聊天為 NVIDIA qwen3-next 主、Gemini 後備（見 [[feedback_coach_nvidia_engine]]）。見 [[feedback_engine_nvidia_no_haiku]]。

> 🚨 **截圖規則 — 絕對禁止 >2000px**：傳進對話的截圖（寬或高任一邊）超過 2000px 會直接炸掉整個 session（"exceeds the dimension limit for many-image requests"）。使用者一說要傳截圖，立刻提醒先確認尺寸；推薦 Win+Shift+S 框選或縮到 ≤ 1920px。

# pong-photo-writing — Photos → pong_writings

End-to-end recipe for taking 1-N chat-attached photos of an already-published 龐君華會督 article (most often a 堂慶紀念特刊 / 期刊 / 書章) and turning it into a fully-rendered entry under `/pong-archive/writings/<id>`.

## When to use

User uploads chat-attached photos of printed pages and asks to "放到刊物文章" / "轉錄成一篇文章". Typical setup:

- 3-5 photos: title page, body pages, possibly the 版權頁 (colophon) and cover
- Vertical traditional Chinese, right-to-left column order
- Article is `category='periodical'` for 紀念特刊 / 院訊 / 衛訊, or other categories for thesis / book_chapter etc.

## Anti-patterns (don't do this)

- **Don't ask the user to save the images to disk and OCR via Gemini.** Codex itself is a vision model — read the photos directly from chat context. The user pushed back on this in the inaugural session and was right. (Memory: `feedback_ocr_strategy.md` is about *book PDFs*, not chat-attached photos.)
- **Don't try `git status` to confirm your edits.** A parallel agent session is often committing & pushing during the conversation, so your files may already be in HEAD before you commit. Verify by reading file content, not git diff.
- **Don't transcribe perfectly accurately on the first pass.** Vertical Chinese from a downsampled photo (2000×1500) has unavoidable ambiguity. Mark uncertain characters with `[?]` and let the user fix in the admin or via SQL.

## Schema

`pong_writings` already has every column needed (added during the 2026-05-14 inaugural session):

| Column | Type | Purpose |
|---|---|---|
| `title` | TEXT | Article title from the spread |
| `category` | TEXT | `periodical` for 特刊/院訊; `book_chapter`, `journal`, etc. otherwise |
| `publication` | TEXT | **Sub-tab category label, NOT the full publication name.** Short, generic, groupable. Existing categories: `中華衛訊` / `衛神院訊` / `衛報` (specific recurring periodicals) and `週年堂慶` / `衛神畢業紀念冊` / `牧者紀念刊` (generic categories for one-off / multi-issue 紀念刊物). The **full publication name lives in `colophon.lines[0].value`** as 出版者. Don't put `衛理公會城中教會六十週年紀念特刊` here — it'd make the sub-tab unreadably long. Pick / reuse a short category instead. |
| `published_date` | DATE | First-of-month if only month known; set `date_approximate=true` |
| `editor` | TEXT | 編輯 from 版權頁 (kept as top-level for searchability; also appears inside `colophon`) |
| `author` | TEXT | **Byline override.** NULL → fallback to hardcoded `龐君華 會督` in [id].vue. Set this when the article shows a different attribution from the era: `龐君華牧師` (early years), `代理院長 龐君華牧師` (~2009-2014 衛神 era), 等。 |
| `page_range` | TEXT | `"14-16"` for spreads, `"12"` for single page |
| `colophon` | JSONB | `{lines: [{label, value}, ...]}` — full 版權頁 reproduction |
| `tags` | TEXT[] | Include publication name + topical tags |
| `content` | TEXT | Body, paragraph per line, `> ` prefix for quotes, plain short lines for headings |
| `is_published` | BOOLEAN | `true` |
| `sort_order` | INTEGER | `max(sort_order)+1` |

## Frontend conventions (already in place)

[`pages/pong-archive/writings/[id].vue`](../../../pages/pong-archive/writings/[id].vue) renders:

1. **Header**: cat badge → publication chip → date chip → `頁次：N-M` chip (from `page_range`)
2. **Byline**: `article.author || '龐君華 會督'` under the title — overrides the default with the role used in the original publication when set
3. **Body**: `text-indent: 2em` on every `.wa-para`, reset to `0` for `--heading` / `--quote` / `--empty`
4. **Colophon** (`.wa-colophon` at bottom of `.wa-body`): grid of `label｜value` rows, only shown if `article.colophon.lines.length`

[`pages/pong-archive/writings/index.vue`](../../../pages/pong-archive/writings/index.vue) `PERIODICAL_ORDER` controls sub-tab order; if you add a new publication, append its **full official name** to the array.

## Process

### 1. Identify which photos contain what

Typically:
- **Title page** (article's opening spread): big title, byline (作者), photo of author/family, page number in corner
- **Body pages**: continuation
- **版權頁 (colophon page)**: list of 出版者 / 出版人 / 設計排版 / 地址 / 電話 / 出版日期
- **Cover**: book title, publisher logo, year

Note all page numbers (e.g. 14, 15, 16) to compute `page_range`.

### 2. Extract colophon

Read the 版權頁 photo carefully and build a colophon JSON. Standard label order (the user established this in 2026-05-14):

```json
{
  "lines": [
    {"label": "出版者",   "value": "<publication full name>"},
    {"label": "出版者",   "value": "<publishing organisation>"},
    {"label": "發行人",   "value": "<出版人 from 版權頁>"},
    {"label": "編輯",     "value": "<editor — ask user if not on 版權頁>"},
    {"label": "設計排版", "value": "..."},
    {"label": "地址",     "value": "..."},
    {"label": "電話",     "value": "..."},
    {"label": "出版日期", "value": "<YYYY年MM月>"}
  ]
}
```

**Convention**: 編輯 goes after 發行人 (the user explicitly placed it there). If the printed 版權頁 doesn't list an editor, ask the user — don't omit.

### 3. OCR the body — Codex vision, direct

Read photos column-by-column, right-to-left (vertical Chinese). Aim:

- One `\n\n`-separated paragraph per logical paragraph
- Lead `> ` for "呼召" / scripture / indented quotes
- Short standalone lines (≤ 20 chars, no terminal punctuation) become headings via `isHeading()` regex in [id].vue
- Bullet lines like `崇拜：每週主日…` / `奉獻：…` — each on its own line; the rendering preserves the colon
- Use `[?]` (max 1 per uncertain word) for characters you can't read. The user will sweep these.
- Aim for **structure first, character accuracy second**. Getting paragraph breaks and quote markers right matters more than reading 100% of characters.

### 4. Insert via PostgREST

```python
import os, requests
from dotenv import load_dotenv
load_dotenv(r"c:\Users\user\Desktop\know-graph-lab\.env")

SB = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1"
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}",
     "Content-Type": "application/json", "Prefer": "return=representation"}

next_sort = (requests.get(f"{SB}/pong_writings", headers=H,
    params={"select":"sort_order","order":"sort_order.desc","limit":1}).json()[0]["sort_order"] or 0) + 1

payload = {
  "title": "...",
  "category": "periodical",
  "publication": "<FULL official name from 版權頁>",
  "published_date": "2021-11-01",
  "date_approximate": True,
  "editor": "楊肇悅",
  "page_range": "14-16",
  "colophon": { ... see above ... },
  "content": "...with \\n\\n paragraph breaks and > for quotes...",
  "tags": ["<publication-name>", "<topical-tag>", ...],
  "is_published": True,
  "sort_order": next_sort,
}
r = requests.post(f"{SB}/pong_writings", headers=H, json=payload)
print(r.status_code, r.json()[0]["id"])
```

### 5. Pick a sub-tab category + ensure it's in PERIODICAL_ORDER

The `publication` value is the **sub-tab label**, not the full publication name. Pick a short, reusable category:

```js
// pages/pong-archive/writings/index.vue
const PERIODICAL_ORDER = [
  '中華衛訊', '衛神院訊', '衛報',       // specific recurring periodicals
  '週年堂慶',                            // 60週年 / 70週年 / etc. 紀念特刊
  '衛神畢業紀念冊',                      // 衛神 每屆 畢業典禮程序單 / 紀念冊
  '牧者紀念刊',                          // 個別牧者過世後的 紀念集
]
```

Decision tree when picking `publication`:
1. **Is the source a long-running periodical with its own name?** Use the periodical name verbatim (中華衛訊, 衛神院訊, 衛報).
2. **Is it a one-off / occasional 紀念刊物?** Use an existing generic category (週年堂慶, 牧者紀念刊). The full name goes into the colophon's first 出版者 line.
3. **Doesn't fit any existing category?** Pick a new short label (3-7 chars), add it to `PERIODICAL_ORDER`, and update this list above.

Don't repeat the publication's specific identity (e.g. 城中教會、第十四屆、林述鼎) in `publication` — those go in `tags` and/or `colophon`. Tags are good for filterable search; colophon is good for citation.

### 6. Commit your files only

```bash
git add server/api/pong-writing/'[id]'.get.js pages/pong-archive/writings/'[id]'.vue pages/pong-archive/writings/index.vue
git commit -m "feat(pong-archive/writings): 加《...》一篇"
git push origin master
```

**Don't `git add .` or `git add -A`** — a parallel session is usually editing `components/genealogy/BiblicalSpineTree.vue` etc. concurrently; you'd swallow their work-in-progress into your commit.

## Reference quality bar

Three gold-standard examples — each illustrates a different shape:

- [`id=43`](http://localhost:3000/pong-archive/writings/43) 學習成為門徒的信仰群體：廿年來牧養的心路歷程 — **default 會督 byline**, full 版權頁 colophon, 3-page periodical article, `publication='週年堂慶'`.
- [`id=44`](http://localhost:3000/pong-archive/writings/44) 重重張力下興起的宗派神學教育 — **`author` override** (`代理院長 龐君華牧師`), **minimal colophon** (2 lines only — 程序單 沒版權頁), small content note `（於 2009 年十週年院慶）` as first paragraph, `publication='衛神畢業紀念冊'`.
- [`id=45`](http://localhost:3000/pong-archive/writings/45) 後記（《主僕林述鼎牧師紀念刊》） — **author byline as just `龐君華`** (era before he became 牧師/會督 was distinguished in print), 8-line colophon with 文編/美編/印刷/發行所/電話, signed off `二〇〇〇年七月二十六日 於台北棲真書舍` at end of content, `publication='牧者紀念刊'`.

Layout invariants in all three:
- Header chips: `[刊物文章] <publication> <date> 頁次：N-M`
- Byline: Serif, 0.18em letter-spacing, gold #6A5E4A (uses `article.author` if set)
- Body: `text-indent: 2em`, justify, 2.1 line-height
- Quote (when present): indented box with left border `#C4B89A`
- Bottom (when colophon present): `.wa-colophon` grid

## Common metadata defaults

| Field | Default if not on photo |
|---|---|
| `published_date` | First of the month given on 版權頁; `date_approximate=true` |
| `category` | `periodical` for 院訊 / 衛訊 / 紀念特刊 / 週報 |
| `editor` | **Ask user** — usually not in the 版權頁 even when there is one |
| `is_published` | `true` |
| `cloudinary_urls` | `[]` — we don't (yet) upload scanned originals; the OCR'd text is canonical |

## Notes

- The byline is `article.author || '龐君華 會督'`. Leave `author` NULL for modern 會督-era pieces; set it for earlier-career pieces (e.g. `代理院長 龐君華牧師` for 衛神 2009-2014 articles). If a future article needs co-author / interview / etc., add a new field at that point.
- The `colophon.lines` array preserves order, so you can put 出版者 / 發行人 / 編輯 in whatever order matches the original 版權頁 (with 編輯 after 發行人 per user preference).
- For multi-volume publications or articles spanning a few different sources, file each as its own row — don't try to merge.

## 整批掃描期刊（《衛報》案例，2026-09-23）

使用者一次掃了整疊刊物（`衛報20-40.pdf` 等三份、225 張），要「分期歸檔＋轉正＋對照典藏補缺」。跟單篇拍照不同，要走批次：

1. **轉正與切頁**：掃描機把 A4 橫式對頁存成直式、整張轉了 90°。判方向別靠文字層（掃描機自帶的 OCR 是側著辨識的亂碼），直接試轉看圖——這批是 `/Rotate 90`。對頁從中間切成兩張 A4；封面、封底本來就是單頁不切。🚨 PyMuPDF `show_pdf_page(clip=…)` 的裁切座標會受來源頁 `/Rotate` 影響，**先把來源頁 `set_rotation(0)` 再裁、輸出頁再轉 90°**，否則左半頁會被截掉一大塊（右半頁卻正常，很容易漏看）。
2. **分期**：看封面（紫色刊頭＋`No.NN`＋日期）與封底切期。三份檔名寫「20-40」但實際只有 20、32、33、34、37、38、40…，**檔名的期號範圍不等於實際收了哪幾期**，要逐張看封面。另外要找「失敗重掃」：第 47 期有一張紙翹起來的對頁，後面緊跟著正確的重掃，要刪掉重複的那張。
3. **歸檔**：Drive `資料\無境界者\龐君華檔案\著作與專文\衛報\第NN期_YYYY-MM-DD\衛報第NN期_YYYY-MM-DD.pdf`；使用者放在 Drive 根目錄的原始三份移到同層 `原始掃描\`。
4. **OCR**：走 know-graph-lab 的 `scripts/mineru_ocr.py run --pdf … --out … --device cpu`（對切好的 A4 版跑，`-m ocr` 會忽略亂碼文字層）。Gemini 免費層撐不住 200 多張：`gemini-2.5-flash` 對大部分 key 已回 404（新帳號下架），剩下的 key 跑到 60 張左右就全 429。
5. **找出龐君華的篇章**：用「獨立一行的署名 `龐君華`／`龐君華牧師`」定位，再看封面目錄確認欄目與頁碼。同期很多篇是郭曜郎（經課講章）、曾正男、謝敏蘭、龐文翰（譯）寫的，不要收。「編者案頭」是楊肇悅。
6. **校對**：MinerU 初稿有簡體混入（耶稣、讲章）、漏「一二三十」、跨欄順序接錯、同頁別篇混入。把每篇的頁圖＋初稿交給 subagent 逐字對圖定稿（原刊錯字照錄、另列 notes）。🚨 **別拿 Gemini OCR 當對照標準**：它會自動「修正」原文（把「回應上主」改成「上帝」、把原刊錯字「其督徒」改成「基督徒」、漏整句）。
7. **入庫**：`publication='衛報'`、`category='periodical'`、`author` 照原刊署名（`龐君華`／`龐君華牧師`）、`editor`＝該期主編（多為楊肇悅，第 40 期是何嘉蘭）、`page_range`＝印刷頁碼、colophon 放刊名期號／衛蘭中心／召集人／主編／欄目／出版日期、tags `['衛報','衛報第NN期', 欄目, '講章']`。第一批 21 篇是 id 50–70。

🚨 **《衛報》和網路版「衛蘭專文」是兩個不同的資料來源，不可合併**（使用者明言）。同一篇（〈我們的呼召〉〈我們的信念〉〈恩典的途徑〉）兩邊文字不同——網路版是之後修訂過的版本——各自一筆，不要拿掃描稿覆蓋網路版，也不要把衛報的「衛蘭專文」欄目名打成標籤。

🚨 **`pong_writings` 的 id 序列曾經落後**（序列在 3、實際最大 id 49），POST 會回 409 `duplicate key (id)`。用 know-graph-lab `.env` 的 `SUPABASE_ACCESS_TOKEN` 走 Management API 跑 `select setval('public.pong_writings_id_seq',(select max(id) from pong_writings))` 校正後再寫。

**講章也要進講道集（使用者 2026-09-23 定）**：衛報上的講章，若講道集 `pong_sermons` 該場沒有內文或根本沒有這場，就把講章填進去，**內文第一行註明「（本篇並非講道錄音轉錄，而是取自《衛報》第N期（日期）頁x–y所刊講章〈題〉。）」**，`description` 也寫明，原有說明（如「資料取自城中教會主日崇拜週報」）保留在前。已有錄音轉錄內文的場次不動。講道日期看經課對修訂共同經課表推定，別直接用刊期日期（刊物常晚一兩週登）；原刊節期標示和經課不符時以經課為準並在 description 註明（如第 46 期〈上主的羔羊〉）。新建場次 `location` 留空（衛報沒寫地點）。第一批：20010909、20011104、20020120、20020303、20020707、20020804 新建，20030223 補內文。
