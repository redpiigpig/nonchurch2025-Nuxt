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
    id: 20160501,
    title: '羔羊的寶座：門徒生命與真正的平安',
    sermon_date: '2016-05-01',
    church_year: 2015,
    liturgical_season: '復活期第六主日',
    scripture_ref: '使徒行傳16:9-15；啟示錄21:10,22-22:5；約翰福音14:23-29',
  },
  {
    id: 20160508,
    title: '基督升天：信仰遠景與四個記號',
    sermon_date: '2016-05-08',
    church_year: 2015,
    liturgical_season: '基督升天主日',
    scripture_ref: '使徒行傳1:1-11；以弗所書1:15-23；路加福音24:44-53',
  },
  {
    id: 20160515,
    title: '聖靈降臨：教會誕生與信仰的熱情',
    sermon_date: '2016-05-15',
    church_year: 2015,
    liturgical_season: '聖靈降臨節',
    scripture_ref: '使徒行傳2:1-21；羅馬書8:14-17；約翰福音14:8-17,25-27',
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
    'SELECT id, title FROM pong_sermons WHERE id BETWEEN 20160501 AND 20160515 ORDER BY id'
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
