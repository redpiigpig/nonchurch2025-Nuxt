// batch_update_db.cjs — 把所有 2013 校對稿寫回 pong_sermons
'use strict';
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SERMON_UPDATES = [
  // Sermon 1: Already in DB, but include for completeness
  { id: 20130113, file: 'proofread_2013_01.txt' },
  // Sermon 2 onwards
  { id: 20130120, file: 'proofread_2013_02.txt' },
  { id: 20130127, file: 'proofread_2013_03.txt' },
  { id: 20130203, file: 'proofread_2013_04.txt' },
  { id: 20130210, file: 'proofread_2013_05.txt' },
  { id: 20130217, file: 'proofread_2013_06.txt' },
  { id: 20130303, file: 'proofread_2013_07.txt' },
  { id: 20130317, file: 'proofread_2013_08.txt' },
  { id: 20130329, file: 'proofread_2013_09.txt' },
  { id: 20130331, file: 'proofread_2013_10.txt' },
  { id: 20130407, file: 'proofread_2013_11.txt' },
  { id: 20130414, file: 'proofread_2013_12.txt' },
  { id: 20130505, file: 'proofread_2013_13.txt' },
  { id: 20130512, file: 'proofread_2013_14.txt' },
  { id: 20130602, file: 'proofread_2013_15.txt' },
  { id: 20130609, file: 'proofread_2013_16.txt' },
  { id: 20130616, file: 'proofread_2013_17.txt' },
  { id: 20130714, file: 'proofread_2013_18.txt' },
  { id: 20130721, file: 'proofread_2013_19.txt' },
  { id: 20130804, file: 'proofread_2013_20.txt' },
  { id: 20130811, file: 'proofread_2013_21.txt' },
  { id: 20130901, file: 'proofread_2013_22.txt' },
  { id: 20130908, file: 'proofread_2013_23.txt' },
  { id: 20130915, file: 'proofread_2013_24.txt' },
  { id: 20130922, file: 'proofread_2013_25.txt' },
  { id: 20130929, file: 'proofread_2013_26.txt' },
  { id: 20131006, file: 'proofread_2013_27.txt' },
  { id: 20131013, file: 'proofread_2013_28.txt' },
  { id: 20131124, file: 'proofread_2013_29.txt' },
  { id: 20131201, file: 'proofread_2013_30.txt' },
  { id: 20131215, file: 'proofread_2013_31.txt' },
  { id: 20131229, file: 'proofread_2013_32.txt' }
];

async function main() {
  const client = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: 5432,
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let updated = 0;
  let errors = 0;

  for (const { id, file } of SERMON_UPDATES) {
    try {
      const filepath = path.join(__dirname, file);
      if (!fs.existsSync(filepath)) {
        console.log(`⚠ Missing file: ${file}`);
        errors++;
        continue;
      }

      const content = fs.readFileSync(filepath, 'utf8');
      await client.query('UPDATE pong_sermons SET content=$1 WHERE id=$2', [content, id]);
      
      const res = await client.query('SELECT length(content) AS len FROM pong_sermons WHERE id=$1', [id]);
      console.log(`✓ id=${id} ${file}: ${res.rows[0].len} chars updated`);
      updated++;
    } catch(e) {
      console.log(`✗ Error id=${id}: ${e.message}`);
      errors++;
    }
  }

  await client.end();
  console.log(`\n完成！更新${updated}筆，錯誤${errors}筆`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
