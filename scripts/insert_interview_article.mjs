// 人物專訪文章 UPSERT 到 Supabase articles 表（REST 版，走 service key，不需 IPv6 直連 DB）
//
// 用法：node scripts/insert_interview_article.mjs scripts/_iv_9-6.json
//
// 配合 .claude/skills/interview-article/SKILL.md
// is_published 預設 false；資料以 id 為主鍵 UPSERT

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((l) => !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
    }),
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const REQUIRED = ["id", "title", "subtitle", "issue", "author", "author_display", "keyword", "summary", "remark", "content"];

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("用法: node scripts/insert_interview_article.mjs <article.json>");
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

for (const k of REQUIRED) {
  if (data[k] === undefined || data[k] === null || data[k] === "") {
    console.error(`缺少必填欄位：${k}`);
    process.exit(1);
  }
}

const row = {
  id: data.id,
  title: data.title,
  subtitle: data.subtitle,
  issue: data.issue,
  category: "人物專訪",
  section: "特稿專區",
  author: data.author,
  author_display: data.author_display,
  keyword: data.keyword,
  summary: data.summary,
  remark: data.remark,
  content: data.content,
  footnotes: Array.isArray(data.footnotes) ? data.footnotes : [],
  article_type: "regular",
  type: "text",
  is_published: !!data.is_published,
  sort_order: data.sort_order ?? null,
  linked_author_ids: [],
  media_data: {},
  updated_at: new Date().toISOString(),
};

const { data: upserted, error } = await supabase
  .from("articles")
  .upsert(row, { onConflict: "id" })
  .select("id, title, subtitle, issue, category, section, is_published, sort_order, updated_at");

if (error) {
  console.error("UPSERT 失敗:", error);
  process.exit(1);
}

const len = data.content.length;
const fnN = (data.footnotes || []).length;
console.log("✓ 已寫入：", upserted[0]);
console.log(`  content 長度: ${len} chars, footnotes: ${fnN} 條`);
