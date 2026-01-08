<script setup>
import AuthorListPage from "~/pages/authors/index.vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <AuthorListPage />
</template>
