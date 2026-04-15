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
export async function parseAndClassifyDocument(
  file,
  useAI = false,
  issueContext = {},
  overrideId = null,
) {
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
    classified = await classifyWithGemini(
      rawContent,
      specContent,
      issueContext,
    );
    // Gemini 有 token 限制，長文章 content 會被截斷。
    // 改用 mammoth 完整 HTML 重新提取內文，確保不遺失後半段。
    classified.content = extractContentFromHtml(rawContent.html);
    // footnotes 也從完整 HTML 重新提取（Gemini 可能漏掉）
    const fullFootnotes = extractFootnotesFromHtml(rawContent.html);
    if (fullFootnotes.length > 0) {
      classified.footnotes = fullFootnotes;
    }
  } else {
    classified = classifyWithRules(rawContent);
  }

  // 若有指定覆蓋 ID，直接套用（不用 Gemini 產生的）
  if (overrideId) {
    classified.id = overrideId;
    // 從 overrideId 解析期號補回
    const m = overrideId.match(/^(\d+)-/);
    if (m) classified.issue = parseInt(m[1]);
  }

  // Step 2.5: 將圖片佔位標記替換為正式 figure HTML
  if (rawContent.imageCount > 0 && classified.id) {
    const idMatch = classified.id.match(/^(\d+)-(\d+)/);
    if (idMatch) {
      const issue = idMatch[1];
      const articleSeq = idMatch[2];
      console.log(
        `🖼️ 偵測到 ${rawContent.imageCount} 張圖片，保留佔位符供前端動態替換`,
      );
      classified.content = replaceImagePlaceholders(
        classified.content,
        issue,
        articleSeq,
      );
    } else {
      console.warn(
        "⚠️ 無法從 AI 建議的 ID 提取期號/篇序，圖片佔位標記保留原樣",
      );
    }
  }

  // Step 3: 自動寫入 Supabase
  console.log("💾 Step 3: 寫入資料庫...");
  const articleId = await saveToSupabase(classified);

  console.log("✅ 完成！文章 ID:", articleId);

  return { articleId, classified };
}

/**
 * Step 1: 提取 Word 內容與樣式
 * 圖片會被替換為 [[圖片N]] 佔位標記
 */
async function extractWordContent(file) {
  const arrayBuffer = await file.arrayBuffer();

  // 使用 mammoth 解析 Word（不傳 convertImage，讓 mammoth 輸出預設的 base64）
  const result = await mammoth.convertToHtml({
    arrayBuffer: arrayBuffer,
    styleMap: [
      // 標題
      "p[style-name='標題'] => h1.title:fresh",
      "p[style-name='Heading 1'] => h1.title:fresh",
      "p[style-name='副標題'] => h2.subtitle:fresh",
      "p[style-name='Heading 2'] => h2.subtitle:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      // 引用（form.md：List Paragraph 為獨立引用段落主要 style）
      "p[style-name='引用'] => blockquote:fresh",
      "p[style-name='Quote'] => blockquote:fresh",
      "p[style-name='List Paragraph'] => blockquote:fresh",
    ],
  });

  // 把所有 base64 圖片資料替換為 [[圖片N]] 佔位標記
  // （比依賴 convertImage callback 更可靠，完全不受 async/await 行為影響）
  let imageCounter = 0;
  const html = result.value.replace(
    /<img\b[^>]*\bsrc="data:[^"]*"[^>]*/gi,
    () => {
      imageCounter++;
      return `<img src="[[圖片${imageCounter}]]" alt=""`;
    },
  );

  // 解析替換後的 HTML 為 DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 提取元素資訊
  const elements = Array.from(doc.body.children).map((el, index) =>
    extractElementInfo(el, index),
  );

  return {
    html,
    elements,
    rawText: doc.body.textContent,
    imageCount: imageCounter,
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
 * 從 mammoth 完整 HTML 提取內文（段落轉 Markdown，保留圖片佔位）
 * 用於 AI 模式下替換 Gemini 截斷的 content，確保長文不遺失後半段。
 */
function extractContentFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const contentParts = [];

  Array.from(doc.body.children).forEach((el) => {
    const tag = el.tagName;

    // mammoth 原生腳注清單由 extractFootnotesFromHtml 處理，此處略過
    if (tag === "OL" && el.classList.contains("footnotes")) return;

    const text = el.textContent.trim();
    if (!text) return;

    // 舊式 [^N] 腳注行略過
    if (/^\[\^\d+\]/.test(text)) return;

    if (el.querySelector("img") || el.innerHTML.includes("[[圖片")) {
      // 圖片佔位：保留整個元素 HTML
      contentParts.push(el.outerHTML);
    } else if (tag === "H1") {
      // H1.title 是文章主標（metadata），略過；其他 H1 視為大標
      if (!el.classList.contains("title")) contentParts.push(`# ${text}`);
    } else if (tag === "H2") {
      // H2.subtitle 是副標（metadata），略過；其他 H2 視為段落小標
      if (!el.classList.contains("subtitle")) contentParts.push(`## ${text}`);
    } else if (tag === "H3") {
      contentParts.push(`### ${text}`);
    } else if (tag === "BLOCKQUOTE") {
      // 引用段落（List Paragraph / 引用 style 對應）
      contentParts.push(`<blockquote>\n${text}\n</blockquote>`);
    } else if (tag === "P") {
      const innerHTML = el.innerHTML.trim();
      // 全粗體短段落 → 段落小標題（form.md：14pt bold = 段落小標題）
      if (/^<strong>[^<]*<\/strong>$/.test(innerHTML) && text.length <= 40) {
        contentParts.push(`## ${text}`);
      } else {
        contentParts.push(paragraphToMarkdown(el));
      }
    } else {
      contentParts.push(text);
    }
  });

  return contentParts.join("\n\n");
}

