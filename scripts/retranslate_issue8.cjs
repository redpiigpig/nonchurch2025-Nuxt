/**
 * 第八期作者 / 文章 多語簡介重新翻譯
 * - 作者 id 35/36/37/38：以 name + bio 為來源，補上 5 語言 translations
 * - 第八期所有 summary 非空的文章：以主 summary 為來源，覆寫 translations[lang].summary
 *   （其他欄位 title / subtitle / keyword / author_display 不動）
 *
 * 用法：
 *   node scripts/retranslate_issue8.cjs            # 全跑
 *   node scripts/retranslate_issue8.cjs authors    # 只跑作者
 *   node scripts/retranslate_issue8.cjs articles   # 只跑文章
 *   node scripts/retranslate_issue8.cjs dry        # 不寫入，只印出 Gemini 回傳
 */
require("dotenv").config();
const { Client } = require("pg");

const MODE = process.argv[2] || "all";
const DRY = process.argv.includes("dry");

const KEYS = (process.env.GEMINI_API_KEYS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (KEYS.length === 0) {
  console.error("❌ 沒有 GEMINI_API_KEYS");
  process.exit(1);
}
let keyIdx = 0;
const nextKey = () => {
  const k = KEYS[keyIdx % KEYS.length];
  keyIdx++;
  return k;
};

const MODEL = "gemini-2.5-flash";
const URL = (k) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${k}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 每次呼叫前的最小間隔（避免每個 key 被打太快）
const MIN_CALL_INTERVAL_MS = 5000;
let lastCallAt = 0;

async function callGemini(prompt, maxRetries = 10) {
  let lastErr = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const key = nextKey();
    // 強制間隔
    const waitBefore = Math.max(0, lastCallAt + MIN_CALL_INTERVAL_MS - Date.now());
    if (waitBefore > 0) await sleep(waitBefore);
    lastCallAt = Date.now();
    try {
      const res = await fetch(URL(key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topK: 1,
            topP: 1,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        if (res.status === 429) {
          const m = body.match(/retry in ([\d.]+)s/i);
          const wait = m
            ? Math.ceil(parseFloat(m[1])) + 5
            : Math.min(120, (attempt + 1) * 15);
          console.log(`  ⏳ 429，換 key 等 ${wait}s 重試 (${attempt + 1}/${maxRetries})`);
          await sleep(wait * 1000);
          continue;
        }
        lastErr = new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
        await sleep(3000);
        continue;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastErr = new Error(
          `空回應 finishReason=${data?.candidates?.[0]?.finishReason}`,
        );
        await sleep(2000);
        continue;
      }
      const m =
        text.match(/```json\s*\n([\s\S]*?)\n```/) ||
        text.match(/```\s*\n([\s\S]*?)\n```/) ||
        text.match(/(\{[\s\S]*\})/);
      if (!m) {
        lastErr = new Error(`無法解析 JSON：${text.slice(0, 200)}`);
        continue;
      }
      return JSON.parse(m[1] || m[0]);
    } catch (e) {
      lastErr = e;
      await sleep(2000);
    }
  }
  throw lastErr || new Error("Gemini 失敗");
}

const LANG_INSTRUCTIONS = `翻譯規則：
- en：自然流暢的英文（學術/雜誌風格，不要逐字直譯）
- ja：自然流暢的日文（一般敬體 です・ます，亦可視段落改用普通体）
- ko：自然流暢的韓文（하십시오体 或 합니다体 為主）
- zh_CN：簡體中文（中國大陸用語與字形，例如「无境界者」「长老教会」「斗争」「台湾」）
- zh_HK：粵語白話文（書寫常用字：嘅 / 咗 / 係 / 喺 / 唔 / 點樣 / 啱啱 / 仲 / 哋 / 而家），保留繁體字
注意事項：
- 譯文要忠於來源語意與資訊量，不要自行擴寫或刪減
- 專有名詞照原樣或常見譯法（如「林義雄」英文 Lin Yi-hsiung；「昭慧法師」Master Chao-hwei；「無境界者」Faith Without Boundary 或保留原名）
- 只回傳 JSON，禁止 markdown 圍欄或任何解釋文字`;

function authorPrompt(name, bio) {
  return `${LANG_INSTRUCTIONS}

請把以下作者的「姓名」與「簡介」翻成 5 種語言。

姓名：${name}
簡介：${bio}

回傳格式（JSON）：
{
  "en": { "name": "…", "bio": "…" },
  "ja": { "name": "…", "bio": "…" },
  "ko": { "name": "…", "bio": "…" },
  "zh_CN": { "name": "…", "bio": "…" },
  "zh_HK": { "name": "…", "bio": "…" }
}`;
}

function summaryPrompt(summary) {
  return `${LANG_INSTRUCTIONS}

請把以下「文章摘要（繁體中文）」翻成 5 種語言。

來源摘要：
"""
${summary}
"""

回傳格式（JSON，每個語言對應一個字串）：
{
  "en": "…",
  "ja": "…",
  "ko": "…",
  "zh_CN": "…",
  "zh_HK": "…"
}`;
}

function validateAuthorOutput(o) {
  const langs = ["en", "ja", "ko", "zh_CN", "zh_HK"];
  for (const l of langs) {
    if (!o[l] || typeof o[l] !== "object")
      throw new Error(`缺少語言 ${l}`);
    if (!o[l].name || !o[l].bio)
      throw new Error(`${l} 缺少 name 或 bio`);
  }
}

function validateSummaryOutput(o) {
  const langs = ["en", "ja", "ko", "zh_CN", "zh_HK"];
  for (const l of langs) {
    if (typeof o[l] !== "string" || !o[l].trim())
      throw new Error(`缺少或空白語言 ${l}`);
  }
}

async function processAuthors(client) {
  const r = await client.query(
    `select id, name, bio, translations
     from authors
     where id in (35, 36, 37, 38)
     order by id`,
  );
  for (const row of r.rows) {
    console.log(`\n📝 作者 #${row.id} ${row.name}`);
    if (!row.bio || row.bio.trim() === "") {
      console.log("  ⚠️  bio 是空的，跳過");
      continue;
    }
    const t = row.translations || {};
    const langs = ["en", "ja", "ko", "zh_CN", "zh_HK"];
    const allDone = langs.every((l) => t[l]?.bio && t[l]?.name);
    if (allDone) {
      console.log("  ✓ 已存在 5 語言，跳過");
      continue;
    }
    const out = await callGemini(authorPrompt(row.name, row.bio));
    validateAuthorOutput(out);
    console.log("  ✓ 翻譯完成");
    if (DRY) {
      console.log(JSON.stringify(out, null, 2).slice(0, 400));
      continue;
    }
    await client.query(
      `update authors set translations = $1 where id = $2`,
      [JSON.stringify(out), row.id],
    );
    console.log("  💾 已寫入 authors.translations");
  }
}

const SKIP_ARTICLE_IDS = (process.env.SKIP_ARTICLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function translateSummaryWithRetry(summary, label) {
  const max = 3;
  let lastErr = null;
  for (let i = 0; i < max; i++) {
    try {
      const out = await callGemini(summaryPrompt(summary));
      validateSummaryOutput(out);
      return out;
    } catch (e) {
      console.log(`  ⚠️  ${label} 翻譯/校驗失敗 (${i + 1}/${max}): ${e.message}`);
      lastErr = e;
      await sleep(3000);
    }
  }
  throw lastErr;
}

async function processArticles(client) {
  const r = await client.query(
    `select id, title, summary, translations
     from articles
     where issue = 8
       and category not in ('編輯資訊')
       and summary is not null and summary <> ''
     order by sort_order nulls last, id`,
  );
  for (const row of r.rows) {
    if (SKIP_ARTICLE_IDS.includes(row.id)) {
      console.log(`\n📰 文章 ${row.id} - 已跳過（在 SKIP_ARTICLE_IDS）`);
      continue;
    }
    console.log(`\n📰 文章 ${row.id}（${row.title}）`);
    const out = await translateSummaryWithRetry(row.summary, row.id);
    console.log("  ✓ 翻譯完成");
    if (DRY) {
      console.log(JSON.stringify(out, null, 2).slice(0, 400));
      continue;
    }
    // 合併：保留 translations[lang] 中其他欄位（title / subtitle / keyword / author_display），只覆寫 summary
    const t = row.translations && typeof row.translations === "object" ? row.translations : {};
    for (const lang of ["en", "ja", "ko", "zh_CN", "zh_HK"]) {
      t[lang] = { ...(t[lang] || {}), summary: out[lang] };
    }
    await client.query(
      `update articles set translations = $1 where id = $2`,
      [JSON.stringify(t), row.id],
    );
    console.log("  💾 已寫入 articles.translations[*].summary");
  }
}

(async () => {
  const c = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: 5432,
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  console.log(`🚀 模式：${MODE}${DRY ? " (DRY)" : ""}`);

  if (MODE === "all" || MODE === "authors") {
    console.log("\n========== 作者 ==========");
    await processAuthors(c);
  }
  if (MODE === "all" || MODE === "articles") {
    console.log("\n========== 文章 ==========");
    await processArticles(c);
  }

  await c.end();
  console.log("\n✅ 完成");
})().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
