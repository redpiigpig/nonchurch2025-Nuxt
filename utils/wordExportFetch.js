/**
 * 呼叫 Word 匯出 API（/api/export-word、/api/export-issue-word），遇到冷啟動自動重試。
 *
 * 線上的 Python 匯出服務在 Render 免費版，閒置 15 分鐘就休眠，喚醒要 ~80 秒；
 * 這段期間 Nuxt 端會回 502/504（或 503 但不是「disabled」）。第一次請求會順便把它叫醒，
 * 所以等一下再送通常就成功。
 *
 * 回傳原生 Response（最後一次的），呼叫端照舊檢查 response.ok。
 */
const RETRY_STATUSES = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 15000;

export async function fetchWordExport(url, body, { onRetry } = {}) {
  let response;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      // 網路層失敗（閘道直接斷線）也視為冷啟動
      if (attempt === MAX_ATTEMPTS) throw err;
      response = null;
    }
    if (response) {
      if (!RETRY_STATUSES.has(response.status)) return response;
      if (response.status === 503) {
        const text = await response.clone().text();
        if (text.includes("Word export is disabled") || text.includes("not allowed")) {
          return response;
        }
      }
      if (attempt === MAX_ATTEMPTS) return response;
    }
    onRetry?.(attempt);
    console.info(`[word-export] 匯出服務喚醒中，${RETRY_DELAY_MS / 1000} 秒後重試（第 ${attempt} 次）`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  return response;
}
