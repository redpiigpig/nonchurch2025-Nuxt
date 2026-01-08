<script setup>
import AppHeader from "~/components/AppHeader.vue";
import AppFooter from "~/components/AppFooter.vue";
</script>

<template>
  <div class="site-layout">
    <AppHeader />

    <div class="main-layout-container">
      <slot />
    </div>

    <AppFooter />
  </div>
</template>

<style scoped>
.site-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

.main-layout-container {
  flex: 1;
  width: 80%;
  max-width: 1200px;
  margin: 40px auto;
  padding: 50px 60px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

@media (max-width: 1024px) {
  .main-layout-container {
    width: 90%;
    padding: 30px;
  }
}

@media (max-width: 768px) {
  .main-layout-container {
    width: 95%;
    padding: 20px;
    margin: 20px auto;
  }
}
</style>
