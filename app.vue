<script setup>
import { watch, computed } from "vue";
import { useEditorMode } from "~/composables/useEditorMode";
import { useLanguage } from "~/composables/useLanguage";

// 取得編輯模式狀態
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

// ⭐ 新增：設定預設的地球圖示 (讓網頁一載入就有圖示，程式碼才抓得到)
useHead({
  htmlAttrs: {
    lang: computed(() => localeMap[currentLang.value] || "zh-TW"),
  },
  link: computed(() => [
    {
      rel: "icon",
      type: "image/svg+xml",
      href: `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌏</text></svg>`,
    },
    ...seoLinks.value,
  ]),
});

// 全站預設 SEO 設定
useSeoMeta({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - 無境界者雜誌` : "無境界者雜誌";
  },
  ogSiteName: "無境界者雜誌",
  ogImage:
    "https://pottupypvdzamztdhsah.supabase.co/storage/v1/object/public/images/system/topic.jpg",
  twitterCard: "summary_large_image",
});

// 修改瀏覽器分頁圖示 (Favicon) 的函式
function changeFavicon(emoji) {
  if (import.meta.server) return;
  const link = document.querySelector("link[rel~='icon']");
  if (!link) return;
  link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`;
}

// 監聽變化：編輯模式顯示月亮，前台顯示地球
watch(
  isEditor,
  (newVal) => {
    if (import.meta.client) {
      changeFavicon(newVal ? "🌑" : "🌏");
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="site-wrapper">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
