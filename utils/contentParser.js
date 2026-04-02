// utils/contentParser.js
/**
 * Word 文件內容解析與分類工具
 * 支援程式規則判斷與 AI 輔助判斷
 */

import mammoth from "mammoth";
import { parseFormatSpec } from "./formatSpecParser";
import { classifyWithGemini } from "./geminiAPI";

// 載入格式規範（啟動時執行一次）
let FORMAT_SPEC = null;

/**
 * 主解析函數 - 自動判斷並分類內容
 * @param {File} file - Word 檔案
 * @param {Boolean} useAI - 是否使用 AI 判斷
 * @returns {Object} {articleId, classified}
 */
export async function parseAndClassifyDocument(file, useAI = false) {
  // 初始化格式規範
  if (!FORMAT_SPEC) {
    FORMAT_SPEC = await parseFormatSpec();
  }

  // Step 1: 解析 Word 為結構化資料
  console.log("📖 Step 1: 解析 Word 文件...");
  const rawContent = await extractWordContent(file);

  // Step 2: 智能分類（程式規則 or AI）
  console.log(`🔍 Step 2: ${useAI ? "AI" : "程式規則"}分類中...`);
  let classified;

  if (useAI) {
    // 讀取完整格式規範
    const specContent = await readFormatSpecFile();
    classified = await classifyWithGemini(rawContent, specContent);
  } else {
    classified = classifyWithRules(rawContent);
  }

  // Step 3: 自動寫入 Supabase
  console.log("💾 Step 3: 寫入資料庫...");
  const articleId = await saveToSupabase(classified);

  console.log("✅ 完成！文章 ID:", articleId);

  return { articleId, classified };
}

/**
 * Step 1: 提取 Word 內容與樣式
 */
async function extractWordContent(file) {
  const arrayBuffer = await file.arrayBuffer();

  // 使用 mammoth 解析 Word
  const result = await mammoth.convertToHtml({
    arrayBuffer: arrayBuffer,
    styleMap: [
      // 保留樣式資訊
      "p[style-name='標題'] => h1.title:fresh",
      "p[style-name='Heading 1'] => h1.title:fresh",
      "p[style-name='副標題'] => h2.subtitle:fresh",
      "p[style-name='Heading 2'] => h2.subtitle:fresh",
      "p[style-name='引用'] => blockquote:fresh",
      "p[style-name='Quote'] => blockquote:fresh",
    ],
  });

  // 解析 HTML 為 DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(result.value, "text/html");

  // 提取元素資訊
  const elements = Array.from(doc.body.children).map((el, index) =>
    extractElementInfo(el, index),
  );

  return {
    html: result.value,
    elements: elements,
    rawText: doc.body.textContent,
  };
}

/**
 * 提取單個元素的詳細資訊
 */
function extractElementInfo(element, index) {
  const computedStyle = getComputedStyleFromHTML(element);

  return {
    index: index,
    tag: element.tagName.toLowerCase(),
    text: element.textContent.trim(),
    html: element.outerHTML,
    classes: Array.from(element.classList),
    style: {
      fontSize: computedStyle.fontSize || parseFontSize(element),
      fontWeight: computedStyle.fontWeight || parseFontWeight(element),
      color: computedStyle.color,
      textAlign: computedStyle.textAlign || parseTextAlign(element),
      backgroundColor: computedStyle.backgroundColor,
      border: computedStyle.border,
    },
  };
}

/**
 * 從 HTML 屬性中解析樣式
 */
function getComputedStyleFromHTML(element) {
  const style = {};
  const styleAttr = element.getAttribute("style");

  if (styleAttr) {
    styleAttr.split(";").forEach((rule) => {
      const [key, value] = rule.split(":").map((s) => s.trim());
      if (key && value) {
        style[toCamelCase(key)] = value;
      }
    });
  }

  return style;
}

function parseFontSize(element) {
  const html = element.outerHTML;
  const sizeMatch =
    html.match(/font-size:\s*(\d+)pt/) || html.match(/font-size:\s*(\d+)px/);
  return sizeMatch ? parseInt(sizeMatch[1]) : 12;
}

