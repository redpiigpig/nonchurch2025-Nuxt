// server/api/subscribe.post.js
import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  const { name, gender, age_group, faith_background, email, how_found, message } = body;

  // 必填欄位驗證
  if (!name || !gender || !age_group || !faith_background || !email) {
    throw createError({ statusCode: 400, message: "缺少必填欄位" });
  }

  // Email 格式驗證
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw createError({ statusCode: 400, message: "電子郵件格式不正確" });
  }

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  );

  // 檢查是否重複訂閱
  const { data: existing } = await supabase
    .from("subscribers")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .single();

  if (existing) {
    throw createError({ statusCode: 409, message: "此電子郵件已訂閱，感謝您的支持！" });
  }

  const { data, error } = await supabase
    .from("subscribers")
    .insert([{
      name: name.trim(),
      gender,
      age_group,
      faith_background: faith_background.trim(),
      email: email.trim().toLowerCase(),
      how_found: how_found?.trim() || null,
      message: message?.trim() || null,
    }])
    .select("id")
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });
  return { success: true, id: data.id };
});
