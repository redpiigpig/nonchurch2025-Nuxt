// server/utils/requireAuth.js
// 管理型 API 的身分驗證。
// 本站 Supabase Auth 沒有公開註冊入口（帳號皆手動建立給編輯/校對者），
// 因此「已登入的 Supabase 使用者」即視為工作人員。
import { serverSupabaseUser } from "#supabase/server";

export async function requireAdminUser(event) {
  let user = null;
  try {
    user = await serverSupabaseUser(event);
  } catch {
    user = null;
  }
  if (!user) {
    throw createError({ statusCode: 401, message: "請先登入" });
  }
  return user;
}
