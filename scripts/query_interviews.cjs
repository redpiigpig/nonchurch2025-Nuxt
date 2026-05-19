// 一次性查詢腳本：撈出所有人物訪談文章供分析格式用
// 用法：node scripts/query_interviews.cjs
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: 5432,
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // 先看哪些 category / section 可能對應「人物訪談」
  const cats = await client.query(`
    SELECT category, section, COUNT(*) AS n
    FROM articles
    WHERE category ILIKE '%訪%' OR section ILIKE '%訪%'
       OR category ILIKE '%人物%' OR section ILIKE '%人物%'
       OR category ILIKE '%對談%' OR section ILIKE '%對談%'
    GROUP BY category, section
    ORDER BY n DESC;
  `);
  console.log('=== 可能的人物訪談分類 ===');
  console.table(cats.rows);

  // 列出所有「人物訪談」相關文章基本資訊
  const list = await client.query(`
    SELECT id, issue, title, subtitle, category, section, author, author_display,
           length(content) AS content_len,
           jsonb_array_length(COALESCE(footnotes, '[]'::jsonb)) AS footnotes_n
    FROM articles
    WHERE category ILIKE '%訪%' OR section ILIKE '%訪%'
       OR category ILIKE '%人物%' OR section ILIKE '%人物%'
    ORDER BY issue, sort_order, id;
  `);
  console.log('\n=== 所有人物訪談文章 ===');
  console.table(list.rows);

  // 把每篇完整內容輸出到檔案供 Claude 分析
  const full = await client.query(`
    SELECT id, issue, title, subtitle, category, section, author, author_display,
           author_title, keyword, summary, remark, content, footnotes
    FROM articles
    WHERE category ILIKE '%訪%' OR section ILIKE '%訪%'
       OR category ILIKE '%人物%' OR section ILIKE '%人物%'
    ORDER BY issue, sort_order, id;
  `);

  const fs = require('fs');
  fs.writeFileSync(
    'scripts/_interview_dump.json',
    JSON.stringify(full.rows, null, 2),
    'utf8'
  );
  console.log(`\n=== 已輸出 ${full.rows.length} 篇到 scripts/_interview_dump.json ===`);

  await client.end();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
