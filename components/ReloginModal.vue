<script setup>
import { useRoute } from "vue-router";
import { useSessionGuard } from "~/composables/useSessionGuard";

const { showRelogin, dismissRelogin } = useSessionGuard();
const route = useRoute();

const gotoLogin = () => {
  const redirect = encodeURIComponent(route.fullPath);
  window.location.href = `/login?redirect=${redirect}`;
};
</script>

<template>
  <Teleport to="body">
    <div v-if="showRelogin" class="relogin-overlay">
      <div class="relogin-modal">
        <div class="relogin-header">⚠️ 登入階段已過期</div>
        <div class="relogin-body">
          <p>剛剛的儲存沒有寫入資料庫（Supabase 登入已過期或被撤銷）。</p>
          <div class="relogin-warn">
            <strong>為避免本頁未儲存的內容遺失，請：</strong>
            <ol>
              <li>先把標題、內文、註腳等<strong>複製到外部備份</strong>（記事本或 Word）</li>
              <li>點下方「前往重新登入」</li>
              <li>登入後回到本頁，手動把備份內容貼回再儲存一次</li>
            </ol>
          </div>
        </div>
        <div class="relogin-footer">
          <button class="btn-secondary" @click="dismissRelogin">先讓我備份內容</button>
          <button class="btn-relogin" @click="gotoLogin">前往重新登入</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.relogin-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.relogin-modal {
  background: white;
  border-radius: 10px;
  width: 500px;
  max-width: 95vw;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}
.relogin-header {
  background: #c0392b;
  color: white;
  padding: 14px 20px;
  font-size: 1.05rem;
  font-weight: 700;
}
.relogin-body {
  padding: 18px 22px;
  color: #333;
  font-size: 0.93rem;
  line-height: 1.6;
}
.relogin-body p {
  margin: 0 0 12px;
}
.relogin-warn {
  background: #fff8e1;
  border-left: 4px solid #f39c12;
  padding: 10px 14px 10px 18px;
  border-radius: 0 4px 4px 0;
  font-size: 0.88rem;
}
.relogin-warn ol {
  margin: 6px 0 0;
  padding-left: 18px;
}
.relogin-warn li {
  margin: 4px 0;
}
.relogin-footer {
  padding: 14px 22px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-secondary {
  padding: 10px 16px;
  background: #f1f3f5;
  color: #555;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-secondary:hover {
  background: #e9ecef;
}
.btn-relogin {
  padding: 10px 22px;
  background: #2980b9;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.95rem;
}
.btn-relogin:hover {
  background: #1f6391;
}
</style>
