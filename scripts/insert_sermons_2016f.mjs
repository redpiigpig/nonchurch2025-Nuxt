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
    id: 20160605,
    title: '寡婦的盼望：真正的依靠與生命的任務',
    sermon_date: '2016-06-05',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第三主日',
    scripture_ref: '列王紀上17:8-24；加拉太書1:11-24；路加福音7:11-17',
  },
  {
    id: 20160612,
    title: '稱義的人：在不義的社會中體現信仰',
    sermon_date: '2016-06-12',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第四主日',
    scripture_ref: '列王紀上21:1-21a；加拉太書2:15-21；路加福音7:36-8:3',
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
    'SELECT id, title FROM pong_sermons WHERE id BETWEEN 20160605 AND 20160612 ORDER BY id'
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
