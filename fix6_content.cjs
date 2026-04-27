'use strict';
const https = require('https');
const KEY = process.env.SUPABASE_SERVICE_KEY; // set in .env

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = { hostname: 'pottupypvdzamztdhsah.supabase.co', path, method,
      headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' } };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(opts, res => {
      let buf = ''; res.on('data', c => buf += c);
      res.on('end', () => { if (res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode)); resolve(buf ? JSON.parse(buf) : null); });
    }); req.on('error', reject); if (data) req.write(data); req.end();
  });
}

const M = new Map();
function r(b, a, rep) { M.set(b + '|' + a, rep); }

// 6-1
r('之後，', '時開火', '何');   // 之後，|時開火 → 何
r('文字能', '更流暢', '以');   // 文字能|更流暢 → 以
r('更流暢', '方式進', '的');   // 更流暢|方式進 → 的
r('被體', '標記為', '制');          // 被體|標記為 → 制
r('無數', '願被體', '甘');          // 無數|願被體 → 甘
r('殿」、', '政治中', '「');   // 殿」、|政治中 → 「
r('上帝', '殿」、', '的');          // 上帝|殿」、 → 的
r('缺陷的', '界而言', '世');   // 缺陷的|界而言 → 世
r('成一', '精神上', '場');          // 成一|精神上 → 場
r('歲末年', '，也是', '終');   // 歲末年|，也是 → 終
r('共同', '向一個', '指');          // 共同|向一個 → 指
r('邊境與', '卷的殘', '古');   // 邊境與|卷的殘 → 古
r('真正', '對話並', '的');          // 真正|對話並 → 的
r('徒——', '時，對', '有');   // 信徒——|時，對 → 有
r('是讓', '己成為', '自');          // 是讓|己成為 → 自
r('特色。', '果前面', '如');   // 特色。|果前面 → 如
r('無論', '共產極', '是');          // 無論|共產極 → 是
r('之間，', '由起舞', '自');   // 之間，|由起舞 → 自

// 6-2
r('嚴謹', '與網路', '度');          // 嚴謹|與網路 → 度
r('驅逐', '積極在', '，');          // 驅逐|積極在 → ，
r('網路', '作的通', '寫');          // 網路|作的通 → 寫
r('願意', '與其中', '參');          // 願意|與其中 → 參

// 6-4
r('出生', '苗栗銅', '於');          // 出生|苗栗銅 → 於
r('苗栗銅', '，畢業', '鑼');   // 苗栗銅|，畢業 → 鑼
r('原本沒', '特別佛', '有');   // 原本沒|特別佛 → 有
r('少數兼', '人權運', '具');   // 少數兼|人權運 → 具
r('運', '背景與', '動');                 // 運|背景與 → 動
r('您們家', '原本沒', '族');   // 您們家|原本沒 → 族
r('當時非', '多人都', '常');   // 當時非|多人都 → 常
r('佛教之後', '就會透', '我'); // 佛教之後|就會透 → 我
r('傳達', '捍衛自', '並');          // 傳達|捍衛自 → 並
r('室，即', '鄭南榕', '為');   // 室，即|鄭南榕 → 為
r('生，他', '樣做是', '這');   // 生，他|樣做是 → 這
r('言論坐', '的地方', '牢');   // 言論坐|的地方 → 牢
r('台南的遊', '。', '行');          // 台南的遊|。 → 行
r('還邀', '我在場', '請');          // 還邀|我在場 → 請
r('一個。', '早期的', '從');   // 一個。|早期的 → 從
r('認為「', '間佛教', '人');   // 認為「|間佛教 → 人
r('溫暖', '饋給社', '回');          // 溫暖|饋給社 → 回
r('回望鄭', '榕先生', '南');   // 回望鄭|榕先生 → 南
r('年鄭', '榕先生', '南');          // 年鄭|榕先生 → 南
r('此外，', '一年鄭', '每');   // 此外，|一年鄭 → 每
r('心與', '慧心就', '智');          // 心與|慧心就 → 智
r('心就', '增長', '能');                 // 心就|增長 → 能
r('引介', '我也見', '，');          // 引介|我也見 → ，
r('的悲', '，得到', '苦');          // 的悲|，得到 → 苦
r('這個', '神。她', '精');          // 這個|神。她 → 精
r('6）', '頁28', '，');          // 06）|頁28 → ，
r('〉，', '民主時', '《');          // 〉，|民主時 → 《
r('不必再', '言論坐', '為');   // 不必再|言論坐 → 為

// 6-5
r('跨', '來台', '海');                       // 跨|來台 → 海
r('算是', '種政治', '一');          // 算是|種政治 → 一
r('圖片', '源：施', '來');          // 圖片|源：施 → 來
r('爭者', '行，這', '同');          // 爭者|行，這 → 同
r('台灣的', '</p', '？');   // 台灣的|</p → ？
r('越來越不', '約會', '想');   // 越來越不|約會 → 想
r('我在', '麗島事', '美');          // 我在|麗島事 → 美
r('團體', '影響社', '能');          // 團體|影響社 → 能
r('人權、環', '與性別', '保'); // 人權、環|與性別 → 保
r('老朋', '，我每', '友');          // 老朋|，我每 → 友
r('差異。', '樣的修', '這');   // 差異。|樣的修 → 這
r('去性', '化）的', '慾');          // 去性|化）的 → 慾  (U+6155=慕, should be U+6170=慾)
r('？相', '於長老', '較');          // ？相|於長老 → 較
r('於挑', '國民黨', '戰');          // 於挑|國民黨 → 戰
r('美麗', '事件關', '島');          // 美麗|事件關 → 島
r('教授', '這位跨', '，');          // 教授|這位跨 → ，
r('們的', '姻算是', '婚');          // 們的|姻算是 → 婚
r('是怎', '滲透台', '麼');          // 是怎|滲透台 → 麼
r('「因', '我是台', '為');          // 「因|我是台 → 為
r('這三', '亞洲國', '個');          // 這三|亞洲國 → 個
r('）。', '很多法', '在');          // ）。|很多法 → 在
r('年的', '舉中皆', '選');          // 年的|舉中皆 → 選

