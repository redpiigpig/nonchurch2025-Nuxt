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
    id: 20160619,
    title: '心靈的聖殿：面對挑戰的內在力量',
    sermon_date: '2016-06-19',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第五主日',
    scripture_ref: '列王紀上19:1-15a；加拉太書3:23-29；路加福音8:26-39',
  },
  {
    id: 20160626,
    title: '基督徒的自由：萬人之王與萬人之僕',
    sermon_date: '2016-06-26',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第六主日',
    scripture_ref: '列王紀上19:15-16,19-21；加拉太書5:1,13-25；路加福音9:51-62',
  },
  {
    id: 20160703,
    title: '基督的律法：彼此互相承擔',
    sermon_date: '2016-07-03',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第七主日',
    scripture_ref: '列王紀下5:1-14；加拉太書6:7-16；路加福音10:1-11,16-20',
  },
  {
    id: 20160724,
    title: '主禱文：門徒生命的基礎',
    sermon_date: '2016-07-24',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第十主日',
    scripture_ref: '何西阿書1:2-10；歌羅西書2:6-15；路加福音11:1-13',
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
    'SELECT id, title FROM pong_sermons WHERE id BETWEEN 20160619 AND 20160724 ORDER BY id'
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
