/**
 * 後端 Gemini 分類 API
 * 接收前端送來的 HTML，呼叫 Gemini，回傳分類結果
 * API key 只存在後端，不會暴露到前端 bundle
 */

const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_RETRIES = 4;

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

  const prompt = buildPrompt(html, formatSpec || "", issueNumber, issueTitle, nextSeq);

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

function stripHtmlAttributes(html) {
  return html
    .replace(/\s+style="[^"]*"/g, "")
    .replace(/\s+class="[^"]*"/g, "")
    .replace(/\s+id="[^"]*"/g, "")
    .replace(/\s+data-[^=]+="[^"]*"/g, "");
}

function buildPrompt(html, formatSpec, issueNumber, issueTitle, nextSeq) {
  const categoryList = [
    "專題文章", "評論與回應", "人物專訪", "生命故事", "時事感想",
    "文藝創作", "公告與剪影", "封面故事", "光影時刻", "實驗園地", "文獻與翻譯",
  ].join("、");

  const issueHint = issueNumber
    ? `\n## 📌 本期資訊（已知，請直接使用）\n- 期數：${issueNumber}\n- 期名：${issueTitle || "（未提供）"}\n- 本期下一個文章序號：${nextSeq || 1}\n`
    : "";

  return `你是一個專業的中文文章結構分析助手。請分析以下 HTML 內容，並按照格式規範進行精確分類。
${issueHint}
## 📋 格式規範
${formatSpec || "（無額外規範）"}

## 📄 待分析 HTML 內容
${stripHtmlAttributes(html)}

## 🎯 分類要求

請將文章內容分類到以下欄位，並以 **純 JSON 格式** 回傳（不要包含任何其他文字）：

\`\`\`json
{
  "id": "文章 ID，格式：{期數}-{篇序}{標題前2-4字}，例如：8-5神的名字",
  "issue": 8,
  "issue_title": "期名，例如：地上神國與人間佛教",
  "title": "文章主標題",
  "subtitle": "副標題（去除開頭的 ── 符號）",
  "author": "作者姓名（文末靠右對齊的文字）",
  "authorTitle": "作者職稱",
  "remark": "備註（例如：本文原載於...、譯自...）",
  "summary": "文章摘要，2-3句話描述文章主旨",
  "keyword": "關鍵字（包含 🌿 或「關鍵字」字樣的段落，去除前綴）",
  "category": "分類（從以下擇一：${categoryList}）",
  "section": "次分類（若有明確子題則填入，否則空字串）",
  "content": "主要內文（轉為 Markdown，保留段落結構，保留所有 [[圖片N]] 並改寫為 [[圖片N:layout]]）",
  "footnotes": [
    { "id": 1, "text": "腳註內容" }
  ],
  "seo": {
    "description": "適合搜尋引擎的文章摘要，100字以內，自然語句",
    "keywords": "3-6個關鍵詞，以逗號分隔"
  }
}
\`\`\`

## 🔍 詳細判斷規則

### 1. 文章 ID 與期號
- 若上方「本期資訊」已提供期數與序號，**直接使用**，不要猜測
- ID 格式：\`{期數}-{序號}{標題前2-4字}\`，例如 \`8-5神的名字\`
- issue 填數字，issue_title 填期名

### 2. 標題
- **title**：第一個大字體、粗體、置中的元素（文章主標題）
- **subtitle**：── 開頭的文字，需移除 ── 符號

### 3. 作者
- **author**：文末靠右對齊的文字
- **authorTitle**：作者姓名下方的職稱
- **remark**：「本文原載於」、「譯自」等說明

### 4. 分類
- 從以下 11 種中選最符合的一種：${categoryList}

### 5. 內文標題層級
- 文章內部的**大段落標題**（如章節名）→ Markdown \`## 標題\`（H2）
- 文章內部的**小標題、子標題** → Markdown \`### 標題\`（H3）
- 不要把文章主標題（title 欄位）重複寫入 content

### 6. 圖片佔位符排版判斷
- \`[[圖片N]]\` 必須改寫為 \`[[圖片N:layout]]\`，layout 三選一：
  - \`center\`：滿版橫幅圖、獨立段落圖
  - \`left\`：直式照片、書封在段落左側
  - \`right\`：直式照片、書封在段落右側
- 若無法判斷，預設 \`center\`

### 7. 腳註
- 正文中 [^1]、[^2] 保留在 content
- 文末腳註列表提取到 footnotes 陣列，id 為數字型別

### 8. SEO
- description：自然語句描述文章，適合出現在搜尋結果，100字以內
- keywords：3-6個關鍵詞，以逗號分隔

## ⚠️ 重要提醒
1. 只回傳 JSON，不要任何說明文字
2. JSON 必須可被 JSON.parse() 解析
3. 找不到的欄位用 "" 或 []
4. content 必須完整，不遺漏段落
5. [[圖片N]] 必須改寫為 [[圖片N:layout]]
`;
}
