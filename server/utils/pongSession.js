// server/utils/pongSession.js
// pong-archive 編輯系統的 server-side session（h3 加密 cookie）。
// 登入成功時由 pong-auth/login 寫入，寫入型 pong API 據此驗證身分。
// 前端 localStorage 的 session 只負責 UI 顯示，不作為伺服器信任依據。

const SESSION_CONFIG = () => ({
  name: "pong-session",
  password:
    process.env.PONG_SESSION_SECRET || (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY),
  maxAge: 60 * 60 * 24 * 30, // 與前端 30 天一致
});

export async function getPongSession(event) {
  return await useSession(event, SESSION_CONFIG());
}

export async function requirePongEditor(event) {
  const session = await getPongSession(event);
  const data = session.data;
  if (!data || !data.email) {
    throw createError({ statusCode: 401, message: "請先登入編輯系統" });
  }
  return data;
}

export async function requirePongChief(event) {
  const data = await requirePongEditor(event);
  if (data.role !== "chief") {
    throw createError({ statusCode: 403, message: "僅限總編輯操作" });
  }
  return data;
}
