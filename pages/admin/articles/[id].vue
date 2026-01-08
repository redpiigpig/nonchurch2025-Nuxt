<script setup>
import ArticleDetailPage from "~/pages/articles/[id].vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <ArticleDetailPage />
</template>
