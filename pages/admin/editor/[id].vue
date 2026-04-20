<script setup>
import EditorView from "~/components/EditorView.vue";
import { supabase } from "~/supabase";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

const route = useRoute();
const router = useRouter();
const articleId = computed(() => route.params.id);

useHead({
  title: computed(() => `編輯文章 ${articleId.value} - 無境界者雜誌`),
});

// toc 文章不走 EditorView，直接導到專用頁面
onMounted(async () => {
  const { data } = await supabase
    .from("articles")
    .select("article_type, title")
    .eq("id", articleId.value)
    .single();
  if (
    data?.article_type === "toc" ||
    data?.title === "目次" ||
    data?.title === "目錄"
  ) {
    router.replace(`/admin/toc-editor/${articleId.value}`);
  }
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
