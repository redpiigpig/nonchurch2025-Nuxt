# 工作機器人A — 龐君華典藏講道上傳任務狀態

> 機器人代號：工作機器人A
> 任務：自動化逐字稿轉錄 + 寫入 pong_sermons / pong_media 資料庫

---

## 一、AI 後端說明（Gemini vs 本地 Ollama）

逐字稿**轉錄**用 faster-whisper（本機 CUDA），不走 AI API。
逐字稿**裁切**（去掉敬拜、讀經等非講道部分）才呼叫 AI，優先序如下：

| 順序 | AI 後端 | 設定方式 | 限制 |
|------|---------|----------|------|
| 1 | Gemini（雲端） | `.env` 的 `VITE_GEMINI_API_KEY` | 免費版容易 429 |
| 2 | 本地 Ollama（自動 fallback） | 安裝後直接可用，**不需要 API key** | 需先安裝模型 |

### 安裝本地模型（一次性，Ollama 已裝）

```bash
ollama pull qwen2.5:14b   # 裁切任務建議（~9GB，中文理解佳）
# 或輕量版（較快但較易出錯）：
ollama pull qwen2.5:7b
```

> Ollama 本地 HTTP server：`http://localhost:11434`，Python 直接 `requests.post`，**無需 API key、無限額**。

### 使用方式

```bash
# 預設：Gemini 優先，429 後自動 fallback 到 Ollama
PYTHONIOENCODING=utf-8 python scripts/pong_fix_2013_transcripts.py --force --year YYYY

# 強制全程使用本地 Ollama（Gemini quota 耗盡時用這個）
PYTHONIOENCODING=utf-8 python scripts/pong_fix_2013_transcripts.py --force --year YYYY --local

# 指定不同本地模型
PYTHONIOENCODING=utf-8 python scripts/pong_fix_2013_transcripts.py --force --year YYYY --local --model qwen2.5:14b
```

---

## 二、限速守則（避免被封鎖）

| 操作 | 規則 |
|------|------|
| yt-dlp 下載多支影片 | 每支之間 `--sleep-requests 3 --sleep-interval 5` 或腳本層 `time.sleep(5)` |
| Gemini API 呼叫（裁切/分析） | 每次呼叫後 `time.sleep(3)`；429 後退避至少 30 秒再重試 |
| Supabase REST API 批次 PATCH | 每筆 `time.sleep(0.5)`；大批量（>50 筆）分段跑，每段間隔 5 秒 |
| Whisper 轉錄完寫入 DB | 無需特別延遲，但不要同時起多個 Whisper 程序 |

> **原則**：寧可慢，不要被鎖。被 YouTube 封鎖後 IP 冷卻期可達數小時。

---

## 三、核心流程

```bash
# 單筆轉錄
PYTHONIOENCODING=utf-8 python -u scripts/pong_sermon_pipeline.py \
  "URL" --date YYYY-MM-DD --title "標題" --yes >> /tmp/p2015_all.log 2>&1

# 轉錄完後整理逐字稿（AI 裁切）
PYTHONIOENCODING=utf-8 python scripts/pong_fix_2013_transcripts.py --force --year YYYY
```

**注意**：

- 背景任務用直接重定向（`>> log 2>&1`），**不要用 tee**（tee pipe 會 SIGPIPE 導致中斷）
- `PYTHONIOENCODING=utf-8` 必加，否則 cp950 crash
- CUDA DLL 已由腳本頂部自動預載，不需重開終端機

---

## 三、逐字稿裁切規則

- **去掉**：講道前的敬拜詩歌、讀經、司會禱告、奉獻禱告、閉幕詩歌
- **保留**：講道正文 + 結尾禱告
- 標題含 `(別人)` / `來賓` / `特別講員` → 直接跳過，不下載

### year ≥ 2014：全自動 AI 裁切（Gemini 優先，Ollama 備援）

`pong_fix_2013_transcripts.py` 對 year ≥ 2014 自動啟用 AI 裁切，去除崇拜非講道部分。Gemini 429 後自動切換本地 Ollama（`qwen2.5:14b`）；兩者均失敗時 fallback 原始全文，不中斷批次。

---

## 四、已完成年份

