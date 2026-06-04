// scripts/backfill_media_assets.cjs
// 把 Cloudinary images/articles/issue-N/ 下、命名為 {N}-{篇}-{序} 的圖片，
// 回填進 Supabase media_assets 表（文章編輯器與媒體庫都靠這張表顯示圖）。
// 預設只處理第 1～7 期（第 8/9 期已有資料、且舊夾混亂，不碰）。
//
//   node scripts/backfill_media_assets.cjs            # dry-run
//   node scripts/backfill_media_assets.cjs --execute  # 實際寫入
require("dotenv").config({ quiet: true });
const cloudinary = require("cloudinary").v2;
const { createClient } = require("@supabase/supabase-js");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const EXECUTE = process.argv.includes("--execute");
const MIN_ISSUE = 1, MAX_ISSUE = 7;

async function listFolder(n) {
  let all = [], next = null;
  do {
    const r = await cloudinary.api.resources({
      type: "upload", resource_type: "image",
      prefix: `images/articles/issue-${n}/`, max_results: 500, next_cursor: next,
    });
    all = all.concat(r.resources.map((x) => ({ pid: x.public_id, url: x.secure_url })));
    next = r.next_cursor;
  } while (next);
  return all;
}

(async () => {
  console.log(EXECUTE ? "*** EXECUTE 模式 ***" : "--- DRY RUN ---");
  const { data: arts } = await sb
    .from("articles").select("id,issue")
    .gte("issue", MIN_ISSUE).lte("issue", MAX_ISSUE)
    .order("issue").order("id");
  const { data: existing } = await sb.from("media_assets").select("article_id,cloudinary_id");
  const existSet = new Set(existing.map((e) => `${e.article_id}|${e.cloudinary_id}`));

  const cache = {};
  const inserts = [];
  const perIssue = {};
  for (const a of arts) {
    const m = a.id.match(/^(\d+)-(\d+)/);
    if (!m) continue;
    const issue = m[1], seq = m[2];
    if (!cache[issue]) cache[issue] = await listFolder(issue);
    const re = new RegExp(`^${issue}-${seq}-(\\d+)$`);
    const matches = cache[issue]
      .map((f) => ({ ...f, base: f.pid.split("/").pop() }))
      .map((f) => ({ ...f, mo: f.base.match(re) }))
      .filter((f) => f.mo)
      .map((f) => ({ pid: f.pid, url: f.url, ord: parseInt(f.mo[1], 10) }))
      .sort((x, y) => x.ord - y.ord);
    for (const f of matches) {
      if (existSet.has(`${a.id}|${f.pid}`)) continue;
      inserts.push({
        issue_id: Number(issue),
        article_id: a.id,
        cloudinary_id: f.pid,
        image_url: f.url,
        sort_order: f.ord,
      });
      perIssue[issue] = (perIssue[issue] || 0) + 1;
    }
  }

  console.log("將新增 media_assets 列:", inserts.length, " 各期:", JSON.stringify(perIssue));
  // 顯示幾篇樣本
  const sampleArts = [...new Set(inserts.map((i) => i.article_id))].slice(0, 6);
  sampleArts.forEach((aid) => {
    const rows = inserts.filter((i) => i.article_id === aid);
    console.log("  " + aid + " -> " + rows.map((r) => r.cloudinary_id.split("/").pop()).join(", "));
  });

  if (!EXECUTE) { console.log("\n（dry-run，未寫入。加 --execute 執行）"); return; }

  // 分批寫入
  for (let i = 0; i < inserts.length; i += 100) {
    const batch = inserts.slice(i, i + 100);
    const { error } = await sb.from("media_assets").insert(batch);
    if (error) console.log("  insert ERR @", i, error.message);
    else console.log("  inserted", i + batch.length, "/", inserts.length);
  }
  console.log("回填完成。");
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
