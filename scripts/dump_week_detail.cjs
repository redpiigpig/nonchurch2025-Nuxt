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

function trunc(s, n=120) { return s ? (s.length > n ? s.slice(0,n)+'…' : s) : '(空)'; }

async function main() {
  const weeks = await apiGet(
    '/rest/v1/pong_lectionary_weeks?select=id,season,week_num,title&lectionary_year=eq.A&limit=200'
  );
  const postXmas = weeks.filter(w => SEASON_ORDER[w.season]).sort((a,b) =>
    (SEASON_ORDER[a.season]||9) - (SEASON_ORDER[b.season]||9) || a.week_num - b.week_num
  );

  const weekIds = postXmas.map(w => w.id).join(',');
  const allDays = await apiGet(
    `/rest/v1/pong_lectionary_days?select=*&week_id=in.(${weekIds})&limit=2000`
  );

  const daysByWeek = {};
  for (const d of allDays) (daysByWeek[d.week_id] = daysByWeek[d.week_id] || []).push(d);

  const lines = [];
  for (const w of postXmas) {
    const label = `A-${w.season}-wk${String(w.week_num).padStart(2,'0')}`;
    lines.push(`\n${'═'.repeat(70)}`);
    lines.push(`${label}  ${w.title||''}`);
    lines.push('═'.repeat(70));

    const days = (daysByWeek[w.id] || []).sort((a,b) => a.day_of_week - b.day_of_week);
    for (const day of days) {
      lines.push(`\n  ─── 星期${DAY_NAMES[day.day_of_week]} ───`);
      for (let ri = 0; ri < (day.readings||[]).length; ri++) {
        const r = day.readings[ri];
        lines.push(`  [讀${ri+1}] ${r.book||'?'} ${r.passage||''} | 小標：${r.title||'(無)'}`);
        lines.push(`    經文: ${trunc(r.text,150)}`);
        lines.push(`    默想: ${trunc(r.meditation,150)}`);
        lines.push(`    金句: ${trunc(r.key_verse,100)}`);
      }
    }
  }

  fs.writeFileSync('scripts/_week_detail.txt', lines.join('\n'), 'utf-8');
  console.log(`已輸出 ${postXmas.length} 週詳情至 scripts/_week_detail.txt`);
}

main().catch(e => { console.error(e); process.exit(1); });
