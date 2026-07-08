// middleware/auth.js
// 頁面層的登入導向（真正的授權防線在 server/utils/requireAuth.js，各管理型 API 各自驗證）。
// 用 useSupabaseUser()：SSR 與 client 都會執行，未登入者在伺服器端就被導向，不會閃現後台頁。
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser();

  if (!user.value && to.path.startsWith("/admin")) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
