// ~/composables/useSessionGuard.js
// 偵測 Supabase 登入過期 / RLS 0-row 寫入失敗，必要時嘗試刷新 token，
// 仍失敗則跳出強制重新登入彈窗，避免「自動儲存失敗」被忽略而資料遺失。

import { ref } from "vue";

// 模組層 singleton：任何頁面觸發後，admin layout 的 ReloginModal 都會顯示
const showRelogin = ref(false);

export function useSessionGuard() {
  const supabase = useSupabaseClient();

  // 嘗試用 refresh token 換新 access token；回傳是否取得有效 session
  const tryRefreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      return !error && !!data?.session;
    } catch {
      return false;
    }
  };

  const triggerRelogin = () => {
    showRelogin.value = true;
  };

  const dismissRelogin = () => {
    showRelogin.value = false;
  };

  return { showRelogin, tryRefreshSession, triggerRelogin, dismissRelogin };
}
