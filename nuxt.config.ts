// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },

  // 1. 告訴 Nuxt 全域 CSS 在哪裡
  css: ["~/assets/main.css", "~/assets/article.css", "~/assets/shared.css"],

  // 2. 設定環境變數 (讓程式碼讀得到 .env)
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
    },
  },

  // 3. 註冊模組 (這裡先保留，之後如果用到其他模組再加)
  modules: ["@pinia/nuxt"],
});
