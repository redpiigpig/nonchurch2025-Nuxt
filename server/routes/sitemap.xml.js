// server/routes/sitemap.xml.js
// 動態 sitemap：固定頁 + 已發布文章 + 作者頁。快取 1 小時避免每次爬蟲都打 DB。
import { createClient } from "@supabase/supabase-js";

const STATIC_PATHS = [
  "/",
  "/articles",
  "/authors",
  "/submit",
  "/submission",
  "/subscribe",
  "/subscribe-print",
  "/about",
  "/mission",
  "/publication",
  "/search",
];

let cache = { xml: null, at: 0 };
const CACHE_MS = 60 * 60 * 1000;

const escapeXml = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export default defineEventHandler(async (event) => {
  setHeader(event, "content-type", "application/xml; charset=utf-8");

  if (cache.xml && Date.now() - cache.at < CACHE_MS) return cache.xml;

  const config = useRuntimeConfig();
  const base = (config.public.siteUrl || "https://nonchurch2025.com").replace(/\/+$/, "");

  const urls = STATIC_PATHS.map((p) => ({ loc: `${base}${p}` }));

  try {
    const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceKey);

    const [{ data: articles }, { data: authors }] = await Promise.all([
      supabase
        .from("articles")
        .select("id, updated_at")
        .eq("is_published", true),
      supabase.from("authors").select("name").eq("is_published", true),
    ]);

    for (const a of articles || []) {
      urls.push({
        loc: `${base}/articles/${encodeURIComponent(a.id)}`,
        lastmod: a.updated_at ? a.updated_at.slice(0, 10) : null,
      });
    }
    for (const au of authors || []) {
      if (au.name) urls.push({ loc: `${base}/authors/${encodeURIComponent(au.name)}` });
    }
  } catch {
    // DB 失敗時仍回傳靜態頁 sitemap，不要 500
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
  )
  .join("\n")}
</urlset>`;

  cache = { xml, at: Date.now() };
  return xml;
});
