// utils/geminiAPI.js
/**
 * Google Gemini API 整合工具
 * 用於 AI 輔助內容分類
 */

/**
 * 呼叫 Gemini API 進行內容分類（含重試機制）
 * @param {Object} content - 解析後的內容物件 {html, elements}
 * @param {String} formatSpec - 格式規範文字（從 form.md 讀取）
 * @param {Number} retries - 重試次數
 * @returns {Object} 分類結果
 */
export async function classifyWithGemini(content, formatSpec, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await _callGeminiAPI(content, formatSpec);
    } catch (error) {
      // 速率限制錯誤：等待後重試
      if (error.message.includes("429") && i < retries - 1) {
        const waitTime = (i + 1) * 2;
        console.log(`⏳ Gemini API 速率限制，等待 ${waitTime} 秒後重試...`);
        await sleep(waitTime * 1000);
        continue;
      }

      // 其他錯誤：直接拋出
      throw error;
    }
  }
}

/**
 * 實際的 Gemini API 呼叫
 */
async function _callGeminiAPI(content, formatSpec) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("❌ 請在 .env 中設定 VITE_GEMINI_API_KEY");
  }

  const prompt = buildClassificationPrompt(content, formatSpec);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2, // 降低隨機性
          topK: 1,
          topP: 1,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Gemini API 錯誤 (${response.status}): ${error.error?.message || "未知錯誤"}`,
    );
  }

  const data = await response.json();

  // 檢查是否有回應
  if (!data.candidates || !data.candidates[0]) {
    throw new Error("❌ Gemini 沒有回傳結果");
  }

  const text = data.candidates[0].content.parts[0].text;

  // 提取 JSON（Gemini 可能包含額外說明文字）
  const jsonMatch =
    text.match(/```json\s*\n([\s\S]*?)\n```/) ||
    text.match(/```\s*\n([\s\S]*?)\n```/) ||
    text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    console.error("Gemini 原始回應：", text);
    throw new Error("❌ Gemini 回傳格式錯誤，無法解析 JSON");
  }

  try {
    const classified = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    return classified;
  } catch (parseError) {
    console.error("JSON 解析錯誤：", jsonMatch[1] || jsonMatch[0]);
    throw new Error("❌ JSON 格式錯誤：" + parseError.message);
  }
}

/**
 * 建立分類提示詞
 */
function buildClassificationPrompt(content, formatSpec) {
  return `你是一個專業的中文文章結構分析助手。請分析以下 HTML 內容，並按照格式規範進行精確分類。

## 📋 格式規範（請嚴格遵守）
${formatSpec}

## 📄 待分析 HTML 內容
${content.html}

## 🎯 分類要求

請將文章內容分類到以下欄位，並以 **純 JSON 格式** 回傳（不要包含任何其他文字）：

\`\`\`json
{
  "title": "文章主標題（第一個大字體、粗體、置中的元素）",
  "subtitle": "副標題（── 開頭的文字，去除 ── 符號）",
  "author": "作者姓名（文末靠右對齊的文字）",
  "authorTitle": "作者職稱（作者姓名下方的文字）",
  "keyword": "關鍵字（包含 🌿 或「關鍵字」字樣的段落，去除前綴）",
  "content": "主要內文（轉為 Markdown 格式，保留段落結構）",
  "footnotes": [
    {
      "id": "1",
      "text": "腳註內容"
    }
  ],
  "metadata": {
    "specialBoxes": [
      {
        "type": "book-box | quote-box | keyword-section | special-box",
        "content": "框內 HTML 內容",
        "position": 0
      }
    ],
    "images": [
      {
        "src": "圖片路徑",
        "alt": "圖片說明",
        "caption": "圖片標題"
      }
    ]
  }
}
\`\`\`

## 🔍 詳細判斷規則

### 1. 標題判斷
- **title**: 第一個大字體（>20px）、粗體、置中的元素
- **subtitle**: 標題之後、── 開頭的粗體文字，需移除 ── 符號

### 2. 作者資訊
- **author**: 文末靠右對齊的文字
- **authorTitle**: 作者姓名下方的職稱或身份說明

### 3. 關鍵字
- 包含「關鍵字」或 🌿 符號的段落
- 需移除「關鍵字：」等前綴，只保留關鍵字本身

### 4. 特殊框類型
- **book-box**: 包含「書名」、「作者」、「出版社」等書籍資訊
- **quote-box**: blockquote 標籤或有明顯引用樣式
- **keyword-section**: 包含 🌿 符號的區塊
- **special-box**: 其他特殊格式框

### 5. 腳註格式
- 正文中的腳註標記：[^1]、[^2] 等
- 腳註內容：[^1]: 腳註文字

### 6. 內文處理
- 將 HTML 轉為 Markdown 格式
- 保留段落結構（使用 \\n\\n 分隔）
- 移除已分類到其他欄位的內容（標題、作者、特殊框等）
- 保留內文中的腳註標記

## ⚠️ 重要提醒
1. 只回傳 JSON，不要包含任何說明文字
2. 確保 JSON 格式完全正確，可被 JSON.parse() 解析
3. 如果某個欄位找不到對應內容，使用空字串 "" 或空陣列 []
4. content 欄位必須是完整的文章內文，不要遺漏段落
5. 所有文字保持原始內容，不要修改或潤飾
`;
}

/**
 * 批次分類多篇文章
 * @param {Array} files - 檔案陣列 [{name, content, formatSpec}]
 * @returns {Array} 結果陣列
 */
export async function batchClassify(files) {
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`🔄 處理第 ${i + 1}/${files.length} 篇文章: ${file.name}`);

    try {
      const result = await classifyWithGemini(file.content, file.formatSpec);
      results.push({
        file: file.name,
        result,
        success: true,
      });

      // 避免觸發速率限制，每篇文章間隔 1 秒
      if (i < files.length - 1) {
        await sleep(1000);
      }
    } catch (error) {
      console.error(`❌ ${file.name} 處理失敗:`, error.message);
      results.push({
        file: file.name,
        error: error.message,
        success: false,
      });
    }
  }

  return results;
}

/**
 * 輔助函數：延遲
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 測試 API 連線
 */
export async function testGeminiConnection() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: "❌ 未設定 API Key",
    };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "測試連線",
                },
              ],
            },
          ],
        }),
      },
    );

    if (response.ok) {
      return {
        success: true,
        message: "✅ Gemini API 連線正常",
      };
    } else {
      const error = await response.json();
      return {
        success: false,
        message: `❌ API 錯誤: ${error.error?.message}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ 連線失敗: ${error.message}`,
    };
  }
}
