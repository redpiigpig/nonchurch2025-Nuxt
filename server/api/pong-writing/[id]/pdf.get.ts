import { createClient } from '@supabase/supabase-js'
import { getPongR2Object } from '../../../utils/pongR2'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const config = useRuntimeConfig()
  const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  const { data, error } = await supabase
    .from('pong_writings')
    .select('pdf_r2_key')
    .eq('id', id)
    .eq('category', 'thesis')
    .eq('is_published', true)
    .single()

  if (error || !data?.pdf_r2_key) {
    throw createError({ statusCode: 404, message: '找不到論文原版 PDF' })
  }

  try {
    const range = getHeader(event, 'range')
    const object = await getPongR2Object(data.pdf_r2_key, range)
    if (!object.Body) throw new Error('empty object body')

    const bytes = Buffer.from(await object.Body.transformToByteArray())
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', 'inline; filename="pong-thesis.pdf"')
    setHeader(event, 'Accept-Ranges', 'bytes')
    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=3600')
    setHeader(event, 'Content-Length', String(bytes.length))

    if (range && object.ContentRange) {
      setResponseStatus(event, 206)
      setHeader(event, 'Content-Range', object.ContentRange)
    }

    return bytes
  } catch (error) {
    // Surface a missing-config H3 error (503 "缺少 R2_xxx") verbatim rather than
    // masking it as a generic 502.
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    console.error('Unable to load thesis PDF:', error instanceof Error ? error.message : 'unknown error')
    throw createError({ statusCode: 502, message: '論文原版 PDF 暫時無法載入，請稍後再試' })
  }
})