function parseFontWeight(element) {
  const html = element.outerHTML;
  if (
    html.includes("font-weight:bold") ||
    html.includes("font-weight:700") ||
    element.querySelector("strong, b")
  ) {
    return 700;
  }
  return 400;
}

function parseTextAlign(element) {
  const html = element.outerHTML;
  if (html.includes("text-align:center")) return "center";
  if (html.includes("text-align:right")) return "right";
  return "left";
}

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Step 2A: 程式規則判斷（免費、快速）
 */
function classifyWithRules(content) {
  const classified = {
    title: "",
    subtitle: "",
    author: "",
    authorTitle: "",
    keyword: "",
    content: "",
    footnotes: [],
    metadata: {
      specialBoxes: [],
      images: [],
    },
  };

  const usedIndices = new Set(); // 記錄已分類的段落

  content.elements.forEach((el, index) => {
    // 跳過空白段落
    if (!el.text || el.text.length < 2) return;

    // 判斷標題（第一個大字體元素）
    if (
      !classified.title &&
      (index === 0 ||
        el.tag === "h1" ||
        el.classes.includes("title") ||
        (el.style.fontSize >= 20 && el.style.fontWeight >= 600))
    ) {
      classified.title = el.text;
      usedIndices.add(index);
    }

    // 判斷副標題（標題後的粗體文字或 ── 開頭）
    else if (
      classified.title &&
      !classified.subtitle &&
      (el.text.startsWith("──") ||
        el.classes.includes("subtitle") ||
        el.tag === "h2")
    ) {
      classified.subtitle = el.text.replace(/^──\s*/, "");
      usedIndices.add(index);
    }

    // 判斷關鍵字（包含 "關鍵字"、"🌿"）
    else if (
      !classified.keyword &&
      (el.text.includes("關鍵字") || el.text.includes("🌿"))
    ) {
      classified.keyword = el.text
        .replace(/關鍵字[：:]\s*/, "")
        .replace(/🌿\s*/, "");
      usedIndices.add(index);
    }

    // 判斷特殊框（blockquote 或有邊框樣式）
    else if (el.tag === "blockquote" || hasBoxStyle(el)) {
      classified.metadata.specialBoxes.push({
        type: detectBoxType(el),
        content: el.html,
        position: index,
      });
      usedIndices.add(index);
    }

    // 判斷腳註（[^1] 格式）
    else if (el.text.match(/\[\^\d+\]/)) {
      const footnote = extractFootnote(el);
      if (footnote) {
        classified.footnotes.push(footnote);
        usedIndices.add(index);
      }
    }

    // 判斷圖片
    else if (el.tag === "img" || el.html.includes("<img")) {
      const img = extractImage(el);
      if (img) {
        classified.metadata.images.push(img);
        usedIndices.add(index);
      }
    }
  });

  // 判斷作者（從後往前找靠右對齊的文字）
  for (let i = content.elements.length - 1; i >= 0; i--) {
    const el = content.elements[i];
    if (usedIndices.has(i)) continue;

    if (el.style.textAlign === "right" && el.text.length > 0) {
      if (!classified.author) {
        classified.author = el.text;
        usedIndices.add(i);
      } else if (!classified.authorTitle) {
        classified.authorTitle = el.text;
        usedIndices.add(i);
        break;
      }
    }
  }

  // 收集內文（未分類的段落）
  const contentParts = [];
  content.elements.forEach((el, index) => {
    if (!usedIndices.has(index) && el.text.length > 0) {
      contentParts.push(convertToMarkdown(el));
    }
  });

  classified.content = contentParts.join("\n\n");

  return classified;
}

/**
 * 判斷是否為特殊框
 */
function hasBoxStyle(element) {
  return (
    element.html.includes("border") ||
    element.style.border ||
    element.style.backgroundColor ||
    element.classes.some((c) => c.includes("box"))
  );
}

/**
 * 判斷特殊框類型
 */
