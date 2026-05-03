<script setup>
definePageMeta({ layout: "admin", middleware: "auth" });

import { ref, computed, onMounted } from "vue";

const supabase = useSupabaseClient();

// ── Tab ───────────────────────────────────────────────────────────
const activeTab = ref("list"); // 'list' | 'print' | 'compose'

// ════════════════════════════════════════════════════════════════
// TAB 1：訂閱者列表
// ════════════════════════════════════════════════════════════════
const subscribers = ref([]);
const loading = ref(true);
const searchEmail = ref("");
const filterGender = ref("");
const filterAge = ref("");
const expandedId = ref(null);

onMounted(fetchAll);

async function fetchAll() {
  loading.value = true;
  const { data, error } = await supabase
    .from("subscribers")
    .select("*")
    .order("created_at", { ascending: false });
  if (!error) subscribers.value = data || [];
  loading.value = false;
}

// 待確認取消的訂閱者
const pendingUnsubscribe = computed(() =>
  subscribers.value.filter((s) => s.unsubscribe_requested === true)
);

const filtered = computed(() => {
  return subscribers.value.filter((s) => {
    if (searchEmail.value && !s.email.includes(searchEmail.value.trim())) return false;
    if (filterGender.value && s.gender !== filterGender.value) return false;
    if (filterAge.value && s.age_group !== filterAge.value) return false;
    return true;
  });
});

// 確認刪除取消訂閱申請
async function confirmUnsubscribe(s) {
  if (!confirm(`確定要刪除訂閱者「${s.name}」（${s.email}）？`)) return;
  const { data, error } = await supabase.from("subscribers").delete().eq("id", s.id).select("id");
  if (error) alert("刪除失敗：" + error.message);
  else if (!data || data.length === 0) alert("⚠️ 未刪除任何資料（可能登入逾期或權限不足）");
  else subscribers.value = subscribers.value.filter((r) => r.id !== s.id);
}

const stats = computed(() => {
  const total = subscribers.value.length;
  const active = subscribers.value.filter((s) => s.is_active !== false).length;
  const genderCount = {};
  const ageCount = {};
  const foundCount = {};
  for (const s of subscribers.value) {
    genderCount[s.gender] = (genderCount[s.gender] || 0) + 1;
    ageCount[s.age_group] = (ageCount[s.age_group] || 0) + 1;
    if (s.how_found) foundCount[s.how_found] = (foundCount[s.how_found] || 0) + 1;
  }
  return { total, active, genderCount, ageCount, foundCount };
});

async function deleteSubscriber(id) {
  if (!confirm("確定要刪除此訂閱者？此操作無法還原。")) return;
  const { data, error } = await supabase.from("subscribers").delete().eq("id", id).select("id");
  if (error) alert("刪除失敗：" + error.message);
  else if (!data || data.length === 0) alert("⚠️ 未刪除任何資料（可能登入逾期或權限不足）");
  else subscribers.value = subscribers.value.filter((s) => s.id !== id);
}

async function toggleActive(s) {
  const newVal = s.is_active === false ? true : false;
  const { data, error } = await supabase
    .from("subscribers")
    .update({ is_active: newVal })
    .eq("id", s.id)
    .select("id");
  if (error) alert("狀態更新失敗：" + error.message);
  else if (!data || data.length === 0) alert("⚠️ 狀態未更新（可能登入逾期或權限不足）");
  else s.is_active = newVal;
}

