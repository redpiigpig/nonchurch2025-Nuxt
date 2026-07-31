<script setup>
definePageMeta({ layout: "admin", middleware: "auth" });

import { computed, onMounted, ref } from "vue";

useSeoMeta({ title: "第九期紙本匯款管理 — 無境界者", robots: "noindex, nofollow" });

const route = useRoute();
const orders = ref([]);
const loading = ref(true);
const loadError = ref("");
const searchQuery = ref("");
const filterStatus = ref("pending");
const expandedId = ref(null);
const savingIds = ref(new Set());
const confirmingIds = ref(new Set());

const markBusy = (target, id, busy) => {
  const next = new Set(target.value);
  if (busy) next.add(id);
  else next.delete(id);
  target.value = next;
};

const fetchOrders = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const result = await $fetch("/api/issue-9-payment-orders");
    orders.value = result.orders || [];
    const requestedId = Number(route.query.order);
    if (Number.isInteger(requestedId) && orders.value.some((order) => order.id === requestedId)) {
      expandedId.value = requestedId;
      filterStatus.value = "";
    }
  } catch (error) {
    loadError.value = error?.data?.message || error.message || "載入失敗";
  } finally {
    loading.value = false;
  }
};

onMounted(fetchOrders);

const filteredOrders = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return orders.value.filter((order) => {
    if (filterStatus.value === "pending" && order.confirmed) return false;
    if (filterStatus.value === "confirmed" && !order.confirmed) return false;
    if (!query) return true;
    return [order.name, order.email, order.last5]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });
});

const stats = computed(() => {
  const confirmed = orders.value.filter((order) => order.confirmed);
  const pending = orders.value.filter((order) => !order.confirmed);
  return {
    total: orders.value.length,
    confirmed: confirmed.length,
    pending: pending.length,
    copies: orders.value.reduce((sum, order) => sum + Number(order.copies || 0), 0),
    amount: orders.value.reduce((sum, order) => sum + Number(order.amount || 0), 0),
  };
});

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
};

const saveOrder = async (order, showMessage = true) => {
  markBusy(savingIds, order.id, true);
  try {
    const result = await $fetch(`/api/issue-9-payment-orders/${order.id}`, {
      method: "PATCH",
      body: {
        name: order.name,
        email: order.email,
        copies: Number(order.copies),
        last5: order.last5,
        message: order.message || "",
        note: order.note || "",
      },
    });
    Object.assign(order, result.order);
    if (showMessage) alert("✅ 訂單已儲存");
    return true;
  } catch (error) {
    alert(error?.data?.message || error.message || "訂單儲存失敗");
    return false;
  } finally {
    markBusy(savingIds, order.id, false);
  }
};

const confirmPayment = async (order) => {
  if (order.confirmed) return;
  const amount = Number(order.copies || 0) * Number(order.unit_price || 350);
  if (!confirm(`確認已收到 ${order.name} 的 NT$ ${amount.toLocaleString("zh-TW")} 匯款，並立即寄出確認信？`)) return;
  if (!(await saveOrder(order, false))) return;

  markBusy(confirmingIds, order.id, true);
  try {
    const result = await $fetch(`/api/issue-9-payment-orders/${order.id}/confirm`, { method: "POST" });
    Object.assign(order, result.order);
    alert(result.alreadyConfirmed ? "這筆訂單先前已確認並寄信。" : "✅ 已確認收款，確認信已寄給讀者");
  } catch (error) {
    alert(error?.data?.message || error.message || "確認或寄信失敗");
  } finally {
    markBusy(confirmingIds, order.id, false);
  }
};
</script>

