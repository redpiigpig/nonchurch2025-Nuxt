<script setup>
import EventsPage from "~/pages/events.vue";

definePageMeta({
  middleware: "auth",
});
</script>

<template>
  <EventsPage />
</template>
