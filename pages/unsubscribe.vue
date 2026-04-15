<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

useSeoMeta({ title: "取消訂閱 — 無境界者", robots: "noindex" });

const route = useRoute();

// requested: 已申請取消 | cancelled: 已取消申請 | invalid | error | loading
const status = ref("loading");
const subscriberName = ref("");
const errorMsg = ref("");

onMounted(async () => {
  const token = route.query.token;
  if (!token || token === "demo-token-preview") {
    status.value = token === "demo-token-preview" ? "demo" : "invalid";
    return;
  }
  await toggle(token);
});

async function toggle(token) {
  status.value = "loading";
  try {
    const res = await $fetch("/api/unsubscribe", {
      method: "POST",
      body: { token },
    });
    subscriberName.value = res.name || "";
    status.value = res.requested ? "requested" : "cancelled";
  } catch (err) {
    if (err?.data?.statusCode === 404) {
      status.value = "invalid";
    } else {
      errorMsg.value = err?.data?.message || "發生錯誤，請稍後再試。";
      status.value = "error";
    }
  }
}

// 點「再按一次」切換狀態
function toggleAgain() {
  toggle(route.query.token);
}
</script>

<template>
  <div class="page-wrap">

    <!-- 處理中 -->
    <div v-if="status === 'loading'" class="box">
      <div class="spinner"></div>
      <p>處理中…</p>
    </div>

    <!-- 已送出取消申請 -->
    <div v-else-if="status === 'requested'" class="box success-box">
      <div class="icon">✅</div>
      <p class="main-msg">已發送取消訂閱要求</p>
      <p class="sub-msg">我們確認後將完成處理，感謝您過去的支持。</p>
      <button class="btn-toggle" @click="toggleAgain">取消此申請</button>
    </div>

    <!-- 已取消申請（反悔了） -->
    <div v-else-if="status === 'cancelled'" class="box cancel-box">
      <div class="icon">↩️</div>
      <p class="main-msg">已取消取消訂閱要求</p>
      <p class="sub-msg">您將繼續收到《無境界者》的出刊通知。</p>
      <button class="btn-toggle" @click="toggleAgain">重新申請取消訂閱</button>
    </div>

    <!-- 測試預覽 -->
    <div v-else-if="status === 'demo'" class="box demo-box">
      <div class="icon">🔍</div>
      <p class="main-msg">（測試預覽）</p>
      <p class="sub-msg">這是電子報中的取消訂閱連結外觀預覽，正式連結含有個人專屬 token。</p>
    </div>

    <!-- 無效連結 -->
    <div v-else-if="status === 'invalid'" class="box error-box">
      <div class="icon">🔗</div>
      <p class="main-msg">連結無效或已失效</p>
      <p class="sub-msg">如需協助，請寄信至 nonchurch2025@gmail.com。</p>
      <NuxtLink to="/" class="btn-home">返回首頁</NuxtLink>
    </div>

    <!-- 系統錯誤 -->
    <div v-else-if="status === 'error'" class="box error-box">
      <div class="icon">⚠️</div>
      <p class="main-msg">發生錯誤</p>
      <p class="sub-msg">{{ errorMsg }}</p>
      <NuxtLink to="/" class="btn-home">返回首頁</NuxtLink>
    </div>

  </div>
</template>

<style scoped>
.page-wrap {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.box {
  max-width: 420px;
  width: 100%;
  text-align: center;
  padding: 44px 32px;
  border-radius: 14px;
  border: 1px solid #e0e0e0;
  background: white;
}

.icon { font-size: 2.8rem; margin-bottom: 14px; }

.main-msg {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2c3e50;
  margin: 0 0 10px;
  text-indent: 0;
}
.sub-msg {
  font-size: 0.95rem;
  color: #777;
  line-height: 1.7;
  margin: 0 0 20px;
  text-indent: 0;
}

.success-box { border-color: #c8e6c9; background: #f8fff8; }
.cancel-box  { border-color: #c8d8f0; background: #f8faff; }
.demo-box    { border-color: #ffe0b2; background: #fffdf8; }
.error-box   { border-color: #f5c6c6; background: #fff8f8; }

.btn-toggle {
  padding: 9px 26px;
  background: white;
  border: 1.5px solid #bbb;
  border-radius: 30px;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  color: #555;
  transition: background 0.15s, border-color 0.15s;
}
.btn-toggle:hover { background: #f5f5f5; border-color: #999; }

.btn-home {
  display: inline-block;
  padding: 9px 26px;
  background: white;
  color: #555;
  border: 1.5px solid #bbb;
  border-radius: 30px;
  font-size: 0.9rem;
  text-decoration: none;
}
.btn-home:hover { background: #f5f5f5; }

.spinner {
  width: 36px;
  height: 36px;
  border: 4px solid #e0e0e0;
  border-top-color: #4caf50;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 14px;
}
@keyframes spin { to { transform: rotate(360deg); } }

p { text-indent: 0; }
</style>
