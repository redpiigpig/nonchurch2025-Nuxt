'use strict';
const https = require('https');
const KEY = process.env.SUPABASE_SERVICE_KEY; // set in .env

// Chunk-safe GET: accumulate Buffer chunks before decoding as UTF-8
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

// Buffer-safe PATCH: pre-encode body to UTF-8 bytes before sending
function patch(path, body) {
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

const M = new Map();
// rep can be multi-char (e.g. '議到' for a [6F] group = 2 missing chars)
function r(b, a, rep) { M.set(b + '|' + a, rep); }

// 19 rules for all 52 FFFFDs in current DB content (chunk-safe scan)
// Contexts with adjacent FFFD groups include literal U+FFFD chars
r('歷史真相', '、「記住', '」');          // G1 [3F] 認識歷史真相[F]、「記住強權
r('經有過爭', '底該不該', '議到');        // G2 [6F] 有過爭[6F]底該不該 → 議+到 (2 chars)
r('觀當中，', '使是��', '即'); // G3 [3F] 當中，[F]使是[G4]輕微 → 即使是
r('��使是', '輕微的舉', '最'); // G4 [3F] [G3]使是[F]輕微 → 最輕微
r('中有五個', '要角��', '主'); // G5 [3F] 有五個[F]要角[G6] → 主要角色
r('��要角', '：四名人', '色'); // G6 [3F] [G5]要角[F]：四名 → 角色
r('會主義美', '，共產黨', '學');          // G7 [2F] 主義美[F]，共產黨 → 美學
r('，又輾轉', '到美國。', '逃');          // G8 [3F] 又輾轉[F]到美國 → 輾轉逃到
r('馬斯和特', '莎意外過', '蕾');          // G9 [2F] 和特[F]莎意外 → 特蕾莎
r('無意義的', '劇</h', '悲');             // G10 [3F] 無意義的[F]劇 → 悲劇
r('托馬斯被', '密警察抓', '秘');          // G11 [3F] 斯被[F]密警察 → 秘密警察
r('，也無法', '解這種痛', '理');          // G12 [2F] 無法[F]解 → 無法理解
r('嘲諷，是', '來自下方', '『');          // G13 [2F] ，是[F]來自下方 → 是『來自下方』
r('的勝利一', '走上街頭', '起');          // G14 [3F] 勝利一[F]走上 → 一起走上
r('是直線前', '。這正是', '進');          // G15 [2F] 直線前[F]。 → 直線前進
r('tive', '，也是主', '性');              // G16 [3F] narrative[F]，也是主體性 → narrativity
r('<p>我', '讀神學院', '在');             // G17 [2F] 我[F]讀神學院 → 我在讀
r('我也就沒', '再固定<', '有');           // G18 [2F] 沒[F]再固定 → 沒有再固定
r('讓我們無', '容忍眼前', '法');          // G19 [2F] 無[F]容忍 → 無法容忍

function fixAll(text) {
  let result = ''; let i = 0; let fixes = 0;
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
      const ctx = text.slice(Math.max(0,i-4),i).replace(/�/g,'~')+'['+nf+'F]'+text.slice(end,end+4).replace(/�/g,'~');
      console.log('  fix:', ctx, '=>', rep);
      result += rep; fixes++;
    } else {
      const ctx = text.slice(Math.max(0,i-4),i).replace(/�/g,'~')+'['+nf+'F]'+text.slice(end,end+4).replace(/�/g,'~');
      console.log('  MISS:', ctx);
      result += text.slice(i, end);
    }
    i = end;
  }
  return { text: result, fixes };
}

(async () => {
  const id = '6-14%E7%9C%8B%EF%BC%81%E5%9C%A8%E5%AA%9A%E4%BF%97%E4%B8%AD%E8%B5%B7%E8%88%9E%E7%9A%84%E4%BA%BA%E9%A1%9E';
  console.log('=== 6-14 (chunk-safe) ===');
  const raw = await get('/rest/v1/articles?id=eq.' + id + '&select=content');
  const content = JSON.parse(raw)[0].content;
  console.log('FFFD before:', content.split('').filter(c => c.charCodeAt(0) === 0xFFFD).length);
  const { text: fixed, fixes } = fixAll(content);
  const rem = fixed.split('').filter(c => c.charCodeAt(0) === 0xFFFD).length;
  console.log('\nFixes applied:', fixes, '| Remaining FFFD:', rem);
  if (fixed !== content) {
    const status = await patch('/rest/v1/articles?id=eq.' + id, { content: fixed });
    console.log('PATCH status:', status);
  } else {
    console.log('(no changes)');
  }
})();