// 6-6
r('主', '內涵的', '義');                 // 主|內涵的 → 義
r('自由主', '內涵的', '義');   // 自由主|內涵的 → 義
r('出任社', '、林世', '長');   // 出任社|、林世 → 長
r('社會', '離。罰', '背');          // 社會|離。罰 → 背
r('停刊、', '收等措', '沒');   // 停刊、|收等措 → 沒
r('社長', '林世煜', '、');          // 社長|林世煜 → 、
r('關於', '由主義', '自');          // 關於|由主義 → 自
r('思想', ' 鄭南榕', '家');         // 思想| 鄭南榕 → 家
r('</b>', '臺北：', '，'); // </b>|臺北： → ，

// 6-7
r('不只', '講個人', '在');          // 不只|講個人 → 在

// 6-8
r('個人', '場，並', '立');          // 個人|場，並 → 立
r('因此這', '又被稱', '天');   // 因此這|又被稱 → 天
r('造成', '立，形', '對');          // 造成|立，形 → 對
r('云云', '然而即', '。');          // 云云|然而即 → 。
r('人權', '區）', '園');                 // 人權|區） → 園

// 6-9
r('歷', '上出現', '史');                 // 歷|上出現 → 史
r('與上', '的直接', '帝');          // 與上|的直接 → 帝
r('的', '標籤化', '「');                 // 的|標籤化 → 「
r('關切的', '究方向', '研');   // 關切的|究方向 → 研

// 6-10
r('三世紀', '一股強', '，');   // 三世紀|一股強 → ，
r('希臘哲', '流派，', '學');   // 希臘哲|流派， → 學
r('sis）', '起自己', '喚'); // sis）|起自己 → 喚
r('流產', '。約納', '物');          // 流產|。約納 → 物
r('在無', '界神學', '境');          // 在無|界神學 → 境
r('強', '「唯有', '調');                 // 強|「唯有 → 調
r('將到', '個異鄉', '那');          // 將到|個異鄉 → 那
r('因此', '無境界', '在');          // 因此|無境界 → 在
r('任何', '西。我', '東');          // 任何|西。我 → 東

function fixAll(text) {
  let result = ''; let i = 0; let fixes = 0;
  while (i < text.length) {
    if (text.charCodeAt(i) !== 0xFFFD) { result += text[i]; i++; continue; }
    let end = i;
    while (end < text.length && text.charCodeAt(end) === 0xFFFD) end++;
    const nf = end - i;
    let rep = null;
    for (let cl = 2; cl <= 8 && !rep; cl++) {
      const b = text.slice(Math.max(0, i - cl), i);
      const a = text.slice(end, end + cl);
      rep = M.get(b + '|' + a);
    }
    if (rep) {
      const b4 = text.slice(Math.max(0, i - 4), i);
      const a4 = text.slice(end, end + 4);
      console.log('  fix: ' + b4 + '[' + nf + 'F]' + a4 + ' => ' + rep);
      result += rep; fixes++;
    } else {
      const b6 = text.slice(Math.max(0, i - 6), i);
      const a6 = text.slice(end, end + 6);
      console.log('  MISS: ' + b6 + '[' + nf + 'F]' + a6);
      result += text.slice(i, end);
    }
    i = end;
  }
  return { text: result, fixes };
}

async function fixArticle(id) {
  console.log('\n=== ' + id + ' ===');
  const d = await request('GET', '/rest/v1/articles?id=eq.' + encodeURIComponent(id) + '&select=content,footnotes', null);
  if (!d || !d[0]) { console.log('  NOT FOUND'); return; }
  const art = d[0]; const patch = {}; let tf = 0;
  if (art.content) {
    const { text, fixes } = fixAll(art.content);
    if (text !== art.content) { patch.content = text; tf += fixes; }
  }
  if (art.footnotes) {
    const raw = JSON.stringify(art.footnotes);
    const { text, fixes } = fixAll(raw);
    if (text !== raw) { patch.footnotes = JSON.parse(text); tf += fixes; }
  }
  if (!Object.keys(patch).length) { console.log('  (no changes)'); return; }
  await request('PATCH', '/rest/v1/articles?id=eq.' + encodeURIComponent(id), patch);
  const allText = (patch.content || art.content) + JSON.stringify(patch.footnotes || art.footnotes);
  const rem = allText.split('').filter(c => c.charCodeAt(0) === 0xFFFD).length;
  console.log('  => PATCHed (' + tf + ' fixes). Remaining FFFD: ' + rem);
}

(async () => {
  const ids = [
    '6-1編輯室報告', '6-2本期作者簡介', '6-4布施無畏的勇者',
    '6-5跨海來台的人權勇士', '6-6異端何以成焰', '6-7教會內的異端份子',
    '6-8和而不同的基督徒政治觀', '6-9帝國邊境的自由靈魂', '6-10陌生又親切的異鄉之神',
  ];
  for (const id of ids) await fixArticle(id);
  console.log('\nDone.');
})();