<template>
  <div class="page-wrap">
    <div class="page-heading">
      <div>
        <p class="eyebrow">《無境界者》第九期</p>
        <h1>紙本匯款管理</h1>
        <p>讀者送出匯款資料後會列在這裡。核對帳戶後，按下確認即可寄出確認信。</p>
      </div>
      <button class="btn-refresh" :disabled="loading" @click="fetchOrders">重新整理</button>
    </div>

    <div v-if="!loading" class="stats-grid">
      <div class="stat-card"><strong>{{ stats.pending }}</strong><span>待確認</span></div>
      <div class="stat-card green"><strong>{{ stats.confirmed }}</strong><span>已確認</span></div>
      <div class="stat-card"><strong>{{ stats.copies }}</strong><span>總訂購本數</span></div>
      <div class="stat-card"><strong>NT$ {{ stats.amount.toLocaleString('zh-TW') }}</strong><span>總回填金額</span></div>
    </div>

    <div class="toolbar">
      <input v-model="searchQuery" type="search" placeholder="搜尋姓名、Email 或後五碼" />
      <select v-model="filterStatus">
        <option value="pending">待確認</option>
        <option value="confirmed">已確認</option>
        <option value="">全部</option>
      </select>
    </div>

    <div v-if="loading" class="state-box">載入訂單中…</div>
    <div v-else-if="loadError" class="state-box error">{{ loadError }}</div>
    <div v-else-if="filteredOrders.length === 0" class="state-box">目前沒有符合條件的匯款資料。</div>

    <div v-else class="order-list">
      <article
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card"
        :class="{ confirmed: order.confirmed }"
      >
        <button class="order-summary" type="button" @click="expandedId = expandedId === order.id ? null : order.id">
          <span class="order-person">
            <strong>{{ order.name }}</strong>
            <small>{{ order.email }}</small>
          </span>
          <span class="order-numbers">
            <strong>{{ order.copies }} 本・NT$ {{ Number(order.amount).toLocaleString('zh-TW') }}</strong>
            <small>後五碼 {{ order.last5 }}・{{ formatDateTime(order.created_at) }}</small>
          </span>
          <span class="status-tag" :class="order.confirmed ? 'done' : 'pending'">
            {{ order.confirmed ? '已確認並寄信' : '待確認' }}
          </span>
          <span class="expand-icon">{{ expandedId === order.id ? '▲' : '▼' }}</span>
        </button>

        <div v-if="expandedId === order.id" class="order-editor">
          <div class="field-grid">
            <label><span>姓名</span><input v-model="order.name" type="text" maxlength="60" /></label>
            <label><span>聯繫 Email</span><input v-model="order.email" type="email" maxlength="200" /></label>
            <label><span>訂購本數</span><input v-model.number="order.copies" type="number" min="1" max="1000" /></label>
            <label><span>匯款後五碼</span><input v-model="order.last5" type="text" inputmode="numeric" maxlength="5" /></label>
          </div>
          <label class="wide-field"><span>讀者備註</span><textarea v-model="order.message" rows="3" maxlength="500"></textarea></label>
          <label class="wide-field"><span>內部備註</span><textarea v-model="order.note" rows="3" maxlength="1000" placeholder="只有後台看得到"></textarea></label>

          <dl class="audit-grid">
            <div><dt>回填時間</dt><dd>{{ formatDateTime(order.created_at) }}</dd></div>
            <div><dt>確認時間</dt><dd>{{ formatDateTime(order.confirmed_at) }}</dd></div>
            <div><dt>確認信寄出</dt><dd>{{ formatDateTime(order.confirmation_email_sent_at) }}</dd></div>
          </dl>

          <div class="actions">
            <button class="btn-save" :disabled="savingIds.has(order.id) || confirmingIds.has(order.id)" @click="saveOrder(order)">
              {{ savingIds.has(order.id) ? '儲存中…' : '儲存修改' }}
            </button>
            <button
              class="btn-confirm"
              :disabled="order.confirmed || savingIds.has(order.id) || confirmingIds.has(order.id)"
              @click="confirmPayment(order)"
            >
              {{ order.confirmed ? '已確認並寄出確認信' : (confirmingIds.has(order.id) ? '寄信中…' : '確認收款並寄信') }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page-wrap { max-width: 1180px; margin: 0 auto; color: #27312a; }
.page-heading { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 24px; }
.page-heading h1 { margin: 2px 0 8px; font-size: 2rem; }
.page-heading p { margin: 0; color: #667069; line-height: 1.7; }
.eyebrow { color: #3f6d49 !important; font-weight: 700; letter-spacing: .08em; }
.btn-refresh, .btn-save, .btn-confirm { border: 0; border-radius: 7px; padding: 10px 18px; font: inherit; font-weight: 700; cursor: pointer; }
.btn-refresh { background: #fff; color: #375640; border: 1px solid #afc2b3; white-space: nowrap; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.stat-card { display: flex; flex-direction: column; gap: 4px; padding: 18px; background: #fff; border-radius: 10px; box-shadow: 0 2px 10px rgba(34, 61, 40, .07); }
.stat-card strong { font-size: 1.45rem; color: #a96221; }
.stat-card.green strong { color: #2f7541; }
.stat-card span { color: #778078; font-size: .9rem; }
.toolbar { display: grid; grid-template-columns: minmax(240px, 1fr) 180px; gap: 12px; margin-bottom: 18px; }
.toolbar input, .toolbar select, .field-grid input, .wide-field textarea { box-sizing: border-box; width: 100%; border: 1px solid #cbd5cd; border-radius: 7px; background: #fff; padding: 10px 12px; color: #27312a; font: inherit; }
.state-box { padding: 32px; border-radius: 10px; background: #fff; text-align: center; color: #69736b; }
.state-box.error { color: #a33636; background: #fff3f3; }
.order-list { display: flex; flex-direction: column; gap: 12px; }
.order-card { overflow: hidden; border-left: 5px solid #d79b55; border-radius: 10px; background: #fff; box-shadow: 0 2px 10px rgba(34, 61, 40, .07); }
.order-card.confirmed { border-left-color: #559969; }
.order-summary { display: grid; grid-template-columns: 1.15fr 1fr auto 24px; gap: 18px; align-items: center; width: 100%; padding: 18px 20px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.order-person, .order-numbers { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.order-person strong, .order-numbers strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-summary small { color: #788078; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-tag { padding: 5px 10px; border-radius: 999px; font-size: .85rem; white-space: nowrap; }
.status-tag.pending { color: #8b5018; background: #fff0db; }
.status-tag.done { color: #286239; background: #e6f5ea; }
.expand-icon { color: #7e897f; }
.order-editor { padding: 20px; border-top: 1px solid #e5ebe6; background: #fbfcfb; }
.field-grid { display: grid; grid-template-columns: 1fr 1.4fr .55fr .7fr; gap: 14px; }
.field-grid label, .wide-field { display: flex; flex-direction: column; gap: 6px; color: #4e5c51; font-weight: 600; }
.wide-field { margin-top: 14px; }
.audit-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
.audit-grid div { padding: 10px 12px; border-radius: 7px; background: #eef3ef; }
.audit-grid dt { color: #6f7a71; font-size: .83rem; }
.audit-grid dd { margin: 4px 0 0; font-weight: 700; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn-save { color: #375640; background: #edf4ef; border: 1px solid #b9cabe; }
.btn-confirm { color: #fff; background: #357a45; }
button:disabled { cursor: not-allowed; opacity: .55; }
@media (max-width: 900px) {
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .order-summary { grid-template-columns: 1fr auto; }
  .order-numbers { grid-column: 1; }
  .status-tag, .expand-icon { grid-column: 2; grid-row: 1; }
  .expand-icon { align-self: end; }
  .field-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .page-heading { flex-direction: column; }
  .stats-grid, .toolbar, .field-grid, .audit-grid { grid-template-columns: 1fr; }
  .order-summary { padding: 15px; }
  .actions { flex-direction: column; }
}
</style>
