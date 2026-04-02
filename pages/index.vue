<script setup>
import HomeView from "~/components/HomeView.vue";

// ✅ useSeoMeta 在 page 層呼叫，避免在 component 呼叫時的 @unhead/vue dispose 錯誤
// 透過 useState("home-page-seo") 與 HomeView.vue 共享動態 SEO 資料
const homePageSeo = useState("home-page-seo", () => ({
  title: "無境界者雜誌",
  description: "一個不以教會為本位的自由信仰論述平台",
  ogImage: "https://res.cloudinary.com/nonchurch2025/image/upload/topic.jpg",
}));

useSeoMeta({
  title: () => homePageSeo.value.title,
  ogTitle: () => homePageSeo.value.title,
  description: () => homePageSeo.value.description,
  ogDescription: () => homePageSeo.value.description,
  ogImage: () => homePageSeo.value.ogImage,
  twitterCard: "summary_large_image",
  twitterTitle: () => homePageSeo.value.title,
  twitterDescription: () => homePageSeo.value.description,
  twitterImage: () => homePageSeo.value.ogImage,
});
</script>

<template>
  <HomeView />
</template>
