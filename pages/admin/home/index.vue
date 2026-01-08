<script setup>
import HomeView from "~/components/HomeView.vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <HomeView />
</template>
