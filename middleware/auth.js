// middleware/auth.js
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const supabase = useSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && to.path.startsWith("/admin")) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
