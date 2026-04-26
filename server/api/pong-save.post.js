import { createClient } from '@supabase/supabase-js'

const ALLOWED_TABLES = [
  'pong_media',
  'pong_sermons',
  'pong_writings',
  'pong_manuscripts',
  'pong_daily_office',
  'pong_photos',
  'pong_remembrance',
]

export default defineEventHandler(async (event) => {
  const { table, id, fields } = await readBody(event)

  if (!ALLOWED_TABLES.includes(table))
    throw createError({ statusCode: 400, message: `Table not allowed: ${table}` })

  if (!id || !fields || typeof fields !== 'object' || Array.isArray(fields))
    throw createError({ statusCode: 400, message: 'Invalid params' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  )

  const { error } = await supabase
    .from(table)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { ok: true }
})
