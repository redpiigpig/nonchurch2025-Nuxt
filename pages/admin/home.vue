<script setup>
import IndexPage from "~/pages/index.vue";

definePageMeta({
  middleware: "auth",
});

useHead({
  title: "首頁預覽 (編輯模式) - 無境界者雜誌",
});
</script>

<template>
  <IndexPage />
</template>
