import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env') })

const { Pool } = pg
const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST,
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME,
  port: 5432,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    await client.query(`
      ALTER TABLE pong_sermons
        ADD COLUMN IF NOT EXISTS preacher          TEXT,
        ADD COLUMN IF NOT EXISTS worship_leader    TEXT,
        ADD COLUMN IF NOT EXISTS worship_team      TEXT,
        ADD COLUMN IF NOT EXISTS scripture_readings JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS worship_songs     JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS description       TEXT;
    `)
    console.log('✅ pong_sermons columns added')
  } catch (err) {
    console.error('❌', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
