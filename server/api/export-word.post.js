/**
 * Word 文件生成 API（Python 版，優先保留既有排版）
 * - 使用 scripts/generate_docx.py
 * - 完整沿用既有 Python 格式規則（你原本精調的版型）
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

// ── Run 描述 + size → TextRun[] ──────────────────────────────────────
// size: half-points（24 = 12pt, 48 = 24pt）
function makeRuns(html, { size = 24, forceBold = false } = {}) {
  return parseInlineRuns(html).map((r) => {
    if (r.type === "fnRef") {
      return new TextRun({
        text:        `[${r.id}]`,
        superScript: true,
        color:       "0070C0",
        size:        Math.round(size * 0.75),
        font:        "Times New Roman",
      });
    }
    return new TextRun({
      text:      r.text,
      bold:      r.bold || forceBold,
      italics:   r.italic    || false,
      underline: r.underline ? {} : undefined,
      font:      r.kaiti ? "標楷體" : "Times New Roman",
      size,
    });
  });
}

// ── 段落工廠 ──────────────────────────────────────────────────────────
function makePara(html, opts = {}) {
  const {
    size        = 24,
    indent      = true,
    leftMM      = 0,
    rightMM     = 0,
    align       = AlignmentType.JUSTIFIED,
    spaceBefore = 0,
    spaceAfter  = 200,
    line        = LINE_1_8,
    border      = undefined,
    children    = null,
  } = opts;

  return new Paragraph({
    children: children || makeRuns(html || "", { size }),
    alignment: align,
    spacing: { before: spaceBefore, after: spaceAfter, line, lineRule: "auto" },
    indent: {
      firstLine: indent ? INDENT_2EM : 0,
      left:  leftMM  ? mmToTwip(leftMM)  : 0,
      right: rightMM ? mmToTwip(rightMM) : 0,
    },
    border,
  });
}

// ── 頂層 Block 提取器 ─────────────────────────────────────────────────
// 從 html[start] 開始，找出下一個完整頂層元素並返回 { tag, attrs, content, end }
function extractNextBlock(html, start = 0) {
  let pos = start;
  while (pos < html.length && /\s/.test(html[pos])) pos++;
  if (pos >= html.length) return null;

  if (html[pos] !== "<") {
    const nextTag = html.indexOf("<", pos);
    const end = nextTag === -1 ? html.length : nextTag;
    const text = html.slice(pos, end);
    return text.trim()
      ? { tag: "#text", attrs: "", content: text, end }
      : { tag: null,    attrs: "", content: "",   end };
  }

  // 自閉合 hr
  const hrM = html.slice(pos).match(/^<hr[^>]*\/?>/i);
  if (hrM) return { tag: "hr", attrs: "", content: "", end: pos + hrM[0].length };

  // 開啟標籤
  const openM = html.slice(pos).match(/^<(\w+)([^>]*)>/);
  if (!openM) return { tag: null, attrs: "", content: "", end: pos + 1 };

  const [fullOpen, rawTag, attrs] = openM;
  const tag = rawTag.toLowerCase();

  if (["br", "img", "input"].includes(tag)) {
    return { tag, attrs, content: "", end: pos + fullOpen.length };
  }

  // 找配對閉合標籤（含深度計數）
  const closeTag = `</${tag}>`;
  let depth = 1;
  let i = pos + fullOpen.length;

  while (i < html.length && depth > 0) {
    const co = html.indexOf(`<${tag}`, i);
    const cc = html.indexOf(closeTag, i);

    if (cc === -1) {
      return { tag, attrs, content: html.slice(pos + fullOpen.length), end: html.length };
    }
    if (co !== -1 && co < cc) {
      const ch = html[co + tag.length + 1];
      if (!ch || /[ >\t\n/]/.test(ch)) {
        depth++;
        i = co + tag.length + 2;
        continue;
      }
    }
    depth--;
    if (depth === 0) {
      return {
        tag,
        attrs,
        content: html.slice(pos + fullOpen.length, cc),
        end:     cc + closeTag.length,
      };
    }
    i = cc + closeTag.length;
  }
  return { tag, attrs, content: html.slice(pos + fullOpen.length), end: html.length };
}

// ── Block → Paragraph[] ───────────────────────────────────────────────
function convertBlock(block) {
  if (!block || !block.tag) return [];
  const { tag, attrs, content } = block;
  const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || "";

  switch (tag) {
    case "#text":
      return content.trim() ? [makePara(content, { indent: false })] : [];

    case "hr":
      return [new Paragraph({
        children: [],
        border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: "444444", space: 0 } },
        spacing: { before: 400, after: 400 },
      })];

    case "h2":
      return [new Paragraph({
        children: [new TextRun({ text: htmlDecode(stripAllTags(content)), bold: true, size: 36, font: "Times New Roman" })],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.LEFT,
        spacing: { before: 560, after: 240, line: LINE_1_8, lineRule: "auto" },
        indent: { firstLine: 0 },
      })];

    case "h3":
      return [new Paragraph({
        children: [new TextRun({ text: htmlDecode(stripAllTags(content)), bold: true, size: 28, font: "Times New Roman" })],
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.LEFT,
        spacing: { before: 480, after: 200, line: LINE_1_8, lineRule: "auto" },
        indent: { firstLine: 0 },
      })];

    case "p": {
      const noIndent = /no-indent/.test(cls);
      return [makePara(content, { indent: !noIndent })];
    }

    case "blockquote": {
      const innerParas = [];
      let pos = 0;
      while (pos < content.length) {
        const b = extractNextBlock(content, pos);
        if (!b || b.end <= pos) break;
        if (b.tag === "p" || b.tag === "#text") {
          innerParas.push(makePara(b.content, {
            indent: false,
            leftMM: 20,
            rightMM: 20,
          }));
        } else if (b.tag === "small") {
          innerParas.push(new Paragraph({
            children: [new TextRun({ text: htmlDecode(stripAllTags(b.content)), size: 20, color: "666666", font: "Times New Roman" })],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 0, after: 200, line: LINE_1_8, lineRule: "auto" },
            indent: { firstLine: 0, left: mmToTwip(20), right: mmToTwip(20) },
          }));
        }
        pos = b.end;
      }
      return innerParas.length
        ? innerParas
        : [makePara(content, { indent: false, leftMM: 20, rightMM: 20 })];
    }

    case "div": {
      // ── book-quote / quote-box ─────────────────────────────────────
      if (cls.includes("book-quote") || cls.includes("quote-box")) {
        const result = [];
        let pos = 0;
        while (pos < content.length) {
          const b = extractNextBlock(content, pos);
          if (!b || b.end <= pos) break;
          if (b.tag === "p" || b.tag === "#text") {
            result.push(new Paragraph({
              children: makeRuns(b.content),
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 0, after: 160, line: LINE_1_8, lineRule: "auto" },
              indent: { firstLine: 0, left: mmToTwip(20), right: mmToTwip(20) },
              border: { left: { style: BorderStyle.THICK, size: 12, color: "8B4513", space: 6 } },
            }));
          }
          pos = b.end;
        }
        if (!result.length) {
          result.push(new Paragraph({
            children: [new TextRun({ text: htmlDecode(stripAllTags(content)), font: "標楷體", size: 24 })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 400, after: 400, line: LINE_1_8, lineRule: "auto" },
            indent: { firstLine: 0, left: mmToTwip(20) },
            border: { left: { style: BorderStyle.THICK, size: 12, color: "8B4513", space: 6 } },
          }));
        }
        return result;
      }

      // ── reference-box ─────────────────────────────────────────────
      if (cls.includes("reference-box")) {
        const result = [];
        let pos = 0;
        while (pos < content.length) {
          const b = extractNextBlock(content, pos);
          if (!b || b.end <= pos) break;
          if (b.tag === "strong") {
            result.push(new Paragraph({
              children: [new TextRun({ text: htmlDecode(stripAllTags(b.content)), bold: true, size: 25, font: "Times New Roman" })],
              spacing: { before: 200, after: 120, line: LINE_1_8, lineRule: "auto" },
              indent: { firstLine: 0, left: mmToTwip(20) },
            }));
          } else if (b.tag === "ul") {
            let lpos = 0;
            while (lpos < b.content.length) {
              const li = extractNextBlock(b.content, lpos);
              if (!li || li.end <= lpos) break;
              if (li.tag === "li") {
                result.push(new Paragraph({
                  children: [
                    new TextRun({ text: "•　", font: "Times New Roman" }),
                    ...makeRuns(li.content),
                  ],
                  spacing: { before: 0, after: 80, line: LINE_1_8, lineRule: "auto" },
                  indent: { firstLine: 0, left: mmToTwip(25) },
                  alignment: AlignmentType.JUSTIFIED,
                }));
              }
              lpos = li.end;
            }
          }
          pos = b.end;
        }
        return result.length
          ? result
          : [makePara(stripAllTags(content), { indent: false, leftMM: 20 })];
      }

      // ── custom-divider ────────────────────────────────────────────
      if (cls.includes("custom-divider")) {
        return [new Paragraph({
          children: [],
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 0 } },
          spacing: { before: 600, after: 600 },
        })];
      }

      // ── special-box ───────────────────────────────────────────────
      if (cls.includes("special-box")) {
        return [new Paragraph({
          children: makeRuns(stripAllTags(content)),
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 400, line: LINE_1_8, lineRule: "auto" },
          indent: { firstLine: 0 },
          border: {
            top:    { style: BorderStyle.DASHED, size: 6, color: "444444", space: 4 },
            bottom: { style: BorderStyle.DASHED, size: 6, color: "444444", space: 4 },
            left:   { style: BorderStyle.DASHED, size: 6, color: "444444", space: 4 },
            right:  { style: BorderStyle.DASHED, size: 6, color: "444444", space: 4 },
          },
        })];
      }

      // ── book-box / author-profile / portrait-box 等包含圖片的區塊 ──
      if (
        cls.includes("book-box")     ||
        cls.includes("author-profile") ||
        cls.includes("portrait-box") ||
        cls.includes("info-card")
      ) {
        const result = [];
        let pos = 0;
        while (pos < content.length) {
          const b = extractNextBlock(content, pos);
          if (!b || b.end <= pos) break;
          if (b.tag === "p" || b.tag === "h3") {
            result.push(makePara(b.content, { indent: false, leftMM: 10 }));
          }
          pos = b.end;
        }
        return result;
      }

      // ── 其他 div：遞迴處理內層 ────────────────────────────────────
      const result = [];
      let pos = 0;
      while (pos < content.length) {
        const b = extractNextBlock(content, pos);
        if (!b || b.end <= pos) break;
        result.push(...convertBlock(b));
        pos = b.end;
      }
      return result;
    }

    case "figure": {
      const capM = content.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
      const capText = capM ? htmlDecode(stripAllTags(capM[1])) : "";
      const result = [new Paragraph({
        children: [new TextRun({ text: "【圖片】", color: "888888", italics: true, font: "Times New Roman" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: capText ? 80 : 400 },
        indent: { firstLine: 0 },
      })];
      if (capText) {
        result.push(new Paragraph({
          children: [new TextRun({ text: capText, size: 19, color: "666666", font: "Times New Roman" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 400 },
          indent: { firstLine: 0 },
        }));
      }
      return result;
    }

    default:
      return content.trim() ? [makePara(content, { indent: false })] : [];
  }
}

// ── 全文 HTML → Paragraph[] ───────────────────────────────────────────
function parseContentToParas(html) {
  if (!html) return [];
  const paras = [];
  let pos = 0;
  // 把圖片佔位符 [[圖片N]] 轉換為 figure 格式
  const clean = html.replace(
    /\[\[圖片(\d+)\]\]/g,
    "<figure><figcaption>[圖片 $1]</figcaption></figure>",
  );

  while (pos < clean.length) {
    const block = extractNextBlock(clean, pos);
    if (!block) break;
    if (block.end <= pos) { pos++; continue; }
    paras.push(...convertBlock(block));
    pos = block.end;
  }
  return paras;
}

// ── 文件組合 ─────────────────────────────────────────────────────────
function buildWordDocument(data) {
  const {
    title        = "",
    subtitle     = "",
    category     = "",
    author       = "",
    author_title = "",
    remark       = "",
    keyword      = "",
    content      = "",
    footnotes    = [],
  } = data;

  const children = [];

  // ── 分類標籤
  if (category) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `【${category}】`, bold: true, size: 20, color: "336699", font: "Times New Roman" })],
      spacing: { after: 160 },
      indent: { firstLine: 0 },
    }));
  }

  // ── 主標題
  if (title) {
    children.push(new Paragraph({
      children: makeRuns(title, { size: 48, forceBold: true }),
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: subtitle ? 120 : 320, line: 360, lineRule: "auto" },
      indent: { firstLine: 0 },
    }));
  }

  // ── 副標題
  if (subtitle) {
    children.push(new Paragraph({
      children: makeRuns(subtitle, { size: 32 }),
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 320, line: 320, lineRule: "auto" },
      indent: { firstLine: 0 },
    }));
  }

  // ── 裝飾橫線
  children.push(new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.DOUBLE, size: 4, color: "444444", space: 0 } },
    spacing: { before: 0, after: 320 },
  }));

  // ── 作者行
  const authorParts = [];
  if (author)       authorParts.push(new TextRun({ text: author, size: 24, font: "Times New Roman" }));
  if (author_title) authorParts.push(new TextRun({ text: `　${author_title}`, size: 22, color: "555555", font: "Times New Roman" }));
  if (authorParts.length) {
    children.push(new Paragraph({
      children: authorParts,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: remark ? 80 : 400 },
      indent: { firstLine: 0 },
    }));
  }

  // ── 備註
  if (remark) {
    children.push(new Paragraph({
      children: makeRuns(remark),
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 400, line: LINE_1_8, lineRule: "auto" },
      indent: { firstLine: 0 },
    }));
  }

  // ── 關鍵字
  if (keyword) {
    children.push(new Paragraph({
      children: [new TextRun({ text: keyword, size: 22, color: "444444", font: "Times New Roman" })],
      spacing: { before: 0, after: 400 },
      indent: { firstLine: 0 },
    }));
  }

  // ── 主內文
  children.push(...parseContentToParas(content));

  // ── 腳注（文末列表）
  if (Array.isArray(footnotes) && footnotes.length > 0) {
    children.push(new Paragraph({
      children: [],
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "444444", space: 8 } },
      spacing: { before: 1000, after: 400 },
    }));
    for (const fn of footnotes) {
      if (!fn || !fn.id) continue;
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${fn.id}.　`, color: "0070C0", size: 20, font: "Times New Roman" }),
          ...makeRuns(fn.text || "", { size: 20 }),
        ],
        spacing: { before: 0, after: 160, line: LINE_1_8, lineRule: "auto" },
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 0, left: mmToTwip(10) },
      }));
    }
  }

  return new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width:  mmToTwip(210),
            height: mmToTwip(297),
          },
          margin: {
            top:    mmToTwip(25),
            right:  mmToTwip(25),
            bottom: mmToTwip(25),
            left:   mmToTwip(30),
          },
        },
      },
      children,
    }],
  });
}

export default defineEventHandler(async (event) => {
  try {
    const articleData = await readBody(event);
    console.log("📥 收到文章資料:", articleData.id);

    const tempDir = path.join(process.cwd(), "temp");
    const tempJsonPath = path.join(tempDir, `${articleData.id}.json`);
    const outputPath = path.join(tempDir, `${articleData.id}.docx`);

    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(
      tempJsonPath,
      JSON.stringify(articleData, null, 2),
      "utf-8",
    );

    const pythonScript = path.join(
      process.cwd(),
      "scripts",
      "generate_docx.py",
    );
    const pythonBin = process.platform === "win32" ? "python" : "python3";
    const command = `${pythonBin} "${pythonScript}" "${tempJsonPath}" "${outputPath}"`;
    console.log("🐍 執行 Python 腳本:", command);

    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log("Python 輸出:", stdout);
    if (stderr) console.warn("Python 訊息:", stderr);

    const fileBuffer = await fs.readFile(outputPath);

    // 清理暫存檔
    try {
      await fs.unlink(tempJsonPath);
      await fs.unlink(outputPath);
    } catch (cleanupError) {
      console.warn("清理暫存檔失敗:", cleanupError);
    }

    console.log("✅ 成功生成 Word 文件（Python）");
    return {
      success: true,
      file: fileBuffer.toString("base64"),
      filename: `${articleData.id}.docx`,
    };
  } catch (error) {
    console.error("❌ 生成 Word 失敗:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});
