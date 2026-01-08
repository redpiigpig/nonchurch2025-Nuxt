// ~/composables/useEditorMode.js

import { computed } from "vue";
import { useRoute } from "vue-router";

export function useEditorMode() {
  const route = useRoute();

  // 核心邏輯：只要網址開頭是 /admin，就視為編輯模式
  // 這樣你的 Header 按鈕就能根據「你現在在哪裡」自動切換圖示
  const isEditor = computed(() => {
    return route.path.startsWith("/admin");
  });

  return { isEditor };
}
