<script setup>
import IndexPage from "~/pages/index.vue";

definePageMeta({
  middleware: "auth",
});

useHead({
  title: "無境界者雜誌",
});
</script>

<template>
  <IndexPage />
</template>
