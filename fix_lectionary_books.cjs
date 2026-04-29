// fix_lectionary_books.cjs
// Fix: book abbreviations → full names, short bleeds, typos, theme_essay cleanup
// Run: node fix_lectionary_books.cjs [--dry-run]

require('dotenv').config();
const { Client } = require('pg');

const DRY_RUN = process.argv.includes('--dry-run');

const client = new Client({
  host: process.env.SUPABASE_DB_HOST, port: 5432,
  user: process.env.SUPABASE_DB_USER, password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME, ssl: { rejectUnauthorized: false }
});

// ===== Book abbreviation → full name mapping =====
const BOOK_MAP = {
  // OT
  '創': '創世記', '出': '出埃及記', '利': '利未記', '民': '民數記', '申': '申命記',
  '書': '約書亞記', '士': '士師記', '得': '路得記',
  '撒上': '撒母耳記上', '撒下': '撒母耳記下',
  '王上': '列王記上', '王下': '列王記下',
  '列王紀上': '列王記上', '列王紀下': '列王記下',
  '代上': '歷代志上', '代下': '歷代志下',
  '拉': '以斯拉記', '尼': '尼希米記', '斯': '以斯帖記',
  '伯': '約伯記', '詩': '詩篇', '箴': '箴言', '傳': '傳道書', '歌': '雅歌',
  '賽': '以賽亞書', '耶': '耶利米書', '哀': '耶利米哀歌',
  '結': '以西結書', '但': '但以理書',
  '何': '何西阿書', '珥': '約珥書', '摩': '阿摩司書', '俄': '俄巴底亞書',
  '拿': '約拿書', '彌': '彌迦書', '鴻': '鴻書', '哈': '哈巴谷書',
  '番': '西番雅書', '該': '哈該書', '亞': '撒迦利亞書', '瑪': '瑪拉基書',
  // NT
  '太': '馬太福音', '可': '馬可福音', '路': '路加福音', '約': '約翰福音',
  '徒': '使徒行傳',
  '羅': '羅馬書', '林前': '哥林多前書', '林後': '哥林多後書',
  '加': '加拉太書', '弗': '以弗所書', '腓': '腓立比書', '西': '歌羅西書',
  '帖前': '帖撒羅尼迦前書', '帖後': '帖撒羅尼迦後書',
  '提前': '提摩太前書', '提後': '提摩太後書',
  '多': '提多書', '門': '腓利門書', '來': '希伯來書',
  '雅': '雅各書', '彼前': '彼得前書', '彼後': '彼得後書',
  '約一': '約翰一書', '約二': '約翰二書', '約三': '約翰三書',
  '猶': '猶大書', '啟': '啟示錄',
  // Typo corrections
  '約壹': '約翰一書', '約翰壹書': '約翰一書', '約翰貮書': '約翰二書',
  '撤迦利亞書': '撒迦利亞書',
};

// Full set of valid names for validation
const FULL_NAMES = new Set(Object.values(BOOK_MAP).concat([
  '所羅門智訓', // deuterocanonical, leave as is
]));

// Special hardcoded overrides for single ambiguous cases
const BOOK_OVERRIDES = {
  // C/easter/wk2/day2/r1: book=帖, passage=8:1-17 → 以斯帖記
  '帖_8:1-17': '以斯帖記',
  // book=約。 with Psalm 107 passage → 詩篇 (not 約翰福音)
  '約。_107:1-3,17-22': '詩篇',
};

function fixBook(book, passage) {
  book = (book || '').trim();

  // Already a valid full name
  if (FULL_NAMES.has(book) || BOOK_NAMES_EXTENDED.has(book)) return null;

  // Step 1: If book has bleed text ending with known abbreviation
  // Pattern: "[any text] [book_abbrev]" where last token is in BOOK_MAP
  const lastSpaceIdx = book.lastIndexOf(' ');
  if (lastSpaceIdx > 0) {
    const lastToken = book.substring(lastSpaceIdx + 1);
    if (BOOK_MAP[lastToken]) return BOOK_MAP[lastToken];
  }

  // Step 2: If book ends with punctuation + book abbreviation (no space)
  // e.g., "約。" → no clear book; try to infer from passage context
  // (handled via hardcoded overrides below)

  // Step 3: Apply direct mapping
  if (BOOK_MAP[book]) return BOOK_MAP[book];

  // Step 4: Hardcoded override by book+passage key
  const overrideKey = book + '_' + (passage || '');
  if (BOOK_OVERRIDES[overrideKey]) return BOOK_OVERRIDES[overrideKey];

  // Step 5: If book ends with 。 or similar (short bleed without book abbrev after)
  // Try to extract just the CJK chars at the very end
  const m = book.match(/([一-鿿]{1,4})[。！？」]?$/);
  if (m && BOOK_MAP[m[1]]) return BOOK_MAP[m[1]];

  return null;
}

