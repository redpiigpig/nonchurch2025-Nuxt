// server/api/submission-lookup.post.js
// 根據姓名 + email 查詢作者自己的投稿記錄（使用 service role key 繞過 RLS）
import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  );

  const { name, email, id } = await readBody(event);

  // 模式一：根據 id + email 取得單筆完整資料（用於載入修改表單）
  if (id) {
    if (!email) throw createError({ statusCode: 400, message: "缺少 email" });
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", id)
      .eq("email", email.trim())
      .single();
    if (error || !data)
      throw createError({ statusCode: 404, message: "找不到投稿或 email 不符" });
    return { success: true, data };
  }

  // 模式二：根據姓名 + email 查詢投稿列表
  if (!name || !email)
    throw createError({ statusCode: 400, message: "請填寫姓名與 Email" });

  const { data: all, error } = await supabase
    .from("submissions")
    .select("id, title, category, status, created_at, issue_number, real_name, display_name")
    .eq("email", email.trim())
    .order("created_at", { ascending: false });

  if (error) throw createError({ statusCode: 500, message: error.message });

  // 用名字再篩一次（真實姓名或筆名）
  const trimmed = name.trim();
  const matched = (all || []).filter(
    (s) => s.real_name === trimmed || s.display_name === trimmed
  );

  return { success: true, data: matched };
});
