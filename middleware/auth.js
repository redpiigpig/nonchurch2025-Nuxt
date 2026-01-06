export default defineNuxtRouteMiddleware(async (to, from) => {
  const { supabase } = await import("~/supabase");
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && to.path !== "/login") {
    return navigateTo("/login");
  }
});
