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

// ✅ 修正：改用純 reactive useHead 管理 favicon
// 不再使用 changeFavicon + document.querySelector，避免與 Nuxt head 管理衝突
// faviconEmoji 隨 isEditor 自動切換，無需手動監聽
const faviconEmoji = computed(() => (isEditor.value ? "🌑" : "🌏"));

useHead({
  htmlAttrs: {
    lang: computed(() => localeMap[currentLang.value] || "zh-TW"),
  },
  link: computed(() => [
    {
      rel: "icon",
      type: "image/svg+xml",
      href: `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${faviconEmoji.value}</text></svg>`,
    },
    ...seoLinks.value,
  ]),
});

// 全站預設 SEO
useSeoMeta({
  titleTemplate: (titleChunk) =>
    titleChunk ? `${titleChunk} - 無境界者雜誌` : "無境界者雜誌",
  ogSiteName: "無境界者雜誌",
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
