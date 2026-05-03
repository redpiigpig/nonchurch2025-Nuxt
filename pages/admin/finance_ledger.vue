<script setup>
definePageMeta({ layout: "admin", middleware: "auth" });
useHead({ title: "財務明細管理 - 無境界者後台" });

import { ref, computed, onMounted, watch } from "vue";
import { supabase } from "~/supabase";
import { loadPeriod, getEndingBalanceBefore } from "~/utils/financeDb";

const allIssues = ref([]);          // 所有期次（從 issues 表）
const issueId = ref(null);          // 目前選定的期
const dateRange = ref("");
const rows = ref([]);               // 當前編輯中的 entries
const originalIds = ref(new Set()); // 載入時的 entry id snapshot（用於儲存時 diff 出 deleted）
const startBalance = ref(0);        // 承接前期最末結餘
const loading = ref(false);
const saving = ref(false);

const fmtNum = (n) => (n == null || n === "" ? "" : Number(n).toLocaleString("zh-TW"));

// 即時計算 balance（不存 DB）
const computedRows = computed(() => {
  let bal = startBalance.value;
  return rows.value.map((r) => {
    const total = Number(r.total) || 0;
    bal += r.type === "收入" ? total : -total;
    return { ...r, balance: bal };
  });
});

const totals = computed(() => {
  let income = 0, expense = 0;
  for (const r of rows.value) {
    const t = Number(r.total) || 0;
    if (r.type === "收入") income += t;
    else expense += t;
  }
  return { income, expense, net: income - expense };
});

const endingBalance = computed(() => {
  const list = computedRows.value;
  return list.length ? list[list.length - 1].balance : startBalance.value;
});

const fetchIssues = async () => {
  const { data, error } = await supabase
    .from("issues")
    .select("id, title")
    .order("id", { ascending: true });
  if (error) {
    alert("載入期次失敗：" + error.message);
    return;
  }
  allIssues.value = data || [];
  if (issueId.value == null && allIssues.value.length) {
    // 預設選最後一期（最新）
    issueId.value = allIssues.value[allIssues.value.length - 1].id;
  }
};

const fetchPeriod = async () => {
  if (issueId.value == null) return;
  loading.value = true;
  try {
    const period = await loadPeriod(supabase, issueId.value);
    dateRange.value = period?.dateRange || "";
    rows.value = (period?.rows || []).map((r) => ({ ...r }));
    originalIds.value = new Set(rows.value.map((r) => r.id));
    startBalance.value = await getEndingBalanceBefore(supabase, issueId.value);
  } finally {
    loading.value = false;
  }
};

watch(issueId, fetchPeriod);

const addRow = () => {
  // 自動 suggest 下一個 id：取所有 entries 中最大 numeric id + 1
  const numericIds = rows.value.map((r) => parseInt(r.id, 10)).filter((n) => !Number.isNaN(n));
  const nextId = numericIds.length ? Math.max(...numericIds) + 1 : "";
  rows.value.push({
    id: String(nextId || ""),
    date: "",
    type: "支出",
    item: "",
    category: "",
    unitPrice: "",
    qty: null,
    total: 0,
    note: "",
  });
};

const deleteRow = (i) => {
  if (!confirm("確定刪除這筆明細？（按下儲存後才會真的從資料庫移除）")) return;
  rows.value.splice(i, 1);
};

