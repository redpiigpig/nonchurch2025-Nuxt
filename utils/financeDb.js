/**
 * 財務徵信 DB 存取
 *
 * 取代舊的 stores/finance_data.js（hardcoded）。所有期次的財務 dateRange
 * 與明細 row 都存在 Supabase 的 finance_periods / finance_entries 表。
 *
 * 結餘（balance）預設由前端依 sort_order 累計即時計算：
 *   balance[i] = balance[i-1] + (type === '收入' ? +total : -total)
 * 各期之間相連：第 N 期第 1 筆的「上一筆 balance」= 第 N-1 期最末筆 balance。
 *
 * 若紙本已刊出特定結餘，finance_entries.balance_override 可保存該值。
 * 有 override 時以紙本值為準，並以該值作為後續列的累計起點；沒有時才自動計算。
 *
 * 編號（display_seq）也不存 DB，依「期次發刊年（西元）後兩位 + 跨期累積流水」計算，
 * 跨年才 reset。詳見 computeDisplaySeqs。
 *
 * 介面（async）：
 *   loadPeriod(client, issueId)
 *     → { issue, dateRange, rows: [...] }   不含 balance、display_seq
 *   loadPeriodWithBalance(client, issueId)
 *     → { issue, dateRange, rows: [{ ..., balance, display_seq }] }
 *
 * 不在頂層 import `~/supabase`，這樣 Node 環境（如 seed 腳本）也能直接 import 純函數。
 * 凡需查詢 DB 的函數一律由呼叫者傳 client。
 */

/** 把 entry row 從 DB column 名（snake_case）轉為前端慣用名（camelCase）。 */
function rowFromDb(r) {
  return {
    id: r.id,
    issue: r.issue,
    date: r.entry_date || "",
    type: r.entry_type || "",
    item: r.item || "",
    category: r.category || "",
    unitPrice: r.unit_price ?? null,
    qty: r.qty ?? null,
    total: r.total ?? null,
    balanceOverride: r.balance_override ?? null,
    note: r.note || "",
    sort_order: r.sort_order ?? 0,
  };
}

/**
 * 計算 display_seq map：跨期所有 entries，編號規則為「期次發刊年（西元）後兩位 + 流水」。
 * 流水號跨期累積，跨年（依期次發刊年）才 reset；同期內按 entry_date 排序。
 *
 * 範例（既有資料）：
 *   第四 / 五 / 六期（2025 年）→ 2501..2532（流水 1..32）
 *   第七 / 八 / 九期（2026 年）→ 2601..跨期延續
 *   2027 年開始的新期 → 27xx 重新從 01
 *
 * 入參：
 *   entries: [{id, issue, date|entry_date, sort_order}]
 *   issueYearMap: { [issueId]: 西元年 }（從 issues.date 抽出）
 *
 * 流水號 ≥ 100 自動變三位。
 */
export function computeDisplaySeqs(entries, issueYearMap = {}) {
  const sorted = [...entries].sort((a, b) => {
    // 先按 issue.id（哪一期）
    const ia = (a.issue ?? 0) - (b.issue ?? 0);
    if (ia !== 0) return ia;
    // 同期內按 entry_date
    const da = a.date || a.entry_date || "";
    const db = b.date || b.entry_date || "";
    if (da !== db) return da.localeCompare(db);
    // 最後保持穩定（sort_order）
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  const counters = {};
  const map = {};
  for (const e of sorted) {
    const year = issueYearMap[e.issue];
    if (!year) {
      map[e.id] = "";
      continue;
    }
    const yearTwoDigit = String(year % 100).padStart(2, "0");
    counters[yearTwoDigit] = (counters[yearTwoDigit] || 0) + 1;
    const seq = counters[yearTwoDigit];
    map[e.id] = yearTwoDigit + (seq < 100 ? String(seq).padStart(2, "0") : String(seq));
  }
  return map;
}

/**
 * 從期次發行月計算財務徵信預設日期區間：「發刊期前一個月 16 日 ~ 結束月 15 日」（民國紀年）。
 *
 *  「2026年01-02月號」 → 「114.12.16 – 115.02.15」
 *  「2026年03-04月號」 → 「115.02.16 – 115.04.15」
 *  「2026.04」（單月格式）→ 「115.03.16 – 115.04.15」（推為 03-04 雙月）
 */
export function computeDefaultDateRange(issueDateStr) {
  if (!issueDateStr) return "";
  const s = String(issueDateStr);
  let year, monthStart, monthEnd;
  let m = s.match(/(\d{4})年(\d{1,2})-(\d{1,2})月/);
  if (m) {
    year = parseInt(m[1], 10);
    monthStart = parseInt(m[2], 10);
    monthEnd = parseInt(m[3], 10);
  } else {
    m = s.match(/(\d{4})\.(\d{1,2})/);
    if (!m) return "";
    year = parseInt(m[1], 10);
    monthEnd = parseInt(m[2], 10);
    monthStart = monthEnd - 1 < 1 ? 12 : monthEnd - 1;
  }
  let startMonth = monthStart - 1;
  let startYear = year;
  if (startMonth < 1) {
    startMonth = 12;
    startYear -= 1;
  }
  const endMonth = monthEnd;
  const endYear = year;
  const pad = (n) => String(n).padStart(2, "0");
  const startMingo = startYear - 1911;
  const endMingo = endYear - 1911;
  return `${startMingo}.${pad(startMonth)}.16 – ${endMingo}.${pad(endMonth)}.15`;
}

/** 撈 issues 表 date 欄，建立 issueId → 西元年 map（從 issues.date 抽四位數字）。 */
export async function loadIssueYearMap(client) {
  const { data, error } = await client.from("issues").select("id, date");
  if (error) throw error;
  const map = {};
  for (const i of data || []) {
    const m = String(i.date || "").match(/(\d{4})/);
    if (m) map[i.id] = parseInt(m[1], 10);
  }
  return map;
}

/** 撈跨期所有 entries（給 display_seq 計算用，欄位精簡）。 */
export async function loadAllEntries(client) {
  const { data, error } = await client
    .from("finance_entries")
    .select("id, issue, entry_date, sort_order")
    .order("issue", { ascending: true })
    .order("entry_date", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    issue: r.issue,
    date: r.entry_date || "",
    sort_order: r.sort_order ?? 0,
  }));
}

