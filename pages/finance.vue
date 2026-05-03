<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useLanguage } from "~/composables/useLanguage";
import { supabase } from "~/supabase";
import { listPeriods, loadPeriodWithBalance } from "~/utils/financeDb";

const { currentLang } = useLanguage();

// 從 DB 載入：期次清單 + 當前選定期的明細（含承接前期結餘）
const periods = ref([]); // [{ issue, dateRange, label }]
const activeKey = ref(null);
const activePeriod = ref(null); // { issue, dateRange, rows[含 balance] }
const loadingLedger = ref(false);

const fetchPeriodsList = async () => {
  const list = await listPeriods(supabase);
  periods.value = list.map((p) => ({
    key: p.issue,
    issue: p.issue,
    dateRange: p.date_range,
    label: `第${p.issue}期`,
  }));
  if (periods.value.length && activeKey.value == null) {
    activeKey.value = periods.value[periods.value.length - 1].key;
  }
};

const fetchActivePeriod = async () => {
  if (activeKey.value == null) return;
  loadingLedger.value = true;
  try {
    const data = await loadPeriodWithBalance(supabase, activeKey.value);
    if (data) {
      activePeriod.value = {
        ...data,
        label: `第${data.issue}期`,
      };
    } else {
      activePeriod.value = null;
    }
  } finally {
    loadingLedger.value = false;
  }
};

watch(activeKey, fetchActivePeriod);
onMounted(async () => {
  await fetchPeriodsList();
  await fetchActivePeriod();
});

const pageTitles = {
  "zh-TW": "財務資訊",
  "zh-HK": "財務資訊",
  "zh-CN": "财务资讯",
  en: "Finance",
  ja: "財務情報",
  ko: "재무 정보",
};

const t = computed(() => ({
  pageTitle: pageTitles[currentLang.value] || pageTitles["zh-TW"],
}));

useSeoMeta({
  title: () => t.value.pageTitle + " - 無境界者雜誌",
});

const fmt = (n) => {
  if (n === null || n === undefined || n === "") return "";
  return Number(n).toLocaleString("zh-TW");
};


const categoryColors = {
  個人贊助:     "#2e7d32",
  機構補助:     "#1565c0",
  專案贊助:     "#1976d2",
  雜誌訂閱:     "#00838f",
  紙本訂閱:     "#00838f",
  紙本印製:     "#e65100",
  雜誌寄送:     "#7b1fa2",
  網路維護:     "#37474f",
  雜費:         "#78909c",
  利息:         "#558b2f",
  編輯費用:     "#bf360c",
  特稿稿費:     "#880e4f",
  雜誌代碼申請: "#4e342e",
};
const getCatColor = (cat) => categoryColors[cat] || "#666";

// 贊助表單
const donateName   = ref("");
const donateEmail  = ref("");
const donateState  = ref("idle"); // idle | loading | success | error
const donateErrors = ref({ name: "", email: "" });

async function submitDonate() {
  donateErrors.value = { name: "", email: "" };
  let valid = true;
  if (!donateName.value.trim()) { donateErrors.value.name = "請填寫您的姓名或機構名稱"; valid = false; }
  if (!donateEmail.value.trim()) {
    donateErrors.value.email = "請填寫電子信箱"; valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donateEmail.value.trim())) {
    donateErrors.value.email = "電子郵件格式不正確"; valid = false;
  }
  if (!valid) return;

  donateState.value = "loading";
  try {
    await $fetch("/api/donate-inquiry", {
      method: "POST",
      body: { name: donateName.value.trim(), email: donateEmail.value.trim() },
    });
    donateState.value = "success";
  } catch (e) {
    donateErrors.value.email = e?.data?.message || "發送失敗，請稍後再試";
    donateState.value = "idle";
  }
}
</script>

