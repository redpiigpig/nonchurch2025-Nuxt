<script setup>
import EditorView from "~/components/EditorView.vue";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

const route = useRoute();

useHead({
  title: `編輯文章 ${route.params.id} - 無境界者雜誌`,
});
</script>

<template>
  <div class="edit-article-page">
    <!-- 編輯模式不顯示上傳面板，直接顯示編輯器 -->
    <EditorView />
  </div>
</template>

<style scoped>
.edit-article-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
