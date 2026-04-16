/**
 * Migration 腳本：articles.content  markdown → HTML
 *
 * 執行方式（在專案根目錄）：
 *   node scripts/migrate_content_to_html.mjs
 *
 * 注意：
 *   - 執行前請確認 .env 內有 VITE_SUPABASE_URL / VITE_SUPABASE_KEY
 *   - 預設只做 dry-run（印出要改的 ID），確認後加 --apply 才真的寫入
 *   - [[圖片N]] 佔位符保留不動（前台 render 時再解析）
 */

import { createClient } from "@supabase/supabase-js";
import { marked } from "marked";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── 讀取 .env ──────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const envRaw = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envRaw
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const SUPABASE_URL = env["VITE_SUPABASE_URL"];
const SUPABASE_KEY = env["SUPABASE_SERVICE_KEY"] || env["VITE_SUPABASE_KEY"];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ 找不到 VITE_SUPABASE_URL 或 VITE_SUPABASE_KEY，請確認 .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const isDryRun = !process.argv.includes("--apply");

// ── markdown 轉 HTML 邏輯（與前台邏輯一致）─────────────────────────
function convertToHtml(content) {
  // 1. 把 [^N] 腳注引用轉成 <sup> 標籤
  const withRefs = content.replace(
    /\[\^(\d+)\]/g,
    (_, id) =>
      `<sup class="footnote-ref"><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`,
  );

  // 2. 跑 marked（保留 [[圖片N]] 佔位符不動，marked 不會處理它）
  return marked.parse(withRefs, { gfm: true, breaks: true });
}

// ── 主流程 ────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Migration 模式：${isDryRun ? "DRY RUN（不寫入）" : "⚠️  APPLY（實際寫入）"}\n`);

  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, content")
    .not("content", "is", null);

  if (error) {
    console.error("❌ 讀取失敗：", error.message);
    process.exit(1);
  }

  console.log(`📋 共 ${articles.length} 篇有內容的文章\n`);

  let migrateCount = 0;
  const toMigrate = [];

  for (const article of articles) {
    toMigrate.push(article);
    migrateCount++;
  }

  console.log(`🔄 全部轉換：${migrateCount} 篇\n`);

  if (toMigrate.length === 0) {
    console.log("🎉 沒有需要 migrate 的文章！");
    return;
  }

  // 列出要處理的 ID
  console.log("要處理的文章 ID：");
  toMigrate.forEach((a) => console.log(`  - ${a.id}`));

  if (isDryRun) {
    console.log("\n⚠️  這是 dry-run，未實際寫入。");
    console.log("   確認無誤後執行：node scripts/migrate_content_to_html.mjs --apply\n");
    return;
  }

  // 實際寫入
  console.log("\n⏳ 開始寫入...\n");
  let successCount = 0;
  let failCount = 0;

  for (const article of toMigrate) {
    try {
      const html = convertToHtml(article.content);
      const { error: updateError } = await supabase
        .from("articles")
        .update({ content: html, updated_at: new Date().toISOString() })
        .eq("id", article.id);

      if (updateError) throw new Error(updateError.message);
      console.log(`  ✅ ${article.id}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ ${article.id}：${err.message}`);
      failCount++;
    }
  }

  console.log(`\n🏁 完成！成功 ${successCount} 篇，失敗 ${failCount} 篇\n`);
}

main();
