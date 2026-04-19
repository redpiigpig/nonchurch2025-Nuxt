<script setup>
import PublicationPage from "~/pages/publication.vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <PublicationPage />
</template>
