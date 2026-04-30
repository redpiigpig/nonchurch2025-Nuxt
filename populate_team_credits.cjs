// populate_team_credits.cjs
// Extract team credits from text files and store in pong_lectionary_weeks.team_credits
// Run: node populate_team_credits.cjs [--dry-run]

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Year-level defaults (used when text file has no credits) ──────────────────
const DEFAULTS = {
  A: [
    { role: '內容原稿', names: '龐君華' },
    { role: '文字工作', names: '邱泰耀、褚秀玲、鄭沂珊' },
    { role: '影音工作', names: '蕭曉玲、呂華光、褚秀玲' },
    { role: '後勤協作', names: '蕭毓蓉' },
    { role: '封面設計', names: '王柏欽' },
    { role: '整合執行', names: '陳繼賢、張芝嘉' },
  ],
  B: [
    { role: '文字工作', names: '龐君華、邱泰耀、褚秀玲、鄭沂珊' },
    { role: '影音工作', names: '劉淑華、呂華光、蕭曉玲' },
    { role: '後勤',     names: '蕭湘逸、蕭毓蓉、陳淑鳳' },
    { role: '封面',     names: '王柏欽' },
    { role: '整合執行', names: '陳繼賢' },
  ],
  C: [
    { role: '文字工作', names: '龐君華、邱泰耀、褚秀玲、鄭沂珊' },
    { role: '影音工作', names: '劉淑華、呂華光、蕭曉玲' },
    { role: '後勤',     names: '蕭毓蓉' },
    { role: '封面',     names: '王柏欽' },
    { role: '整合執行', names: '陳繼賢' },
  ],
};

function getTextFilePath(year, season, weekNum) {
  const seasonCap = season.charAt(0).toUpperCase() + season.slice(1);
  return path.join('stores/三讀三禱', `${year}-${seasonCap}-wk${String(weekNum).padStart(2,'0')}-text.txt`);
}

// Parse one credits line like "文字工作：龐君華、邱泰耀、褚秀玲"
function parseLine(line) {
  const m = line.match(/^(.{2,6})[：:]\s*(.+?)\s*$/);
  if (!m) return null;
  return { role: m[1].trim(), names: m[2].trim() };
}

function extractCredits(text) {
  // Allow optional suffix before colon: 後勤協作、封面設計 etc.
  const creditRe = /(?:文字工作|影音工作|後勤|封面|整合執行|內容原稿).{0,4}[：:]/;
  const lines = text.split('\n');

  // Find the first line that looks like a credit entry
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (creditRe.test(lines[i])) { startIdx = i; break; }
  }
  if (startIdx < 0) return null;

  // Collect contiguous credit lines (allow one blank line gap)
  const credits = [];
  let blankCount = 0;
  for (let i = startIdx; i < Math.min(startIdx + 12, lines.length); i++) {
    const t = lines[i].trim();
    if (!t) { blankCount++; if (blankCount > 1) break; continue; }
    blankCount = 0;
    const parsed = parseLine(t);
    if (parsed && creditRe.test(t)) credits.push(parsed);
    else if (credits.length > 0) break; // end of credits block
  }
  return credits.length >= 2 ? credits : null;
}

async function main() {
  const { data: weeks, error } = await supabase
    .from('pong_lectionary_weeks')
    .select('id, lectionary_year, season, week_num, team_credits')
    .order('id');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }

  let fromFile = 0, fromDefault = 0, skipped = 0, updated = 0;

  for (const wk of weeks) {
    const filePath = getTextFilePath(wk.lectionary_year, wk.season, wk.week_num);
    let credits = null;

    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf8');
      credits = extractCredits(text);
      if (credits) fromFile++;
    }

    if (!credits) {
      credits = DEFAULTS[wk.lectionary_year] || null;
      if (credits) fromDefault++;
      else { skipped++; continue; }
    }

    if (DRY_RUN) {
      console.log(`[${wk.lectionary_year}-${wk.season}-wk${wk.week_num}] ${credits.map(c=>c.role).join('、')}`);
      continue;
    }

    const { error: upErr } = await supabase
      .from('pong_lectionary_weeks')
      .update({ team_credits: credits })
      .eq('id', wk.id);

    if (upErr) console.error(`Update error id=${wk.id}:`, upErr.message);
    else updated++;
  }

  console.log(`\n=== 完成 ===`);
  console.log(`從文字檔提取: ${fromFile} 週`);
  console.log(`使用年份預設: ${fromDefault} 週`);
  console.log(`無法處理: ${skipped} 週`);
  if (!DRY_RUN) console.log(`更新 DB: ${updated} 筆`);
  if (DRY_RUN) console.log('(DRY RUN)');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
