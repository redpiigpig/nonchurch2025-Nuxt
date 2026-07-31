import { createClient } from "@supabase/supabase-js";

export const ISSUE_9_UNIT_PRICE = 350;
export const ISSUE_9_REPLY_EMAIL = "nonchurch2025@gmail.com";

export function getIssue9OrdersClient() {
  const config = useRuntimeConfig();
  if (!config.public?.supabaseUrl || !config.supabaseServiceKey) {
    throw createError({ statusCode: 500, message: "伺服器尚未設定訂單資料庫。" });
  }

  return createClient(config.public.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function escapeIssue9Html(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function validateIssue9OrderInput(body) {
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const copies = Number(body?.copies);
  const last5 = String(body?.last5 || "").trim();
  const message = String(body?.message || "").trim();
  const note = String(body?.note || "").trim();

  if (!name || !email || !Number.isInteger(copies) || copies < 1 || copies > 1000 || !/^\d{5}$/.test(last5)) {
    throw createError({ statusCode: 400, message: "請確認姓名、Email、訂購本數與帳號後五碼。" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, message: "Email 格式不正確。" });
  }
  if (name.length > 60 || email.length > 200 || message.length > 500 || note.length > 1000) {
    throw createError({ statusCode: 400, message: "填寫內容超過長度限制。" });
  }

  return {
    name,
    email,
    copies,
    last5,
    message: message || null,
    note: note || null,
  };
}
