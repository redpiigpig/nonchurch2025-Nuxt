import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host:     process.env.SUPABASE_DB_HOST,
  port:     process.env.SUPABASE_DB_PORT || 5432,
  user:     process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  ssl:      { rejectUnauthorized: false }
});

function readSermon(date) {
  const p = `C:/Users/user/AppData/Local/Temp/sermons/${date}_v2.txt`;
  return fs.readFileSync(p, 'utf8')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

const sermons = [
  {
    id: 20160221,
    title: '大齋期的反思：典範、呼召與徹底的跟隨',
    sermon_date: '2016-02-21',
    church_year: 2015,
    liturgical_season: '大齋期第二主日',
    scripture_ref: '創世記15:1-12,17-18；腓立比書3:17-4:1；路加福音13:31-35',
  },
  {
    id: 20160417,
    title: '善牧主日：牧者的聲音與門徒的典範',
    sermon_date: '2016-04-17',
    church_year: 2015,
    liturgical_season: '復活期第四主日',
    scripture_ref: '使徒行傳9:36-43；啟示錄7:9-17；詩篇23；約翰福音10:22-30',
  },
];

async function main() {
  await client.connect();

  let inserted = 0;
  for (const s of sermons) {
    const content = readSermon(String(s.id));

    const exists = await client.query('SELECT id FROM pong_sermons WHERE id = $1', [s.id]);
    if (exists.rows.length > 0) {
      console.log(`⏭  ${s.id} 已存在，跳過`);
      continue;
    }

    await client.query(`
      INSERT INTO pong_sermons (
        id, title, sermon_date, church_year, liturgical_season,
        scripture_ref, location, preacher, content,
        has_recording, is_published, occasion
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12
      )
    `, [
      s.id, s.title, s.sermon_date, s.church_year, s.liturgical_season,
      s.scripture_ref, '台北城中衛理公會', '龐君華', content,
      false, true, '主日崇拜'
    ]);

    console.log(`✅ ${s.id} ${s.title} (${content.length} chars)`);
    inserted++;
  }

  console.log(`\n完成，共新增 ${inserted} 筆`);

  const check = await client.query(
    'SELECT id, title FROM pong_sermons WHERE id IN (20160221, 20160417) ORDER BY id'
  );
  console.log('\n驗證結果：');
  check.rows.forEach(r => console.log(`  ${r.id}  ${r.title}`));

  await client.end();
}

main().catch(async e => {
  console.error('❌', e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
