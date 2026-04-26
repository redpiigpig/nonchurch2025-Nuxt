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

// ── 1. Remove 凡我所有向主呈獻 from ids 1-4 ──────────────────
const { rows: songsRows } = await client.query(
  `SELECT id, worship_songs FROM pong_sermons WHERE id IN (1,2,3,4)`
)
for (const row of songsRows) {
  const filtered = (row.worship_songs || []).filter(s => s !== '凡我所有向主呈獻')
  await client.query(
    `UPDATE pong_sermons SET worship_songs = $1 WHERE id = $2`,
    [JSON.stringify(filtered), row.id]
  )
  console.log(`id=${row.id} songs: ${filtered.length} remaining`)
}

// ── 2. Set YouTube URLs ───────────────────────────────────────
const updates = [
  { id: 2, url: 'https://www.youtube.com/watch?v=WP6iW2xS8nU' },
  { id: 3, url: 'https://www.youtube.com/watch?v=sVSduRPjKjo&t=1s' },
  { id: 4, url: 'https://www.youtube.com/watch?v=CjIhO1WUhjo&t=110s' },
  { id: 5, url: 'https://www.youtube.com/watch?v=sbuE3ubUaLM' },
]
for (const { id, url } of updates) {
  await client.query(`UPDATE pong_sermons SET youtube_url = $1 WHERE id = $2`, [url, id])
  console.log(`id=${id} youtube_url set`)
}

// ── verify ────────────────────────────────────────────────────
const { rows } = await client.query(
  `SELECT id, worship_songs, youtube_url FROM pong_sermons ORDER BY id`
)
rows.forEach(r => console.log(`id=${r.id} songs=${r.worship_songs?.length} yt=${r.youtube_url?.slice(32,60) || '—'}`))

await client.end()
