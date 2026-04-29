// fix_keyvverse_missing.cjs
// Recover missing key_verse from text files (page-break cases)
// Run: node fix_keyvverse_missing.cjs [--dry-run]

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const FULL_TO_ABBREV = {
  '創世記':'創','出埃及記':'出','利未記':'利','民數記':'民','申命記':'申',
  '約書亞記':'書','士師記':'士','路得記':'得',
  '撒母耳記上':'撒上','撒母耳記下':'撒下',
  '列王記上':'王上','列王記下':'王下','歷代志上':'代上','歷代志下':'代下',
  '以斯拉記':'拉','尼希米記':'尼','以斯帖記':'斯',
  '約伯記':'伯','詩篇':'詩','箴言':'箴','傳道書':'傳','雅歌':'歌',
  '以賽亞書':'賽','耶利米書':'耶','耶利米哀歌':'哀','以西結書':'結','但以理書':'但',
  '何西阿書':'何','約珥書':'珥','阿摩司書':'摩','俄巴底亞書':'俄',
  '約拿書':'拿','彌迦書':'彌','鴻書':'鴻','哈巴谷書':'哈',
  '西番雅書':'番','哈該書':'該','撒迦利亞書':'亞','瑪拉基書':'瑪',
  '馬太福音':'太','馬可福音':'可','路加福音':'路','約翰福音':'約',
  '使徒行傳':'徒',
  '羅馬書':'羅','哥林多前書':'林前','哥林多後書':'林後',
  '加拉太書':'加','以弗所書':'弗','腓立比書':'腓','歌羅西書':'西',
  '帖撒羅尼迦前書':'帖前','帖撒羅尼迦後書':'帖後',
  '提摩太前書':'提前','提摩太後書':'提後','提多書':'多','腓利門書':'門','希伯來書':'來',
  '雅各書':'雅','彼得前書':'彼前','彼得後書':'彼後',
  '約翰一書':'約一','約翰二書':'約二','約翰三書':'約三','猶大書':'猶','啟示錄':'啟',
};

// Canticles that naturally have no key_verse
const CANTICLE_PASSAGES = {
  '路加福音': new Set(['1:46b-55','1:46-55','1:68-79','2:29-32','3:1-6']),
  '撒母耳記上': new Set(['2:1-10']),
  '以賽亞書': new Set(['12:2-6','12:1-6']),
};

function isCanticle(book, passage) {
  return !!(CANTICLE_PASSAGES[book] && CANTICLE_PASSAGES[book].has(passage));
}

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function getTextFilePath(year, season, weekNum) {
  const seasonCap = season.charAt(0).toUpperCase() + season.slice(1);
  return path.join('stores/三讀三禱', `${year}-${seasonCap}-wk${String(weekNum).padStart(2,'0')}-text.txt`);
}

// Strip trailing reading-reference lines and day headers from extracted key_verse
function stripTrailingRef(kv) {
  let prev = '';
  while (kv !== prev) {
    prev = kv;
    // Trailing page number
    kv = kv.replace(/\n+\d+\s*$/, '').trimEnd();
    // Trailing reading reference: 1-4 CJK + space + digit
    kv = kv.replace(/\n+[一-鿿]{1,4}[\s　]+\d+[^\n]*$/, '').trimEnd();
    // Trailing day header
    kv = kv.replace(/\n+(?:星期|禮拜)[^\n]*$/, '').trimEnd();
  }
  return kv;
}

const ABBREV_TO_FULL = {
  '創':'創世記','出':'出埃及記','利':'利未記','民':'民數記','申':'申命記',
  '書':'約書亞記','士':'士師記','得':'路得記',
  '撒上':'撒母耳記上','撒下':'撒母耳記下','王上':'列王記上','王下':'列王記下',
  '代上':'歷代志上','代下':'歷代志下','拉':'以斯拉記','尼':'尼希米記','斯':'以斯帖記',
  '伯':'約伯記','詩':'詩篇','箴':'箴言','傳':'傳道書','歌':'雅歌',
  '賽':'以賽亞書','耶':'耶利米書','哀':'耶利米哀歌','結':'以西結書','但':'但以理書',
  '何':'何西阿書','珥':'約珥書','摩':'阿摩司書','俄':'俄巴底亞書',
  '拿':'約拿書','彌':'彌迦書','鴻':'鴻書','哈':'哈巴谷書',
  '番':'西番雅書','該':'哈該書','亞':'撒迦利亞書','瑪':'瑪拉基書',
  '太':'馬太福音','可':'馬可福音','路':'路加福音','約':'約翰福音','徒':'使徒行傳',
  '羅':'羅馬書','林前':'哥林多前書','林後':'哥林多後書',
  '加':'加拉太書','弗':'以弗所書','腓':'腓立比書','西':'歌羅西書',
  '帖前':'帖撒羅尼迦前書','帖後':'帖撒羅尼迦後書',
  '提前':'提摩太前書','提後':'提摩太後書','多':'提多書','門':'腓利門書','來':'希伯來書',
  '雅':'雅各書','彼前':'彼得前書','彼後':'彼得後書',
  '約一':'約翰一書','約二':'約翰二書','約三':'約翰三書','猶':'猶大書','啟':'啟示錄',
};

