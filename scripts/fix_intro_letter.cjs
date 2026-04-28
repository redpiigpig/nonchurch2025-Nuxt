#!/usr/bin/env node
/**
 * 檢查並修正所有 A/B/C 年 pong_lectionary_weeks.intro_letter
 *
 * 問題類型：
 *  1. PDF 行包裹：正文每行 ~25 字被 PDF 解析器截斷，每行成獨立 <p>，顯示破碎
 *  2. 問候語後缺少 \n\n 分隔（renderBody 無法正確分段）
 *  3. 問候語本身含多餘空格
 *
 * 修正策略：
 *  - 規則式：合併 PDF 行包裹、補 \n\n 段落分隔符
 *  - Gemini：批次（每次最多 5 筆）驗證署名是否與文意一致
 *
 * 用法：
 *   node scripts/fix_intro_letter.cjs           # 只檢查，不寫入
 *   node scripts/fix_intro_letter.cjs --fix     # 寫入修正
 *   node scripts/fix_intro_letter.cjs --no-ai  # 略過 Gemini 驗證
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const https = require('https');
const fs    = require('fs');

const SUPABASE_URL = 'https://pottupypvdzamztdhsah.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_KEY   = process.env.VITE_GEMINI_API_KEY;

// ── REST ──────────────────────────────────────────────────────────────────────
function apiGet(path) {
  return new Promise((res, rej) => {
    const u = new URL(SUPABASE_URL + path);
    https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY }
    }, re => { let d=''; re.on('data', x=>d+=x); re.on('end', ()=>res(JSON.parse(d))); }).on('error',rej).end();
  });
}
function apiPatch(path, body) {
  return new Promise((res, rej) => {
    const data = Buffer.from(JSON.stringify(body));
    const u = new URL(SUPABASE_URL + path);
    https.request({
      hostname: u.hostname, path: u.pathname+u.search, method:'PATCH',
      headers:{
        apikey: SERVICE_KEY, Authorization:'Bearer '+SERVICE_KEY,
        'Content-Type':'application/json', 'Content-Length': data.length,
        Prefer:'return=minimal'
      }
    }, re => { let d=''; re.on('data',x=>d+=x); re.on('end',()=>res(re.statusCode)); }).on('error',rej).write(data);
  });
}

// ── Gemini（帶重試） ───────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function gemini(prompt, retries = 3) {
  const body = Buffer.from(JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
  }));
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await sleep(15000);  // 15s 間隔
    const result = await new Promise((res, rej) => {
      const path = `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
      https.request({
        hostname:'generativelanguage.googleapis.com', path, method:'POST',
        headers:{'Content-Type':'application/json','Content-Length':body.length}
      }, re => {
        let d=''; re.on('data',x=>d+=x);
        re.on('end',()=>{
          try {
            const j = JSON.parse(d);
            if (re.statusCode === 429) { res({retry: true}); return; }
            res({ text: j?.candidates?.[0]?.content?.parts?.[0]?.text || '' });
          } catch(e) { res({text:''}); }
        });
      }).on('error', rej).write(body);
    });
    if (!result.retry) return result.text || '';
    process.stdout.write('  [Gemini 限速，等候 15s...]\n');
  }
  return '';
}

// ── 格式判斷與修正（規則式） ─────────────────────────────────────────────────
// 句末標點：視為這行可以結束
const SENTENCE_END  = /[。！？；…」』）：]$/u;
// 問候語偵測（第一行）
const GREETING_RE   = /^各位讀者[：:]/;
// 署名行偵測（必須是句首有明確標記，避免誤判聖經節文）
const SIG_RE = /^(主內|謹識|奉上)|敬上\s*$|陳繼賢|([一-鿿]{2,4}(弟兄|姊妹)\s*於\s*20)/u;

function parseParts(text) {
  const lines = text.split('\n');

  // 問候語：第一行，若結尾不含標點則含第二行（如 "各位讀者：\n哈利路亞！"）
  let greetEnd = 0;
  if (GREETING_RE.test(lines[0] || '')) {
    greetEnd = 1;
    if (!SENTENCE_END.test(lines[0]) && lines[1] && !GREETING_RE.test(lines[1]) && lines[1].trim()) {
      greetEnd = 2;
    }
  }
  const greeting = lines.slice(0, greetEnd).map(l => l.trim()).join('');

  // 署名：倒數 8 行中找第一個含 SIG_RE 的行
  let sigStart = lines.length;
  for (let i = Math.max(greetEnd, lines.length - 8); i < lines.length; i++) {
    if (SIG_RE.test(lines[i])) { sigStart = i; break; }
  }
  const sig = lines.slice(sigStart).join('\n').trim();

  const bodyLines = lines.slice(greetEnd, sigStart);
  return { greeting, bodyLines, sig };
}

function joinWrappedLines(bodyLines) {
  // 先以現有的空行切出「段落組」
  const groups = [];
  let cur = [];
  for (const line of bodyLines) {
    if (!line.trim()) {
      if (cur.length) { groups.push(cur); cur = []; }
    } else {
      cur.push(line.trim());
    }
  }
  if (cur.length) groups.push(cur);

  // 若完全沒有空行（PDF 格式），視整個 body 為一個「組」
  if (groups.length === 0 && bodyLines.some(l => l.trim())) {
    groups.push(bodyLines.filter(l => l.trim()));
  }

  // 每「組」內部：合併行包裹（前行結尾不是句末標點 → 接下一行）
  const paras = groups.map(group => {
    const merged = [];
    for (const line of group) {
      if (!merged.length) {
        merged.push(line);
      } else {
        const prev = merged[merged.length - 1];
        if (SENTENCE_END.test(prev)) {
          // 前行已句末 → 看是否明顯新段（有段落標記字）
          merged.push(line);
        } else {
          // 前行是包裹行 → 合併
          merged[merged.length - 1] = prev + line;
        }
      }
    }
    return merged.join('');
  });

  return paras.filter(Boolean);
}

function fixText(text) {
  const { greeting, bodyLines, sig } = parseParts(text);
  const paras = joinWrappedLines(bodyLines);

  const parts = [];
  if (greeting) parts.push(greeting);
  parts.push(...paras);
  if (sig) parts.push(sig);
  return parts.join('\n\n');
}

function hasIssue(text) {
  if (!text || !text.trim()) return false;
  const lines = text.split('\n');
  // 問候語後緊接正文（無 \n\n）
  if (!text.includes('\n\n')) return true;
  // 問候語含多餘空格
  if (lines[0] && GREETING_RE.test(lines[0]) && lines[0] !== lines[0].trim()) return true;
  // PDF 行包裹：body 中有短行結尾非句末標點
  const { bodyLines } = parseParts(text);
  const SHORT_WRAP = /^.{8,30}[^。！？；…」』）：\n]$/u;
  if (bodyLines.some(l => l.trim() && SHORT_WRAP.test(l.trim()))) return true;
  return false;
}

// ── 批次 Gemini 驗證署名 ──────────────────────────────────────────────────────
async function verifySignaturesBatch(items) {
  // items: [{label, sig, intro_preview}]
  if (!items.length) return {};
  const list = items.map((it, i) =>
    `[${i+1}] ${it.label}\n署名行：${it.sig || '（無署名）'}\n引言摘要：${it.intro_preview}`
  ).join('\n\n');

  const prompt = `以下是教會每週靈修引言的署名與摘要，請逐一判斷署名是否與內容一致：
- 若引言中明確提及龐君華已安息或逝世，說明作者應為其他人（如陳繼賢弟兄）
- 若引言內容是第一人稱以牧者身分分享，通常署名應是龐君華
- 若署名為空但內容明確，請根據內容推斷作者
- 若無法判斷請回答「無法判斷」

${list}

請以下面格式回覆每一筆（不加其他說明）：
[1] 署名正確/署名有誤（說明）/無法判斷
[2] ...`;

  const resp = await gemini(prompt);
  const result = {};
  for (let i = 0; i < items.length; i++) {
    const re = new RegExp(`\\[${i+1}\\]\\s*([^\\n]+)`);
    const m = resp.match(re);
    result[items[i].label] = m ? m[1].trim() : '（未回應）';
  }
  return result;
}

// ── 主程式 ─────────────────────────────────────────────────────────────────────
async function main() {
  const doFix   = process.argv.includes('--fix');
  const noAI    = process.argv.includes('--no-ai');
  const yearArg = (() => { const i = process.argv.indexOf('--year'); return i>=0?process.argv[i+1]:null; })();

  let url = '/rest/v1/pong_lectionary_weeks?select=id,lectionary_year,season,week_num,intro_letter&intro_letter=neq.null&limit=500&order=lectionary_year,season,week_num';
  if (yearArg) url += `&lectionary_year=eq.${yearArg}`;

  const rows = await apiGet(url);
  // 過濾空字串
  const withContent = rows.filter(r => r.intro_letter && r.intro_letter.trim());
  console.log(`共 ${withContent.length} 週有 intro_letter 內容\n`);

  const needFix    = [];
  const allSigItems = [];
  let okCount = 0;

  // ── 第一遍：格式檢查 ────────────────────────────────────────────────────────
  for (const row of withContent) {
    const label = `${row.lectionary_year}-${row.season}-wk${String(row.week_num).padStart(2,'0')}`;
    const text  = row.intro_letter;
    const { sig } = parseParts(text);
    const preview = text.slice(0, 60).replace(/\n/g, '↵');

    allSigItems.push({ label, sig, intro_preview: preview });

    // 安全閘：若 intro_letter 超過 100 行且無署名 → 整個週次資料誤塞，需人工處理
    const lines = text.split('\n');
    if (lines.length > 100 && !sig) {
      process.stdout.write(`🚫 ${label}  [${lines.length} 行，無署名，疑似誤載整週資料，需人工處理]\n`);
      continue;
    }

    if (hasIssue(text)) {
      const fixed = fixText(text);
      const changed = (fixed !== text);
      needFix.push({ row, label, text, fixed, changed, sig });
      process.stdout.write(`⚠️  ${label}  署名：${sig || '（無）'}  [格式問題]\n`);
    } else {
      okCount++;
      process.stdout.write(`✅ ${label}  署名：${sig || '（無）'}\n`);
    }
  }

  console.log(`\n格式正確：${okCount}　需修正：${needFix.length}`);

  // ── 顯示修正差異 ────────────────────────────────────────────────────────────
  if (needFix.length) {
    console.log('\n──── 修正預覽 ────');
    for (const item of needFix) {
      if (!item.changed) { process.stdout.write(`  ${item.label}: 修正後無差異，略過\n`); continue; }
      process.stdout.write(`\n[${item.label}]\n`);
      process.stdout.write(`  原文頭：${JSON.stringify(item.text.slice(0,120))}\n`);
      process.stdout.write(`  修正頭：${JSON.stringify(item.fixed.slice(0,120))}\n`);
    }
  }

  // ── Gemini 批次驗證署名 ─────────────────────────────────────────────────────
  let sigVerification = {};
  if (!noAI && GEMINI_KEY && allSigItems.length) {
    console.log('\n──── Gemini 批次驗證署名 ────');
    const BATCH = 8;
    for (let i = 0; i < allSigItems.length; i += BATCH) {
      const batch = allSigItems.slice(i, i + BATCH);
      process.stdout.write(`  驗證 ${i+1}–${Math.min(i+BATCH, allSigItems.length)} / ${allSigItems.length}...`);
      await sleep(3000);  // 避免限速
      const res = await verifySignaturesBatch(batch);
      Object.assign(sigVerification, res);
      process.stdout.write(' 完成\n');
    }

    console.log('\n署名驗證結果（有問題或無法判斷的條目）：');
    let sigIssues = 0;
    for (const [label, verdict] of Object.entries(sigVerification)) {
      if (verdict && !verdict.includes('署名正確')) {
        process.stdout.write(`  ⚠️  ${label}：${verdict}\n`);
        sigIssues++;
      }
    }
    if (!sigIssues) console.log('  （所有署名均正確）');
  }

  // ── 寫入 ────────────────────────────────────────────────────────────────────
  if (doFix) {
    console.log('\n──── 寫入修正 ────');
    let updated = 0, errors = 0;
    for (const item of needFix) {
      if (!item.changed) continue;
      const status = await apiPatch(
        `/rest/v1/pong_lectionary_weeks?id=eq.${item.row.id}`,
        { intro_letter: item.fixed }
      );
      if (status === 204 || status === 200) {
        process.stdout.write(`  ✅ ${item.label}\n`);
        updated++;
      } else {
        process.stdout.write(`  ❌ ${item.label} HTTP ${status}\n`);
        errors++;
      }
    }
    console.log(`\n完成：更新 ${updated}　錯誤 ${errors}`);
  } else {
    console.log('\n（加上 --fix 旗標可自動寫入修正）');
  }

  // 儲存報告
  const report = { sigVerification, needFix: needFix.map(x=>({label:x.label, changed:x.changed, sig:x.sig})) };
  fs.writeFileSync('scripts/_intro_letter_report.json', JSON.stringify(report,null,2),'utf-8');
  console.log('詳細報告：scripts/_intro_letter_report.json');
}

main().catch(e => { console.error(e); process.exit(1); });
