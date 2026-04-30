import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const raw = fs.readFileSync(path.join(__dirname, '..', 'stores', 'pong_talk_audio.txt'), 'utf8');

// 修正 Whisper 辨識錯誤的專有名詞
const transcript = raw
  .replace(/龐俊華/g, '龐君華')
  .replace(/龐尊華/g, '龐君華')
  .replace(/慰禮公會|威力公會|為理公會|衛禮公會|為理工會/g, '衛理公會')
  .replace(/威神|慰神/g, '衛理神學院')
  .replace(/衛理中的教會|城中教會|幕會/g, '台北城中衛理公會')
  .replace(/母子生涯/g, '牧者生涯')
  .replace(/不養/g, '牧養')
  .replace(/不禱/g, '牧養')
  .replace(/如雲/g, '盧雲')
  .replace(/海瑞納文/g, 'Henri Nouwen')
  .replace(/傑伯倫/g, '紀伯倫（Kahlil Gibran）')
  .trim();

const client = new Client({
  host:     'db.pottupypvdzamztdhsah.supabase.co',
  port:     5432,
  user:     'postgres',
  password: '',
  database: 'postgres',
  ssl:      { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  const res = await client.query(`
    INSERT INTO pong_media (
      title, source, program_name, interviewer,
      media_type, platform,
      broadcast_date, transcript, description,
      is_published, sort_order
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6,
      $7, $8, $9,
      $10, $11
    )
    RETURNING id
  `, [
    '從新修道主義來看我們的服事',
    '校園福音團契',
    '校園福音團契演講',
    '左心泰牧師',
    'talk',
    'other',
    '2024-03-05',
    transcript,
    '龐君華會督受邀於校園福音團契（公館校園福音大樓）分享，以新修道主義為視角，回顧其靈性探索歷程，探討生命、生活、服事的內在連結，以及心靈習慣的塑造。',
    false,
    null
  ]);

  const id = res.rows[0].id;
  console.log(`✅ 已新增 pong_media，id = ${id}`);

  // 將 id 存檔以備後續操作
  fs.writeFileSync(path.join(__dirname, '..', 'stores', 'pong_talk_media_id.txt'), String(id));

  await client.end();
}

main().catch(async e => {
  console.error('❌', e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
