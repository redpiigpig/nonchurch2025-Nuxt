/**
 * 財務徵信 DB 存取
 *
 * 取代舊的 stores/finance_data.js（hardcoded）。所有期次的財務 dateRange
 * 與明細 row 都存在 Supabase 的 finance_periods / finance_entries 表。
 *
 * 結餘（balance）不存 DB，由前端依 sort_order 累計即時計算：
 *   balance[i] = balance[i-1] + (type === '收入' ? +total : -total)
 * 各期之間相連：第 N 期第 1 筆的「上一筆 balance」= 第 N-1 期最末筆 balance。
 *
 * 介面（async）：
 *   loadPeriod(supabase, issueId)
 *     → { issue, dateRange, rows: [...] }   不含 balance
 *   loadPeriodWithBalance(supabase, issueId)
 *     → { issue, dateRange, rows: [{ ..., balance }] } 含計算好的 balance
 */

import { supabase as defaultClient } from "~/supabase";

/** 把 entry row 從 DB column 名（snake_case）轉為前端慣用名（camelCase）。 */
function rowFromDb(r) {
  return {
    id: r.id,
    date: r.entry_date || "",
    type: r.entry_type || "",
    item: r.item || "",
    category: r.category || "",
    unitPrice: r.unit_price ?? null,
    qty: r.qty ?? null,
    total: r.total ?? null,
    note: r.note || "",
    sort_order: r.sort_order ?? 0,
  };
}

/** 取單一期次的財務資料（不含 balance）。 */
export async function loadPeriod(client, issueId) {
  const sb = client || defaultClient;
  const issueNum = parseInt(issueId, 10);
  if (Number.isNaN(issueNum)) return null;

  const [{ data: periodRow }, { data: entryRows }] = await Promise.all([
    sb.from("finance_periods").select("issue, date_range").eq("issue", issueNum).maybeSingle(),
    sb
      .from("finance_entries")
      .select("id, entry_date, entry_type, item, category, unit_price, qty, total, note, sort_order")
      .eq("issue", issueNum)
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
 * 取期次資料 + 計算好的 balance（含承接前期最末結餘）。
 *
 * 第 1 期：起點 0；第 N 期：起點 = 第 N-1 期最末筆 balance（遞迴查上期）。
 */
export async function loadPeriodWithBalance(client, issueId) {
  const sb = client || defaultClient;
  const period = await loadPeriod(sb, issueId);
  if (!period) return null;

  const startBalance = await getEndingBalanceBefore(sb, period.issue);
  let balance = startBalance;
  period.rows = period.rows.map((r) => {
    const total = Number(r.total) || 0;
    balance += r.type === "收入" ? total : -total;
    return { ...r, balance };
  });
  return period;
}

/**
 * 取「N 期之前」的累計結餘（即第 N-1 期最末筆 balance）。
 * 採遞迴從第 1 期累加，避免只信任 DB 中可能缺漏的歷史資料。
 */
export async function getEndingBalanceBefore(client, issueId) {
  const sb = client || defaultClient;
  const target = parseInt(issueId, 10);
  if (Number.isNaN(target) || target <= 1) return 0;

  // 一次撈所有早於 target 的 entry，按 (issue, sort_order) 累加
  const { data, error } = await sb
    .from("finance_entries")
    .select("issue, entry_type, total, sort_order")
    .lt("issue", target)
    .order("issue", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  let bal = 0;
  for (const r of data || []) {
    const t = Number(r.total) || 0;
    bal += r.entry_type === "收入" ? t : -t;
  }
  return bal;
}

/** 取所有期次的財務 period 列表（給後台選擇器用）。 */
export async function listPeriods(client) {
  const sb = client || defaultClient;
  const { data, error } = await sb
    .from("finance_periods")
    .select("issue, date_range")
    .order("issue", { ascending: true });
  if (error) throw error;
  return data || [];
}
