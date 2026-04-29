const { Client } = require('pg');
require('dotenv').config({ path: 'C:/Users/user/Desktop/nonchurch-nuxt/.env' });

const client = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: 5432,
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

// CJK Unicode range check
function hasCJK(str) {
  return /[一-鿿㐀-䶿豈-﫿]/.test(str);
}

// Check if book contains digit:digit pattern (chapter:verse mixed in)
function bookHasChapterRef(str) {
  return /\d+:\d+/.test(str);
}

async function main() {
  await client.connect();
  console.log('Connected to DB');

  // Get all weeks
  const weeksRes = await client.query(
    'SELECT id, lectionary_year, season, week_num FROM pong_lectionary_weeks ORDER BY lectionary_year, season, week_num'
  );
  const weeks = weeksRes.rows;
  console.log(`Total weeks: ${weeks.length}`);

  // Get all days with readings
  const daysRes = await client.query(
    'SELECT id, week_id, day_of_week, day_label, readings FROM pong_lectionary_days ORDER BY week_id, day_of_week'
  );
  const days = daysRes.rows;
  console.log(`Total days: ${days.length}`);

  // Build week lookup
  const weekMap = {};
  for (const w of weeks) {
    weekMap[w.id] = w;
  }

  let issueCount = 0;
  const issues = [];

  for (const day of days) {
    const week = weekMap[day.week_id];
    if (!week) {
      issues.push(`[?] ORPHAN day id=${day.id}: week_id=${day.week_id} not found`);
      issueCount++;
      continue;
    }

    const year = week.lectionary_year;
    const season = week.season;
    const weekNum = week.week_num;
    const dow = day.day_of_week;

    let readings = day.readings;
    if (!readings) continue;

    // readings could be array or object
    if (!Array.isArray(readings)) {
      // Try to handle object case
      readings = Object.values(readings);
    }

    for (let ri = 0; ri < readings.length; ri++) {
      const r = readings[ri];
      if (!r) continue;

      const book = (r.book || '').toString();
      const passage = (r.passage || '').toString();
      const title = (r.title || '').toString();
      const rIdx = ri + 1;

      const prefix = `[${year}] ${season} wk${weekNum} day${dow} reading#${rIdx}`;

      // Check 1: passage length > 60
      if (passage.length > 60) {
        issues.push(`${prefix}: passage 過長(${passage.length}字) | book=${book.substring(0,30)} | passage=${passage.substring(0,80)} | title=${title.substring(0,40)}`);
        issueCount++;
      }

      // Check 2: passage contains CJK
      if (hasCJK(passage)) {
        issues.push(`${prefix}: passage 含中文 | book=${book.substring(0,30)} | passage=${passage.substring(0,80)} | title=${title.substring(0,40)}`);
        issueCount++;
      }

      // Check 3: passage contains newline
      if (passage.includes('\n') || passage.includes('\r')) {
        issues.push(`${prefix}: passage 含換行 | book=${book.substring(0,30)} | passage=${passage.replace(/[\n\r]/g,'↵').substring(0,80)} | title=${title.substring(0,40)}`);
        issueCount++;
      }

      // Check 4: book contains newline
      if (book.includes('\n') || book.includes('\r')) {
        issues.push(`${prefix}: book 含換行 | book=${book.replace(/[\n\r]/g,'↵').substring(0,50)} | passage=${passage.substring(0,30)} | title=${title.substring(0,40)}`);
        issueCount++;
      }

      // Check 5: title length > 60
      if (title.length > 60) {
        issues.push(`${prefix}: title 過長(${title.length}字) | book=${book.substring(0,30)} | passage=${passage.substring(0,30)} | title=${title.substring(0,80)}`);
        issueCount++;
      }

      // Check 6: book contains chapter:verse reference
      if (bookHasChapterRef(book)) {
        issues.push(`${prefix}: book 含章節引用 | book=${book.substring(0,50)} | passage=${passage.substring(0,30)} | title=${title.substring(0,40)}`);
        issueCount++;
      }
    }
  }

  if (issues.length === 0) {
    console.log('\n[OK] 沒有發現格式問題。');
  } else {
    console.log('\n=== 格式異常報告 ===');
    for (const issue of issues) {
      console.log(issue);
    }
    console.log(`\n總計問題：${issueCount} 筆`);
  }

  await client.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
