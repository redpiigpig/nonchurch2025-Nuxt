/**
 * 一次性腳本：
 *  - 用 utils/metaTemplates.js 強制覆寫每期 submission_info / editorial_info 的 title 與 content
 *  - 缺少這三篇 meta (toc / submission_info / editorial_info) 的期次自動補建
 *  - toc 的 content 維持 null（動態生成）
 *
 * 使用：
 *   node scripts/seed_meta_articles.mjs              # 預覽：列出將要做的事，不實際寫入
 *   node scripts/seed_meta_articles.mjs --apply      # 真正寫入
 */

import "dotenv/config";
import pg from "pg";
import { buildSubmissionInfoHtml, buildEditorialInfoHtml } from "../utils/metaTemplates.js";
import { getPeriodByIssue } from "../stores/finance_data.js";

const APPLY = process.argv.includes("--apply");

const META_TYPES = ["toc", "submission_info", "editorial_info"];

const tag = (s) => (APPLY ? s : `[DRY] ${s}`);

async function main() {
  const c = new pg.Client({
    host: process.env.SUPABASE_DB_HOST,
    port: 5432,
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const issuesRes = await c.query(
    "SELECT id, title, date, cfp_title, cfp_theme, cfp_deadline, cfp_image FROM issues ORDER BY id",
  );
  const issues = issuesRes.rows;

  for (const issue of issues) {
    console.log(`\n===== Issue ${issue.id} 《${issue.title}》 =====`);

    const metaRes = await c.query(
      "SELECT id, article_type, content FROM articles WHERE issue=$1 AND article_type=ANY($2)",
      [issue.id, META_TYPES],
    );
    const existing = Object.fromEntries(metaRes.rows.map((r) => [r.article_type, r]));

    // 1) 補建缺少的 row
    const missing = META_TYPES.filter((t) => !existing[t]);
    if (missing.length) {
      console.log(`  缺少 meta：${missing.join(", ")}`);
      const inserts = [];
      if (missing.includes("toc")) {
        inserts.push({
          id: `${issue.id}-0目次`,
          issue: issue.id,
          title: "目次",
          section: "主題介紹",
          sort_order: 0,
          article_type: "toc",
          content: null,
        });
      }
      if (missing.includes("submission_info")) {
        inserts.push({
          id: `${issue.id}-19投稿資訊`,
          issue: issue.id,
          title: "投稿資訊",
          section: "編輯資訊",
          sort_order: 19,
          article_type: "submission_info",
          content: buildSubmissionInfoHtml(issue),
        });
      }
      if (missing.includes("editorial_info")) {
        inserts.push({
          id: `${issue.id}-20編輯資訊`,
          issue: issue.id,
          title: "編輯資訊",
          section: "編輯資訊",
          sort_order: 20,
          article_type: "editorial_info",
          content: buildEditorialInfoHtml(issue, getPeriodByIssue(issue.id)),
        });
      }
      for (const r of inserts) {
        if (APPLY) {
          await c.query(
            `INSERT INTO articles (id, issue, title, section, sort_order, article_type, content, is_published)
             VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
            [r.id, r.issue, r.title, r.section, r.sort_order, r.article_type, r.content],
          );
        }
        console.log(tag(`  + INSERT ${r.id} (${r.article_type})`));
      }
    }

    // 2) 強制覆寫已存在 row 的 title 與 content（toc 不動，因為動態生成）
    if (existing.submission_info) {
      const html = buildSubmissionInfoHtml(issue);
      if (APPLY) {
        await c.query(
          "UPDATE articles SET title=$1, content=$2, updated_at=now() WHERE id=$3",
          ["投稿資訊", html, existing.submission_info.id],
        );
      }
      console.log(tag(`  ~ UPDATE ${existing.submission_info.id} title="投稿資訊" content (${html.length} chars)`));
    }
    if (existing.editorial_info) {
      const html = buildEditorialInfoHtml(issue, getPeriodByIssue(issue.id));
      if (APPLY) {
        await c.query(
          "UPDATE articles SET title=$1, content=$2, updated_at=now() WHERE id=$3",
          ["編輯資訊", html, existing.editorial_info.id],
        );
      }
      console.log(tag(`  ~ UPDATE ${existing.editorial_info.id} title="編輯資訊" content (${html.length} chars)`));
    }
  }

  await c.end();
  console.log(APPLY ? "\n✅ 已寫入" : "\n（預覽完成，加 --apply 實際執行）");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
