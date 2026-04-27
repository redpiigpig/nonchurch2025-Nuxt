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

function rep(s, from, to) { return s.split(from).join(to); }

// Returns { content, footnotes, translations } raw strings
async function fetch(id) {
  const enc = encodeURIComponent(id);
  const raw = await get('/rest/v1/articles?id=eq.' + enc + '&select=content,footnotes,translations');
  const rows = JSON.parse(raw);
  if (!rows[0]) return null;
  return rows[0];
}

async function applyFixes(id, fixes) {
  console.log('\n=== ' + id + ' ===');
  const row = await fetch(id);
  if (!row) { console.log('  NOT FOUND'); return; }

  const patch = {};
  let anyChange = false;

  for (const [field, reps] of Object.entries(fixes)) {
    const isJson = (field !== 'content');
    let val = isJson ? JSON.stringify(row[field]) : (row[field] || '');
    const orig = val;
    for (const [from, to] of reps) {
      if (val.includes(from)) {
        console.log('  [' + field + '] FOUND: ' + JSON.stringify(from) + ' -> ' + JSON.stringify(to));
        val = rep(val, from, to);
      } else {
        console.log('  [' + field + '] MISS:  ' + JSON.stringify(from));
      }
    }
    if (val !== orig) {
      patch[field] = isJson ? JSON.parse(val) : val;
      anyChange = true;
    }
  }

  if (!anyChange) { console.log('  (no changes)'); return; }
  const enc = encodeURIComponent(id);
  const status = await patchReq('/rest/v1/articles?id=eq.' + enc, patch);
  console.log('  PATCH status:', status);
}

(async () => {
  // 6-6
  await applyFixes('6-6異端何以成焰', {
    content: [
      ['1987年12月05日', '1987.12.05'],
      ['1987年02月23日', '1987.02.23'],
    ]
  });

  // 6-10
  await applyFixes('6-10陌生又親切的異鄉之神', {
    footnotes: [
      ['張新彰 譯', '張新樟 譯'],
      ['張新璋', '張新樟'],
    ],
    translations: [
      ['汉斯．约纳斯', '汉斯・约纳斯'],
      ['漢斯．約納斯', '漢斯・約納斯'],
    ]
  });

  // 6-11
  await applyFixes('6-11聆聽異端的聲音', {
    footnotes: [
      ['矢內原', '矢内原'],
      ['1942年2月設立', '1942年2月制定'],
      ['三○周年', '三〇周年'],
    ]
  });

  // 6-12
  await applyFixes('6-12當鄉下老鼠遇上支配惡魔', {
    translations: [
      ['链锯人 : 蕾洁篇', '链锯人─蕾洁篇'],
      ['鏈鋸人 : 蕾潔篇', '鏈鋸人─蕾潔篇'],
    ]
  });

  // 6-13
  await applyFixes('6-13話語、肉身與教義語法', {
    translations: [
      ['未「敘」甚至為「議」', '未「敘」甚至未「議」'],
    ],
    footnotes: [
      ['Soseins."', 'Soseins."'],
      ['香港：道風書社，2009。', '（香港：道風書社，2009）。'],
    ]
  });

  // 6-14
  await applyFixes('6-14看！在媚俗中起舞的人類', {
    translations: [
      ['Hermann Hesse, Siddhartha, Rebellious Seeker, Life Narrative', 'Milan Kundera, The Unbearable Lightness of Being, Kitsch, Eternal Return'],
      ['ヘルマン・ヘッセ、シッダルタ、反逆の求道者、ライフナラティブ', 'ミラン・クンデラ、存在の耐えられない軽さ、キッチュ、永遠回帰'],
      ['헤르만 헤세, 싯다르타, 반항적 구도자, 삶의 서사', '밀란 쿤데라, 참을 수 없는 존재의 가벼움, 키치, 영원회귀'],
      ['赫曼‧赫塞、流浪者之歌、叛逆的寻道者、生命叙事', '米兰・昆德拉、生命中不能承受之轻、媚俗、永劫回归'],
      ['赫曼‧赫塞、流浪者之歌、叛逆的尋道者、生命敘事', '米蘭・昆德拉、生命中不能承受之輕、媚俗、永劫回歸'],
      ['米兰‧昆德拉', '米兰・昆德拉'],
      ['米蘭‧昆德拉', '米蘭・昆德拉'],
    ],
    footnotes: [
      ['米蘭昆德拉：', '米蘭・昆德拉：'],
      ['米蘭·昆德拉', '米蘭・昆德拉'],
      ['弗朗索瓦‧希加', '弗朗索瓦・希加'],
      ['米蘭‧昆德拉', '米蘭・昆德拉'],
      ['不可承受之輕', '不能承受之輕'],
    ]
  });

  // 6-15
  await applyFixes('6-15那一天教會教導成了我的夢魘', {
    translations: [
      ['潜而默化', '潜移默化'],
      ['Metoo', 'MeToo'],
    ]
  });

  console.log('\nDone.');
})();
