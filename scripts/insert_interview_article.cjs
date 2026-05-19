// 人物專訪文章 INSERT/UPSERT 到 Supabase articles 表
// 配合 .claude/skills/interview-article/SKILL.md
//
// 用法：先建一個 JSON 描述檔（例如 scripts/_iv_8-5.json），格式：
//   {
//     "id": "8-5訪談標題",
//     "title": "訪談主標題",
//     "subtitle": "專訪XXX",
//     "issue": 8,
//     "author": "受訪者：XXX<br>訪問者：張辰瑋",
//     "author_display": "XXX",
//     "keyword": "🌿關鍵字：A、B、C、D、E",
//     "summary": "...",
//     "remark": "訪問時間：YYYY年MM月DD日HH:MM-HH:MM<br>訪問地點：XXX",
//     "content": "<h3>訪談簡介</h3>...",
//     "footnotes": [{"id":"1","text":"...","refId":"ref-1"}],
//     "sort_order": 5
//   }
// 然後：
//   node scripts/insert_interview_article.cjs scripts/_iv_8-5.json
//
// 寫完會 SELECT 驗證，不會自動發布（is_published=false）。

require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

const REQUIRED = [
  'id', 'title', 'subtitle', 'issue', 'author', 'author_display',
  'keyword', 'summary', 'remark', 'content',
];

(async () => {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('用法: node scripts/insert_interview_article.cjs <article.json>');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  for (const k of REQUIRED) {
    if (data[k] === undefined || data[k] === null || data[k] === '') {
      console.error(`缺少必填欄位：${k}`);
      process.exit(1);
    }
  }
  const footnotes = Array.isArray(data.footnotes) ? data.footnotes : [];
  const sortOrder = data.sort_order ?? null;
  const isPublished = !!data.is_published; // 預設 false

  const client = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: 5432,
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  await client.query(
    `INSERT INTO articles (
       id, title, subtitle, issue, category, section, author, author_display,
       keyword, summary, remark, content, footnotes,
       article_type, type, is_published, sort_order, linked_author_ids, media_data
     ) VALUES (
       $1, $2, $3, $4, '人物專訪', '特稿專區', $5, $6,
       $7, $8, $9, $10, $11::jsonb,
       'regular', 'text', $12, $13, '[]'::jsonb, '{}'::jsonb
     )
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       subtitle = EXCLUDED.subtitle,
       issue = EXCLUDED.issue,
       category = EXCLUDED.category,
       section = EXCLUDED.section,
       author = EXCLUDED.author,
       author_display = EXCLUDED.author_display,
       keyword = EXCLUDED.keyword,
       summary = EXCLUDED.summary,
       remark = EXCLUDED.remark,
       content = EXCLUDED.content,
       footnotes = EXCLUDED.footnotes,
       sort_order = EXCLUDED.sort_order,
       updated_at = now();`,
    [
      data.id, data.title, data.subtitle, data.issue,
      data.author, data.author_display,
      data.keyword, data.summary, data.remark,
      data.content, JSON.stringify(footnotes),
      isPublished, sortOrder,
    ]
  );

  const { rows } = await client.query(
    `SELECT id, title, subtitle, issue, category, section,
            length(content) AS content_len,
            jsonb_array_length(footnotes) AS footnotes_n,
            is_published, sort_order, updated_at
     FROM articles WHERE id = $1`,
    [data.id]
  );
  console.log('✓ 已寫入 Supabase：');
  console.table(rows);

  await client.end();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
