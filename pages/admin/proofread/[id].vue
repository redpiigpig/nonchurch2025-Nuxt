<script setup>
import ProofreadView from "~/components/ProofreadView.vue";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

const route = useRoute();
useHead({
  title: computed(() => `文章校對 ${route.params.id} - 無境界者後台`),
});
</script>

<template>
  <div class="proofread-page">
    <ProofreadView />
  </div>
</template>

<style scoped>
.proofread-page {
  max-width: 1600px;
  margin: 0 auto;
}
</style>
