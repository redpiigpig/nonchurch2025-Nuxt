// 重新產生 /public 下的 favicon 系列實檔（給 Google 搜尋用）。
// 來源：Cloudinary web_Logo.png，先 e_trim 切邊，再 c_fit 縮到 90% 留白後 c_pad 補成正方。
// 用法：node scripts/regenerate_favicon.cjs

const fs = require("fs");
const path = require("path");
const pngToIco = require("png-to-ico").default;

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const SOURCE = "v1774248992/web_Logo.png";
const BASE = "https://res.cloudinary.com/nonchurch2025/image/upload";

// 切邊 → 縮到目標尺寸的 90%（留 5% 邊框） → 補正方
function buildUrl(size) {
  const inner = Math.round(size * 0.9);
  return `${BASE}/e_trim/c_fit,w_${inner},h_${inner}/c_pad,w_${size},h_${size},b_transparent/${SOURCE}`;
}

const targets = [
  { name: "favicon-512.png", size: 512 },
  { name: "favicon-192.png", size: 192 },
  { name: "apple-touch-icon.png", size: 180 },
];

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  console.log(`  → ${path.relative(process.cwd(), dest)} (${buf.length} bytes)`);
}

(async () => {
  console.log("Downloading trimmed PNGs from Cloudinary...");
  for (const { name, size } of targets) {
    await download(buildUrl(size), path.join(PUBLIC_DIR, name));
  }

  console.log("Downloading 48px PNG for ICO conversion...");
  const tmp48 = path.join(PUBLIC_DIR, "_favicon_48_tmp.png");
  await download(buildUrl(48), tmp48);

  console.log("Converting 48px PNG → favicon.ico...");
  const icoBuf = await pngToIco([tmp48]);
  const icoPath = path.join(PUBLIC_DIR, "favicon.ico");
  fs.writeFileSync(icoPath, icoBuf);
  console.log(`  → ${path.relative(process.cwd(), icoPath)} (${icoBuf.length} bytes)`);

  fs.unlinkSync(tmp48);
  console.log("Done.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
