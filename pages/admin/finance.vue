<script setup>
import FinancePage from "~/pages/finance.vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <FinancePage />
</template>
