// 清除 pong-archive 的 server session cookie（與前端 localStorage 登出同步呼叫）
export default defineEventHandler(async (event) => {
  const session = await getPongSession(event)
  await session.clear()
  return { ok: true }
})
