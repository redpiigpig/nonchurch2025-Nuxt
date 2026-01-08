// ~/supabase.js
import { createClient } from "@supabase/supabase-js";

// ✅ 改用 import.meta.env 直接讀取 (這是最穩定不報錯的寫法)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// 防呆檢查
if (!supabaseUrl || !supabaseKey) {
  console.error(
    "❌ 無法讀取 Supabase 設定，請檢查 .env 變數是否已加上 VITE_ 前綴"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