| 年份               | 結果                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------ |
| 台北衛理堂（2021） | ✅ 3 筆全部完成                                                                            |
| 城中教會 2013      | ✅ 32 筆完成（9 筆別人跳過）；段落重整完成（2026-04-29）；5 筆別人條目 content 已清空；⚠️ 2013-03-31 主錄影 `RCzu6zwIQUY` 尚未轉錄，需與 id=15 合併；✅ 幻覺/垃圾清理完成（2026-04-30，共 9 筆修正） |
| 城中教會 2014      | ✅ 24 筆完成（18 筆別人跳過）；段落重整完成（2026-04-29）；✅ 20140126（media_id=47）Whisper 重錄完成（2026-04-30）；✅ 20141228（media_id=68）Whisper 重錄完成（2026-04-30）；✅ 2014-06-08 聖靈降臨節入庫完成（pong_media id=76，pong_sermons id=20140608）；✅ 幻覺/垃圾清理完成（2026-04-30，共 4 筆修正） |
| 城中教會 2015      | ✅ 36 筆完成（8 筆別人跳過）；轉錄全部完成（2026-04-30，media_id=69~108）；⚠️ 4 筆 Part 2 待補合併：01-18/02-01/09-13/09-20 |

---

## 五、城中教會 2015 系列（✅ 轉錄全部完成，2026-04-30）

來源：`stores/城中教會講道清單/城中教會講道_2015.txt`（36 筆龐牧師 / 8 筆別人跳過）

**跳過（別人）**：03-29、04-19、05-17、05-24、05-31、11-22、11-29、12-13

**骨架建立**：✅ 已完成（2026-04-28）— 36 筆 pong_sermons 含 youtube_url

**轉錄進度**：

| 日期       | 狀態                                                    |
| ---------- | ------------------------------------------------------- |
| 2015-01-11 | ✅ 完成（media_id=69） |
| 2015-01-18 | ✅ 完成（media_id=70）；Part 2 `q5ugqfT5ZtY` 待補合併 |
| 2015-01-25 | ✅ 完成（media_id=71） |
| 2015-02-01 | ✅ 完成（media_id=72）；Part 2 `t6cm7jbxyKo` 待補合併 |
| 2015-02-08 | ✅ 完成（media_id=77） |
| 2015-02-15 | ✅ 完成（media_id=78） |
| 2015-02-22 | ✅ 完成（media_id=79） |
| 2015-03-01 | ✅ 完成（media_id=80） |
| 2015-03-08 | ✅ 完成（media_id=81） |
| 2015-03-15 | ✅ 完成（media_id=82） |
| 2015-03-22 | ✅ 完成（media_id=83） |
| 2015-04-12 | ✅ 完成（media_id=84） |
| 2015-04-26 | ✅ 完成（media_id=85） |
| 2015-05-03 | ✅ 完成（media_id=86） |
| 2015-05-10 | ✅ 完成（media_id=87） |
| 2015-06-06 | ✅ 完成（media_id=88） |
| 2015-06-14 | ✅ 完成（media_id=89） |
| 2015-06-21 | ✅ 完成（media_id=90） |
| 2015-08-02 | ✅ 完成（media_id=91） |
| 2015-08-09 | ✅ 完成（media_id=92） |
| 2015-08-16 | ✅ 完成（media_id=93） |
| 2015-08-23 | ✅ 完成（media_id=94） |
| 2015-09-06 | ✅ 完成（media_id=95） |
| 2015-09-13 | ✅ 完成（media_id=96）；Part 2 `cjdArqH1uNI` 待補合併 |
| 2015-09-20 | ✅ 完成（media_id=97）；Part 2 `5OC6AeW_cMw` 待補合併 |
| 2015-09-27 | ✅ 完成（media_id=98） |
| 2015-10-04 | ✅ 完成（media_id=99） |
| 2015-10-11 | ✅ 完成（media_id=100） |
| 2015-10-18 | ✅ 完成（media_id=101） |
| 2015-10-25 | ✅ 完成（media_id=102） |
| 2015-11-01 | ✅ 完成（media_id=103） |
| 2015-11-08 | ✅ 完成（media_id=104） |
| 2015-11-15 | ✅ 完成（media_id=105） |
| 2015-12-06 | ✅ 完成（media_id=106） |
| 2015-12-20 | ✅ 完成（media_id=107） |
| 2015-12-27 | ✅ 完成（media_id=108） |

**Phase 3（待執行）**：全部轉錄完成後整理逐字稿

```bash
PYTHONIOENCODING=utf-8 python scripts/pong_fix_2013_transcripts.py --force --year 2015
```

