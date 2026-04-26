import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Client } = pg
const client = new Client({
  host:     process.env.SUPABASE_DB_HOST,
  port:     5432,
  user:     process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME,
  ssl:      { rejectUnauthorized: false }
})

await client.connect()

// Append 【牧禱】 section with prayer spoken by 辛俊傑會督
const { rows } = await client.query(`SELECT content FROM pong_sermons WHERE id = 6`)
const existing = rows[0]?.content || ''

const prayerSection = `
【牧禱】
辛俊傑會督：願主以他復活的盼望安慰我們，在哀傷中賜下力量，在離別中賜下信心。願主的平安保守我們的心懷意念，使我們在今生忠心行走，直到那日在主裡再相聚。又願我主耶穌基督的恩惠，天父上帝的慈愛，聖靈的感動，常與我們眾人同在，從今時直到永遠。`

const updated = existing.trimEnd() + '\n' + prayerSection.trimStart()

await client.query(`UPDATE pong_sermons SET content = $1 WHERE id = 6`, [updated])

const { rows: verify } = await client.query(
  `SELECT LENGTH(content) AS len, RIGHT(content, 60) AS tail FROM pong_sermons WHERE id = 6`
)
console.log('Updated. Content length:', verify[0].len)
console.log('Tail:', verify[0].tail)

await client.end()
