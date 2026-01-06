<template>
  <div class="site-layout">
    <AppHeader />

    <div class="main-layout-container">
      <slot></slot>
    </div>

    <AppFooter />
  </div>
</template>

<style scoped>
/* 最外層結構：確保 Footer 會被推到底部 */
.site-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%; /* 確保佔滿螢幕 */
}

/* 中間的白色內容框 */
.main-layout-container {
  flex: 1; /* 自動撐開高度 */
  width: 80%; /* 設定寬度 */
  max-width: 1200px; /* 避免在大螢幕太寬 */
  margin: 40px auto; /* 上下留白，左右置中 */
  padding: 50px 60px;

  /* 視覺樣式 */
  background-color: rgba(255, 255, 255, 0.9); /* 稍微不那麼透明，比較好閱讀 */
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

/* RWD 設定 */
@media (max-width: 1024px) {
  .main-layout-container {
    width: 95%; /* 平板時變寬一點 */
    padding: 30px;
  }
}

@media (max-width: 768px) {
  .main-layout-container {
    width: 100%; /* 手機版全寬 */
    margin: 0; /* 移除外距 */
    border-radius: 0; /* 移除圓角 */
    padding: 20px;
  }
}
</style>
