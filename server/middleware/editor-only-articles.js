import { serverSupabaseUser } from "#supabase/server";
import { isEditorOnlyArticle } from "../../utils/directOnlyArticles.js";

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const match = url.pathname.match(/^\/articles\/([^/]+)\/?$/);
  if (!match) return;

  let articleId = match[1];
  try {
    articleId = decodeURIComponent(articleId);
  } catch {
    return;
  }

  if (articleId === "10-8無境界者2026年度演講會公告") {
    return sendRedirect(
      event,
      `/articles/${encodeURIComponent("無境界者2026年度演講會公告")}`,
      301,
    );
  }

  if (!isEditorOnlyArticle(articleId)) return;

  setHeader(event, "cache-control", "private, no-store, max-age=0");
  setHeader(event, "pragma", "no-cache");
  setHeader(event, "vary", "Cookie");
  setHeader(
    event,
    "x-robots-tag",
    "noindex, nofollow, noarchive, nosnippet",
  );

  let user = null;
  try {
    user = await serverSupabaseUser(event);
  } catch {
    user = null;
  }

  if (!user) {
    const redirect = `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`;
    return sendRedirect(event, redirect, 302);
  }
});
