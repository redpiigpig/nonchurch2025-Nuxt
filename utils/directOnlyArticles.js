// Articles in this list keep their database row but are hidden from public
// discovery and require an authenticated editor session even at the direct URL.
export const DIRECT_ONLY_ARTICLE_IDS = new Set(["9-15我的循道宗史"]);

export const isDirectOnlyArticle = (articleId) =>
  DIRECT_ONLY_ARTICLE_IDS.has(String(articleId || ""));

export const isEditorOnlyArticle = isDirectOnlyArticle;
