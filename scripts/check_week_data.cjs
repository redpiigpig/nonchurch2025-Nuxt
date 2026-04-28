const https = require('https');
const fs    = require('fs');
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

const SEASON_ORDER = { epiphany:1, lent:2, easter:3, pentecost:4 };
const DAY_NAMES = ['日','一','二','三','四','五','六'];

// ── 啟發式問題偵測 ────────────────────────────────────────────────────────────
const MEDITATION_KEYWORDS = /你如何|你是否|你願意|你認為|請問|請思考|請分享|你會|你有|你曾|你現在|你對|你的|我們如何|試想|回想/;
const VERSE_START = /^\d+[：:]\d+/;
const CHAPTER_VERSE = /\d+[：:]\d+/g;

function detectIssues(r) {
  const issues = [];
  const text       = (r.text       || '').trim();
  const meditation = (r.meditation || '').trim();
  const key_verse  = (r.key_verse  || '').trim();

  // 經文欄像默想文字
  if (text && MEDITATION_KEYWORDS.test(text) && (text.match(CHAPTER_VERSE)||[]).length < 3)
    issues.push('經文欄含默想語氣（可能誤放）');

  // 默想欄開頭像經文章節
  if (meditation && VERSE_START.test(meditation) && (meditation.match(CHAPTER_VERSE)||[]).length > 3)
    issues.push('默想欄開頭像經文章節（可能互換）');

  // 經文欄空但默想欄很長
  if (!text && meditation.length > 150)
    issues.push('經文欄空，默想欄有內容（可能互換）');

  // 書卷名空
  if (!r.book) issues.push('書卷名空白');

  // 金句超長（超過200字可能誤放整段）
  if (key_verse.length > 200) issues.push(`金句過長(${key_verse.length}字)`);

  // 默想欄空但通常應有內容
  if (!meditation && text) issues.push('默想欄空（可能未解析）');

  return issues;
}

async function main() {
  // 1. 取甲年所有週次 (聖誕後)
  const weeks = await apiGet(
    '/rest/v1/pong_lectionary_weeks?select=id,season,week_num,title&lectionary_year=eq.A&limit=200'
  );
  if (!Array.isArray(weeks)) { console.error(weeks); process.exit(1); }

  const postXmas = weeks.filter(w => SEASON_ORDER[w.season]).sort((a,b) =>
    (SEASON_ORDER[a.season]||9) - (SEASON_ORDER[b.season]||9) || a.week_num - b.week_num
  );

  console.log(`甲年聖誕後共 ${postXmas.length} 週\n`);

  // 2. 取所有對應 days
  const weekIds = postXmas.map(w => w.id).join(',');
  const allDays = await apiGet(
    `/rest/v1/pong_lectionary_days?select=*&week_id=in.(${weekIds})&limit=2000`
  );
  if (!Array.isArray(allDays)) { console.error(allDays); process.exit(1); }

  // group by week_id
  const daysByWeek = {};
  for (const d of allDays) {
    (daysByWeek[d.week_id] = daysByWeek[d.week_id] || []).push(d);
  }

  const report = [];
  let problemWeeks = 0;

  for (const w of postXmas) {
    const label = `A-${w.season}-wk${String(w.week_num).padStart(2,'0')}`;
    const days  = (daysByWeek[w.id] || []).sort((a,b) => a.day_of_week - b.day_of_week);
    const weekProblems = [];

    for (const day of days) {
      for (let ri = 0; ri < (day.readings||[]).length; ri++) {
        const r = day.readings[ri];
        const issues = detectIssues(r);
        if (issues.length) {
          weekProblems.push({
            day: DAY_NAMES[day.day_of_week] || day.day_of_week,
            reading: ri + 1,
            book: r.book,
            passage: r.passage,
            title: r.title,
            issues,
            // 前100字摘要供人工確認
            textPreview: (r.text||'').slice(0,80),
            meditationPreview: (r.meditation||'').slice(0,80),
          });
        }
      }
    }

    const entry = { week: label, title: w.title, problems: weekProblems };
    report.push(entry);

    if (weekProblems.length) {
      problemWeeks++;
      console.log(`\n❌ ${label} — ${w.title||''}`);
      for (const p of weekProblems) {
        console.log(`  星期${p.day} 第${p.reading}讀 ${p.book||'?'} ${p.passage||''} [${p.title||''}]`);
        for (const i of p.issues) console.log(`    ⚠️  ${i}`);
      }
    } else {
      process.stdout.write(`✅ ${label}\n`);
    }
  }

  fs.writeFileSync('scripts/_week_check.json', JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n===`);
  console.log(`有問題：${problemWeeks} 週 / 共 ${postXmas.length} 週`);
  console.log(`完整報告：scripts/_week_check.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
