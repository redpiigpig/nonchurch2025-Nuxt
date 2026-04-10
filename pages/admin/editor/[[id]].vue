<script setup>
import EditorView from "~/components/EditorView.vue";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

const route = useRoute();
const articleId = computed(() => route.params.id);

useHead({
  title: computed(() => `編輯文章 ${articleId.value} - 無境界者雜誌`),
});
</script>

<template>
  <div class="edit-article-page">
    <!-- 編輯模式：只有編輯器，沒有上傳功能 -->
    <!-- EditorView 會自動根據 route.params.id 判斷為編輯模式 -->
    <!-- 編輯模式會顯示「下載 Word」按鈕 -->
    <EditorView />
  </div>
</template>

<style scoped>
.edit-article-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
