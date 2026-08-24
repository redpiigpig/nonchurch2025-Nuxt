/**
 * Word 匯出：把 issues.date 注入匯出 payload
 *
 * 頁首「無境界者｜Vol. N（YYYY.MM-MM）」的日期以資料庫 issues.date 為準，
 * 不再寫死在 scripts/generate_docx.py 裡（Python 端若沒收到 issue_date，
 * 會退回依期數推算）。
 */
import { createClient } from "@supabase/supabase-js";

function getClient() {
  const config = useRuntimeConfig();
  const url = config.public?.supabaseUrl;
  const key = config.supabaseServiceKey || config.public?.supabaseKey;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 取回 { [issueId]: date } */
async function fetchIssueDates(issueIds) {
  if (!issueIds.length) return {};
  const client = getClient();
  if (!client) return {};
  const { data, error } = await client
    .from("issues")
    .select("id, date")
    .in("id", issueIds);
  if (error || !Array.isArray(data)) return {};
  return data.reduce((acc, row) => {
    if (row?.date) acc[String(row.id)] = row.date;
    return acc;
  }, {});
}

/**
 * 為單篇或多篇文章 payload 補上 issue_date（就地修改並回傳）。
 * - meta 類（issue 是物件）不處理，render_meta_docx.py 已自行讀 issue.date
 * - 已帶 issue_date 的 payload 不覆寫
 * - 查不到日期就靜默略過，讓 Python 端退回依期數推算
 */
export async function attachIssueDates(articles) {
  const list = (Array.isArray(articles) ? articles : [articles]).filter(
    (a) => a && typeof a === "object" && typeof a.issue !== "object",
  );
  const pending = list.filter((a) => !a.issue_date && a.issue != null);
  const ids = [...new Set(pending.map((a) => Number(a.issue)))].filter(
    (n) => Number.isFinite(n),
  );
  if (!ids.length) return articles;

  try {
    const dates = await fetchIssueDates(ids);
    for (const article of pending) {
      const date = dates[String(Number(article.issue))];
      if (date) article.issue_date = date;
    }
  } catch {
    // 查不到就交給 Python 端推算，不阻擋匯出
  }
  return articles;
}