<template>
  <div class="finance-page">
    <h1 class="page-main-title">
      <span class="emoji">💰</span>{{ t.pageTitle }}<span class="emoji">💰</span>
    </h1>
    <div class="main-divider"></div>

    <!-- 說明文字 -->
    <div class="finance-content">
      <p>《無境界者》是一份非商業導向的獨立信仰雜誌。為了達到最高的傳播效率，並盡可能減少文字事工的成本與開銷，我們採取以線上事工為主、少量紙本為輔的發行策略。</p>

      <p>儘管我們致力於樽節開支，但維持一份獨立刊物的長期運作，每一期仍不可避免地需要基本開銷。本刊每期（兩個月）的經常性費用雖然會依情況浮動，但大致涵蓋以下項目：</p>

      <ul>
        <li>編輯作業開銷：約 4,000 元</li>
        <li>網域與資料庫維護：約 2,000 元</li>
        <li>少量紙本印製：約 5,000 至 9,000 元</li>
        <li>特約專稿稿費：約 1,500 至 3,000 元</li>
      </ul>

      <p>在創刊的前三期，所有維持刊物運作的經費皆是由團隊自行吸收。然而，由於本刊目前並無固定的資金來源與機構奧援，為了讓這份體制外的自由聲音得以長久延續，我們自第四期開始，正式對外接受小額贊助，主要用作支持網站運作與少量紙本印製的費用。若您認同本刊的理念，期盼您能成為我們的後盾，給予我們實質的財務贊助與支持。</p>

      <p>我們也深知，在這個資訊快速流動的世代裡，您願意撥出寶貴的時間來閱讀我們所書寫的文字，本身就是您給予我們最珍貴的付出。我們誠摯邀請您成為《無境界者》的守護者，讓這份獨立的信仰省思不致淹沒在現實的開銷中。</p>

      <p>願我們能繼續在紙本與線上的對話裡，建立深厚的跨界情誼，共同見證文字事工的無限可能。</p>

      <div class="finance-img-wrap">
        <img
          src="https://res.cloudinary.com/nonchurch2025/image/upload/v1776557629/Gemini_Generated_Image_g8c8ftg8c8ftg8c8_PhotoGrid.png"
          alt="財務資訊圖示"
          class="finance-img"
        />
      </div>
    </div>

    <!-- 每期財務明細 -->
    <section class="ledger-section">
      <h3 class="section-heading">每期財務明細</h3>

      <!-- 期數 Tab -->
      <div class="period-tabs">
        <button
          v-for="p in periods"
          :key="p.key"
          class="period-tab"
          :class="{ active: activeKey === p.key }"
          @click="activeKey = p.key"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- 表格 -->
      <div v-if="activePeriod" class="table-wrap">
        <p class="period-range">{{ activePeriod.label }}（{{ activePeriod.dateRange }}）</p>
        <div class="table-scroll">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>編號</th>
                <th>日期</th>
                <th>收支</th>
                <th>項目</th>
                <th>性質</th>
                <th>單價</th>
                <th>數量</th>
                <th>總價（元）</th>
                <th>結餘（元）</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in activePeriod.rows" :key="row.id">
                <td class="td-id">{{ row.id }}</td>
                <td class="td-date">{{ row.date }}</td>
                <td :class="row.type === '收入' ? 'td-income' : 'td-expense'">{{ row.type }}</td>
                <td class="td-item">{{ row.item }}</td>
                <td class="td-cat" :style="{ color: getCatColor(row.category) }">{{ row.category }}</td>
                <td class="td-num">{{ row.unitPrice ?? '' }}</td>
                <td class="td-num">{{ row.qty ?? '' }}</td>
                <td class="td-num" :class="row.type === '收入' ? 'td-income-val' : 'td-expense-val'">{{ fmt(row.total) }}</td>
                <td class="td-num">{{ fmt(row.balance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 贊助方式 -->
    <section class="donate-section">
      <h3 class="section-heading">贊助方式</h3>

      <div class="donate-notice">
        <p>《無境界者》目前尚未法人化，因此您的資金支持性質屬於「個人贊助」，我們暫時無法開具附有統一編號且可供抵稅的正式收據，敬請見諒。</p>
        <p>若您願意支持本刊營運，請填寫您的姓名或機構名稱與電子信箱，點擊「我要贊助」後，系統將自動寄送匯款帳號至您的信箱，贊助金額由您自行決定。完成匯款後，請依信中連結回填匯款資訊，我們將依您的意願（是否公開姓名／機構名稱），在每期財務明細中登錄您的贊助紀錄。</p>
      </div>

      <div v-if="donateState !== 'success'" class="donate-form">
        <div class="field" :class="{ 'has-error': donateErrors.name }">
          <label for="donate-name">姓名或機構名稱 <span class="required">*</span></label>
          <input
            id="donate-name"
            v-model="donateName"
            type="text"
            placeholder="請輸入您的姓名或機構名稱"
            :disabled="donateState === 'loading'"
          />
          <span v-if="donateErrors.name" class="field-error">{{ donateErrors.name }}</span>
        </div>

        <div class="field" :class="{ 'has-error': donateErrors.email }">
          <label for="donate-email">電子信箱 <span class="required">*</span></label>
          <p class="field-hint">匯款帳號將寄送至此信箱，完成劃撥後請回信告知</p>
          <input
            id="donate-email"
            v-model="donateEmail"
            type="email"
            placeholder="請輸入您的電子信箱"
            :disabled="donateState === 'loading'"
          />
          <span v-if="donateErrors.email" class="field-error">{{ donateErrors.email }}</span>
        </div>

        <div class="submit-row">
          <button
            type="button"
            class="btn-submit"
            :disabled="donateState === 'loading'"
            @click="submitDonate"
          >
            {{ donateState === 'loading' ? '傳送中⋯' : '我要贊助' }}
          </button>
        </div>
      </div>

      <div v-else class="donate-success">
        <p>✉️ 匯款帳號已寄至您的信箱，感謝您成為《無境界者》的守護者！<br>完成劃撥後，請回信告知匯款金額，我們將依您的意願登錄於財務明細。</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.finance-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1.5rem 4rem;
}

/* ── 說明文字 ── */
.finance-content {
  max-width: 700px;
  margin: 0 auto;
}
.finance-content p {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.1rem;
  line-height: 2;
  color: #444;
  text-align: justify;
  margin-bottom: 1.2rem;
  text-indent: 2em;
}
.finance-content ul {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.1rem;
  line-height: 2;
  color: #444;
  margin: 0 0 1.2rem 3em;
  padding: 0;
}
.finance-content li { list-style: disc; margin-bottom: 0.2rem; }

.finance-img-wrap { text-align: center; margin-top: 2.5rem; }
.finance-img { width: 100%; max-width: 600px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }

/* ── 明細區塊 ── */
.ledger-section { margin-top: 3rem; }

.section-heading {
  font-size: 1.4rem;
  color: #444;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  margin: 0 0 1.2rem;
}

/* ── Tabs ── */
.period-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.2rem;
}
.period-tab {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1rem;
  padding: 0.4rem 1.1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f9f9f9;
  color: #555;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.period-tab:hover { background: #eef4ff; border-color: #007bff; color: #007bff; }
.period-tab.active { background: #007bff; border-color: #007bff; color: #fff; font-weight: bold; }

/* ── 表格 ── */
.period-range {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1rem;
  color: #666;
  margin-bottom: 0.7rem;
}
.table-scroll { overflow-x: auto; }
.ledger-table {
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 0.92rem;
}
.ledger-table th {
  background: #f0f4f8;
  color: #444;
  font-weight: bold;
  padding: 0.5rem 0.6rem;
  border: 1px solid #ddd;
  white-space: nowrap;
  text-align: center;
}
.ledger-table td {
  padding: 0.42rem 0.6rem;
  border: 1px solid #eee;
  color: #444;
  vertical-align: middle;
}
.ledger-table tbody tr:nth-child(even) { background: #fafafa; }
.ledger-table tbody tr:hover { background: #f0f4ff; }

.td-id   { white-space: nowrap; text-align: center; }
.td-date { white-space: nowrap; text-align: center; }
.td-num  { text-align: right; white-space: nowrap; }
.td-cat  { white-space: nowrap; }

.ledger-table .td-income     { color: #2e7d32; font-weight: bold; text-align: center; white-space: nowrap; }
.ledger-table .td-expense    { color: #c62828; font-weight: bold; text-align: center; white-space: nowrap; }
.ledger-table .td-income-val { color: #2e7d32; font-weight: bold; }
.ledger-table .td-expense-val{ color: #c62828; font-weight: bold; }

.td-cat { font-weight: bold; }

@media (max-width: 600px) {
  .period-tab { font-size: 0.9rem; padding: 0.35rem 0.8rem; }
}
/* ── 贊助區塊 ── */
.donate-section { margin-top: 3rem; }

.donate-notice p {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.05rem;
  line-height: 2;
  color: #444;
  text-align: justify;
  text-indent: 2em;
  margin-bottom: 1rem;
}

.donate-form { max-width: 640px; margin: 1.5rem auto 0; }

.field { margin-bottom: 28px; }
.field label {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
  font-size: 1.05rem;
}
.required { color: #e74c3c; margin-left: 2px; }
.optional { font-weight: normal; color: #999; font-size: 0.9rem; margin-left: 4px; }

.field-hint { font-size: 0.95rem; color: #777; margin: 0 0 8px; line-height: 1.6; }

.field input[type="text"],
.field input[type="email"] {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1.1rem;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.field input:focus { outline: none; border-color: #5b9bd5; box-shadow: 0 0 0 2px rgba(91,155,213,0.15); }
.field input:disabled { background: #f5f5f5; }
.has-error input { border-color: #e74c3c; }
.field-error { display: block; color: #e74c3c; font-size: 0.87rem; margin-top: 5px; }

.radio-group { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
.radio-label { display: flex; align-items: center; gap: 8px; font-size: 1rem; cursor: pointer; }
.radio-label input[type="radio"] { width: 16px; height: 16px; cursor: pointer; }

.submit-row { text-align: center; margin-top: 36px; margin-bottom: 48px; }
.btn-submit {
  padding: 14px 64px;
  background-color: #5b9bd5;
  color: white;
  font-size: 1.3rem;
  font-weight: bold;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
  box-shadow: 0 4px 6px rgba(0,0,0,0.12);
  font-family: inherit;
}
.btn-submit:hover:not(:disabled) { background-color: #4a87c0; transform: translateY(-1px); }
.btn-submit:disabled { background: #aaa; cursor: default; transform: none; }

.donate-success {
  max-width: 640px;
  margin: 1.5rem auto 0;
}
.donate-success p {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.05rem;
  color: #2e7d32;
  line-height: 2;
  padding: 1.2rem 1.5rem;
  background: #f0fff4;
  border: 1px solid #a5d6a7;
  border-radius: 6px;
}
</style>
