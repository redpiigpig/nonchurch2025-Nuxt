import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const client = new Client({
  host:     'db.pottupypvdzamztdhsah.supabase.co',
  port:     5432,
  user:     'postgres',
  password: '',
  database: 'postgres',
  ssl:      { rejectUnauthorized: false }
});

// Read sermon content from temp files extracted from conversation log
function readSermon(date) {
  const p = `C:/Users/user/AppData/Local/Temp/sermons/${date}_v2.txt`;
  const raw = fs.readFileSync(p, 'utf8');
  // Normalize to \n
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\[Message truncated[^\]]*\]/g, '').trim();
}

const sermons = [
  {
    id: 20160918,
    title: '管家的忠心：不能事奉兩個主',
    sermon_date: '2016-09-18',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第十八主日',
    scripture_ref: '耶利米書8:18-9:1；提摩太前書2:1-7；路加福音16:1-13',
  },
  {
    id: 20160925,
    title: '財主與拉撒路：屬上帝的人',
    sermon_date: '2016-09-25',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第十九主日',
    scripture_ref: '耶利米書32:1-3a,6-15；提摩太前書6:6-19；路加福音16:19-31',
  },
  {
    id: 20161002,
    title: '無偽的信心：剛強、仁愛、謹守',
    sermon_date: '2016-10-02',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第二十主日',
    scripture_ref: '耶利米哀歌1:1-6；提摩太後書1:1-14；路加福音17:5-10',
  },
  {
    id: 20161009,
    title: '十個痲瘋病人：感恩與使命',
    sermon_date: '2016-10-09',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第二十一主日',
    scripture_ref: '耶利米書29:1,4-7；提摩太後書2:8-15；路加福音17:11-19',
  },
  {
    id: 20161016,
    title: '常常禱告，不要灰心',
    sermon_date: '2016-10-16',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第二十二主日',
    scripture_ref: '耶利米書31:27-34；提摩太後書3:14-4:5；路加福音18:1-8',
  },
  {
    id: 20161106,
    title: '哈該：不要懼怕，上帝同在',
    sermon_date: '2016-11-06',
    church_year: 2015,
    liturgical_season: '聖靈降臨後第二十五主日',
    scripture_ref: '哈該書1:15b-2:9；帖撒羅尼迦後書2:1-5,13-17；路加福音20:27-38',
  },
  {
    id: 20161120,
    title: '基督為王：沒有力量的力量',
    sermon_date: '2016-11-20',
    church_year: 2015,
    liturgical_season: '基督君王主日',
    scripture_ref: '耶利米書23:1-6；歌羅西書1:11-20；路加福音23:33-43',
  },
  {
    id: 20161204,
    title: '平安的盼望：彼此接納',
    sermon_date: '2016-12-04',
    church_year: 2016,
    liturgical_season: '將臨期第二主日',
    scripture_ref: '以賽亞書11:1-10；羅馬書15:4-13；馬太福音3:1-12',
  },
  {
    id: 20161225,
    title: '耶穌降生：一個新的開始',
    sermon_date: '2016-12-25',
    church_year: 2016,
    liturgical_season: '聖誕主日',
    scripture_ref: '以賽亞書52:7-10；希伯來書1:1-4',
  },
];

async function main() {
  await client.connect();

  let inserted = 0;
  for (const s of sermons) {
    const content = readSermon(String(s.id));

    // Check if already exists
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

    console.log(`✅ ${s.id} ${s.title}`);
    inserted++;
  }

  console.log(`\n完成，共新增 ${inserted} 筆`);

  // Verify
  const check = await client.query(
    'SELECT id, title FROM pong_sermons WHERE id BETWEEN 20160918 AND 20161225 ORDER BY id'
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
