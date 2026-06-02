// scripts/migrate_cloudinary_naming.js
// 一次性遷移：把命名不規範的 Cloudinary 圖片搬到正規路徑，並同步回寫 Supabase 所有引用。
//
// 規則（只處理可自動歸類者，471+ 張）：
//   issue{N}_{a}-{b}                         -> images/articles/issue-{N}/{N}-{a}-{b}
//   articles/issue-{N}/issue{N}_{a}-{b}      -> images/articles/issue-{N}/{N}-{a}-{b}
//   author_{n}                               -> images/authors/author_{n}
//   authors/{x}                              -> images/authors/{x}
//   cover / cover-{n}                        -> images/covers/cover[-n]
//   covers/{x}                               -> images/covers/{x}
//   topic / topic-{n}                        -> images/topics/topic[-n]
//
// 用法：
//   node scripts/migrate_cloudinary_naming.js            # dry-run（預設，不改動）
//   node scripts/migrate_cloudinary_naming.js --execute  # 真正搬移 + 回寫 DB
//
// 所有 secret 一律從 .env 讀取，腳本不含任何金鑰值。
require("dotenv").config({ quiet: true });
const cloudinary = require("cloudinary").v2;
const { createClient } = require("@supabase/supabase-js");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const EXECUTE = process.argv.includes("--execute");

// 把一個 public_id 對應到正規路徑；回傳 null 表示「不處理」
function targetFor(id) {
  let m;
  if (/^(cld-sample|main-sample|samples\/|system\/)/.test(id)) return null;
  if (/^images\/(articles|authors|covers|topics|system)\//.test(id)) return null;
  if (/^submissions\//.test(id) || /^magazines\//.test(id)) return null;
  if ((m = id.match(/^issue(\d+)_(\d+)-(\d+)$/)))
    return `images/articles/issue-${m[1]}/${m[1]}-${m[2]}-${m[3]}`;
  // 刻意「不」處理 articles/issue-N/issueN_a-b（第 8/9 期舊資料夾）：
  // 這批檔名嵌的篇號與真實文章對不上、且會與既有 images/articles/ 檔案碰撞，
  // 需人工逐筆判斷，故排除於自動遷移之外。
  if (/^author_\d+$/.test(id)) return `images/authors/${id}`;
  if ((m = id.match(/^authors\/(.+)$/))) return `images/authors/${m[1]}`;
  if (/^cover(-\d+)?$/.test(id)) return `images/covers/${id}`;
  if ((m = id.match(/^covers\/(.+)$/))) return `images/covers/${m[1]}`;
  if (/^topic(-\d+)?$/.test(id)) return `images/topics/${id}`;
  return null; // 其餘（Vol.N PDF、page、photo、logo 等）需人工處理
}

// 解析 cloudinary URL，回傳 {prefix, version, publicId, ext}；非 cloudinary 回 null
const URL_RE =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|raw|video)\/upload\/)(v\d+\/)?(.+?)(\.[A-Za-z0-9]+)?$/;
function parseUrl(u) {
  const m = String(u).match(URL_RE);
  if (!m) return null;
  return { prefix: m[1], version: m[2] || "", publicId: m[3], ext: m[4] || "" };
}

async function listAllImages() {
  let all = [];
  let next = null;
  do {
    const res = await cloudinary.api.resources({
      type: "upload",
      resource_type: "image",
      max_results: 500,
      next_cursor: next,
    });
    all = all.concat(res.resources.map((r) => r.public_id));
    next = res.next_cursor;
  } while (next);
  return all;
}

