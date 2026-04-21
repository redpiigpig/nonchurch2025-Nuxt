<script setup>
definePageMeta({ layout: "admin", middleware: "auth" });

import { ref, computed, onMounted } from "vue";
import { createClient } from "@supabase/supabase-js";

const config = useRuntimeConfig();
const supabase = createClient(config.public.supabaseUrl, config.public.supabaseKey);

// ── 資料 ─────────────────────────────────────────────────────────
const donations = ref([]);
const loading = ref(true);
const expandedId = ref(null);

// ── 篩選 ─────────────────────────────────────────────────────────
const searchQuery = ref("");
const filterStatus = ref(""); // "" | "confirmed" | "pending"

onMounted(fetchAll);

async function fetchAll() {
  loading.value = true;
  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .order("created_at", { ascending: false });
  if (!error) donations.value = data || [];
  loading.value = false;
}

const filtered = computed(() => {
  return donations.value.filter((d) => {
    if (filterStatus.value === "confirmed" && !d.confirmed) return false;
    if (filterStatus.value === "pending" && d.confirmed) return false;
    if (searchQuery.value) {
      const q = searchQuery.value.trim().toLowerCase();
      if (!d.name?.toLowerCase().includes(q) && !d.email?.toLowerCase().includes(q)) return false;
    }
    return true;
  });
});