---

# 工作機器人C — 無境界者雜誌文章校對與 Word 同步任務

> 任務：逐期校對 articles 資料庫內文，與本地 Word 原稿比對，雙向同步（DB ↔ Word）

## 標準流程

```
① DB 校對：逐篇校閱 content + footnotes → 直接 PATCH DB
② SQL 核對（若有 NotebookLM 腳本）：比對 Word + DB，只對「未套用」項目執行
③ Word ↔ DB 差異掃描 → 人工確認
④ DB → Word 同步：fix_word*.py（python-docx），保留字型格式，完後刪腳本
⑤ Git commit（不 push，等使用者確認）
```

**工具守則**：DB 讀取用 `.cjs`（Node.js），DB 寫入用 `pg` 直連，Word 替換用 `python-docx`（`PYTHONIOENCODING=utf-8`）

## 已完成

| 期數                 | 狀態                      |
| -------------------- | ------------------------- |
| 第七期（7-1 ~ 7-16） | ✅ 全部完成（2026-04-27） |

## 【最優先】第六期 FFFD 亂碼修復（進行中）

修復腳本：`fix6_content.cjs`（專案根目錄，~120 條規則，**勿刪**）

| 文章                       | 狀態                |
| -------------------------- | ------------------- |
| 6-1 編輯室報告             | 待執行 PATCH        |
| 6-2 本期作者簡介           | 待執行 PATCH        |
| 6-4 布施無畏的勇者         | 進行中，剩 ~12 FFFD |
| 6-5 跨海來台的人權勇士     | 待執行 PATCH        |
| 6-6 異端何以成焰           | 進行中，剩 ~3 FFFD  |
| 6-7 教會內的異端份子       | ✅ 完成             |
| 6-8 和而不同的基督徒政治觀 | 待執行 PATCH        |
| 6-9 帝國邊境的自由靈魂     | 進行中，剩 ~3 FFFD  |
| 6-10 陌生又親切的異鄉之神  | 進行中，剩 ~12 FFFD |
| 6-11 ~ 6-15                | 待掃描              |

**下一步**：`node fix6_content.cjs` → 掃描剩餘 MISS → 補規則 → 掃描 6-11~6-15

**注意**：Write/Edit 儲存 .cjs 時部分 CJK 字（鑼/榕/慾/煜）會損壞，改用 `\uXXXX` escape

## 待處理期數

| 期數      | 狀態                                     |
| --------- | ---------------------------------------- |
| 第六期    | FFFD 修復進行中（見上）                  |
| 第五期    | 待校對                                   |
| 第四~一期 | 使用者有現成 SQL，核對後套用 + Word 同步 |

---

# 工作機器人D — 三讀三禱資料修正任務

> 腳本：`scripts/lectionary_pipeline.py`（甲/丙年）、`scripts/lectionary_yearb_html.py`（乙年）
> PDF 存放：`stores/三讀三禱/{Year}-{Season}-wk{NN}.pdf`（不進 Git）

## 已完成

| 項目 | 狀態 |
|------|------|
| 甲年 Year A 下載上傳（Advent~Easter wk4，22 週） | ✅ |
| 丙年 Year C 下載上傳（52 週，week_id=5~56） | ✅ |
| 乙年 Year B 下載上傳（52 週，week_id=75~126） | ✅ |
| 本週小組討論 內容修正（2026-04-29） | ✅ 共修正 34 週（見下方細節） |
| 讀經 book/passage/title 欄位修正（2026-04-29） | ✅ 共修正 534 筆（見下方細節） |
| 讀經書卷名稱：簡稱→全名、錯字修正（2026-04-29） | ✅ 共 1736 筆；theme_essay 錯誤內容清空 30 週 |
| 讀經 text：清除 PAGE 標記（2026-04-29） | ✅ 共 441 筆 === PAGE N === 刪除 |
| 讀經 key_verse：清除默想指示前綴（2026-04-29） | ✅ 共 794 筆「以下經文，留意…心得記下）」前綴刪除 |

### 本週小組討論 修正內容（2026-04-29）

**垃圾前綴清除（2 週）**：PDF 解析時在正文前夾入舊版討論文字 + `<p>本週小組討論</p>` 分隔符
- [A] 顯現期 wk05（id=63）
- [A] 大齋期 wk03（id=67）

