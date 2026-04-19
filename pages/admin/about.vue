<script setup>
import AboutPage from "~/pages/about.vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <AboutPage />
</template>
