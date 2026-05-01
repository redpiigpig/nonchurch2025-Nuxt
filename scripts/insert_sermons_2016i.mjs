import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host:     'db.pottupypvdzamztdhsah.supabase.co',
  port:     5432,
  user:     'postgres',
  password: '',
  database: 'postgres',
  ssl:      { rejectUnauthorized: false }
});

function readSermon(date) {
  const p = `C:/Users/user/AppData/Local/Temp/sermons/${date}_v2.txt`;
  return fs.readFileSync(p, 'utf8')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

const sermons = [
  {
    id: 20160110,
    title: '基督受洗：逾越的生命與委身的群體',
    sermon_date: '2016-01-10',
    church_year: 2015,
    liturgical_season: '顯現節後第一主日',
    scripture_ref: '以賽亞書43:1-7；使徒行傳8:14-17；路加福音3:15-17,21-22',
  },
  {
    id: 20160207,
    title: '登山變像：從光的循環到真實的道成肉身',
    sermon_date: '2016-02-07',
    church_year: 2015,
    liturgical_season: '登山變像主日',
    scripture_ref: '出埃及記34:29-35；哥林多後書3:12-4:2；路加福音9:28-36',
  },
  {
    id: 20160214,
    title: '大齋期：試探、捨己與十字架的道路',
    sermon_date: '2016-02-14',
    church_year: 2015,
    liturgical_season: '大齋期第一主日',
    scripture_ref: '申命記26:1-11；羅馬書10:8b-13；路加福音4:1-13',
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
    'SELECT id, title FROM pong_sermons WHERE id IN (20160110, 20160207, 20160214) ORDER BY id'
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
