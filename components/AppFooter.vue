<script setup>
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="app-footer">
    <p class="footer-note">
      Copyright © {{ currentYear }} 無境界者雙月刊 All rights reserved.
    </p>
  </footer>
</template>

<style scoped>
*,
*::before,
*::after {
  box-sizing: border-box;
}

.app-footer {
  background-color: #f1f1f1;
  text-align: center;
  height: 70px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.footer-note {
  margin: 10px 0;
  font-size: 20px;
  color: #444;
}

@media (max-width: 768px) {
  .app-footer {
    height: auto;
    padding: 20px 10px;
    line-height: 1.4;
  }

  .footer-note {
    padding: 0;
    font-size: 14px;
  }
}
</style>
