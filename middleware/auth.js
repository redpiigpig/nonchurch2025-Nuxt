import { supabase } from "~/supabase";

export default defineNuxtRouteMiddleware(async (to, from) => {
  if (import.meta.server) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && to.path.startsWith("/admin")) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