function exportCsv() {
  const header = ["ID", "訂閱時間", "姓名", "性別", "年齡層", "信仰背景", "Email", "如何得知", "留言", "狀態"];
  const rows = filtered.value.map((s) => [
    s.id,
    s.created_at ? s.created_at.slice(0, 10) : "",
    `"${(s.name || "").replace(/"/g, '""')}"`,
    s.gender || "",
    s.age_group || "",
    `"${(s.faith_background || "").replace(/"/g, '""')}"`,
    s.email || "",
    `"${(s.how_found || "").replace(/"/g, '""')}"`,
    `"${(s.message || "").replace(/"/g, '""')}"`,
    s.is_active === false ? "停用" : "啟用",
  ]);
  const csvContent = "\uFEFF" + [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

// ════════════════════════════════════════════════════════════════
// TAB 2：紙本訂閱者
// ════════════════════════════════════════════════════════════════
const printSubscribers = ref([]);
const printLoading = ref(true);
const printSearch = ref("");
const printFilterSubType = ref("");
const printExpandedId = ref(null);

onMounted(fetchPrint);

async function fetchPrint() {
  printLoading.value = true;
  const { data, error } = await supabase
    .from("print_subscribers")
    .select("*")
    .order("created_at", { ascending: false });
  if (!error) printSubscribers.value = data || [];
  printLoading.value = false;
}

const printStats = computed(() => {
  const total = printSubscribers.value.length;
  const subTypeCount = {};
  for (const s of printSubscribers.value) {
    if (s.sub_type) subTypeCount[s.sub_type] = (subTypeCount[s.sub_type] || 0) + 1;
  }
  return { total, subTypeCount };
});

const printFiltered = computed(() => {
  return printSubscribers.value.filter((s) => {
    if (printSearch.value) {
      const q = printSearch.value.trim().toLowerCase();
      const hay = `${s.email || ""} ${s.recipient_name || ""} ${s.reader_name || ""} ${s.phone || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (printFilterSubType.value && s.sub_type !== printFilterSubType.value) return false;
    return true;
  });
});

async function deletePrintSubscriber(id) {
  if (!confirm("確定要刪除此紙本訂閱者？此操作無法還原。")) return;
  const { data, error } = await supabase.from("print_subscribers").delete().eq("id", id).select("id");
  if (error) alert("刪除失敗：" + error.message);
  else if (!data || data.length === 0) alert("⚠️ 未刪除任何資料（可能登入逾期或權限不足）");
  else printSubscribers.value = printSubscribers.value.filter((s) => s.id !== id);
}

function exportPrintCsv() {
  const header = [
    "ID", "訂閱時間", "Email", "訂閱方式", "期數",
    "收件人姓名", "收件地址", "聯絡電話", "寄送備註",
    "讀者姓名", "性別", "年齡層", "信仰背景", "得知來源", "留言",
  ];
  const rows = printFiltered.value.map((s) => [
    s.id,
    s.created_at ? s.created_at.slice(0, 10) : "",
    s.email || "",
    `"${(s.sub_type || "").replace(/"/g, '""')}"`,
    `"${(Array.isArray(s.issues) ? s.issues.join("、") : "").replace(/"/g, '""')}"`,
    `"${(s.recipient_name || "").replace(/"/g, '""')}"`,
    `"${(s.address || "").replace(/"/g, '""')}"`,
    `"${(s.phone || "").replace(/"/g, '""')}"`,
    `"${(s.note || "").replace(/"/g, '""')}"`,
    `"${(s.reader_name || "").replace(/"/g, '""')}"`,
    s.gender || "",
    s.age_group || "",
    `"${(s.faith_background || "").replace(/"/g, '""')}"`,
    `"${(s.how_found || "").replace(/"/g, '""')}"`,
    `"${(s.message || "").replace(/"/g, '""')}"`,
  ]);
  const csvContent = "﻿" + [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `print_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════════════
// TAB 3：發送電子報
// ════════════════════════════════════════════════════════════════

// 預設範本（參考截圖格式）
const DEFAULT_TEMPLATE = `親愛的讀者{{姓名}}，感謝您對本雜誌的訂閱及支持，第___期的《無境界者》雜誌已經上線囉~

（在此填寫本期主題介紹...）

🎉本期封面故事：
（文章標題）

🎉本期特稿：
（文章列表）


😜社群帳號歡迎追蹤！
Instagram：https://www.instagram.com/nonchurch2025/
Threads：https://www.threads.com/@nonchurch2025/

📕雜誌資訊：
🌐 線上閱讀：（網站連結）
📮 訂閱《無境界者》：（訂閱頁連結）

📄徵稿公告：
下期主題：（主題名稱），詳情請見：（連結）
截稿日期：（日期）`;

const compose = ref({
  subject: "《無境界者》訂閱者通知：第___期已上線",
  bodyText: DEFAULT_TEMPLATE,
  pdfLink: "",
  testEmail: "",
});

const sendStep = ref("idle"); // idle | testing | sending | done | error
const sendResult = ref(null);
const sendErrorMsg = ref("");
const showConfirm = ref(false);

// 預覽：把 {{姓名}} 換成示範名字，並簡易轉 HTML
const previewHtml = computed(() => {
  const text = compose.value.bodyText.replace(/\{\{姓名\}\}/g, "王小明");
  return text
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para
        .split("\n")
        .map((line) =>
          line.replace(
            /(https?:\/\/[^\s<>"]+)/g,
            '<a href="$1" style="color:#4caf50;" target="_blank">$1</a>'
          )
        )
        .join("<br>");
      return `<p style="margin:0 0 14px;line-height:1.9;">${lines}</p>`;
    })
    .join("");
});

const activeCount = computed(() =>
  subscribers.value.filter((s) => s.is_active !== false).length
);

// 測試發送
async function sendTest() {
  if (!compose.value.testEmail.trim()) {
    alert("請填寫測試信箱");
    return;
  }
  sendStep.value = "testing";
  sendErrorMsg.value = "";
  try {
    const res = await $fetch("/api/send-newsletter", {
      method: "POST",
      body: {
        subject: compose.value.subject,
        bodyText: compose.value.bodyText,
        pdfLink: compose.value.pdfLink || null,
        testEmail: compose.value.testEmail.trim(),
      },
    });
    alert(`✅ 測試信件已寄出至 ${compose.value.testEmail}`);
  } catch (err) {
    alert("❌ 發送失敗：" + (err?.data?.message || err.message));
  } finally {
    sendStep.value = "idle";
  }
}

// 正式發送
async function sendAll() {
  showConfirm.value = false;
  sendStep.value = "sending";
  sendResult.value = null;
  sendErrorMsg.value = "";
  try {
    const res = await $fetch("/api/send-newsletter", {
      method: "POST",
      body: {
        subject: compose.value.subject,
        bodyText: compose.value.bodyText,
        pdfLink: compose.value.pdfLink || null,
      },
    });
    sendResult.value = res;
    sendStep.value = "done";
  } catch (err) {
    sendErrorMsg.value = err?.data?.message || err.message || "發送失敗";
    sendStep.value = "error";
  }
}
</script>

<template>
  <div class="page-wrap">
    <h1 class="page-title">📋 訂閱者管理</h1>

    <!-- Tab 切換 -->
    <div class="tabs">
      <button
        :class="['tab-btn', { active: activeTab === 'list' }]"
        @click="activeTab = 'list'"
      >
        👥 電子報訂閱者
        <span class="tab-badge">{{ subscribers.length }}</span>
        <span v-if="pendingUnsubscribe.length > 0" class="tab-badge-alert">
          {{ pendingUnsubscribe.length }} 待確認
        </span>
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'print' }]"
        @click="activeTab = 'print'"
      >
        📦 紙本訂閱者
        <span class="tab-badge">{{ printSubscribers.length }}</span>
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'compose' }]"
        @click="activeTab = 'compose'"
      >
        ✉️ 發送電子報
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         TAB 1：訂閱者列表
    ══════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'list'">

      <!-- ── 待確認取消訂閱 ── -->
      <div v-if="pendingUnsubscribe.length > 0" class="unsub-alert">
        <div class="unsub-alert-title">
          ⚠️ 有 {{ pendingUnsubscribe.length }} 位讀者申請取消訂閱，請確認後刪除
        </div>
        <div class="unsub-list">
          <div v-for="s in pendingUnsubscribe" :key="s.id" class="unsub-item">
            <div class="unsub-info">
              <span class="unsub-name">{{ s.name }}</span>
              <span class="unsub-email">{{ s.email }}</span>
              <span class="unsub-date">
                申請於 {{ s.unsubscribe_requested_at ? s.unsubscribe_requested_at.slice(0,10) : '—' }}
              </span>
            </div>
            <button class="btn-confirm-del" @click="confirmUnsubscribe(s)">確認刪除</button>
          </div>
        </div>
      </div>

      <!-- 統計 -->
      <div class="stats-row" v-if="!loading">
        <div class="stat-card">
          <div class="stat-num">{{ stats.total }}</div>
          <div class="stat-label">總訂閱人數</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ stats.active }}</div>
          <div class="stat-label">啟用中</div>
        </div>
        <div class="stat-breakdown">
          <div class="breakdown-title">性別分布</div>
          <div v-for="(count, g) in stats.genderCount" :key="g" class="breakdown-row">
            <span class="breakdown-key">{{ g }}</span>
            <span class="breakdown-val">{{ count }} 人</span>
          </div>
        </div>
        <div class="stat-breakdown">
          <div class="breakdown-title">年齡分布</div>
          <div v-for="(count, a) in stats.ageCount" :key="a" class="breakdown-row">
            <span class="breakdown-key">{{ a }}</span>
            <span class="breakdown-val">{{ count }} 人</span>
          </div>
        </div>
        <div class="stat-breakdown">
          <div class="breakdown-title">得知來源</div>
          <div v-for="(count, f) in stats.foundCount" :key="f" class="breakdown-row">
            <span class="breakdown-key">{{ f }}</span>
            <span class="breakdown-val">{{ count }} 人</span>
          </div>
        </div>
      </div>

      <!-- 工具列 -->
      <div class="toolbar">
        <input v-model="searchEmail" type="text" placeholder="搜尋 Email…" class="search-input" />
        <select v-model="filterGender" class="filter-select">
          <option value="">全部性別</option>
          <option v-for="g in ['男','女','非二元性別','不便透露']" :key="g" :value="g">{{ g }}</option>
        </select>
        <select v-model="filterAge" class="filter-select">
          <option value="">全部年齡層</option>
          <option v-for="a in ['20 歲以下','21–30 歲','31–40 歲','41–50 歲','51–60 歲','61 歲以上','19歲以下','20~29歲','20~30歲','30~39歲','30~40歲','40~49歲','40~50歲','50~59歲','60~69歲','70歲以上']" :key="a" :value="a">{{ a }}</option>
        </select>
        <button class="btn-export" @click="exportCsv">⬇ 匯出 CSV</button>
      </div>

      <div v-if="loading" class="loading-msg">載入中…</div>
      <div v-else-if="filtered.length === 0" class="empty-msg">
        {{ subscribers.length === 0 ? "尚無訂閱者" : "找不到符合條件的訂閱者" }}
      </div>

      <div v-else class="subscriber-list">
        <div
          v-for="s in filtered"
          :key="s.id"
          class="subscriber-card"
          :class="{ inactive: s.is_active === false }"
        >
          <div class="card-header" @click="expandedId = expandedId === s.id ? null : s.id">
            <div class="card-main">
              <span class="s-name">{{ s.name }}</span>
              <span class="s-tags">
                <span class="tag gender">{{ s.gender }}</span>
                <span class="tag age">{{ s.age_group }}</span>
                <span v-if="s.is_active === false" class="tag inactive-tag">停用</span>
              </span>
            </div>
            <div class="card-meta">
              <span class="s-email">{{ s.email }}</span>
              <span class="s-date">{{ formatDate(s.created_at) }}</span>
            </div>
            <span class="expand-icon">{{ expandedId === s.id ? "▲" : "▼" }}</span>
          </div>

          <div v-if="expandedId === s.id" class="card-detail">
            <div class="detail-row">
              <span class="detail-label">信仰背景</span>
              <span class="detail-val">{{ s.faith_background || "—" }}</span>
            </div>
            <div class="detail-row" v-if="s.how_found">
              <span class="detail-label">得知來源</span>
              <span class="detail-val">{{ s.how_found }}</span>
            </div>
            <div class="detail-row" v-if="s.message">
              <span class="detail-label">留言</span>
              <span class="detail-val msg">{{ s.message }}</span>
            </div>
            <div class="card-actions">
              <button class="btn-toggle" @click="toggleActive(s)">
                {{ s.is_active === false ? "重新啟用" : "停用" }}
              </button>
              <button class="btn-delete" @click="deleteSubscriber(s.id)">刪除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         TAB 2：紙本訂閱者
    ══════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'print'">

      <!-- 統計 -->
      <div class="stats-row" v-if="!printLoading">
        <div class="stat-card">
          <div class="stat-num">{{ printStats.total }}</div>
          <div class="stat-label">紙本訂閱總數</div>
        </div>
        <div class="stat-breakdown" v-if="Object.keys(printStats.subTypeCount).length">
          <div class="breakdown-title">訂閱方式</div>
          <div v-for="(count, k) in printStats.subTypeCount" :key="k" class="breakdown-row">
            <span class="breakdown-key">{{ k }}</span>
            <span class="breakdown-val">{{ count }} 人</span>
          </div>
        </div>
      </div>

      <!-- 工具列 -->
      <div class="toolbar">
        <input v-model="printSearch" type="text" placeholder="搜尋 Email / 姓名 / 電話…" class="search-input" />
        <select v-model="printFilterSubType" class="filter-select">
          <option value="">全部訂閱方式</option>
          <option v-for="k in Object.keys(printStats.subTypeCount)" :key="k" :value="k">{{ k }}</option>
        </select>
        <button class="btn-export" @click="exportPrintCsv">⬇ 匯出 CSV</button>
      </div>

      <div v-if="printLoading" class="loading-msg">載入中…</div>
      <div v-else-if="printFiltered.length === 0" class="empty-msg">
        {{ printSubscribers.length === 0 ? "尚無紙本訂閱者" : "找不到符合條件的紙本訂閱者" }}
      </div>

      <div v-else class="subscriber-list">
        <div
          v-for="s in printFiltered"
          :key="s.id"
          class="subscriber-card"
        >
          <div class="card-header" @click="printExpandedId = printExpandedId === s.id ? null : s.id">
            <div class="card-main">
              <span class="s-name">{{ s.recipient_name }}</span>
              <span class="s-tags">
                <span class="tag age">{{ s.sub_type }}</span>
                <span v-if="s.issues && s.issues.length" class="tag gender">{{ s.issues.length }} 期</span>
              </span>
            </div>
            <div class="card-meta">
              <span class="s-email">{{ s.email }}</span>
              <span class="s-date">{{ formatDate(s.created_at) }}</span>
            </div>
            <span class="expand-icon">{{ printExpandedId === s.id ? "▲" : "▼" }}</span>
          </div>

          <div v-if="printExpandedId === s.id" class="card-detail">
            <div class="detail-row">
              <span class="detail-label">訂閱方式</span>
              <span class="detail-val">{{ s.sub_type }}</span>
            </div>
            <div class="detail-row" v-if="s.issues && s.issues.length">
              <span class="detail-label">期數</span>
              <span class="detail-val">{{ s.issues.join("、") }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">收件地址</span>
              <span class="detail-val">{{ s.address }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">聯絡電話</span>
              <span class="detail-val">{{ s.phone }}</span>
            </div>
            <div class="detail-row" v-if="s.note">
              <span class="detail-label">寄送備註</span>
              <span class="detail-val msg">{{ s.note }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">讀者姓名</span>
              <span class="detail-val">{{ s.reader_name }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">性別 / 年齡</span>
              <span class="detail-val">{{ s.gender }} / {{ s.age_group }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">信仰背景</span>
              <span class="detail-val">{{ s.faith_background || "—" }}</span>
            </div>
            <div class="detail-row" v-if="s.how_found">
              <span class="detail-label">得知來源</span>
              <span class="detail-val">{{ s.how_found }}</span>
            </div>
            <div class="detail-row" v-if="s.message">
              <span class="detail-label">留言</span>
              <span class="detail-val msg">{{ s.message }}</span>
            </div>
            <div class="card-actions">
              <button class="btn-delete" @click="deletePrintSubscriber(s.id)">刪除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         TAB 3：發送電子報
    ══════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'compose'" class="compose-wrap">

      <!-- 左欄：編輯 -->
      <div class="compose-left">
        <div class="compose-card">
          <h2 class="section-title">📝 撰寫電子報</h2>

          <!-- 主旨 -->
          <div class="c-field">
            <label class="c-label">主旨 <span class="required">*</span></label>
            <input
              v-model="compose.subject"
              type="text"
              class="c-input"
              placeholder="《無境界者》訂閱者通知：第___期已上線"
            />
          </div>

          <!-- 內文 -->
          <div class="c-field">
            <label class="c-label">
              內文 <span class="required">*</span>
              <span class="hint-tag">用 <code>{{姓名}}</code> 自動替換收件人姓名</span>
            </label>
            <textarea
              v-model="compose.bodyText"
              class="c-textarea"
              rows="22"
              placeholder="親愛的讀者{{姓名}}，..."
            ></textarea>
            <div class="char-count">{{ compose.bodyText.length }} 字</div>
          </div>

          <!-- PDF 連結 -->
          <div class="c-field">
            <label class="c-label">
              📎 PDF 連結
              <span class="hint-tag">選填，可從媒體庫取得 Cloudinary 連結</span>
            </label>
            <input
              v-model="compose.pdfLink"
              type="url"
              class="c-input"
              placeholder="https://res.cloudinary.com/nonchurch2025/..."
            />
            <p v-if="compose.pdfLink" class="pdf-preview-hint">
              ✅ 信件底部將顯示「閱讀本期完整 PDF」按鈕
            </p>
          </div>
        </div>

        <!-- 測試發送 -->
        <div class="compose-card test-card">
          <h2 class="section-title">🧪 先測試發送</h2>
          <p class="hint-text">建議先寄一封給自己確認排版正確，再正式寄出。</p>
          <div class="test-row">
            <input
              v-model="compose.testEmail"
              type="email"
              class="c-input"
              placeholder="your@email.com"
              style="flex:1"
            />
            <button
              class="btn-test"
              @click="sendTest"
              :disabled="sendStep === 'testing'"
            >
              {{ sendStep === 'testing' ? '寄送中…' : '寄測試信' }}
            </button>
          </div>
        </div>

        <!-- 正式發送 -->
        <div class="compose-card send-card">
          <h2 class="section-title">🚀 正式發送</h2>
          <p class="hint-text">
            將寄給所有 <strong>{{ activeCount }} 位</strong> 啟用中的訂閱者，
            每封間隔 0.4 秒，預計約需 <strong>{{ Math.ceil(activeCount * 0.4 / 60) }} 分鐘</strong>。
          </p>

          <!-- idle -->
          <div v-if="sendStep === 'idle' || sendStep === 'testing'">
            <button class="btn-send-all" @click="showConfirm = true">
              ✉️ 寄給全部訂閱者（{{ activeCount }} 人）
            </button>
          </div>

          <!-- 確認對話框 -->
          <div v-if="showConfirm" class="confirm-box">
            <p>⚠️ 確定要寄出電子報給 <strong>{{ activeCount }} 位</strong>訂閱者嗎？</p>
            <p class="hint-text">主旨：{{ compose.subject }}</p>
            <div class="confirm-btns">
              <button class="btn-confirm-yes" @click="sendAll">確定寄出</button>
              <button class="btn-confirm-no" @click="showConfirm = false">取消</button>
            </div>
          </div>

          <!-- 發送中 -->
          <div v-if="sendStep === 'sending'" class="send-progress">
            <div class="progress-spinner"></div>
            <p>正在發送中，請勿關閉此頁面…</p>
            <p class="hint-text">（發送過程約需 {{ Math.ceil(activeCount * 0.4 / 60) }} 分鐘）</p>
          </div>

          <!-- 完成 -->
          <div v-if="sendStep === 'done' && sendResult" class="result-done">
            <div class="result-icon">✅</div>
            <p><strong>發送完成！</strong></p>
            <p>成功 {{ sendResult.successCount }} 封 / 共 {{ sendResult.total }} 封</p>
            <div v-if="sendResult.failedCount > 0" class="failed-list">
              <p class="failed-title">⚠️ 失敗 {{ sendResult.failedCount }} 封：</p>
              <div v-for="f in sendResult.failed" :key="f.email" class="failed-item">
                {{ f.email }} — {{ f.reason }}
              </div>
            </div>
            <button class="btn-secondary" @click="sendStep = 'idle'">關閉</button>
          </div>

          <!-- 錯誤 -->
          <div v-if="sendStep === 'error'" class="result-error">
            <div class="result-icon">❌</div>
            <p><strong>發送失敗</strong></p>
            <p class="hint-text">{{ sendErrorMsg }}</p>
            <button class="btn-secondary" @click="sendStep = 'idle'">返回</button>
          </div>
        </div>
      </div>

      <!-- 右欄：預覽 -->
      <div class="compose-right">
        <div class="preview-card">
          <h2 class="section-title">👁 預覽（示範：王小明）</h2>
          <div class="email-preview">
            <!-- Header -->
            <div class="ep-header">《無境界者》雜誌</div>
            <!-- Subject -->
            <div class="ep-subject">主旨：{{ compose.subject || "（未填）" }}</div>
            <!-- Body -->
            <div class="ep-body" v-html="previewHtml"></div>
            <!-- PDF button preview -->
            <div v-if="compose.pdfLink" class="ep-pdf-btn">
              📖 閱讀本期完整 PDF
            </div>
            <!-- Footer -->
            <div class="ep-footer">
              您收到此郵件是因為您曾訂閱《無境界者》雜誌電子報。<br>
              如欲取消訂閱，請回覆此郵件並告知。
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-wrap {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
.page-title {
  font-size: 1.6rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 20px;
}

/* ── Tabs ── */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 0;
}
.tab-btn {
  padding: 10px 22px;
  border: none;
  background: none;
  font-size: 1rem;
  font-family: inherit;
  color: #888;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tab-btn:hover { color: #2c3e50; }
.tab-btn.active { color: #2c3e50; font-weight: bold; border-bottom-color: #4caf50; }
.tab-badge {
  background: #e8f0fe;
  color: #2c5aa0;
  border-radius: 20px;
  font-size: 0.78rem;
  padding: 1px 7px;
  font-weight: 600;
}
.tab-badge-alert {
  background: #e74c3c;
  color: white;
  border-radius: 20px;
  font-size: 0.78rem;
  padding: 1px 8px;
  font-weight: 600;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.65; }
}

/* ── 待確認取消訂閱 ── */
.unsub-alert {
  background: #fff5f5;
  border: 1.5px solid #f5c6c6;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 20px;
}
.unsub-alert-title {
  font-weight: bold;
  color: #c0392b;
  margin-bottom: 12px;
  font-size: 0.95rem;
}
.unsub-list { display: flex; flex-direction: column; gap: 8px; }
.unsub-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  border: 1px solid #f5c6c6;
  border-radius: 7px;
  padding: 10px 14px;
  gap: 12px;
}
.unsub-info { display: flex; align-items: center; gap: 12px; flex: 1; flex-wrap: wrap; }
.unsub-name { font-weight: bold; color: #2c3e50; }
.unsub-email { font-size: 0.88rem; color: #555; }
.unsub-date { font-size: 0.8rem; color: #aaa; }
.btn-confirm-del {
  padding: 6px 18px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.88rem;
  white-space: nowrap;
}
.btn-confirm-del:hover { background: #c0392b; }

/* ── 統計 ── */
.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 22px;
}
.stat-card {
  background: #f0f4ff;
  border: 1px solid #c8d8f0;
  border-radius: 10px;
  padding: 14px 22px;
  text-align: center;
  min-width: 100px;
}
.stat-num { font-size: 2rem; font-weight: bold; color: #2c3e50; }
.stat-label { font-size: 0.82rem; color: #666; margin-top: 4px; }
.stat-breakdown {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 12px 16px;
  min-width: 130px;
}
.breakdown-title { font-weight: bold; color: #444; margin-bottom: 7px; font-size: 0.88rem; }
.breakdown-row { display: flex; justify-content: space-between; gap: 10px; font-size: 0.88rem; color: #555; padding: 1px 0; }
.breakdown-key { color: #333; }
.breakdown-val { font-weight: 600; color: #2c3e50; }

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
  width: 190px;
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

/* ── 訂閱者卡片 ── */
.subscriber-list { display: flex; flex-direction: column; gap: 9px; }
.subscriber-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  overflow: hidden;
}
.subscriber-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
.subscriber-card.inactive { opacity: 0.55; }
.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
}
.card-main { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0; }
.s-name { font-weight: bold; color: #2c3e50; white-space: nowrap; }
.s-tags { display: flex; gap: 5px; flex-wrap: wrap; }
.tag { font-size: 0.76rem; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
.tag.gender { background: #e8f0fe; color: #2c5aa0; }
.tag.age { background: #e8f8ed; color: #1a7a3c; }
.tag.inactive-tag { background: #f0f0f0; color: #999; }
.card-meta { display: flex; gap: 12px; align-items: center; }
.s-email { font-size: 0.88rem; color: #555; }
.s-date { font-size: 0.8rem; color: #aaa; white-space: nowrap; }
.expand-icon { color: #aaa; font-size: 0.78rem; }
.card-detail { border-top: 1px solid #f0f0f0; padding: 14px 16px; background: #fafafa; }
.detail-row { display: flex; gap: 14px; margin-bottom: 9px; align-items: flex-start; }
.detail-label { font-weight: 600; color: #666; font-size: 0.88rem; min-width: 68px; padding-top: 1px; }
.detail-val { color: #333; font-size: 0.93rem; line-height: 1.6; }
.detail-val.msg { white-space: pre-wrap; }
.card-actions { display: flex; gap: 9px; margin-top: 12px; }
.btn-toggle, .btn-delete {
  padding: 5px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.88rem;
}
.btn-toggle { background: #e8f0fe; color: #2c5aa0; }
.btn-toggle:hover { background: #d0e4ff; }
.btn-delete { background: #fff0f0; color: #c0392b; }
.btn-delete:hover { background: #ffd5d5; }

/* ══════════════════════════════════════════════════
   TAB 2：發送電子報
══════════════════════════════════════════════════ */
.compose-wrap {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.compose-left { flex: 0 0 480px; display: flex; flex-direction: column; gap: 16px; }
.compose-right { flex: 1; min-width: 0; }

.compose-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 22px 24px;
}
.section-title {
  font-size: 1.1rem;
  font-weight: bold;
  color: #2c3e50;
  margin: 0 0 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid #eee;
}

/* ── 欄位 ── */
.c-field { margin-bottom: 18px; }
.c-label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
  font-size: 0.95rem;
}
.required { color: #e74c3c; margin-left: 2px; }
.hint-tag {
  font-weight: normal;
  font-size: 0.82rem;
  color: #888;
  margin-left: 6px;
}
.c-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.c-input:focus { outline: none; border-color: #4caf50; box-shadow: 0 0 0 2px rgba(76,175,80,0.15); }
.c-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.97rem;
  font-family: inherit;
  box-sizing: border-box;
  resize: vertical;
  line-height: 1.65;
  transition: border-color 0.2s;
}
.c-textarea:focus { outline: none; border-color: #4caf50; box-shadow: 0 0 0 2px rgba(76,175,80,0.15); }
.char-count { font-size: 0.8rem; color: #aaa; text-align: right; margin-top: 3px; }
.pdf-preview-hint { font-size: 0.85rem; color: #4caf50; margin: 4px 0 0; }
.hint-text { font-size: 0.9rem; color: #777; line-height: 1.6; margin: 0 0 12px; }

/* ── 測試 ── */
.test-card { background: #fafff8; border-color: #c8e6c9; }
.test-row { display: flex; gap: 10px; align-items: center; }
.btn-test {
  padding: 9px 18px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.btn-test:hover { background: #388e3c; }
.btn-test:disabled { background: #aaa; cursor: not-allowed; }

/* ── 正式發送 ── */
.send-card { background: #fff8f0; border-color: #ffe0b2; }
.btn-send-all {
  width: 100%;
  padding: 14px;
  background: #e67e22;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.05rem;
  font-weight: bold;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-send-all:hover { background: #cf6d17; }

.confirm-box {
  background: #fff3e0;
  border: 1px solid #ffcc02;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}
.confirm-box p { margin: 0 0 8px; }
.confirm-btns { display: flex; gap: 10px; margin-top: 12px; }
.btn-confirm-yes {
  padding: 9px 22px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
  font-family: inherit;
}
.btn-confirm-yes:hover { background: #c0392b; }
.btn-confirm-no {
  padding: 9px 22px;
  background: white;
  border: 1px solid #aaa;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
  font-family: inherit;
}
.btn-confirm-no:hover { background: #f5f5f5; }

.send-progress {
  text-align: center;
  padding: 20px 0;
}
.progress-spinner {
  width: 36px;
  height: 36px;
  border: 4px solid #ffe0b2;
  border-top-color: #e67e22;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.result-done { text-align: center; padding: 16px 0; }
.result-error { text-align: center; padding: 16px 0; }
.result-icon { font-size: 2.4rem; margin-bottom: 8px; }
.failed-list { background: #fff5f5; border-radius: 6px; padding: 10px 14px; margin: 10px 0; text-align: left; }
.failed-title { font-weight: bold; color: #c0392b; margin: 0 0 6px; }
.failed-item { font-size: 0.85rem; color: #555; margin: 2px 0; }
.btn-secondary {
  margin-top: 12px;
  padding: 8px 28px;
  background: white;
  border: 1.5px solid #aaa;
  border-radius: 30px;
  font-size: 0.95rem;
  cursor: pointer;
  font-family: inherit;
}
.btn-secondary:hover { background: #f5f5f5; }

/* ── 預覽 ── */
.preview-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 20px 22px;
  position: sticky;
  top: 20px;
}
.email-preview {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  font-family: 'Microsoft JhengHei', serif;
  font-size: 14px;
  max-height: 700px;
  overflow-y: auto;
}
.ep-header {
  background: linear-gradient(135deg, #4caf50, #81c784);
  color: white;
  font-size: 16px;
  font-weight: bold;
  padding: 16px 22px;
  letter-spacing: 0.1em;
}
.ep-subject {
  background: #f5f5f5;
  padding: 10px 22px;
  font-size: 12px;
  color: #666;
  border-bottom: 1px solid #eee;
}
.ep-body {
  padding: 22px 22px 10px;
  color: #333;
  line-height: 1.9;
}
.ep-pdf-btn {
  margin: 0 22px 18px;
  text-align: center;
  background: #4caf50;
  color: white;
  padding: 11px;
  border-radius: 24px;
  font-weight: bold;
  font-size: 14px;
}
.ep-footer {
  background: #f8f8f8;
  border-top: 1px solid #eee;
  padding: 14px 22px;
  font-size: 11px;
  color: #aaa;
  text-align: center;
  line-height: 1.7;
}

@media (max-width: 900px) {
  .compose-wrap { flex-direction: column; }
  .compose-left { flex: none; width: 100%; }
}
</style>
