<script setup>
import { watch } from "vue";
import { useEditorMode } from "~/composables/useEditorMode";

const { isEditor } = useEditorMode();

function changeFavicon(emoji) {
  if (import.meta.server) return;

  const link = document.querySelector("link[rel~='icon']");
  if (!link) return;
  link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`;
}

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
