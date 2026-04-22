// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },

  // 樣式設定
  css: ["~/assets/main.css", "~/assets/article.css", "~/assets/shared.css"],

  // 1. 設定環境變數 (給手動寫的 supabase.js 以及後端 API 用)
  runtimeConfig: {
    // server-only（不會暴露到前端 bundle）
    geminiApiKey: process.env.VITE_GEMINI_API_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    gmailUser: process.env.GMAIL_USER,
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
    siteUrl: process.env.SITE_URL || "https://nonchurch2025.com",

    // 👇 新增：Cloudinary 後端 API 專用環境變數
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
    wordExportMode:
      process.env.WORD_EXPORT_MODE ||
      (process.env.NODE_ENV === "production" ? "disabled" : "local_python"),
    wordExportServiceUrl: process.env.WORD_EXPORT_SERVICE_URL,
    wordExportServiceToken: process.env.WORD_EXPORT_SERVICE_TOKEN,
    wordExportArticlePath:
      process.env.WORD_EXPORT_ARTICLE_PATH || "/export/article",
    wordExportIssuePath:
      process.env.WORD_EXPORT_ISSUE_PATH || "/export/issue",

    public: {
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseKey: process.env.VITE_SUPABASE_KEY,
    },
  },

  // 2. 註冊模組
  modules: ["@nuxtjs/supabase", "@pinia/nuxt"],

  // 3. 設定 Supabase 模組 (關鍵修正！)
  supabase: {
    redirect: false,
    // 明確告訴模組變數在哪裡，因為我們改名了
    url: process.env.VITE_SUPABASE_URL,
    key: process.env.VITE_SUPABASE_KEY,
  },
});
