const { Client } = require('pg');
require('dotenv').config({ path: 'C:/Users/user/Desktop/nonchurch-nuxt/.env' });

const client = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: 5432,
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  // Check columns of pong_lectionary_weeks
  const weeksCol = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'pong_lectionary_weeks'
    ORDER BY ordinal_position
  `);
  console.log('pong_lectionary_weeks columns:');
  for (const r of weeksCol.rows) console.log(`  ${r.column_name}: ${r.data_type}`);

  // Check columns of pong_lectionary_days
  const daysCol = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'pong_lectionary_days'
    ORDER BY ordinal_position
  `);
  console.log('\npong_lectionary_days columns:');
  for (const r of daysCol.rows) console.log(`  ${r.column_name}: ${r.data_type}`);

  // Sample a week row
  const sampleWeek = await client.query('SELECT * FROM pong_lectionary_weeks LIMIT 1');
  console.log('\nSample week row:', JSON.stringify(sampleWeek.rows[0], null, 2));

  // Sample a day row
  const sampleDay = await client.query('SELECT * FROM pong_lectionary_days LIMIT 1');
  console.log('\nSample day row:', JSON.stringify(sampleDay.rows[0], null, 2));

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
