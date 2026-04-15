/**
 * 後端 Gemini 分類 API
 * 接收前端送來的 HTML，呼叫 Gemini，回傳分類結果
 * API key 只存在後端，不會暴露到前端 bundle
 */

import { readFileSync } from "fs";
import { join } from "path";

const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_RETRIES = 4;

// 伺服器端快取 form.md 內容
let _cachedFormSpec = null;
function getFormSpec() {
  if (!_cachedFormSpec) {
    try {
      _cachedFormSpec = readFileSync(join(process.cwd(), "stores", "form.md"), "utf-8");
    } catch {
      _cachedFormSpec = "";
    }
  }
  return _cachedFormSpec;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;

  if (!apiKey) {
    throw createError({ statusCode: 500, message: "伺服器未設定 Gemini API Key" });
  }

  const { html, formatSpec, issueNumber, issueTitle, nextSeq } = await readBody(event);

  if (!html) {
    throw createError({ statusCode: 400, message: "缺少 html 欄位" });
  }

  // 優先使用前端傳來的 formatSpec，否則伺服器端直接讀取 form.md
  const spec = formatSpec || getFormSpec();
  const prompt = buildPrompt(html, spec, issueNumber, issueTitle, nextSeq);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let response;
    try {
      response = await $fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              topK: 1,
              topP: 1,
              maxOutputTokens: 8192,
              // 限制 thinking budget，避免 2.5-flash 消耗過多 token 觸發 429
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          },
        },
      );
    } catch (fetchError) {
      // $fetch 在 4xx/5xx 時會拋出，解析出實際的錯誤訊息
      const status = fetchError.response?.status;
      const body = fetchError.data || fetchError.response?._data;

      if (status === 429 && attempt < MAX_RETRIES - 1) {
        // 從錯誤訊息解析建議等待秒數
        const retryMsg = JSON.stringify(body || "");
        const retryMatch = retryMsg.match(/retry in ([\d.]+)s/i);
        const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 3 : (attempt + 1) * 15;
        console.log(`⏳ Gemini 速率限制，等待 ${waitSec} 秒後重試（第 ${attempt + 1} 次）...`);
        await sleep(waitSec * 1000);
        continue;
      }

      const msg = body?.error?.message || fetchError.message || "未知錯誤";
      throw createError({ statusCode: status || 500, message: `Gemini API 錯誤 (${status}): ${msg}` });
    }

    // 成功：解析回應
    const candidate = response?.candidates?.[0];
    console.log("📨 Gemini 回應 finishReason:", candidate?.finishReason);

    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      // 印出完整回應以便診斷（安全過濾、空回應等）
      console.error("❌ Gemini 沒有回傳文字，完整回應：", JSON.stringify(response, null, 2));
      const reason = candidate?.finishReason || "unknown";
      throw createError({ statusCode: 502, message: `Gemini 沒有回傳結果（finishReason: ${reason}）` });
    }

    console.log("📝 Gemini 回傳文字長度：", text.length, "字元");

    const jsonMatch =
      text.match(/```json\s*\n([\s\S]*?)\n```/) ||
      text.match(/```\s*\n([\s\S]*?)\n```/) ||
      text.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      console.error("❌ 無法從回應中找到 JSON，原始文字：", text.substring(0, 500));
      throw createError({ statusCode: 502, message: "Gemini 回傳格式錯誤，無法解析 JSON" });
    }

    try {
      const classified = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return { success: true, classified };
    } catch (e) {
      console.error("❌ JSON 解析失敗：", (jsonMatch[1] || jsonMatch[0]).substring(0, 500));
      throw createError({ statusCode: 502, message: "JSON 格式錯誤：" + e.message });
    }
  }

  throw createError({ statusCode: 429, message: "Gemini API 重試次數已達上限，請稍後再試" });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 提取用於辨識 metadata 的 HTML 片段。
 * 只需文章開頭（標題、副標、關鍵字）和結尾（作者、腳注）即可，
 * 不需要送整篇內文給 Gemini，大幅減少 token 用量並避免 JSON 截斷。
 */
function extractMetaHtml(html) {
  const stripped = html
    .replace(/\s+style="[^"]*"/g, "")
    .replace(/\s+class="[^"]*"/g, "")
    .replace(/\s+id="[^"]*"/g, "")
    .replace(/\s+data-[^=]+="[^"]*"/g, "")
    // 移除 base64 圖片資料（保留 <img> 標籤但清空 src）
    .replace(/src="data:[^"]*"/g, 'src=""');

  // 取前 6000 字元（含標題、副標、摘要段落）
  const head = stripped.slice(0, 6000);
  // 取後 3000 字元（含作者、腳注）
  const tail = stripped.length > 6000
    ? "\n<!-- ... -->\n" + stripped.slice(-3000)
    : "";

  return head + tail;
}

function buildPrompt(html, _formatSpec, issueNumber, issueTitle, nextSeq) {
  const categoryList = [
    "專題文章", "評論與回應", "人物專訪", "生命故事", "時事感想",
    "文藝創作", "公告與剪影", "封面故事", "光影時刻", "實驗園地", "文獻與翻譯",
  ].join("、");

  const issueHint = issueNumber
    ? `\n## 📌 本期資訊（已知，請直接使用）\n- 期數：${issueNumber}\n- 期名：${issueTitle || "（未提供）"}\n- 本期下一個文章序號：${nextSeq || 1}\n`
    : "";

  return `你是一個專業的中文文章結構分析助手。請分析以下 HTML 片段，辨識文章的 metadata。

注意：這份 HTML 只包含文章的開頭與結尾，**內文已由系統另行處理，不需要你回傳 content 欄位**。
${issueHint}
## 📄 待分析 HTML（開頭 + 結尾摘錄）
${extractMetaHtml(html)}

## 🎯 請以純 JSON 格式回傳以下欄位（不要任何說明文字）：

\`\`\`json
{
  "id": "文章 ID，格式：{期數}-{篇序}{標題前2-4字}，例如：8-5神的名字",
  "issue": 8,
  "issue_title": "期名，例如：地上神國與人間佛教",
  "title": "文章主標題",
  "subtitle": "副標題（去除開頭的 ── 符號）",
  "author": "作者姓名",
  "authorTitle": "作者職稱",
  "remark": "備註（本文原載於…、譯自… 等）",
  "summary": "文章摘要，2-3句話",
  "keyword": "關鍵字（去除 🌿 前綴）",
  "category": "從以下擇一：${categoryList}",
  "section": "次分類（無則空字串）",
  "seo": {
    "description": "適合搜尋引擎的摘要，100字以內",
    "keywords": "3-6個關鍵詞，逗號分隔"
  }
}
\`\`\`

## 🔍 判斷規則

1. **ID**：若已提供期數與序號，直接使用，格式 \`{期數}-{序號}{標題前2-4字}\`
2. **title**：文章最主要的大標題
3. **subtitle**：── 開頭的副標，需移除 ── 符號
4. **author**：文末靠右對齊的姓名
5. **authorTitle**：作者姓名下方的職稱
6. **remark**：「本文原載於」、「譯自」等說明文字
7. **category**：從上方 11 種分類中選最符合的一種
8. 找不到的欄位填 "" 或 []，JSON 必須可被 JSON.parse() 解析
`;
}
