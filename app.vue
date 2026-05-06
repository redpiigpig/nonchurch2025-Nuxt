<script setup>
import { computed } from "vue";
import { useEditorMode } from "~/composables/useEditorMode";
import { useLanguage } from "~/composables/useLanguage";

const { isEditor } = useEditorMode();
const { currentLang } = useLanguage();
const route = useRoute();

const localeMap = {
  default: "zh-TW",
  "zh-HK": "zh-HK",
  "zh-CN": "zh-CN",
  en: "en",
  ja: "ja",
  ko: "ko",
};

const canonicalPath = computed(() => route.path);

const seoLinks = computed(() => {
  const base = "https://nonchurch.tw";
  const langs = ["default", "zh-HK", "zh-CN", "en", "ja", "ko"];
  const links = [
    { rel: "canonical", href: `${base}${canonicalPath.value}` },
    {
      rel: "alternate",
      hreflang: "x-default",
      href: `${base}${canonicalPath.value}`,
    },
  ];
  for (const lang of langs) {
    const url =
      lang === "default"
        ? `${base}${canonicalPath.value}`
        : `${base}${canonicalPath.value}?lang=${encodeURIComponent(lang)}`;
    links.push({
      rel: "alternate",
      hreflang: localeMap[lang].toLowerCase(),
      href: url,
    });
  }
  return links;
});

// favicon：admin 模式仍用 🌑 emoji（data URI 只給瀏覽器分頁辨識），
// 一般頁面用實體檔案 /favicon-*.png /favicon.ico，讓 Google 搜尋抓得到。
useHead({
  htmlAttrs: {
    lang: computed(() => localeMap[currentLang.value] || "zh-TW"),
  },
  link: computed(() => {
    const iconLinks = isEditor.value
      ? [
          {
            rel: "icon",
            type: "image/svg+xml",
            href: `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌑</text></svg>`,
          },
        ]
      : [
          { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
          { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-192.png" },
          { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon-512.png" },
          { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        ];
    return [...iconLinks, ...seoLinks.value];
  }),
});

// ✅ 方案 B：多語言網站標題
const siteName = computed(() => {
  const langTitles = {
    "zh-TW": "無境界者雜誌",
    "zh-HK": "無境界者雜誌",
    "zh-CN": "无境界者杂志",
    en: "Faith Without Boundary",
    ja: "無境界者",
    ko: "무경계자 매거진",
    default: "無境界者雜誌",
  };
  return langTitles[currentLang.value] || langTitles.default;
});

// 全站預設 SEO
useSeoMeta({
  titleTemplate: (titleChunk) =>
    titleChunk ? `${titleChunk} - ${siteName.value}` : siteName.value,
  ogSiteName: siteName,
  ogImage: "https://res.cloudinary.com/nonchurch2025/image/upload/topic.jpg",
  twitterCard: "summary_large_image",
});
</script>

<template>
  <div class="site-wrapper">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
