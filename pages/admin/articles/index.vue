<script setup>
import ArticleListPage from "~/pages/articles/index.vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <ArticleListPage />
</template>