async function main() {
  console.log(EXECUTE ? "*** EXECUTE 模式：將實際搬移並回寫 DB ***" : "--- DRY RUN（不改動）---");

  const allIds = await listAllImages();
  const idSet = new Set(allIds);

  // 1) 建 renameMap
  const renameMap = new Map(); // oldId -> newId
  for (const id of allIds) {
    const t = targetFor(id);
    if (t && t !== id) renameMap.set(id, t);
  }

  // 2) 碰撞檢查：目標 public_id 已存在？或多個來源撞同一目標？
  const collisions = [];
  const targetCount = new Map();
  for (const [oldId, newId] of renameMap) {
    if (idSet.has(newId)) collisions.push([oldId, newId, "目標已存在"]);
    targetCount.set(newId, (targetCount.get(newId) || 0) + 1);
  }
  for (const [t, n] of targetCount) if (n > 1) collisions.push(["(多來源)", t, n + " 個來源撞同目標"]);

  console.log(`\n可遷移檔案：${renameMap.size}`);
  console.log(`碰撞問題：${collisions.length}`);
  collisions.slice(0, 50).forEach((c) => console.log("  ⚠️", c.join(" | ")));

  // 3) 掃描 DB 所有引用，計算將被改寫的數量
  const [{ data: articles }, { data: authors }, { data: issues }, { data: assets }] =
    await Promise.all([
      sb.from("articles").select("id,content,media_data"),
      sb.from("authors").select("id,author_image"),
      sb.from("issues").select("id,cover_img,cfp_image"),
      sb.from("media_assets").select("id,image_url,cloudinary_id"),
    ]);

  // 改寫一段文字中所有命中的 cloudinary URL；回傳 {text, hits}
  function rewriteText(text) {
    if (!text) return { text, hits: 0 };
    let hits = 0;
    const out = String(text).replace(
      /https?:\/\/res\.cloudinary\.com\/[^\s"'<>)\]]+/g,
      (u) => {
        const p = parseUrl(u);
        if (p && renameMap.has(p.publicId)) {
          hits++;
          return p.prefix + p.version + renameMap.get(p.publicId) + p.ext;
        }
        return u;
      },
    );
    return { text: out, hits };
  }

  const plan = { articleContent: 0, articleMedia: 0, authors: 0, issues: 0, assetsUrl: 0, assetsCid: 0 };
  const articleUpdates = [];
  for (const a of articles) {
    const c = rewriteText(a.content);
    const mdStr = a.media_data ? JSON.stringify(a.media_data) : null;
    const md = rewriteText(mdStr);
    if (c.hits || md.hits) {
      plan.articleContent += c.hits;
      plan.articleMedia += md.hits;
      articleUpdates.push({
        id: a.id,
        content: c.hits ? c.text : undefined,
        media_data: md.hits ? JSON.parse(md.text) : undefined,
      });
    }
  }
  const authorUpdates = [];
  for (const a of authors) {
    const r = rewriteText(a.author_image);
    if (r.hits) { plan.authors += r.hits; authorUpdates.push({ id: a.id, author_image: r.text }); }
  }
  const issueUpdates = [];
  for (const i of issues) {
    const cov = rewriteText(i.cover_img);
    const cfp = rewriteText(i.cfp_image);
    if (cov.hits || cfp.hits) {
      plan.issues += cov.hits + cfp.hits;
      issueUpdates.push({ id: i.id, cover_img: cov.hits ? cov.text : undefined, cfp_image: cfp.hits ? cfp.text : undefined });
    }
  }
  const assetUpdates = [];
  for (const m of assets) {
    const url = rewriteText(m.image_url);
    let cid = m.cloudinary_id;
    let cidHit = 0;
    if (cid && renameMap.has(cid)) { cid = renameMap.get(cid); cidHit = 1; }
    if (url.hits || cidHit) {
      plan.assetsUrl += url.hits; plan.assetsCid += cidHit;
      assetUpdates.push({ id: m.id, image_url: url.hits ? url.text : undefined, cloudinary_id: cidHit ? cid : undefined });
    }
  }

  console.log("\nDB 將改寫的引用數：", JSON.stringify(plan));
  console.log(`  文章列 ${articleUpdates.length}、作者 ${authorUpdates.length}、期刊 ${issueUpdates.length}、媒體 ${assetUpdates.length}`);

  if (!EXECUTE) {
    console.log("\n（dry-run 結束，未改動。加 --execute 才實際搬移）");
    return;
  }

  if (collisions.length) {
    console.log("\n❌ 有碰撞問題，為安全起見中止。請先處理碰撞。");
    return;
  }

  // 4) 真正搬移 Cloudinary
  console.log("\n>>> 開始 Cloudinary 改名...");
  let ok = 0, skip = 0, fail = 0;
  for (const [oldId, newId] of renameMap) {
    try {
      await cloudinary.uploader.rename(oldId, newId, { resource_type: "image", overwrite: false, invalidate: true });
      ok++;
    } catch (e) {
      if (idSet.has(newId) || /already exists|not found/i.test(e.message)) skip++;
      else { fail++; console.log("  rename FAIL", oldId, "->", newId, ":", e.message); }
    }
    if ((ok + skip + fail) % 50 === 0) console.log(`  ...${ok + skip + fail}/${renameMap.size}`);
  }
  console.log(`Cloudinary 改名完成：ok=${ok} skip=${skip} fail=${fail}`);

  // 5) 回寫 DB
  console.log("\n>>> 回寫 Supabase...");
  for (const u of articleUpdates) {
    const payload = {};
    if (u.content !== undefined) payload.content = u.content;
    if (u.media_data !== undefined) payload.media_data = u.media_data;
    const { error } = await sb.from("articles").update(payload).eq("id", u.id);
    if (error) console.log("  article", u.id, "ERR", error.message);
  }
  for (const u of authorUpdates) {
    const { error } = await sb.from("authors").update({ author_image: u.author_image }).eq("id", u.id);
    if (error) console.log("  author", u.id, "ERR", error.message);
  }
  for (const u of issueUpdates) {
    const payload = {};
    if (u.cover_img !== undefined) payload.cover_img = u.cover_img;
    if (u.cfp_image !== undefined) payload.cfp_image = u.cfp_image;
    const { error } = await sb.from("issues").update(payload).eq("id", u.id);
    if (error) console.log("  issue", u.id, "ERR", error.message);
  }
  for (const u of assetUpdates) {
    const payload = {};
    if (u.image_url !== undefined) payload.image_url = u.image_url;
    if (u.cloudinary_id !== undefined) payload.cloudinary_id = u.cloudinary_id;
    const { error } = await sb.from("media_assets").update(payload).eq("id", u.id);
    if (error) console.log("  asset", u.id, "ERR", error.message);
  }
  console.log("DB 回寫完成。");
}

main().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
