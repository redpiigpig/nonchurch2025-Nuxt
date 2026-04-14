/**
 * 格式規範解析器（純前端版）
 * 規範資料已硬編碼，不依賴 fs/path（避免瀏覽器不相容）
 * fullSpec 文字由 classify-article API 在伺服器端讀取
 */

/**
 * 解析格式規範
 * @returns {Object} 解析後的格式規範
 */
export function parseFormatSpec() {
  try {
    const spec = {
      title: {
        // 標題規則：24pt、粗體、華康中黑體或 Times New Roman
        fontSize: 24,
        bold: true,
        fonts: ["華康中黑體", "Times New Roman"],
        align: "left",
      },
      subtitle: {
        // 副標題規則：──開頭、16pt、粗體
        prefix: "──",
        fontSize: 16,
        bold: true,
        fonts: ["華康中黑體", "Times New Roman"],
      },
      author: {
        // 作者規則：文鼎中行書、靠右對齊
        fonts: ["文鼎中行書", "Brush Script MT"],
        align: "right",
      },
      keywords: {
        // 關鍵字規則：🌿 開頭、粗體
        prefix: "🌿",
        bold: true,
        pattern: /🌿\s*關鍵字[:：]\s*(.+)/,
      },
      categories: {
        // 欄目分類與色碼
        封面故事: "#833C0B",
        專題文章: "#C00000",
        人物專訪: "#FFC000",
        評論與回應: "#ED7D31",
        生命故事: "#00B050",
        公告與剪影: "#7030A0",
        時事感想: "#0070C0",
      },
      sections: {
        // 區塊分類
        special: "特稿專區",
        theme: "主題廣場",
        diverse: "多元講堂",
      },
      specialBlocks: {
        // 特殊框識別規則
        quote: {
          // 引用框：標楷體、左縮排
          font: "標楷體",
          indent: true,
        },
        bookInfo: {
          // 書籍介紹框：文鼎粗鋼筆行楷
          font: "文鼎粗鋼筆行楷",
        },
      },
      footnotes: {
        // 腳註規則：[^數字] 格式
        pattern: /\[\^(\d+)\]/g,
      },
      fullSpec: "", // 完整規範文字由伺服器端 classify-article API 讀取
    };

    return spec;
  } catch (error) {
    console.error("解析格式規範失敗:", error);
    return null;
  }
}

/**
 * 獲取完整的格式規範文字（給 Gemini AI 使用）
 * @returns {string} 完整的格式規範
 */
export function getFullSpecText() {
  const spec = parseFormatSpec();
  return spec ? spec.fullSpec : "";
}

/**
 * 判斷文字是否符合標題規則
 * @param {Object} element - 文字元素
 * @returns {boolean}
 */
export function isTitleElement(element) {
  const spec = parseFormatSpec();
  if (!spec) return false;

  return element.fontSize >= spec.title.fontSize && element.bold === true;
}

/**
 * 判斷文字是否符合副標題規則
 * @param {string} text - 文字內容
 * @returns {boolean}
 */
export function isSubtitleElement(text) {
  const spec = parseFormatSpec();
  if (!spec) return false;

  return text.trim().startsWith(spec.subtitle.prefix);
}

/**
 * 判斷文字是否符合作者規則
 * @param {Object} element - 文字元素
 * @returns {boolean}
 */
export function isAuthorElement(element) {
  return element.align === "right" || element.align === "end";
}

/**
 * 提取關鍵字
 * @param {string} text - 文字內容
 * @returns {string|null}
 */
export function extractKeywords(text) {
  const spec = parseFormatSpec();
  if (!spec) return null;

  const match = text.match(spec.keywords.pattern);
  return match ? match[1].trim() : null;
}

/**
 * 判斷分類
 * @param {string} text - 文字內容
 * @returns {string|null}
 */
export function detectCategory(text) {
  const spec = parseFormatSpec();
  if (!spec) return null;

  for (const [category, color] of Object.entries(spec.categories)) {
    if (text.includes(`【${category}】`)) {
      return category;
    }
  }

  return null;
}
