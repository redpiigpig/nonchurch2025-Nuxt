const https = require('https');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const SUPABASE_URL = 'https://pottupypvdzamztdhsah.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const opts = { hostname: url.hostname, path: url.pathname + url.search, method: 'GET',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY } };
    const req = https.request(opts, res => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject); req.end();
  });
}

async function main() {
  // 取各幾筆 B/C 年樣本
  const samples = [
    { year: 'B', season: 'advent', wk: 1 },
    { year: 'B', season: 'pentecost', wk: 1 },
    { year: 'C', season: 'advent', wk: 1 },
    { year: 'C', season: 'pentecost', wk: 1 },
  ];
  for (const s of samples) {
    const rows = await apiGet(
      `/rest/v1/pong_lectionary_weeks?select=appendices&lectionary_year=eq.${s.year}&season=eq.${s.season}&week_num=eq.${s.wk}`
    );
    const apps = rows[0]?.appendices || [];
    const disc = apps.find(a => a.title?.includes('討論'));
    console.log(`\n=== ${s.year}-${s.season}-wk${s.wk} ===`);
    console.log(disc?.body?.slice(0, 600) || '❌ 無');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
