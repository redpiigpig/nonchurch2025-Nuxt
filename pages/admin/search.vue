<script setup>
import SearchPage from "~/pages/search.vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <SearchPage />
</template>