const moveUp = (i) => {
  if (i === 0) return;
  const arr = rows.value;
  [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
};
const moveDown = (i) => {
  if (i === rows.value.length - 1) return;
  const arr = rows.value;
  [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
};

const saveAll = async () => {
  if (issueId.value == null) return;
  // 簡單檢查：所有 row 必須有 id 與 date
  const missing = rows.value.findIndex((r) => !r.id?.trim() || !r.date?.trim());
  if (missing !== -1) {
    alert(`第 ${missing + 1} 筆缺少編號或日期`);
    return;
  }
  // 檢查 id 重複
  const ids = rows.value.map((r) => r.id);
  if (new Set(ids).size !== ids.length) {
    alert("有重複的明細編號");
    return;
  }

  saving.value = true;
  try {
    // 1. upsert finance_periods.date_range
    {
      const { error } = await supabase.from("finance_periods").upsert({
        issue: issueId.value,
        date_range: dateRange.value || "",
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }

    // 2. 刪除被移除的 entries
    const currentIds = new Set(rows.value.map((r) => r.id));
    const toDelete = [...originalIds.value].filter((id) => !currentIds.has(id));
    if (toDelete.length) {
      const { error } = await supabase
        .from("finance_entries")
        .delete()
        .in("id", toDelete);
      if (error) throw error;
    }

    // 3. upsert 所有目前 rows（sort_order = 陣列順序）
    const upserts = rows.value.map((r, i) => ({
      id: r.id,
      issue: issueId.value,
      entry_date: r.date || null,
      entry_type: r.type || null,
      item: r.item || null,
      category: r.category || null,
      unit_price:
        r.unitPrice == null || r.unitPrice === "" ? null : String(r.unitPrice),
      qty: r.qty == null || r.qty === "" ? null : Number(r.qty),
      total: r.total == null || r.total === "" ? null : Number(r.total),
      note: r.note || null,
      sort_order: i,
      updated_at: new Date().toISOString(),
    }));
    if (upserts.length) {
      const { error } = await supabase.from("finance_entries").upsert(upserts);
      if (error) throw error;
    }

    alert("✅ 已儲存");
    await fetchPeriod();
  } catch (err) {
    alert("儲存失敗：" + (err.message || err));
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await fetchIssues();
  await fetchPeriod();
});
</script>

<template>
  <div class="ledger-admin">
    <div class="header">
      <h2>💰 財務明細管理</h2>
      <p class="desc">
        編輯每期財務徵信表。結餘自動依「上一期最末結餘」+ 本期累加計算（不存 DB）。
        <br />儲存後，前台 <code>/finance</code> 會即時反映。
      </p>
    </div>

    <div class="toolbar">
      <label>
        期次：
        <select v-model="issueId" class="issue-select">
          <option v-for="i in allIssues" :key="i.id" :value="i.id">
            Vol.{{ i.id }} {{ i.title ? `《${i.title}》` : "" }}
          </option>
        </select>
      </label>
      <label class="date-range-input">
        日期區間：
        <input
          type="text"
          v-model="dateRange"
          placeholder="如：115.02.16 – 115.04.15"
        />
      </label>
      <span class="status">
        起始結餘：{{ fmtNum(startBalance) }}
        本期收入：<span class="income">{{ fmtNum(totals.income) }}</span>
        本期支出：<span class="expense">{{ fmtNum(totals.expense) }}</span>
        本期淨額：<span :class="totals.net >= 0 ? 'income' : 'expense'">{{ fmtNum(totals.net) }}</span>
        期末結餘：<strong>{{ fmtNum(endingBalance) }}</strong>
      </span>
    </div>

    <div v-if="loading" class="loading">載入中…</div>

    <div v-else class="table-wrap">
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
            <th>總價</th>
            <th>結餘</th>
            <th>備註</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="i">
            <td><input type="text" v-model="row.id" class="cell-input cell-id" /></td>
            <td><input type="text" v-model="row.date" class="cell-input" placeholder="115.02.20" /></td>
            <td>
              <select v-model="row.type" class="cell-input">
                <option value="收入">收入</option>
                <option value="支出">支出</option>
              </select>
            </td>
            <td><input type="text" v-model="row.item" class="cell-input" /></td>
            <td><input type="text" v-model="row.category" class="cell-input" /></td>
            <td><input type="text" v-model="row.unitPrice" class="cell-input cell-num" placeholder="—" /></td>
            <td><input type="number" v-model="row.qty" class="cell-input cell-num" /></td>
            <td><input type="number" v-model="row.total" class="cell-input cell-num" /></td>
            <td class="cell-balance" :class="computedRows[i]?.balance < 0 ? 'expense' : ''">
              {{ fmtNum(computedRows[i]?.balance) }}
            </td>
            <td><input type="text" v-model="row.note" class="cell-input" /></td>
            <td class="actions">
              <button class="btn-mini" @click="moveUp(i)" :disabled="i === 0" title="上移">↑</button>
              <button class="btn-mini" @click="moveDown(i)" :disabled="i === rows.length - 1" title="下移">↓</button>
              <button class="btn-mini btn-del" @click="deleteRow(i)" title="刪除">✕</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="11" class="empty">本期尚無明細，按下方「+ 新增明細」開始輸入。</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer-actions">
      <button class="btn-add" @click="addRow">＋ 新增明細</button>
      <button class="btn-save" :disabled="saving" @click="saveAll">
        {{ saving ? "儲存中…" : "💾 儲存" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.ledger-admin { padding: 20px; max-width: 1280px; margin: 0 auto; }
.header h2 { color: #2c3e50; margin: 0 0 4px; }
.desc { color: #666; line-height: 1.6; margin: 0 0 16px; font-size: 0.9rem; }
.desc code { background: #f1f3f5; padding: 1px 6px; border-radius: 3px; font-size: 0.85em; }

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  align-items: center;
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  margin-bottom: 16px;
  font-size: 0.92rem;
}
.toolbar label { display: inline-flex; align-items: center; gap: 6px; }
.issue-select, .date-range-input input {
  padding: 5px 9px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem;
}
.date-range-input input { width: 200px; }
.status { color: #555; }
.income { color: #2e7d32; font-weight: bold; }
.expense { color: #c62828; font-weight: bold; }

.loading { text-align: center; color: #888; padding: 40px; }

.table-wrap {
  background: #fff; border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  overflow-x: auto;
}
.ledger-table { width: 100%; border-collapse: collapse; min-width: 1200px; }
.ledger-table th {
  background: #f0f4f8; color: #444; padding: 8px 6px;
  border-bottom: 2px solid #ddd; font-size: 0.88rem; text-align: center;
  white-space: nowrap;
}
.ledger-table td {
  padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: middle;
}
.ledger-table tbody tr:hover { background: #fafbfd; }
.cell-input {
  width: 100%; padding: 5px 7px; border: 1px solid #ddd; border-radius: 3px;
  font-size: 0.88rem; box-sizing: border-box;
}
.cell-input:focus { outline: none; border-color: #5b9bd5; }
.cell-id { width: 75px; }
.cell-num { text-align: right; }
.cell-balance {
  text-align: right; padding-right: 10px; font-weight: bold;
  background: #f8f9fa; white-space: nowrap;
}

.actions { white-space: nowrap; text-align: center; }
.btn-mini {
  background: #f1f3f5; border: 1px solid #ddd; border-radius: 3px;
  width: 26px; height: 26px; cursor: pointer; margin: 0 1px;
  font-size: 0.85rem;
}
.btn-mini:hover:not(:disabled) { background: #e2e6ea; }
.btn-mini:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-del { color: #c62828; }
.btn-del:hover { background: #ffebee; }

.empty { text-align: center; color: #999; padding: 30px; font-size: 0.95rem; }

.footer-actions {
  display: flex; gap: 12px; margin-top: 16px;
}
.btn-add {
  padding: 9px 18px; background: #fff; border: 1px dashed #5b9bd5;
  color: #5b9bd5; border-radius: 5px; cursor: pointer; font-size: 0.95rem;
}
.btn-add:hover { background: #f0f8ff; }
.btn-save {
  padding: 9px 24px; background: #2c3e50; color: #fff; border: none;
  border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.95rem;
  margin-left: auto;
}
.btn-save:hover:not(:disabled) { background: #34495e; }
.btn-save:disabled { background: #aaa; cursor: not-allowed; }
</style>