/** 取單一期次的財務資料（不含 balance、display_seq）。 */
export async function loadPeriod(client, issueId) {
  const issueNum = parseInt(issueId, 10);
  if (Number.isNaN(issueNum)) return null;

  const [{ data: periodRow }, { data: entryRows }] = await Promise.all([
    client.from("finance_periods").select("issue, date_range").eq("issue", issueNum).maybeSingle(),
    client
      .from("finance_entries")
      .select("id, issue, entry_date, entry_type, item, category, unit_price, qty, total, balance_override, note, sort_order")
      .eq("issue", issueNum)
      // 同期內按日期 → 同日期 fallback sort_order
      .order("entry_date", { ascending: true, nullsFirst: true })
      .order("sort_order", { ascending: true }),
  ]);

  if (!periodRow && (!entryRows || entryRows.length === 0)) return null;

  return {
    issue: issueNum,
    dateRange: periodRow?.date_range || "",
    rows: (entryRows || []).map(rowFromDb),
  };
}

/**
 * 取期次資料 + 計算好的 balance + display_seq。
 *
 * balance：第 1 期起點 0；第 N 期起點 = 第 N-1 期最末筆 balance（遞迴累加）。
 * display_seq：依跨期所有 entries + 期次發刊年計算。
 */
export async function loadPeriodWithBalance(client, issueId) {
  const period = await loadPeriod(client, issueId);
  if (!period) return null;

  // balance：累計到本期之前 + 本期累加
  const startBalance = await getEndingBalanceBefore(client, period.issue);
  let balance = startBalance;
  period.rows = period.rows.map((r) => {
    const total = Number(r.total) || 0;
    balance += r.type === "收入" ? total : -total;
    if (r.balanceOverride !== null && r.balanceOverride !== "") {
      balance = Number(r.balanceOverride);
    }
    return { ...r, balance };
  });

  // display_seq：撈跨期 entries + issues 年份 → 計算，回填本期 rows
  const [all, yearMap] = await Promise.all([
    loadAllEntries(client),
    loadIssueYearMap(client),
  ]);
  const seqMap = computeDisplaySeqs(all, yearMap);
  period.rows = period.rows.map((r) => ({ ...r, display_seq: seqMap[r.id] || "" }));

  return period;
}

/**
 * 取「N 期之前」的累計結餘（即第 N-1 期最末筆 balance）。
 * 從第 1 期遞迴累加，避免只信任 DB 中可能缺漏的歷史資料。
 */
export async function getEndingBalanceBefore(client, issueId) {
  const target = parseInt(issueId, 10);
  if (Number.isNaN(target) || target <= 1) return 0;

  const { data, error } = await client
    .from("finance_entries")
    .select("issue, entry_type, total, balance_override, sort_order")
    .lt("issue", target)
    .order("issue", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  let bal = 0;
  for (const r of data || []) {
    const t = Number(r.total) || 0;
    bal += r.entry_type === "收入" ? t : -t;
    if (r.balance_override !== null && r.balance_override !== "") {
      bal = Number(r.balance_override);
    }
  }
  return bal;
}

/**
 * 取所有期次的財務 period 列表。
 * options.onlyPublished = true 時，過濾未發布期次（前台 /finance 訪客用）。
 */
export async function listPeriods(client, { onlyPublished = false } = {}) {
  const { data: periods, error } = await client
    .from("finance_periods")
    .select("issue, date_range")
    .order("issue", { ascending: true });
  if (error) throw error;
  if (!onlyPublished || !periods?.length) return periods || [];

  const issueIds = periods.map((p) => p.issue);
  const { data: issues } = await client
    .from("issues")
    .select("id, is_published")
    .in("id", issueIds);
  const publishedSet = new Set(
    (issues || []).filter((i) => i.is_published).map((i) => i.id),
  );
  return periods.filter((p) => publishedSet.has(p.issue));
}
