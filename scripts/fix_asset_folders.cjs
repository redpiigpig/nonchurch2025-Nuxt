// scripts/fix_asset_folders.cjs
// 把所有 images/ 底下圖片的 asset_folder 對齊它的 public_id 路徑（動態資料夾模式修正），
// 讓媒體庫「原始資料夾模式」的 folder= 搜尋／導覽能正確列出。
// 走 Upload API 的 explicit（不吃 Admin API 速率限制）。
//
//   node scripts/fix_asset_folders.cjs            # dry-run（只統計）
//   node scripts/fix_asset_folders.cjs --execute  # 實際修正
require("dotenv").config({ quiet: true });
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const EXECUTE = process.argv.includes("--execute");

async function listAll() {
  let all = [], next = null;
  do {
    const r = await cloudinary.api.resources({
      type: "upload", resource_type: "image",
      prefix: "images/", max_results: 500, next_cursor: next,
    });
    all = all.concat(r.resources.map((x) => ({ pid: x.public_id, af: x.asset_folder })));
    next = r.next_cursor;
  } while (next);
  return all;
}

(async () => {
  console.log(EXECUTE ? "*** EXECUTE ***" : "--- DRY RUN ---");
  const all = await listAll();
  const need = all.filter((f) => {
    const dir = f.pid.split("/").slice(0, -1).join("/");
    return f.af !== dir;
  });
  console.log(`images/ 圖片總數 ${all.length}，需修正 asset_folder ${need.length}`);
  if (!EXECUTE) { console.log("（dry-run，加 --execute 執行）"); return; }

  const CONC = 8;
  let done = 0, fail = 0;
  for (let i = 0; i < need.length; i += CONC) {
    const batch = need.slice(i, i + CONC);
    await Promise.all(batch.map(async (f) => {
      const dir = f.pid.split("/").slice(0, -1).join("/");
      try {
        await cloudinary.uploader.explicit(f.pid, { type: "upload", asset_folder: dir });
        done++;
      } catch (e) { fail++; console.log("  FAIL", f.pid, e.message); }
    }));
    if ((done + fail) % 80 === 0 || i + CONC >= need.length) console.log(`  ...${done + fail}/${need.length}`);
  }
  console.log(`完成：ok=${done} fail=${fail}`);
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
