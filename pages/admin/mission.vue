<script setup>
import MissionPage from "~/pages/mission.vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <MissionPage />
</template>
