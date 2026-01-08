// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },

  css: ["~/assets/main.css", "~/assets/article.css", "~/assets/shared.css"],

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
    },
  },

  // 👇 記得把 @nuxtjs/supabase 加回來
  modules: ["@pinia/nuxt", "@nuxtjs/supabase"],

  // 👇 加上這個避免首頁被強制導向登入頁
  supabase: {
    redirect: false,
  },
});
