// composables/useLanguage.js
//
// ✅ 修正 hydration mismatch 問題：
//    原本在 setup() 階段直接讀 localStorage 並改 currentLang，
//    導致 SSR 渲染的 HTML（lang="default"）與 client hydration 時不一致，
//    Vue 判斷 mismatch 後中止 hydration，造成整頁 router / 事件失效。
//
//    修法：把 localStorage 讀取移到 onMounted()（hydration 完成之後才執行），
//    確保 SSR 與 client 初始 render 都是 "default"，hydration 順利完成，
//    再由 onMounted 更新成使用者偏好的語言。

import { onMounted, watch } from "vue";

const SUPPORTED_LANGS = ["default", "zh-HK", "zh-CN", "en", "ja", "ko"];

export function useLanguage() {
  const currentLang = useState("app_lang", () => "default");
  const route = useRoute();

  // ✅ 移到 onMounted：hydration 完成後再讀取 localStorage / URL query
  onMounted(() => {
    const fromQuery =
      typeof route.query.lang === "string" ? route.query.lang : null;
    const fromStorage = localStorage.getItem("app_lang");
    const candidate = fromQuery || fromStorage || "default";
    currentLang.value = SUPPORTED_LANGS.includes(candidate)
      ? candidate
      : "default";
  });

  // 語言切換時寫入 localStorage
  watch(currentLang, (newVal) => {
    const safeLang = SUPPORTED_LANGS.includes(newVal) ? newVal : "default";
    currentLang.value = safeLang;
    if (import.meta.client) {
      localStorage.setItem("app_lang", safeLang);
    }
  });

  return { currentLang, supportedLangs: SUPPORTED_LANGS };
}
