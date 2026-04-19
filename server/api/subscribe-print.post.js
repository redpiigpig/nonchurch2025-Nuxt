import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  const {
    email, sub_type, issues, recipient_name, address, phone, note,
    reader_name, gender, age_group, faith_background, how_found, message,
  } = body;

  if (!email || !sub_type || !recipient_name || !address || !phone || !reader_name || !gender || !age_group || !faith_background) {
    throw createError({ statusCode: 400, message: "缺少必填欄位" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw createError({ statusCode: 400, message: "Email 格式不正確" });
  }

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  );

  const { data, error } = await supabase
    .from("print_subscribers")
    .insert([{
      email: email.trim().toLowerCase(),
      sub_type,
      issues: issues || [],
      recipient_name: recipient_name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      note: note?.trim() || null,
      reader_name: reader_name.trim(),
      gender,
      age_group,
      faith_background: faith_background.trim(),
      how_found: how_found?.trim() || null,
      message: message?.trim() || null,
    }])
    .select("id")
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });
  return { success: true, id: data.id };
});
