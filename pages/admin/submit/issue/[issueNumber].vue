<script setup>
import SubmitPage from "~/pages/submit.vue";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});
</script>

<template>
  <SubmitPage />
</template>