**錯誤內容替換（4 週）**：PDF 末頁機構資訊誤抓為討論內容，已重新從 text 檔提取正確內容
- [B] 聖靈降臨期 wk18（id=117）— 原本是團隊名單
- [B] 聖靈降臨期 wk27（id=93）— 原本是團隊名單
- [C] 顯現期 wk07（id=17）— 原本是機構連結
- [C] 顯現期 wk08（id=18）— 原本是機構連結

**h4 標題截斷修正（28 週）**：PDF 文字提取時段落首行誤入 `<h4>` 末尾，已合併回標題
- 影響年份：丙年（C）大齋期 wk02/04/05/06、復活期 wk01/04/07、聖靈降臨期 wk01~19

### 本週小組討論 正確格式（以甲年將臨期為基準）

```html
<p class="wk-disc-author">鄭沂珊 撰</p>
<h4 class="wk-disc-subtitle">一、標題標題標題標題</h4>
<p>正文段落...</p>
<h4 class="wk-disc-subtitle">二、標題標題標題標題</h4>
<p>正文段落...</p>
<h4 class="wk-disc-subtitle">三、標題標題標題標題</h4>
<p>正文段落...</p>
```

- 乙年（B）部分週次使用數字清單格式（無 `<h4>`）：`<p>1. 問題一...\n2. 問題二...\n3. 問題三...</p>`
- 丙年（C）晚期週次（pentecost wk20~25）也使用數字清單格式
- **主題默想**（`theme_essay`）只有少數週次有內容；前端已用 `v-if="weekData.theme_essay"` 控制顯示，無需手動清空

### PDF 解析常見陷阱

1. **垃圾前綴**：body 開頭出現舊版行動文字 + `<p>本週小組討論</p>`，正文在分隔符之後
2. **機構/團隊資訊誤入**：PDF 末頁印有 1day3read3pray.com / 團隊名單，解析器可能誤抓為討論內容
3. **h4 截斷**：PDF 每行約 16 字換行，若標題橫跨兩行，第二行文字會跑進下一個 `<p>` 開頭（須合併回 `<h4>`）

修正腳本邏輯（臨時，已刪除）：
- 清除垃圾前綴：`body.substring(body.indexOf('<p>本週小組討論</p>') + marker.length)`
- h4 截斷修正：`/<h4 class="wk-disc-subtitle">([^<]+)<\/h4>\n<p>([^\n]{1,35})\n/g` → 將第一行併入 `<h4>`

### 讀經欄位修正內容（2026-04-29）

**根本原因**：PDF 解析器將：
1. 上一筆讀經的 key_verse 文字溢入下一筆的 `book` 欄位（末尾才是真正的書卷縮寫）
2. 「以此領悟作為祈禱）」指示文字錯置到 `book` 欄位（真正書卷縮寫在其後）
3. 書卷縮寫+章節+標題三合一連接到 `book` 欄位（`passage` 為空）
4. 書卷縮寫帶入 `passage` 欄位（`book` 欄位只有垃圾文字）

**修正方式**：`fix_lectionary_readings.cjs`（臨時，已刪除）— 534 筆自動修正 + 6 筆手動

**手動特例**：
- B 復活��� wk5 day0：以 wk6 資料取代，替換為正確 Acts 8:26-40 等四讀
- C 聖靈降臨期 wk3 Saturday r1：書卷補 `王下`
- C 聖靈降臨期 wk15 Saturday r1：書卷補 `耶`
- B 復���期 wk7 day0 r5：passage 含 key_verse+實際讀經，手動拆解
- B 將臨期 wk4 day1 r4：title 首段含章節號碼，合併回 passage

**新 pipeline 守則**：解析完成後，應執行 `node scripts/scan_lectionary.cjs` 確認零問題再上傳

## 待辦

- [ ] **甲年 Pentecost**（2026 下半年陸續釋出，逐批補充 WEEKS 清單後重跑 pipeline；新週次上線後需再次檢查本週小組討論格式、並用 scan_lectionary.cjs 掃描讀經欄位）
- [ ] **Git push**（等使用者確認）

## 爬蟲注意

⚠️ 乙年曾被 WAF（Wordfence）封鎖，每次下載前先確認：

```bash
curl -s -o /dev/null -w "%{http_code}" https://www.1day3read3pray.com/
```

回 200 才繼續。被封鎖時立即停止，不強行爬取。
