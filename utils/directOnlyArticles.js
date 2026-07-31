// Articles in this list keep their direct URL and database row, but public
// discovery surfaces must not link to them. Editors retain their normal links.
export const DIRECT_ONLY_ARTICLE_IDS = new Set(["9-15我的循道宗史"]);

export const isDirectOnlyArticle = (articleId) =>
  DIRECT_ONLY_ARTICLE_IDS.has(String(articleId || ""));
