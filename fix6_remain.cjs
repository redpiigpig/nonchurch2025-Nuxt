'use strict';
const https = require('https');
const KEY = process.env.SUPABASE_SERVICE_KEY; // set in .env

function get(path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'pottupypvdzamztdhsah.supabase.co', path,
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } };
    const r = https.request(opts, res => {
      const bufs = []; res.on('data', c => bufs.push(c));
      res.on('end', () => resolve(Buffer.concat(bufs).toString('utf8')));
    }); r.on('error', reject); r.end();
  });
}

function patchReq(path, body) {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(JSON.stringify(body), 'utf8');
    const opts = { hostname: 'pottupypvdzamztdhsah.supabase.co', path, method: 'PATCH',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
        'Content-Length': bodyBuf.length } };
    const r = https.request(opts, res => {
      const bufs = []; res.on('data', c => bufs.push(c));
      res.on('end', () => resolve(res.statusCode));
    }); r.on('error', reject); r.write(bodyBuf); r.end();
  });
}

// --- fixAll engine ---
const M = new Map();
function r(b, a, rep) { M.set(b + '|' + a, rep); }

function fixAll(text) {
  let result = ''; let i = 0; let fixes = 0; let misses = 0;
  while (i < text.length) {
    if (text.charCodeAt(i) !== 0xFFFD) { result += text[i]; i++; continue; }
    let end = i;
    while (end < text.length && text.charCodeAt(end) === 0xFFFD) end++;
    const nf = end - i;
    let rep = null;
    for (let cl = 2; cl <= 12 && !rep; cl++) {
      const b = text.slice(Math.max(0, i - cl), i);
      const a = text.slice(end, end + cl);
      rep = M.get(b + '|' + a);
    }
    if (rep) {
      const b4 = text.slice(Math.max(0, i - 4), i).replace(/\n/g, '↵');
      const a4 = text.slice(end, end + 4).replace(/\n/g, '↵');
      console.log('  fix: "' + b4 + '[' + nf + 'F]' + a4 + '" => "' + rep + '"');
      result += rep; fixes++;
    } else {
      const b4 = text.slice(Math.max(0, i - 4), i).replace(/\n/g, '↵');
      const a4 = text.slice(end, end + 4).replace(/\n/g, '↵');
      console.log('  MISS: "' + b4 + '[' + nf + 'F]' + a4 + '"');
      result += text.slice(i, end); misses++;
    }
    i = end;
  }
  return { text: result, fixes, misses };
}

async function fixArticle(id, rules) {
  // Clear and re-populate rule map for this article
  M.clear();
  for (const [b, a, rep] of rules) r(b, a, rep);

  console.log('\n=== ' + id + ' ===');
  const enc = encodeURIComponent(id);
  const raw = await get('/rest/v1/articles?id=eq.' + enc + '&select=content');
  const row = JSON.parse(raw)[0];
  if (!row) { console.log('  NOT FOUND'); return; }

  const before = row.content.split('').filter(c => c.charCodeAt(0) === 0xFFFD).length;
  console.log('  FFFD before: ' + before);

  const { text: fixed, fixes, misses } = fixAll(row.content);
  const after = fixed.split('').filter(c => c.charCodeAt(0) === 0xFFFD).length;
  console.log('  fixes=' + fixes + ' misses=' + misses + ' remaining=' + after);

  if (fixed !== row.content) {
    const status = await patchReq('/rest/v1/articles?id=eq.' + enc, { content: fixed });
    console.log('  PATCH status: ' + status);
  } else {
    console.log('  (no changes)');
  }
}

(async () => {
  // 6-10: 5 FFFD positions (12 chars total)
  await fixArticle('6-10陌生又親切的異鄉之神', [
    // From公元前一世紀至公元三世[2F]，一股強調「唯有獲得特殊
    ['公元三世', '，一股強', '紀'],
    // 是索菲亞激情與無知的流產[2F]。約納斯認為這一派的思想
    ['知的流產', '。約納斯', '物'],
    // 命所挑選並栽培的。我將到[3F]個異鄉人所愛的那些好人中
    ['。我將到', '個異鄉人', '那'],
    // 故事。</p><p>因此[3F]無境界神學的視野下，我們
    ['p>因此', '無境界神', '在'],
    // 我不再信靠這個世上的任何[2F]西。我不信靠這個世上的父
    ['上的任何', '西。我不', '東'],
  ]);

  // 6-13: 2 FFFD positions (4 chars total)
  await fixArticle('6-13話語、肉身與教義語法', [
    // 敘事倫理、教會作為品格塑[2F]共同體等討論彼此交織的原
    ['為品格塑', '共同體等', '造'],
    // rong>例如，就猶太教[2F]早期基督教的「分道揚鑣」
    ['就猶太教', '早期基督', '與'],
  ]);

  // 6-4: 6 FFFD positions (12 chars total)
  await fixArticle('6-4布施無畏的勇者', [
    // 異端者的權利」為主題，特[2F]回望鄭南榕先生所主張的「
    ['主題，特', '回望鄭南', '別'],
    // 們聽說之後當然也有去關心[2F]當時非常多人都有去關心。
    ['有去關心', '當時非常', '，'],
    // 坐坐。我的身體不好，接觸[2F]教之後，就會透過內觀去體
    ['好，接觸', '教之後，', '佛'],
    // 表達抗議，只能用這樣的行[2F]來傳達他捍衛自由的理念。
    ['這樣的行', '來傳達他', '動'],
    // n>原自由時代雜誌社總編[2F]室，即為鄭南榕先生自焚現
    ['誌社總編', '室，即為', '輯'],
    // 是一種理解。因為我了解鄭[2F]生，他這樣做是出於深切的
    ['我了解鄭', '生，他這', '南'],
  ]);

  // 6-6: 1 FFFD position (3 chars total)
  await fixArticle('6-6異端何以成焰', [
    // 他的作品中，雖有不少關於[3F]由主義內涵的討論，卻少有
    ['不少關於', '由主義內', '自'],
  ]);

  // 6-9: 1 FFFD position (3 chars total)
  await fixArticle('6-9帝國邊境的自由靈魂', [
    // 與信仰交織的複雜脈絡下，[3F]占庭歷史上出現了一個極具
    ['脈絡下，', '占庭歷史', '拜'],
  ]);

  console.log('\nDone.');
})();
