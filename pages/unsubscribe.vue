<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useLanguage } from "~/composables/useLanguage";

useSeoMeta({ title: "取消訂閱 — 無境界者", robots: "noindex" });

const { currentLang } = useLanguage();

const i18n = {
  "zh-TW": {
    loading: "處理中…",
    requestedMain: "已發送取消訂閱要求",
    requestedSub: "我們確認後將完成處理，感謝您過去的支持。",
    requestedToggle: "取消此申請",
    cancelledMain: "已取消取消訂閱要求",
    cancelledSub: "您將繼續收到《無境界者》的出刊通知。",
    cancelledToggle: "重新申請取消訂閱",
    demoMain: "（測試預覽）",
    demoSub: "這是電子報中的取消訂閱連結外觀預覽，正式連結含有個人專屬 token。",
    invalidMain: "連結無效或已失效",
    invalidSub: "如需協助，請寄信至 nonchurch2025@gmail.com。",
    errorMain: "發生錯誤",
    home: "返回首頁",
  },
  "zh-HK": {
    loading: "處理中…",
    requestedMain: "已發送取消訂閱要求",
    requestedSub: "我們確認後將完成處理，感謝您過去嘅支持。",
    requestedToggle: "取消此申請",
    cancelledMain: "已取消取消訂閱要求",
    cancelledSub: "您將繼續收到《無境界者》嘅出刊通知。",
    cancelledToggle: "重新申請取消訂閱",
    demoMain: "（測試預覽）",
    demoSub: "呢個係電子報中嘅取消訂閱連結外觀預覽，正式連結含有個人專屬 token。",
    invalidMain: "連結無效或已失效",
    invalidSub: "如需協助，請寄信至 nonchurch2025@gmail.com。",
    errorMain: "發生錯誤",
    home: "返回首頁",
  },
  "zh-CN": {
    loading: "处理中…",
    requestedMain: "已发送取消订阅要求",
    requestedSub: "我们确认后将完成处理，感谢您过去的支持。",
    requestedToggle: "取消此申请",
    cancelledMain: "已取消取消订阅要求",
    cancelledSub: "您将继续收到《无境界者》的出刊通知。",
    cancelledToggle: "重新申请取消订阅",
    demoMain: "（测试预览）",
    demoSub: "这是电子报中的取消订阅链接外观预览，正式链接含有个人专属 token。",
    invalidMain: "链接无效或已失效",
    invalidSub: "如需协助，请发邮件至 nonchurch2025@gmail.com。",
    errorMain: "发生错误",
    home: "返回首页",
  },
  en: {
    loading: "Processing…",
    requestedMain: "Unsubscribe request sent",
    requestedSub: "We will process your request after confirmation. Thank you for your support.",
    requestedToggle: "Cancel this request",
    cancelledMain: "Unsubscribe request cancelled",
    cancelledSub: "You will continue to receive issue notifications from Faith Without Boundary.",
    cancelledToggle: "Re-submit unsubscribe request",
    demoMain: "(Preview mode)",
    demoSub: "This is a preview of the unsubscribe link in newsletters. The actual link contains a personal token.",
    invalidMain: "Invalid or expired link",
    invalidSub: "For assistance, please email nonchurch2025@gmail.com.",
    errorMain: "An error occurred",
    home: "Back to Home",
  },
  ja: {
    loading: "処理中…",
    requestedMain: "購読解除リクエストを送信しました",
    requestedSub: "確認後に処理を完了いたします。これまでのご支援に感謝します。",
    requestedToggle: "このリクエストをキャンセル",
    cancelledMain: "購読解除リクエストをキャンセルしました",
    cancelledSub: "引き続き《無境界者》の発刊通知をお受け取りいただけます。",
    cancelledToggle: "再度購読解除を申請する",
    demoMain: "（テストプレビュー）",
    demoSub: "これはメールマガジン内の購読解除リンクのプレビューです。実際のリンクには個人専用のトークンが含まれます。",
    invalidMain: "リンクが無効または期限切れです",
    invalidSub: "サポートが必要な場合は nonchurch2025@gmail.com までご連絡ください。",
    errorMain: "エラーが発生しました",
    home: "ホームへ戻る",
  },
  ko: {
    loading: "처리 중…",
    requestedMain: "구독 취소 요청이 전송되었습니다",
    requestedSub: "확인 후 처리가 완료됩니다. 그동안의 지지에 감사드립니다.",
    requestedToggle: "이 요청 취소하기",
    cancelledMain: "구독 취소 요청이 철회되었습니다",
    cancelledSub: "《무경계자》의 발간 알림을 계속 받으실 수 있습니다.",
    cancelledToggle: "구독 취소 재신청",
    demoMain: "（테스트 미리보기）",
    demoSub: "이것은 뉴스레터의 구독 취소 링크 미리보기입니다. 실제 링크에는 개인 전용 토큰이 포함되어 있습니다.",
    invalidMain: "링크가 유효하지 않거나 만료되었습니다",
    invalidSub: "도움이 필요하시면 nonchurch2025@gmail.com 으로 문의해 주세요.",
    errorMain: "오류가 발생했습니다",
    home: "홈으로 돌아가기",
  },
};

const t = computed(() => i18n[currentLang.value] || i18n["zh-TW"]);

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
      <p>{{ t.loading }}</p>
    </div>

    <!-- 已送出取消申請 -->
    <div v-else-if="status === 'requested'" class="box success-box">
      <div class="icon">✅</div>
      <p class="main-msg">{{ t.requestedMain }}</p>
      <p class="sub-msg">{{ t.requestedSub }}</p>
      <button class="btn-toggle" @click="toggleAgain">{{ t.requestedToggle }}</button>
    </div>

    <!-- 已取消申請（反悔了） -->
    <div v-else-if="status === 'cancelled'" class="box cancel-box">
      <div class="icon">↩️</div>
      <p class="main-msg">{{ t.cancelledMain }}</p>
      <p class="sub-msg">{{ t.cancelledSub }}</p>
      <button class="btn-toggle" @click="toggleAgain">{{ t.cancelledToggle }}</button>
    </div>

    <!-- 測試預覽 -->
    <div v-else-if="status === 'demo'" class="box demo-box">
      <div class="icon">🔍</div>
      <p class="main-msg">{{ t.demoMain }}</p>
      <p class="sub-msg">{{ t.demoSub }}</p>
    </div>

    <!-- 無效連結 -->
    <div v-else-if="status === 'invalid'" class="box error-box">
      <div class="icon">🔗</div>
      <p class="main-msg">{{ t.invalidMain }}</p>
      <p class="sub-msg">{{ t.invalidSub }}</p>
      <NuxtLink to="/" class="btn-home">{{ t.home }}</NuxtLink>
    </div>

    <!-- 系統錯誤 -->
    <div v-else-if="status === 'error'" class="box error-box">
      <div class="icon">⚠️</div>
      <p class="main-msg">{{ t.errorMain }}</p>
      <p class="sub-msg">{{ errorMsg }}</p>
      <NuxtLink to="/" class="btn-home">{{ t.home }}</NuxtLink>
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