function detectBoxType(element) {
  const text = element.text.toLowerCase();

  if (text.includes("書名") || text.includes("作者") || text.includes("出版")) {
    return "book-box";
  }
  if (text.includes("🌿")) {
    return "keyword-section";
  }
  if (element.tag === "blockquote") {
    return "quote-box";
  }
  if (
    element.style.color?.includes("8b4513") ||
    element.style.color?.includes("brown")
  ) {
    return "book-quote";
  }

  return "special-box";
}

/**
 * 提取腳註
 */
function extractFootnote(element) {
  const match = element.text.match(/\[\^(\d+)\][：:]?\s*(.*)/);
  if (match) {
    return {
      id: match[1],
      text: match[2] || element.text,
    };
  }
  return null;
}

/**
 * 提取圖片資訊
 */
function extractImage(element) {
  const img = element.querySelector?.("img") || element;
  const src = img.getAttribute?.("src") || "";
  const alt = img.getAttribute?.("alt") || "";

  if (src) {
    return { src, alt, caption: alt };
  }
  return null;
}

/**
 * 將 HTML 元素轉為 Markdown
 */
function convertToMarkdown(element) {
  let text = element.text;

  // 處理粗體
  if (element.style.fontWeight >= 600 || element.html.includes("<strong")) {
    text = `**${text}**`;
  }

  // 處理斜體
  if (element.html.includes("<em") || element.html.includes("<i>")) {
    text = `*${text}*`;
  }

  // 處理標題
  if (element.tag.startsWith("h")) {
    const level = parseInt(element.tag[1]);
    text = "#".repeat(level) + " " + text;
  }

  // 處理引用
  if (element.tag === "blockquote") {
    text = "> " + text;
  }

  return text;
}

/**
 * Step 3: 自動寫入 Supabase
 */
async function saveToSupabase(classified) {
  // 動態導入 Supabase（避免伺服器端錯誤）
  const { createClient } = await import("@supabase/supabase-js");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("❌ 請設定 Supabase 環境變數");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const articleData = {
    title: classified.title || "未命名文章",
    subtitle: classified.subtitle || null,
    author: classified.author || null,
    author_title: classified.authorTitle || null,
    keyword: classified.keyword || null,
    content: classified.content || "",
    footnotes: classified.footnotes || [],
    metadata: classified.metadata || {},
    is_published: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("articles")
    .insert([articleData])
    .select()
    .single();

  if (error) {
    console.error("Supabase 錯誤:", error);
    throw new Error(`資料庫寫入失敗: ${error.message}`);
  }

  return data.id;
}

/**
 * 讀取格式規範檔案
 */
async function readFormatSpecFile() {
  try {
    const response = await fetch("/stores/form.md");
    if (!response.ok) {
      throw new Error("無法讀取格式規範檔案");
    }
    return await response.text();
  } catch (error) {
    console.warn("⚠️ 無法讀取 form.md，使用預設規範");
    return getDefaultFormatSpec();
  }
}

/**
 * 預設格式規範（當無法讀取檔案時使用）
 */
function getDefaultFormatSpec() {
  return `
# 無境界者_格式規範

## 1. 文章標題
- 主標題：粗體、置中、大字體（>20px）
- 副標題：── 開頭、粗體

## 2. 作者資訊
- 作者姓名：文末靠右對齊
- 作者職稱：作者姓名下方

## 3. 特殊格式
- 書籍介紹框：包含「書名」、「作者」字樣
- 引用框：blockquote 標籤或邊框樣式
- 關鍵字：包含 🌿 或「關鍵字」字樣

## 4. 腳註
- 格式：[^1]、[^2] 等
  `;
}

/**
 * 計算分類可信度
 */
export function calculateConfidence(classified) {
  let score = 0;

  if (classified.title) score += 0.3;
  if (classified.author) score += 0.2;
  if (classified.content && classified.content.length > 100) score += 0.3;
  if (classified.footnotes && classified.footnotes.length > 0) score += 0.1;
  if (classified.metadata?.specialBoxes?.length > 0) score += 0.1;

  return score;
}
