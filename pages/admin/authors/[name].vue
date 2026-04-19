<script setup>
import AuthorDetailPage from "~/pages/authors/[name].vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <AuthorDetailPage :show-all="true" />
</template>
