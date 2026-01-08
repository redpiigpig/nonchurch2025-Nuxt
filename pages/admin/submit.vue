<script setup>
import SubmitPage from "~/pages/submit.vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <SubmitPage />
</template>
