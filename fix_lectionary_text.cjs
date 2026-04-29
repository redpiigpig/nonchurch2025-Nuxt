// fix_lectionary_text.cjs
// 1. Strip "=== PAGE N ===" markers from reading.text
// 2. Strip meditation instruction prefix from reading.key_verse
// Run: node fix_lectionary_text.cjs [--dry-run]

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function cleanText(text) {
  if (!text) return null;
  const cleaned = text
    .replace(/\s*=== PAGE \d+ ===\s*/g, '\n')
    .replace(/^\n+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
  return cleaned !== text ? cleaned : null;
}

// Strip meditation instruction prefix ending with 心得記下）
function cleanKeyVerse(kv) {
  if (!kv) return null;
  const m = kv.match(/^[\s\S]*?心得記下[）\)]\s*/);
  if (m && m[0].length < kv.length) {
    return kv.substring(m[0].length).trimStart() || null;
  }
  return null;
}

async function main() {
  let textFixed = 0;
  let kvFixed = 0;
  let rowsUpdated = 0;

  // Fetch all rows in pages of 200
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
        let updated = { ...r };

        const newText = cleanText(r.text);
        if (newText !== null) {
          if (DRY_RUN) console.log(`TEXT id=${row.id}: [${(r.text||'').substring(0,50).replace(/\n/g,'↵')}] → [${newText.substring(0,50).replace(/\n/g,'↵')}]`);
          updated.text = newText;
          textFixed++;
          changed = true;
        }

        const newKv = cleanKeyVerse(r.key_verse);
        if (newKv !== null) {
          if (DRY_RUN) console.log(`KV   id=${row.id}: [${(r.key_verse||'').substring(0,70).replace(/\n/g,'↵')}] → [${newKv.substring(0,50).replace(/\n/g,'↵')}]`);
          updated.key_verse = newKv;
          kvFixed++;
          changed = true;
        }

        return updated;
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
  console.log(`text PAGE標記清除: ${textFixed} 筆`);
  console.log(`key_verse 前綴清除: ${kvFixed} 筆`);
  if (!DRY_RUN) console.log(`更新資料列: ${rowsUpdated} 行`);
  if (DRY_RUN) console.log('(DRY RUN - 未實際更新 DB)');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
