// utils/formatSpecParser.js
import fs from "fs";
import path from "path";

/**
 * 解析格式規範 Markdown，轉為程式可用的規則
 */
export function parseFormatSpec() {
  // 讀取格式規範檔案
  const specPath = path.join(process.cwd(), "stores/form.md");
  const specContent = fs.readFileSync(specPath, "utf-8");

  // 解析為結構化規則
  const rules = {
    title: extractRule(specContent, "文章標題"),
    author: extractRule(specContent, "作者資訊"),
    specialBoxes: extractBoxRules(specContent),
    footnotes: extractRule(specContent, "腳註"),
    images: extractRule(specContent, "圖片"),
    styles: extractStyleRules(specContent),
  };

  return rules;
}

/**
 * 提取特定規則
 */
function extractRule(markdown, sectionName) {
  const regex = new RegExp(`## .*${sectionName}([\\s\\S]*?)(?=##|$)`, "i");
  const match = markdown.match(regex);

  if (!match) return {};

  const sectionContent = match[1];
  const rules = {};

  // 解析規則項目（- 開頭的列表）
  const items = sectionContent.match(/- (.*?):(.*?)(?=\n-|\n#|$)/gs);

  if (items) {
    items.forEach((item) => {
      const [key, value] = item
        .replace(/^- /, "")
        .split(":")
        .map((s) => s.trim());
      rules[key] = parseRuleValue(value);
    });
  }

  return rules;
}

/**
 * 解析規則值
 */
function parseRuleValue(value) {
  const rules = {
    indicators: [], // 判斷指標
    styles: {}, // 樣式要求
  };

  // 提取樣式關鍵字
  if (value.includes("粗體")) rules.styles.fontWeight = "bold";
  if (value.includes("置中")) rules.styles.textAlign = "center";
  if (value.includes("靠右")) rules.styles.textAlign = "right";
  if (value.includes("大字體")) rules.styles.fontSize = "large";

  // 提取內容指標
  if (value.includes("── 開頭")) rules.indicators.push("startsWith:──");
  if (value.includes("🌿")) rules.indicators.push("contains:🌿");

  return rules;
}

/**
 * 提取特殊框規則
 */
function extractBoxRules(markdown) {
  const boxSection = markdown.match(/### 3\. 特殊格式([\s\S]*?)(?=##|$)/)?.[1];
  if (!boxSection) return {};

  const boxes = {};
  const boxTypes = boxSection.match(/#### (.*?)\n([\s\S]*?)(?=####|$)/g);

  if (boxTypes) {
    boxTypes.forEach((boxType) => {
      const [, name, content] = boxType.match(/#### (.*?)\n([\s\S]*)/);
      boxes[name.trim()] = {
        name: name.trim(),
        indicators: extractIndicators(content),
        styles: extractStyles(content),
      };
    });
  }

  return boxes;
}

function extractIndicators(content) {
  const indicators = [];

  if (content.includes("包含「書名」")) indicators.push("contains:書名");
  if (content.includes("blockquote")) indicators.push("tag:blockquote");
  if (content.includes("邊框")) indicators.push("hasBorder:true");
  if (content.includes("背景色")) indicators.push("hasBackground:true");

  return indicators;
}

function extractStyles(content) {
  const styles = {};

  const colorMatch = content.match(/顏色[：:]\s*#?(\w+)/i);
  if (colorMatch) styles.color = colorMatch[1];

  const sizeMatch = content.match(/字體[：:]\s*(\d+)/);
  if (sizeMatch) styles.fontSize = parseInt(sizeMatch[1]);

  return styles;
}

/**
 * 提取樣式規則（從 CSS 範例中提取）
 */
function extractStyleRules(markdown) {
  const styleSection = markdown.match(/```css([\s\S]*?)```/);
  if (!styleSection) return {};

  const css = styleSection[1];
  const rules = {};

  // 解析 CSS 類別
  const classes = css.match(/\.([\w-]+)\s*{([^}]*)}/g);
  if (classes) {
    classes.forEach((cls) => {
      const [, className, properties] = cls.match(/\.([\w-]+)\s*{([^}]*)}/);
      rules[className] = parseCSSProperties(properties);
    });
  }

  return rules;
}

function parseCSSProperties(css) {
  const props = {};
  const lines = css.split(";").filter((l) => l.trim());

  lines.forEach((line) => {
    const [key, value] = line.split(":").map((s) => s.trim());
    if (key && value) {
      props[toCamelCase(key)] = value;
    }
  });

  return props;
}

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}
