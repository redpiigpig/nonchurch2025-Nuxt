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
    supabaseServiceKey: (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY),
    gmailUser: process.env.GMAIL_USER,
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
    adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL || "redpiigpig@gmail.com,nonchurch2025@gmail.com",
    proofreaderNotifyEmail: process.env.PROOFREADER_NOTIFY_EMAIL || "noah110742@gmail.com",
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
    r2Endpoint: process.env.R2_ENDPOINT,
    r2AccessKey: process.env.R2_ACCESS_KEY,
    r2SecretKey: process.env.R2_SECRET_KEY,
    r2Bucket: process.env.R2_BUCKET,

    public: {
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseKey: process.env.VITE_SUPABASE_KEY,
      siteUrl: process.env.SITE_URL || "https://nonchurch2025.com",
    },
  },

  // 快取策略：公開頁用 SWR（背景再驗證），後台不快取
  nitro: {
    // compressPublicAssets 已關閉（2026-08-25）：
    // 它會在建置時對 public/ 每個檔做 gzip + brotli。當時 public/ 有 554 MB
    // （雜誌 PDF 與歷期圖片），brotli 對已壓縮的 PDF/JPG 幾乎沒效果，卻多產出
    // 275 MB、把 .output 撐到 845 MB，導致 Zeabur 建置卡住、網站 502。
    // 大檔已移出 repo（見 tree.txt / Drive 備份），public/ 只剩 favicon 等小檔，
    // 壓縮與否影響極小；靜態檔的傳輸壓縮交給 Zeabur 閘道處理。
    compressPublicAssets: false,
    routeRules: {
      // 幾乎不變的靜態內容頁：快取 1 小時
      "/about": { swr: 3600 },
      "/mission": { swr: 3600 },
      "/publication": { swr: 3600 },
      // 內容列表與文章頁：快取 5 分鐘（出刊/改稿最多延遲 5 分鐘可接受）
      "/": { swr: 300 },
      "/events": { swr: 300 },
      "/articles/9-15我的循道宗史": {
        cache: false,
        swr: false,
        headers: {
          "cache-control": "private, no-store, max-age=0",
          "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
        },
      },
      "/articles/**": { swr: 300 },
      "/authors/**": { swr: 300 },
      "/home/**": { swr: 300 },
      // 後台與登入頁：不快取、不索引
      "/admin/**": { headers: { "x-robots-tag": "noindex" } },
      "/login": { headers: { "x-robots-tag": "noindex" } },
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
