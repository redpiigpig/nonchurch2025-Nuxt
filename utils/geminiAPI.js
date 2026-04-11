// utils/geminiAPI.js
/**
 * Gemini 分類工具（前端）
 * 只負責呼叫自家後端 /api/classify-article，不直接接觸 Gemini API
 * API key 與重試邏輯全部在 server/api/classify-article.post.js
 */

/**
 * 呼叫後端分類 API
 * @param {Object} content - 解析後的內容物件 {html, elements, imageCount}
 * @param {String} formatSpec - 格式規範文字
 * @returns {Object} 分類結果
 */
export async function classifyWithGemini(content, formatSpec, issueContext = {}) {
  const result = await $fetch("/api/classify-article", {
    method: "POST",
    body: {
      html: content.html,
      formatSpec: formatSpec || "",
      issueNumber: issueContext.issueNumber,
      issueTitle: issueContext.issueTitle,
      nextSeq: issueContext.nextSeq,
    },
  });

  if (!result.success) {
    throw new Error(result.message || "分類失敗");
  }

  return result.classified;
}

/**
 * 測試後端 API 連線是否正常
 */
export async function testGeminiConnection() {
  try {
    const result = await $fetch("/api/classify-article", {
      method: "POST",
      body: { html: "<p>測試連線</p>", formatSpec: "" },
    });
    return { success: true, message: "✅ Gemini API 連線正常" };
  } catch (error) {
    return { success: false, message: `❌ 連線失敗: ${error.message}` };
  }
}

/**
 * 批次分類多篇文章
 */
export async function batchClassify(files) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`🔄 處理第 ${i + 1}/${files.length} 篇文章: ${file.name}`);
    try {
      const result = await classifyWithGemini(file.content, file.formatSpec);
      results.push({ file: file.name, result, success: true });
      if (i < files.length - 1) await sleep(1000);
    } catch (error) {
      console.error(`❌ ${file.name} 處理失敗:`, error.message);
      results.push({ file: file.name, error: error.message, success: false });
    }
  }
  return results;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
