const SUPPORTED_LANGS = ["default", "zh-HK", "zh-CN", "en", "ja", "ko"];

export function useLanguage() {
  const currentLang = useState("app_lang", () => "default");
  const route = useRoute();

  if (import.meta.client) {
    const fromQuery = typeof route.query.lang === "string" ? route.query.lang : null;
    const fromStorage = localStorage.getItem("app_lang");
    const candidate = fromQuery || fromStorage || "default";
    currentLang.value = SUPPORTED_LANGS.includes(candidate) ? candidate : "default";
  }

  watch(currentLang, (newVal) => {
    const safeLang = SUPPORTED_LANGS.includes(newVal) ? newVal : "default";
    currentLang.value = safeLang;
    if (import.meta.client) {
      localStorage.setItem("app_lang", safeLang);
    }
  });

  return { currentLang, supportedLangs: SUPPORTED_LANGS };
}
