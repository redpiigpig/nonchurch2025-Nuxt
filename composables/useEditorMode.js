import { computed } from "vue";
import { useRoute } from "vue-router";

export function useEditorMode() {
  const route = useRoute();

  // 只要網址開頭是 /admin，就視為編輯模式 (月亮/深藍色)
  // 否則就是閱讀模式 (地球/綠色)
  const isEditor = computed(() => {
    return route.path.startsWith("/admin");
  });

  return { isEditor };
}
