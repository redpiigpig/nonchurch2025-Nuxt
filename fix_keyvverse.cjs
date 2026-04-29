// fix_keyvverse.cjs
// Clean key_verse fields:
//   1. Entirely-number entries → null
//   2. Trailing page number (\n{N}) → strip
//   3. Trailing 【默想】 marker → strip
//   4. Trailing reading-reference bleed lines → strip
// Run: node fix_keyvverse.cjs [--dry-run]

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function cleanKeyVerse(kv) {
  if (!kv || !kv.trim()) return null;
  kv = kv.trim();

  // Entirely a number → clear
  if (/^\d+\s*$/.test(kv)) return null;

  // Iteratively strip trailing garbage until stable
  let prev = '';
  while (kv !== prev) {
    prev = kv;
    // 1. Trailing page number
    kv = kv.replace(/\n+\d+\s*$/, '').trimEnd();
    // 2. Trailing 【默想】 marker (and any parenthetical instruction following it)
    kv = kv.replace(/\n+【默想】[\s\S]*$/, '').trimEnd();
    // 3. Trailing reading-reference line: 1-4 CJK chars + whitespace + digit(s) + optional title
    //    e.g. "路 1:68-79 撒迦利亞頌" or "詩 90 我們一生的年日"
    kv = kv.replace(/\n+[一-鿿]{1,4}[\s　]+\d+(?:[:\-,\d]*)?[^\n]*$/, '').trimEnd();
  }

  return kv || null;
}

async function main() {
  let cleared = 0, fixed = 0, unchanged = 0;
  let rowsUpdated = 0;
  let offset = 0;
  const PAGE = 200;

  while (true) {
    const { data: rows, error } = await supabase
      .from('pong_lectionary_days')
      .select('id, readings')
      .order('id')
      .range(offset, offset + PAGE - 1);

    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      let changed = false;
      const newReadings = row.readings.map(r => {
        const orig = r.key_verse;
        if (!orig) { unchanged++; return r; }

        const cleaned = cleanKeyVerse(orig);

        if (cleaned === null && orig.trim()) {
          // Was something, now null
          cleared++;
          changed = true;
          if (DRY_RUN) console.log(`CLEAR id=${row.id} book=${r.book}: [${orig.trim().substring(0, 60).replace(/\n/g, '↵')}]`);
          return { ...r, key_verse: null };
        }
        if (cleaned !== null && cleaned !== orig.trim()) {
          fixed++;
          changed = true;
          if (DRY_RUN) console.log(`FIX   id=${row.id} book=${r.book}: ...→[${cleaned.slice(-80).replace(/\n/g, '↵')}]`);
          return { ...r, key_verse: cleaned };
        }
        unchanged++;
        return r;
      });

      if (changed && !DRY_RUN) {
        const { error: upErr } = await supabase
          .from('pong_lectionary_days')
          .update({ readings: newReadings })
          .eq('id', row.id);
        if (upErr) console.error(`Update error id=${row.id}:`, upErr.message);
        else rowsUpdated++;
      }
    }

    offset += PAGE;
    if (rows.length < PAGE) break;
  }

  console.log(`\n=== 完成 ===`);
  console.log(`key_verse 清空（純數字）: ${cleared} 筆`);
  console.log(`key_verse 尾端清理: ${fixed} 筆`);
  console.log(`key_verse 無需修改: ${unchanged} 筆`);
  if (!DRY_RUN) console.log(`更新資料列: ${rowsUpdated} 行`);
  if (DRY_RUN) console.log('(DRY RUN - 未實際更新 DB)');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