// ── 統計 ─────────────────────────────────────────────────────────
const stats = computed(() => {
  const total = donations.value.length;
  const confirmed = donations.value.filter((d) => d.confirmed).length;
  const pending = total - confirmed;
  const totalAmount = donations.value.reduce((sum, d) => {
    const n = parseInt(d.amount?.replace(/[^0-9]/g, "") || "0", 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const confirmedAmount = donations.value
    .filter((d) => d.confirmed)
    .reduce((sum, d) => {
      const n = parseInt(d.amount?.replace(/[^0-9]/g, "") || "0", 10);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  return { total, confirmed, pending, totalAmount, confirmedAmount };
});

// ── 標記已確認 ────────────────────────────────────────────────────
async function toggleConfirm(d) {
  const newVal = !d.confirmed;
  const update = newVal
    ? { confirmed: true, confirmed_at: new Date().toISOString() }
    : { confirmed: false, confirmed_at: null };
  const { error } = await supabase.from("donations").update(update).eq("id", d.id);
  if (error) { alert("更新失敗：" + error.message); return; }
  d.confirmed = update.confirmed;
  d.confirmed_at = update.confirmed_at;

  // 標記為已確認時，寄確認信給贊助者
  if (newVal) {
    try {
      await $fetch("/api/donate-send-confirm", {
        method: "POST",
        body: { name: d.name, email: d.email },
      });
    } catch (err) {
      alert("資料庫已更新，但確認信寄送失敗：" + (err?.data?.message || err.message));
    }
  }
}

// ── 備註 ─────────────────────────────────────────────────────────
const editingNoteId = ref(null);
const noteInput = ref("");

function startEditNote(d) {
  editingNoteId.value = d.id;
  noteInput.value = d.note || "";
}

async function saveNote(d) {
  const { error } = await supabase
    .from("donations")
    .update({ note: noteInput.value.trim() || null })
    .eq("id", d.id);
  if (!error) {
    d.note = noteInput.value.trim() || null;
    editingNoteId.value = null;
  } else {
    alert("儲存備註失敗：" + error.message);
  }
}

// ── 刪除 ─────────────────────────────────────────────────────────
async function deleteDonation(d) {
  if (!confirm(`確定要刪除「${d.name}」的贊助紀錄？此操作無法還原。`)) return;
  const { error } = await supabase.from("donations").delete().eq("id", d.id);
  if (!error) donations.value = donations.value.filter((r) => r.id !== d.id);
  else alert("刪除失敗：" + error.message);
}

// ── 匯出 CSV ──────────────────────────────────────────────────────
function exportCsv() {
  const header = ["ID", "回填時間", "姓名", "電子郵件", "匯款時間", "金額(NT$)", "帳號末五碼", "公開姓名", "已確認", "確認時間", "留言", "備註"];
  const rows = filtered.value.map((d) => [
    d.id,
    d.created_at ? d.created_at.slice(0, 16).replace("T", " ") : "",
    `"${(d.name || "").replace(/"/g, '""')}"`,
    d.email || "",
    `"${(d.donate_date || "").replace(/"/g, '""')}"`,
    d.amount || "",
    d.last5 || "",
    d.is_public || "",
    d.confirmed ? "是" : "否",
    d.confirmed_at ? d.confirmed_at.slice(0, 10) : "",
    `"${(d.message || "").replace(/"/g, '""')}"`,
    `"${(d.note || "").replace(/"/g, '""')}"`,
  ]);
  const csvContent = "\uFEFF" + [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `donations_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}
</script>

<template>
  <div class="page-wrap">
    <h1 class="page-title">💰 贊助者管理</h1>

    <!-- 統計 -->
    <div class="stats-row" v-if="!loading">
      <div class="stat-card highlight">
        <div class="stat-num">NT$ {{ stats.totalAmount.toLocaleString() }}</div>
        <div class="stat-label">總贊助金額</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">NT$ {{ stats.confirmedAmount.toLocaleString() }}</div>
        <div class="stat-label">已確認金額</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ stats.total }}</div>
        <div class="stat-label">總回填筆數</div>
      </div>
      <div class="stat-card green">
        <div class="stat-num">{{ stats.confirmed }}</div>
        <div class="stat-label">已確認</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-num">{{ stats.pending }}</div>
        <div class="stat-label">待確認</div>
      </div>
    </div>

    <!-- 工具列 -->
    <div class="toolbar">
      <input v-model="searchQuery" type="text" placeholder="搜尋姓名或 Email…" class="search-input" />
      <select v-model="filterStatus" class="filter-select">
        <option value="">全部狀態</option>
        <option value="pending">待確認</option>
        <option value="confirmed">已確認</option>
      </select>
      <button class="btn-export" @click="exportCsv">⬇ 匯出 CSV</button>
    </div>

    <div v-if="loading" class="loading-msg">載入中…</div>
    <div v-else-if="filtered.length === 0" class="empty-msg">
      {{ donations.length === 0 ? "尚無贊助紀錄" : "找不到符合條件的紀錄" }}
    </div>

    <div v-else class="donation-list">
      <div
        v-for="d in filtered"
        :key="d.id"
        class="donation-card"
        :class="{ confirmed: d.confirmed }"
      >
        <!-- 卡片標頭：點擊展開 -->
        <div class="card-header" @click="expandedId = expandedId === d.id ? null : d.id">
          <div class="card-left">
            <span class="d-name">{{ d.name }}</span>
            <span class="d-public-tag" :class="d.is_public === '願意公開' ? 'public' : 'anon'">
              {{ d.is_public === '願意公開' ? '公開' : '匿名' }}
            </span>
            <span class="d-status-tag" :class="d.confirmed ? 'tag-confirmed' : 'tag-pending'">
              {{ d.confirmed ? '已確認' : '待確認' }}
            </span>
          </div>
          <div class="card-right">
            <span class="d-amount">NT$ {{ d.amount }}</span>
            <span class="d-date">{{ formatDate(d.created_at) }}</span>
            <span class="expand-icon">{{ expandedId === d.id ? '▲' : '▼' }}</span>
          </div>
        </div>

        <!-- 展開詳細 -->
        <div v-if="expandedId === d.id" class="card-detail">
          <div class="detail-grid">
            <div class="detail-row">
              <span class="detail-label">電子郵件</span>
              <span class="detail-val">{{ d.email }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">匯款時間</span>
              <span class="detail-val">{{ d.donate_date }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">帳號末五碼</span>
              <span class="detail-val">{{ d.last5 }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">回填時間</span>
              <span class="detail-val">{{ d.created_at ? d.created_at.slice(0, 16).replace('T', ' ') : '—' }}</span>
            </div>
            <div v-if="d.confirmed_at" class="detail-row">
              <span class="detail-label">確認時間</span>
              <span class="detail-val">{{ d.confirmed_at.slice(0, 10) }}</span>
            </div>
            <div v-if="d.message" class="detail-row full">
              <span class="detail-label">留言</span>
              <span class="detail-val msg">{{ d.message }}</span>
            </div>
            <div class="detail-row full">
              <span class="detail-label">備註</span>
              <div class="detail-val note-wrap">
                <template v-if="editingNoteId === d.id">
                  <textarea v-model="noteInput" class="note-input" rows="2" placeholder="輸入備註…"></textarea>
                  <div class="note-btns">
                    <button class="btn-note-save" @click="saveNote(d)">儲存</button>
                    <button class="btn-note-cancel" @click="editingNoteId = null">取消</button>
                  </div>
                </template>
                <template v-else>
                  <span class="note-text">{{ d.note || '（無備註）' }}</span>
                  <button class="btn-note-edit" @click="startEditNote(d)">編輯</button>
                </template>
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button
              class="btn-confirm"
              :class="{ confirmed: d.confirmed }"
              @click="toggleConfirm(d)"
            >
              {{ d.confirmed ? '✅ 取消確認' : '☑ 標記已確認匯款' }}
            </button>
            <button class="btn-delete" @click="deleteDonation(d)">刪除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-wrap {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}
.page-title {
  font-size: 1.6rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 20px;
}

/* ── 統計 ── */
.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}
.stat-card {
  background: #f8f8f8;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 14px 22px;
  text-align: center;
  min-width: 110px;
}
.stat-card.highlight {
  background: #f0f4ff;
  border-color: #c8d8f0;
}
.stat-card.green {
  background: #f0faf0;
  border-color: #b2dfdb;
}
.stat-card.orange {
  background: #fff8f0;
  border-color: #ffe0b2;
}
.stat-num {
  font-size: 1.6rem;
  font-weight: bold;
  color: #2c3e50;
}
.stat-label {
  font-size: 0.82rem;
  color: #666;
  margin-top: 4px;
}

/* ── 工具列 ── */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
  align-items: center;
}
.search-input {
  padding: 7px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.93rem;
  font-family: inherit;
  width: 200px;
}
.filter-select {
  padding: 7px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.93rem;
  font-family: inherit;
}
.btn-export {
  padding: 7px 16px;
  background: #2c3e50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.93rem;
  cursor: pointer;
  font-family: inherit;
  margin-left: auto;
}
.btn-export:hover { background: #1a252f; }

.loading-msg, .empty-msg {
  text-align: center;
  color: #888;
  padding: 40px;
}

/* ── 贊助卡片 ── */
.donation-list { display: flex; flex-direction: column; gap: 9px; }
.donation-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  overflow: hidden;
}
.donation-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
.donation-card.confirmed { border-left: 4px solid #4caf50; }

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  gap: 12px;
}
.card-left { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0; flex-wrap: wrap; }
.d-name { font-weight: bold; color: #2c3e50; }
.d-public-tag, .d-status-tag {
  font-size: 0.76rem;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 500;
}
.d-public-tag.public { background: #e8f8ed; color: #1a7a3c; }
.d-public-tag.anon { background: #f0f0f0; color: #777; }
.tag-confirmed { background: #e8f8ed; color: #1a7a3c; }
.tag-pending { background: #fff8e1; color: #b36a00; }

.card-right { display: flex; align-items: center; gap: 14px; }
.d-amount { font-weight: bold; color: #2c3e50; font-size: 1rem; white-space: nowrap; }
.d-date { font-size: 0.82rem; color: #aaa; white-space: nowrap; }
.expand-icon { color: #aaa; font-size: 0.78rem; }

/* ── 展開詳細 ── */
.card-detail {
  border-top: 1px solid #f0f0f0;
  padding: 16px;
  background: #fafafa;
}
.detail-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.detail-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.detail-row.full { align-items: flex-start; }
.detail-label {
  font-weight: 600;
  color: #666;
  font-size: 0.88rem;
  min-width: 76px;
  padding-top: 1px;
  flex-shrink: 0;
}
.detail-val { color: #333; font-size: 0.93rem; line-height: 1.6; }
.detail-val.msg { white-space: pre-wrap; }

/* ── 備註 ── */
.note-wrap { display: flex; align-items: flex-start; gap: 10px; flex: 1; flex-wrap: wrap; }
.note-text { color: #555; font-size: 0.93rem; flex: 1; }
.btn-note-edit {
  padding: 2px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  font-size: 0.82rem;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.btn-note-edit:hover { background: #f0f0f0; }
.note-input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.93rem;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}
.note-input:focus { outline: none; border-color: #4caf50; }
.note-btns { display: flex; gap: 7px; }
.btn-note-save {
  padding: 4px 14px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.88rem;
  cursor: pointer;
  font-family: inherit;
}
.btn-note-save:hover { background: #388e3c; }
.btn-note-cancel {
  padding: 4px 12px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.88rem;
  cursor: pointer;
  font-family: inherit;
}
.btn-note-cancel:hover { background: #f5f5f5; }

/* ── 操作按鈕 ── */
.card-actions { display: flex; gap: 9px; }
.btn-confirm {
  padding: 6px 18px;
  border-radius: 6px;
  border: 1.5px solid #4caf50;
  background: white;
  color: #2e7d32;
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-confirm:hover { background: #e8f5e9; }
.btn-confirm.confirmed {
  background: #e8f5e9;
  color: #888;
  border-color: #aaa;
}
.btn-confirm.confirmed:hover { background: #f5f5f5; }
.btn-delete {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  background: #fff0f0;
  color: #c0392b;
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-delete:hover { background: #ffd5d5; }

@media (max-width: 600px) {
  .card-header { flex-direction: column; align-items: flex-start; }
  .card-right { flex-wrap: wrap; }
  .stats-row { gap: 8px; }
  .stat-card { min-width: 90px; padding: 10px 14px; }
}
</style>
