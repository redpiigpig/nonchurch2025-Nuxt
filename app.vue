<script setup>
import { watch } from "vue";
import { useEditorMode } from "~/composables/useEditorMode";

// 取得編輯模式狀態
const { isEditor } = useEditorMode();

// 修改瀏覽器分頁圖示 (Favicon) 的函式
function changeFavicon(emoji) {
  if (import.meta.server) return; // 確保只在瀏覽器端執行

  const link = document.querySelector("link[rel~='icon']");
  if (!link) return;
  // 使用 SVG Data URI 將 Emoji 變成圖示
  link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`;
}

// 監聽 isEditor 變化：編輯模式顯示月亮，前台顯示地球
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
