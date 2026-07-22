import { createClient } from '@supabase/supabase-js'
import { gunzipSync } from 'node:zlib'
import { getPongR2Object } from '../../../utils/pongR2'

type ThesisBlock = {
  type?: string
  text?: string
  level?: number
  marker?: string
}

type ThesisPage = {
  page: number
  blocks: ThesisBlock[]
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const config = useRuntimeConfig()
  const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  const { data, error } = await supabase
    .from('pong_writings')
    .select('pages_r2_key, total_pages')
    .eq('id', id)
    .eq('category', 'thesis')
    .eq('is_published', true)
    .single()

  if (error || !data?.pages_r2_key) {
    throw createError({ statusCode: 404, message: '找不到論文分頁內容' })
  }

  try {
    const object = await getPongR2Object(data.pages_r2_key)
    if (!object.Body) throw new Error('empty object body')

    const source = Buffer.from(await object.Body.transformToByteArray())
    const isGzip = object.ContentEncoding === 'gzip' || (source[0] === 0x1f && source[1] === 0x8b)
    const text = (isGzip ? gunzipSync(source) : source).toString('utf8')

    const pages = text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ThesisPage)
      .filter((page) => Number.isInteger(page.page) && Array.isArray(page.blocks))
      .sort((a, b) => a.page - b.page)

    if (!pages.length) throw new Error('no valid pages')

    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=3600')
    return { pages, totalPages: data.total_pages || pages.length }
  } catch (error) {
    console.error('Unable to load thesis pages:', error instanceof Error ? error.message : 'unknown error')
    throw createError({ statusCode: 502, message: '論文分頁暫時無法載入，請稍後再試' })
  }
})
