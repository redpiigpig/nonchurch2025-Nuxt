import { createClient } from '@supabase/supabase-js'

// 每張表只開放前端編輯器實際使用的欄位，避免 mass-assignment
// （is_published、sort_order、id、created_at 等一律不可經此端點修改）
const ALLOWED_FIELDS = {
  pong_sermons: [
    'title', 'location', 'youtube_url', 'content', 'worship_songs',
    'officiant', 'preacher', 'worship_leader', 'scripture_reader',
    'song_leader', 'choir', 'worship_team',
  ],
  pong_media: [
    'source', 'source_en', 'program_name', 'program_en',
    'title', 'title_en', 'broadcast_date', 'interviewer', 'media_type',
    'youtube_id', 'description', 'transcript',
    'proofread_by', 'proofread_date', 'proofread_note',
  ],
  pong_lectionary_weeks: ['intro_letter', 'theme_essay_title', 'theme_essay', 'appendices'],
  pong_lectionary_days: ['readings'],
}

// Tables that don't have an updated_at column
const NO_TIMESTAMP = new Set(['pong_lectionary_weeks', 'pong_lectionary_days'])

export default defineEventHandler(async (event) => {
  await requirePongEditor(event)
  const { table, id, fields } = await readBody(event)

  const allowedFields = ALLOWED_FIELDS[table]
  if (!allowedFields)
    throw createError({ statusCode: 400, message: `Table not allowed: ${table}` })

  if (!id || !fields || typeof fields !== 'object' || Array.isArray(fields))
    throw createError({ statusCode: 400, message: 'Invalid params' })

  const badField = Object.keys(fields).find(f => !allowedFields.includes(f))
  if (badField)
    throw createError({ statusCode: 400, message: `Field not allowed: ${badField}` })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY),
  )

  const payload = NO_TIMESTAMP.has(table)
    ? { ...fields }
    : { ...fields, updated_at: new Date().toISOString() }

  const { error } = await supabase
    .from(table)
    .update(payload)
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { ok: true }
})