/**
 * 將 <p> 元素內容轉換為 Markdown，保留行內 bold/italic/腳注引用
 */
function paragraphToMarkdown(el) {
  let result = "";
  el.childNodes.forEach((node) => {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      result += node.textContent;
    } else if (node.nodeType === 1 /* ELEMENT_NODE */) {
      const tag = node.tagName;
      const text = node.textContent;
      if (tag === "STRONG" || tag === "B") {
        result += `**${text}**`;
      } else if (tag === "EM" || tag === "I") {
        result += `*${text}*`;
      } else if (tag === "SUP") {
        // mammoth 腳注引用：<sup><a href="#footnote-N">[N]</a></sup>
        const numMatch = text.match(/\[?(\d+)\]?/);
        result += numMatch ? `[^${numMatch[1]}]` : text;
      } else if (tag === "A") {
        const href = node.getAttribute("href") || "";
        // 略過腳注內部跳轉連結
        if (href.startsWith("#footnote")) return;
        result += `[${text}](${href})`;
      } else {
        result += text;
      }
    }
  });
  return result.trim();
}

/**
 * 從 mammoth 完整 HTML 提取腳注陣列 [{id, text}, ...]
 * 支援 mammoth 原生 <ol class="footnotes"> 與舊式 [^N]: 兩種格式
 */
function extractFootnotesFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const footnotes = [];

  // 優先：mammoth 原生格式 <ol class="footnotes"><li id="footnote-N">
  const footnoteList = doc.querySelector("ol.footnotes");
  if (footnoteList) {
    Array.from(footnoteList.querySelectorAll("li")).forEach((li) => {
      const idAttr = li.getAttribute("id") || "";
      const numMatch = idAttr.match(/footnote-(\d+)/);
      if (!numMatch) return;
      const id = parseInt(numMatch[1]);
      // 移除返回文章的 ↩ 連結
      li.querySelectorAll('a[href^="#footnote-ref"]').forEach((a) => a.remove());
      const text = li.textContent.trim();
      if (text) footnotes.push({ id, text });
    });
    return footnotes;
  }

  // 備用：舊式 [^N]: text 格式
  Array.from(doc.body.children).forEach((el) => {
    const text = el.textContent.trim();
    const m = text.match(/^\[\^(\d+)\][：:]\s*(.*)/);
    if (m) footnotes.push({ id: parseInt(m[1]), text: m[2] });
  });

  return footnotes;
}

// layout 對應的 CSS class
const LAYOUT_CLASS = {
  center: "img-bottom px-600",
  left: "img-left px-300",
  right: "img-right px-300",
};

/**
 * 將 content 中的 [[圖片N:layout]] 佔位標記替換為正式 figure HTML
 * 🌟 修改：不再寫死實體路徑，保留 [[圖片N]] 供前端從 media_assets 動態替換
 */
function replaceImagePlaceholders(content, _issue, articleSeq) {
  if (!content) return content;
  // 同時相容舊格式 [[圖片N]] 和新格式 [[圖片N:layout]]
  return content.replace(
    /\[\[圖片(\d+)(?::(left|right|center))?\]\]/g,
    (_, n, layout) => {
      const cssClass = LAYOUT_CLASS[layout] || LAYOUT_CLASS.center;
      return `\n\n<figure class="${cssClass}"><img src="[[圖片${n}]]" alt="圖片 ${articleSeq}-${n}"><figcaption>（圖片 ${articleSeq}-${n}，待上傳）</figcaption></figure>\n\n`;
    },
  );
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

  if (!classified.id) {
    throw new Error("❌ AI 未能產生文章 ID，請手動輸入");
  }

  const articleData = {
    id: classified.id,
    title: classified.title || "未命名文章",
    subtitle: classified.subtitle || null,
    issue: classified.issue || null,
    category: classified.category || null,
    section: classified.section || null,
    author: classified.author || null,
    author_title: classified.authorTitle || null,
    remark: classified.remark || null,
    summary: classified.summary || null,
    keyword: classified.keyword || null,
    issue_title: classified.issue_title || issueContext.issueTitle || null,
    content: classified.content || "",
    footnotes: classified.footnotes || [],
    seo: classified.seo || null,
    is_published: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("articles")
    .upsert(articleData, { onConflict: "id" })
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
