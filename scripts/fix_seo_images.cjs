// scripts/fix_seo_images.cjs
// 搬移時漏改 articles.seo 內的圖片 URL，導致 SEO/分享縮圖指向已搬走的舊路徑而 404。
// 這支用與搬移相同的對應規則改寫 seo.image 與 seo.og.image，並去掉舊版本號（用 versionless）。
//
//   node scripts/fix_seo_images.cjs            # dry-run
//   node scripts/fix_seo_images.cjs --execute  # 實際更新
require("dotenv").config({ quiet: true });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const EXECUTE = process.argv.includes("--execute");

// 與 migrate_cloudinary_naming.cjs 相同的對應規則
function targetFor(id) {
  let m;
  if (/^(cld-sample|main-sample|samples\/|system\/)/.test(id)) return null;
  if (/^images\/(articles|authors|covers|topics|system)\//.test(id)) return null;
  if (/^submissions\//.test(id) || /^magazines\//.test(id)) return null;
  if ((m = id.match(/^issue(\d+)_(\d+)-(\d+)$/))) return `images/articles/issue-${m[1]}/${m[1]}-${m[2]}-${m[3]}`;
  if (/^author_\d+$/.test(id)) return `images/authors/${id}`;
  if ((m = id.match(/^authors\/(.+)$/))) return `images/authors/${m[1]}`;
  if (/^cover(-\d+)?$/.test(id)) return `images/covers/${id}`;
  if ((m = id.match(/^covers\/(.+)$/))) return `images/covers/${m[1]}`;
  if (/^topic(-\d+)?$/.test(id)) return `images/topics/${id}`;
  return null;
}

const URL_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/)?(.+?)(\.[A-Za-z0-9]+)?$/;
// 回傳改寫後的 URL，或 null（不需改）
function remap(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(URL_RE);
  if (!m) return null;
  // 清掉結尾的空白／%20（修正像 issue5_11-1%20 這種壞命名）
  let pid = decodeURIComponent(m[3]).replace(/\s+$/, "");
  const ext = m[4] || "";
  const tgt = targetFor(pid);
  if (!tgt) return null;
  return m[1] + tgt + ext; // versionless
}

(async () => {
  console.log(EXECUTE ? "*** EXECUTE ***" : "--- DRY RUN ---");
  const { data: arts } = await sb.from("articles").select("id,seo").not("seo", "is", null);
  let changed = 0;
  const samples = [];
  for (const a of arts) {
    const seo = a.seo;
    if (!seo || typeof seo !== "object") continue;
    let dirty = false;
    const ni = remap(seo.image);
    if (ni && ni !== seo.image) { seo.image = ni; dirty = true; }
    if (seo.og && typeof seo.og === "object") {
      const no = remap(seo.og.image);
      if (no && no !== seo.og.image) { seo.og.image = no; dirty = true; }
    }
    if (dirty) {
      changed++;
      if (samples.length < 6) samples.push(`${a.id} -> ${(seo.image || seo.og.image).split("/upload/")[1]}`);
      if (EXECUTE) {
        const { error } = await sb.from("articles").update({ seo }).eq("id", a.id);
        if (error) console.log("  ERR", a.id, error.message);
      }
    }
  }
  console.log("將改寫 seo 圖的文章數:", changed);
  samples.forEach((s) => console.log("  " + s));
  if (!EXECUTE) console.log("\n（dry-run，加 --execute 執行）");
  else console.log("完成。");
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
