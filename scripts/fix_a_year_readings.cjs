#!/usr/bin/env node
/**
 * 清理甲年聖誕後各週 readings JSONB 中的 PDF 解析殘留問題：
 * 1. key_verse 開頭多餘的 `。`
 * 2. key_verse / text / meditation 結尾的獨立頁碼 (e.g. \n26)
 * 3. key_verse 結尾的殘留下一課段頭 (e.g. \n詩篇 X 篇...\n【默想】)
 * 4. 任何欄位中嵌入的 PDF 頁碼分隔符 (e.g. \n9\n=== PAGE 12 ===)
 * 5. meditation/text 結尾的腳注行 (e.g. \na [32.4]...)
 */
const https = require('https');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const SUPABASE_URL = 'https://pottupypvdzamztdhsah.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search,
      headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
    }, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject); req.end();
  });
}

function apiPatch(path, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body));
    const url  = new URL(SUPABASE_URL + path);
    const req  = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'PATCH',
      headers: {
        'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json', 'Content-Length': data.length,
        'Prefer': 'return=minimal'
      }
    }, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

// ── 各種清理 regex ────────────────────────────────────────────────────────────

// 1. key_verse 開頭的 `。` 或 `。\n`
const RE_LEADING_DOT = /^。\n?/;

// 2. 任意欄位結尾的 1~3 位頁碼（獨立行）
const RE_TRAILING_PAGENUM = /\n\d{1,3}\s*$/;

// 3. key_verse 中內嵌的下一課段頭以及之後的所有內容（可能跨多行）
//    觸發關鍵字：詩篇/大齋期/棕樹主日/受難主日/復活節/五旬節
//    詩篇格式多樣：「詩篇 89:5-37」「詩篇 40 篇」「詩篇 1…」
const RE_TRAILING_SECTION = /\n(詩篇[\s\d:，,、\-篇章節至…]{0,60}[^\n]{0,40}|大齋期[^\n]{0,30}|棕樹主日[^\n]{0,80}|受難主日[^\n]{0,80}|復活節[^\n]{0,50}|五旬節[^\n]{0,50})[\s\S]*$/;

// 4. 嵌入的 PDF 頁碼分隔符（任意欄位）
//    e.g. "\n9\n=== PAGE 12 ===\n" 或 "\n20\n=== PAGE 21 ===\n"
const RE_PAGE_MARKER = /\n\d{1,3}\n=== PAGE \d+ ===\n?/g;

// 5. meditation/text 結尾的腳注行
//    e.g. "\na [32.4]..." or "\nb [32.6]..." 或多行
const RE_FOOTNOTES = /(\n[a-z] \[\d+\.\d+\][^\n]+)+\n?$/;

// 6. 結尾「=== PAGE...」殘留（可能 RE_PAGE_MARKER 沒打到末尾的片段）
const RE_TRAILING_PAGE_SEP = /\n\d{1,3}\n==…?\s*$/;

function cleanField(value, fieldName) {
  if (!value || typeof value !== 'string') return value;

  let v = value;

  // 4. 先移除嵌入頁碼分隔符（可能在中間）
  v = v.replace(RE_PAGE_MARKER, '\n');

  // 6. 末尾殘留的截斷頁碼分隔符
  v = v.replace(RE_TRAILING_PAGE_SEP, '');

  if (fieldName === 'key_verse') {
    // 1. 移除開頭 。
    v = v.replace(RE_LEADING_DOT, '');

    // 3. 移除末尾課段頭
    v = v.replace(RE_TRAILING_SECTION, '');

    // 2. 移除末尾頁碼
    v = v.replace(RE_TRAILING_PAGENUM, '');
  }

  if (fieldName === 'meditation' || fieldName === 'text') {
    // 5. 移除末尾腳注行
    v = v.replace(RE_FOOTNOTES, '');

    // 2. 移除末尾頁碼
    v = v.replace(RE_TRAILING_PAGENUM, '');
  }

  return v.trim() || value.trim(); // 若清理後為空則保留原始
}

function cleanReadings(readings) {
  if (!Array.isArray(readings)) return { changed: false, readings };
  let changed = false;
  const cleaned = readings.map(r => {
    const newR = { ...r };
    for (const field of ['key_verse', 'text', 'meditation']) {
      const orig = r[field];
      const fixed = cleanField(orig, field);
      if (fixed !== orig) {
        newR[field] = fixed;
        changed = true;
      }
    }
    return newR;
  });
  return { changed, readings: cleaned };
}

const SEASON_ORDER = { epiphany:1, lent:2, easter:3, pentecost:4 };

async function main() {
  const dryRun = process.argv.includes('--dry');
  if (dryRun) console.log('[DRY RUN] 不實際更新資料庫\n');

  // 1. 取甲年聖誕後週次
  const weeks = await apiGet(
    '/rest/v1/pong_lectionary_weeks?select=id,season,week_num&lectionary_year=eq.A&limit=200'
  );
  if (!Array.isArray(weeks)) { console.error(weeks); process.exit(1); }
  const postXmas = weeks.filter(w => SEASON_ORDER[w.season])
    .sort((a,b) => (SEASON_ORDER[a.season]||9)-(SEASON_ORDER[b.season]||9) || a.week_num - b.week_num);

  console.log(`甲年聖誕後共 ${postXmas.length} 週`);

  // 2. 取所有對應 days
  const weekIds = postXmas.map(w => w.id).join(',');
  const allDays = await apiGet(
    `/rest/v1/pong_lectionary_days?select=id,week_id,day_of_week,readings&week_id=in.(${weekIds})&limit=2000`
  );
  if (!Array.isArray(allDays)) { console.error(allDays); process.exit(1); }

  console.log(`共 ${allDays.length} 天\n`);

  const weekLabel = {};
  for (const w of postXmas) weekLabel[w.id] = `A-${w.season}-wk${String(w.week_num).padStart(2,'0')}`;
  const DAY_NAMES = ['日','一','二','三','四','五','六'];

  let updated = 0, skipped = 0, errors = 0;

  for (const day of allDays) {
    const label = `${weekLabel[day.week_id]} 星期${DAY_NAMES[day.day_of_week]}`;
    const { changed, readings: fixedReadings } = cleanReadings(day.readings);
    if (!changed) { skipped++; continue; }

    // 顯示改動摘要
    for (let i = 0; i < (day.readings||[]).length; i++) {
      const orig = day.readings[i];
      const fixed = fixedReadings[i];
      for (const field of ['key_verse','text','meditation']) {
        if (orig[field] !== fixed[field]) {
          const before = (orig[field]||'').slice(-80);
          const after  = (fixed[field]||'').slice(-80);
          process.stdout.write(`  [${label}] 讀${i+1} ${field}: ...${JSON.stringify(before)} => ...${JSON.stringify(after)}\n`);
        }
      }
    }

    if (dryRun) {
      updated++;
      continue;
    }

    const status = await apiPatch(
      `/rest/v1/pong_lectionary_days?id=eq.${day.id}`,
      { readings: fixedReadings }
    );
    if (status === 204 || status === 200) {
      process.stdout.write(`  ✅ ${label}\n`);
      updated++;
    } else {
      process.stdout.write(`  ❌ ${label} HTTP ${status}\n`);
      errors++;
    }
  }

  console.log(`\n完成：更新 ${updated}　跳過 ${skipped}　錯誤 ${errors}`);
}

main().catch(e => { console.error(e); process.exit(1); });