function extractKeyVerseFromText(text, bookAbbrev, passage) {
  const firstPart = passage.split(';')[0].split(',')[0].replace(/\([^)]*\)/g,'').trim();

  // Try both abbreviation and full name in header search
  const fullName = ABBREV_TO_FULL[bookAbbrev] || bookAbbrev;
  const candidates = [bookAbbrev];
  if (fullName !== bookAbbrev) candidates.push(fullName);

  let hm = null;
  for (const name of candidates) {
    const re = new RegExp(escRe(name) + '[\\s　]+' + escRe(firstPart));
    const m = re.exec(text);
    if (m) { hm = m; break; }
    // Try without trailing 'a' or 'b' in passage
    const firstPartClean = firstPart.replace(/[ab](?=[-\s]|$)/g,'');
    if (firstPartClean !== firstPart) {
      const m2 = new RegExp(escRe(name) + '[\\s　]+' + escRe(firstPartClean)).exec(text);
      if (m2) { hm = m2; break; }
    }
  }
  if (!hm) return null;

  // Find next key_verse instruction after this header
  const seg = text.substring(hm.index);
  const instrRe = /請默禱[^\n]*\n[^\n]*心得記下[）)][^\n]*/;
  const im = instrRe.exec(seg);
  if (!im) return null;

  // Guard: another reading header between current header and instruction = wrong instruction
  // Count 【経文】 markers (each reading section has one)
  const between = seg.substring(0, im.index);
  const extraHeaders = (between.match(/【経文】/g) || []).length;
  if (extraHeaders > 1) return null;

  // Get content after instruction
  let after = seg.substring(im.index + im[0].length);
  after = after.replace(/^\s+/, '');

  // Skip leading page number + PAGE marker (cross-page case)
  after = after.replace(/^\d+\s*\n=== PAGE \d+ ===\s*\n/, '');
  after = after.replace(/^=== PAGE \d+ ===\s*\n/, '');

  // Extract verse lines until stop condition
  const lines = after.split('\n');
  const kv = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^\d+$/.test(t)) break;          // page footer
    if (/^=== PAGE \d+/.test(t)) break;  // page marker
    if (/^【/.test(t)) break;            // section header
    if (/^(?:星期|禮拜)/.test(t)) break; // day header
    if (!t && kv.length > 0) break;      // blank line after content
    if (t) kv.push(t);
  }

  let result = kv.join('\n').trim();
  // Strip trailing reading-reference lines
  result = stripTrailingRef(result);
  // Must contain a proper chapter:verse reference (colon required)
  if (!result || !/\d+:\d+/.test(result)) return null;

  // Validate: the first chapter number in the key verse should match the passage's chapter range
  const passageChapters = firstPart.match(/^(\d+)/);
  if (passageChapters) {
    const passageChap = parseInt(passageChapters[1]);
    const kvChapMatches = result.match(/^(\d+):/m);
    if (kvChapMatches) {
      const kvChap = parseInt(kvChapMatches[1]);
      // Allow ±1 chapter tolerance for cross-chapter passages
      const passageEnd = firstPart.match(/[-–](\d+):/);
      const endChap = passageEnd ? parseInt(passageEnd[1]) : passageChap;
      if (kvChap < passageChap - 1 || kvChap > endChap + 1) return null;
    }
  }

  return result;
}

async function main() {
  // Load week info for all weeks
  const { data: weeks } = await supabase
    .from('pong_lectionary_weeks')
    .select('id, lectionary_year, season, week_num');
  const weekMap = {};
  for (const w of weeks) weekMap[w.id] = w;

  let found = 0, notFound = 0, canticle = 0, updated = 0;
  const notFoundList = [];

  // Get all days, look for missing key_verse
  let offset = 0;
  while (true) {
    const { data: rows } = await supabase
      .from('pong_lectionary_days')
      .select('id, week_id, day_of_week, readings')
      .order('id')
      .range(offset, offset + 199);
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      const wk = weekMap[row.week_id];
      if (!wk) { offset += 200; continue; }

      const textFile = getTextFilePath(wk.lectionary_year, wk.season, wk.week_num);
      if (!fs.existsSync(textFile)) { offset += 200; continue; }

      let text;
      try { text = fs.readFileSync(textFile, 'utf8'); } catch { continue; }

      let rowChanged = false;
      const newReadings = row.readings.map(r => {
        if (r.book === '詩篇') return r;
        if (r.key_verse && r.key_verse.trim()) return r; // already has content
        if (isCanticle(r.book, r.passage)) { canticle++; return r; }

        const abbrev = FULL_TO_ABBREV[r.book];
        if (!abbrev) { notFound++; notFoundList.push('id='+row.id+' '+r.book+' '+r.passage+' (no abbrev)'); return r; }

        const kv = extractKeyVerseFromText(text, abbrev, r.passage);
        if (kv) {
          found++;
          if (DRY_RUN) {
            console.log(`FOUND id=${row.id} ${r.book} ${r.passage}:`);
            console.log('  → ' + kv.substring(0,120).replace(/\n/g,'↵'));
          }
          rowChanged = true;
          return { ...r, key_verse: kv };
        } else {
          notFound++;
          notFoundList.push('id='+row.id+' wk='+row.week_id+' '+r.book+' '+r.passage);
          return r;
        }
      });

      if (rowChanged && !DRY_RUN) {
        const { error } = await supabase
          .from('pong_lectionary_days')
          .update({ readings: newReadings })
          .eq('id', row.id);
        if (!error) updated++;
        else console.error('Update error id='+row.id+':', error.message);
      }
    }

    offset += 200;
    if (rows.length < 200) break;
  }

  console.log(`\n=== 完成 ===`);
  console.log(`key_verse 成功補回: ${found} 筆`);
  console.log(`頌詩（無金句，正常）: ${canticle} 筆`);
  console.log(`無法自動補回: ${notFound} 筆`);
  if (!DRY_RUN) console.log(`更新資料列: ${updated} 行`);
  if (DRY_RUN) console.log('(DRY RUN)');

  if (notFoundList.length > 0) {
    console.log('\n--- 無法補回的清單 ---');
    for (const x of notFoundList) console.log('  ' + x);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
