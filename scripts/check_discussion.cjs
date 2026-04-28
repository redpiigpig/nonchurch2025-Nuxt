const https = require('https');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const SUPABASE_URL = 'https://pottupypvdzamztdhsah.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error: ' + data.slice(0,200))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function apiPatch(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const payload = JSON.stringify(body);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function fetchAllWeeks() {
  const allRows = [];
  let offset = 0;
  while (true) {
    const rows = await apiGet(
      `/rest/v1/pong_lectionary_weeks?select=id,lectionary_year,season,week_num,appendices&appendices=not.is.null&limit=1000&offset=${offset}`
    );
    if (!Array.isArray(rows) || rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return allRows;
}

async function main() {
  const weeks = await fetchAllWeeks();
  // 排序：年份 > 節期 > 週次
  const seasonOrder = { advent:1, christmas:2, epiphany:3, lent:4, easter:5, pentecost:6 };
  weeks.sort((a,b) =>
    a.lectionary_year.localeCompare(b.lectionary_year) ||
    (seasonOrder[a.season]||9) - (seasonOrder[b.season]||9) ||
    a.week_num - b.week_num
  );

  console.log(`共 ${weeks.length} 週有 appendices 資料\n`);

  const issues = [];
  const stats = { hasDisc: 0, noDisc: 0, hasEmoji: 0 };
  const toFix = [];

  for (const w of weeks) {
    const apps = w.appendices || [];
    const label = `${w.lectionary_year}-${w.season}-wk${String(w.week_num).padStart(2,'0')}`;

    // 前端邏輯：title 含「討論」者為本週小組討論
    const discApps = apps.filter(a => a.title?.includes('討論'));

    if (discApps.length === 0) {
      stats.noDisc++;
      issues.push({ week: label, issue: '❌ 無本週小組討論' });
      continue;
    }

    stats.hasDisc++;
    let weekNeedsUpdate = false;

    for (const disc of discApps) {
      const body = disc.body || '';
      const hasEmoji = body.includes('💡');
      const hasAuthor = body.includes('wk-disc-author');
      const hasSubtitle = body.includes('wk-disc-subtitle');

      // 作者應在小標之前
      const authorIdx = body.indexOf('wk-disc-author');
      const subtitleIdx = body.indexOf('wk-disc-subtitle');
      const authorBeforeSubtitle = (authorIdx === -1 || subtitleIdx === -1)
        ? true
        : authorIdx < subtitleIdx;

      const flags = [
        hasAuthor ? '✅署名' : '❌署名',
        hasSubtitle ? '✅小標' : '❌小標',
        hasEmoji ? '💡需刪' : '',
        !authorBeforeSubtitle ? '⚠️順序錯' : ''
      ].filter(Boolean).join(' ');

      const preview = body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
      console.log(`${label}  [${disc.title}]  ${flags}`);
      console.log(`  ${preview}\n`);

      if (!hasAuthor) issues.push({ week: label, issue: '❌ 無署名' });
      if (!hasSubtitle) issues.push({ week: label, issue: '⚠️  無小標 (wk-disc-subtitle)' });
      if (!authorBeforeSubtitle) issues.push({ week: label, issue: '⚠️  署名在小標之後' });

      if (hasEmoji) {
        stats.hasEmoji++;
        disc.body = body.replace(/💡\s*/g, '');
        weekNeedsUpdate = true;
      }
    }

    if (weekNeedsUpdate) {
      toFix.push({ id: w.id, label, appendices: apps });
    }
  }

  console.log('=== 統計 ===');
  console.log(`有本週小組討論：${stats.hasDisc} 週`);
  console.log(`無本週小組討論：${stats.noDisc} 週`);
  console.log(`含 💡 需修正：${stats.hasEmoji} 筆`);

  if (issues.length > 0) {
    console.log('\n=== 問題清單 ===');
    for (const i of issues) console.log(`  ${i.week}  ${i.issue}`);
  } else {
    console.log('\n✅ 結構全部正常');
  }

  if (toFix.length > 0) {
    console.log(`\n--- 修正 ${toFix.length} 筆 💡 emoji ---`);
    for (const f of toFix) {
      const res = await apiPatch(
        `/rest/v1/pong_lectionary_weeks?id=eq.${f.id}`,
        { appendices: f.appendices }
      );
      console.log(`  ${f.label}  HTTP ${res.status}`);
    }
    console.log('✅ 修正完成');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
