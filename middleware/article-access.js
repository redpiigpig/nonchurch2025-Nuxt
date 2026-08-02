import { isEditorOnlyArticle } from "~/utils/directOnlyArticles";

export default defineNuxtRouteMiddleware((to) => {
  if (!isEditorOnlyArticle(to.params.id)) return;

  const user = useSupabaseUser();
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
