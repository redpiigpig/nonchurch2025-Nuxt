import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  )
  const { data, error } = await supabase
    .from('pong_writings')
    .select('id, title, title_en, category, publication, published_date, date_approximate, source_url, cloudinary_urls, tags, content, pages_r2_key, total_pages')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
  if (error) throw createError({ statusCode: 500, message: error.message })

  // Trim the payload: never ship full article bodies to the list view — just a
  // short preview + a flag for how each item is read (inline text vs PDF flipbook).
  return (data || []).map((w) => {
    const text = (w.content || '').replace(/\s+/g, ' ').trim()
    const isFlipbook = w.category === 'thesis' && Boolean(w.pages_r2_key)
    const { content, pages_r2_key, ...rest } = w
    return {
      ...rest,
      excerpt: text ? text.slice(0, 72) : '',
      has_text: text.length > 20,
      is_flipbook: isFlipbook,
      total_pages: isFlipbook ? (w.total_pages || 0) : null,
    }
  })
})