// Extended set including less common books that appear as full names already
const BOOK_NAMES_EXTENDED = new Set([
  '創世記', '出埃及記', '利未記', '民數記', '申命記', '約書亞記', '士師記', '路得記',
  '撒母耳記上', '撒母耳記下', '列王記上', '列王記下', '歷代志上', '歷代志下',
  '以斯拉記', '尼希米記', '以斯帖記', '約伯記', '詩篇', '箴言', '傳道書', '雅歌',
  '以賽亞書', '耶利米書', '耶利米哀歌', '以西結書', '但以理書',
  '何西阿書', '約珥書', '阿摩司書', '俄巴底亞書', '約拿書', '彌迦書', '鴻書',
  '哈巴谷書', '西番雅書', '哈該書', '撒迦利亞書', '瑪拉基書',
  '馬太福音', '馬可福音', '路加福音', '約翰福音', '使徒行傳',
  '羅馬書', '哥林多前書', '哥林多後書', '加拉太書', '以弗所書', '腓立比書', '歌羅西書',
  '帖撒羅尼迦前書', '帖撒羅尼迦後書', '提摩太前書', '提摩太後書',
  '提多書', '腓利門書', '希伯來書', '雅各書', '彼得前書', '彼得後書',
  '約翰一書', '約翰二書', '約翰三書', '猶大書', '啟示錄',
  '所羅門智訓',
]);

// ===== theme_essay cleanup =====
function isDiscussionContent(text) {
  if (!text) return false;
  // Discussion content starts with numbered questions like "1. " or "1、"
  return /^\s*[1１一][.、．]\s/.test(text);
}

// ===== Main =====
async function main() {
  await client.connect();
  console.log('Connected to DB');

  let bookFixed = 0;
  let themeCleared = 0;

  // --- Fix book names in pong_lectionary_days ---
  const daysRes = await client.query(
    'SELECT id, readings FROM pong_lectionary_days ORDER BY id'
  );

  for (const day of daysRes.rows) {
    let changed = false;
    const newReadings = day.readings.map(r => {
      const fixedBook = fixBook(r.book, r.passage);
      if (fixedBook) {
        changed = true;
        if (DRY_RUN) {
          console.log(`book: [${(r.book||'').substring(0,50)}] → [${fixedBook}] (passage=${r.passage})`);
        }
        bookFixed++;
        return { ...r, book: fixedBook };
      }
      return r;
    });

    if (changed && !DRY_RUN) {
      await client.query(
        'UPDATE pong_lectionary_days SET readings=$1::jsonb WHERE id=$2',
        [JSON.stringify(newReadings), day.id]
      );
    }
  }

  // --- Clear theme_essay for weeks with discussion content ---
  const weeksRes = await client.query(
    "SELECT id, lectionary_year, season, week_num, theme_essay FROM pong_lectionary_weeks WHERE theme_essay IS NOT NULL AND theme_essay != ''"
  );

  for (const week of weeksRes.rows) {
    if (isDiscussionContent(week.theme_essay)) {
      themeCleared++;
      if (DRY_RUN) {
        console.log(`CLEAR theme_essay: [${week.lectionary_year}] ${week.season} wk${week.week_num}: "${(week.theme_essay||'').substring(0,60)}..."`);
      } else {
        await client.query(
          'UPDATE pong_lectionary_weeks SET theme_essay=NULL WHERE id=$1',
          [week.id]
        );
      }
    }
  }

  console.log(`\n=== 完成 ===`);
  console.log(`書卷名稱修正: ${bookFixed} 筆`);
  console.log(`theme_essay 清空: ${themeCleared} 週`);
  if (DRY_RUN) console.log('(DRY RUN - 未實際���新 DB)');

  await client.end();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
