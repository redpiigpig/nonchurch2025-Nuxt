#!/usr/bin/env node
/*
 * 用第 N 期 Word 範本（7-x.docx）替換內容為第 N+1 期文章（8-x），
 * 保留範本的字型、版面、頁首頁尾、章節屬性，只重寫 word/document.xml
 * 與 word/footnotes.xml。
 *
 * 用法： node scripts/rebuild_issue_docx.cjs <article_id>
 *   ex.  node scripts/rebuild_issue_docx.cjs 8-3精衛救火
 *
 * 對應：
 *   8-0目次  ← 7-0目次.docx
 *   8-1編輯室報告 ← 7-1編輯室報告.docx
 *   8-2本期作者簡介 ← 7-2本期作者簡介.docx
 *   8-3精衛救火 ← 7-3火燒島的美麗風景.docx
 *
 * 參照 CLAUDE.md：
 *   - 不硬編碼 secret，從 process.env / .env 讀
 *   - 圖片不下載（顯示為佔位符或省略）
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { Client } = require('pg');

// ---------- 迷你 HTML parser（只處理我們文章用到的 tag） ----------
const TEXT_NODE = 1;
const ELEMENT_NODE = 2;
const VOID_TAGS = new Set(['br', 'img', 'hr', 'meta', 'input', 'link']);
function parse(html) {
  let i = 0;
  const len = html.length;
  const root = { type: 0, children: [] };
  const stack = [root];

  function parseAttrs(s) {
    const attrs = {};
    const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let m;
    while ((m = re.exec(s))) {
      const key = m[1];
      const val = m[3] != null ? m[3] : m[4] != null ? m[4] : m[5] != null ? m[5] : '';
      attrs[key] = val;
    }
    return attrs;
  }

  while (i < len) {
    if (html[i] === '<') {
      // comment
      if (html.startsWith('<!--', i)) {
        const end = html.indexOf('-->', i + 4);
        i = end < 0 ? len : end + 3;
        continue;
      }
      // closing tag
      if (html[i + 1] === '/') {
        const end = html.indexOf('>', i);
        if (end < 0) { i = len; break; }
        const name = html.slice(i + 2, end).trim().toLowerCase();
        // pop until matched
        for (let j = stack.length - 1; j > 0; j--) {
          if (stack[j].name === name) {
            stack.length = j;
            break;
          }
        }
        i = end + 1;
        continue;
      }
      // opening tag
      const end = html.indexOf('>', i);
      if (end < 0) { i = len; break; }
      let inside = html.slice(i + 1, end);
      let selfClose = false;
      if (inside.endsWith('/')) { selfClose = true; inside = inside.slice(0, -1); }
      const sp = inside.search(/\s/);
      const name = (sp < 0 ? inside : inside.slice(0, sp)).toLowerCase();
      const attrs = sp < 0 ? {} : parseAttrs(inside.slice(sp + 1));
      const node = { type: ELEMENT_NODE, name, attributes: attrs, children: [] };
      stack[stack.length - 1].children.push(node);
      if (!selfClose && !VOID_TAGS.has(name)) {
        stack.push(node);
      }
      i = end + 1;
      continue;
    }
    // text
    const next = html.indexOf('<', i);
    const text = html.slice(i, next < 0 ? len : next);
    if (text) {
      stack[stack.length - 1].children.push({ type: TEXT_NODE, value: text });
    }
    i = next < 0 ? len : next;
  }
  return root;
}

// 載入 .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  });
}

// ------------ 對應表 ------------
const TEMPLATE_MAP = {
  '8-0目次':           '07-第七期/7-0目次.docx',
  '8-1編輯室報告':     '07-第七期/7-1編輯室報告.docx',
  '8-2本期作者簡介':   '07-第七期/7-2本期作者簡介.docx',
  '8-3精衛救火':       '07-第七期/7-3火燒島的美麗風景.docx',
};

const STORE_DIR = path.join(__dirname, '..', 'stores', '無境界者雜誌');

// ------------ XML helpers ------------
function escXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 解 HTML entity （簡易版，足以涵蓋我們資料）
function decodeEntities(s) {
  return String(s ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

// ------------ 樣式：rPr 片段 ------------
const FONT_BODY     = `<w:rFonts w:ascii="Times New Roman" w:eastAsia="NSimSun" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>`;
const FONT_TITLE    = `<w:rFonts w:ascii="華康中黑體" w:eastAsia="華康中黑體" w:hAnsi="華康中黑體" w:cs="華康中黑體"/>`;
const FONT_KAITI    = `<w:rFonts w:ascii="標楷體" w:eastAsia="標楷體" w:hAnsi="標楷體" w:cs="標楷體"/>`;

function rTitle(text) {
  return `<w:r><w:rPr>${FONT_TITLE}<w:b/><w:bCs/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}
function rSubtitle(text) {
  return `<w:r><w:rPr>${FONT_TITLE}<w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}
function rByline(text) {
  return `<w:r><w:rPr>${FONT_BODY}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}
function rH3(text) {
  return `<w:r><w:rPr>${FONT_BODY}<w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}
function rH2(text) {
  return `<w:r><w:rPr>${FONT_BODY}<w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}

// 段落包裝
function pTitle(text) {
  return `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr>${rTitle(text)}</w:p>`;
}
function pSubtitle(text) {
  return `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr>${rSubtitle(text)}</w:p>`;
}
function pByline(text) {
  return `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr>${rByline(text)}</w:p>`;
}
function pH3(text) {
  // 上方加水平線
  return (
    `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr><w:r><w:pict><v:rect id="_x0000_i_${Math.random().toString(36).slice(2,8)}" style="width:481.9pt;height:1.5pt" o:hralign="center" o:hrstd="t" o:hrnoshade="t" o:hr="t" fillcolor="#bfbfbf" stroked="f"/></w:pict></w:r></w:p>` +
    `<w:p><w:pPr><w:spacing w:beforeLines="50" w:before="180" w:afterLines="50" w:after="180" w:line="300" w:lineRule="auto"/></w:pPr>${rH3(text)}</w:p>`
  );
}
function pH2(text) {
  return (
    `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr><w:r><w:pict><v:rect id="_x0000_i_${Math.random().toString(36).slice(2,8)}" style="width:481.9pt;height:2pt" o:hralign="center" o:hrstd="t" o:hrnoshade="t" o:hr="t" fillcolor="#7295D2" stroked="f"/></w:pict></w:r></w:p>` +
    `<w:p><w:pPr><w:spacing w:beforeLines="50" w:before="180" w:afterLines="50" w:after="180" w:line="300" w:lineRule="auto"/></w:pPr>${rH2(text)}</w:p>`
  );
}
function pDivider() {
  return `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr><w:r><w:pict><v:rect id="_x0000_i_${Math.random().toString(36).slice(2,8)}" style="width:481.9pt;height:1.5pt" o:hralign="center" o:hrstd="t" o:hrnoshade="t" o:hr="t" fillcolor="#bfbfbf" stroked="f"/></w:pict></w:r></w:p>`;
}
function pEmpty() {
  return `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr></w:p>`;
}

// ------------ HTML inline → runs ------------
// 把 article HTML 解析為一連串「段落物件」，每個段落含 runs
// runs：{ text, bold, italic, kaiti, footnoteId, lineBreak }
//
// 段落型別 type：
//   p / h2 / h3 / blockquote / book-quote / book-quote-rel
//   divider / image / list-item

function parseArticleHtml(html, footnotes) {
  if (!html) return [];

  const root = parse(html);
  const blocks = [];
  let currentInlineRuns = null;
  let currentType = 'p';
  let pendingPindent = false;

  function flushBlock() {
    if (currentInlineRuns && currentInlineRuns.length > 0) {
      blocks.push({ type: currentType, runs: currentInlineRuns, indent: pendingPindent });
    }
    currentInlineRuns = null;
    currentType = 'p';
    pendingPindent = false;
  }

  function startBlock(type, indent = false) {
    flushBlock();
    currentInlineRuns = [];
    currentType = type;
    pendingPindent = indent;
  }

  function pushText(text, fmt = {}) {
    // 沒文字、且也沒 footnote / lineBreak 等控制屬性才略過
    const hasControl = fmt.footnoteId != null || fmt.lineBreak;
    if ((text == null || text === '') && !hasControl) return;
    if (!currentInlineRuns) {
      currentInlineRuns = [];
      currentType = 'p';
    }
    currentInlineRuns.push({ text, ...fmt });
  }

  // 用 walk 控制細節，以便處理 inline 與 block 的混合
  function walk(node, fmt) {
    fmt = fmt || {};
    if (node.type === TEXT_NODE) {
      const txt = decodeEntities(node.value).replace(/[\r\n\t]+/g, '');
      if (txt) pushText(txt, fmt);
      return;
    }
    if (node.type !== ELEMENT_NODE) {
      // doc/fragment：往下走
      if (node.children) for (const c of node.children) walk(c, fmt);
      return;
    }
    const tag = (node.name || '').toLowerCase();
    const cls = (node.attributes && node.attributes.class) || '';

    // block 元素
    if (['p', 'h2', 'h3', 'h4', 'figure', 'div', 'blockquote'].includes(tag)) {
      // div 可能包含其他 block，需依 class 分流
      if (tag === 'div' && cls.includes('book-quote')) {
        // book-quote 內部可能有內文 + book-quote-rel 子 div
        // 先抽出 book-quote-rel 的子節點，避免重複
        const relChild = (node.children || []).find(
          (c) => c.type === ELEMENT_NODE && c.name === 'div' && (c.attributes?.class || '').includes('book-quote-rel'),
        );
        // 主引言段
        startBlock('book-quote');
        for (const c of node.children || []) {
          if (c === relChild) continue;
          walk(c, fmt);
        }
        flushBlock();
        // 出處段
        if (relChild) {
          startBlock('book-quote-rel');
          for (const c of relChild.children || []) walk(c, fmt);
          flushBlock();
        }
        return;
      }
      if (tag === 'div' && cls.includes('custom-divider')) {
        flushBlock();
        blocks.push({ type: 'divider' });
        return;
      }
      if (tag === 'div' && cls.includes('reference-box')) {
        startBlock('reference');
        for (const c of node.children || []) walk(c, fmt);
        flushBlock();
        return;
      }
      if (tag === 'div' && cls.includes('special-box')) {
        startBlock('special');
        for (const c of node.children || []) walk(c, fmt);
        flushBlock();
        return;
      }
      if (tag === 'div' && cls.includes('author-profile')) {
        // 作者簡介卡片：把內部當成數個段落輸出
        flushBlock();
        for (const c of node.children || []) walk(c, fmt);
        flushBlock();
        return;
      }
      if (tag === 'div' && cls.includes('theme-image')) {
        flushBlock();
        blocks.push({ type: 'image-placeholder', alt: '主題圖片' });
        return;
      }
      if (tag === 'figure') {
        flushBlock();
        // 抓 img alt
        let alt = '圖片';
        function findImg(n) {
          if (!n) return;
          if (n.type === ELEMENT_NODE && n.name === 'img') {
            alt = (n.attributes && n.attributes.alt) || alt;
            return;
          }
          if (n.children) for (const c of n.children) findImg(c);
        }
        findImg(node);
        blocks.push({ type: 'image-placeholder', alt });
        // figcaption
        for (const c of node.children || []) {
          if (c.type === ELEMENT_NODE && (c.name === 'figcaption')) {
            startBlock('figcaption');
            for (const cc of c.children || []) walk(cc, fmt);
            flushBlock();
          }
        }
        return;
      }

      // 一般 block
      let blockType = 'p';
      let indent = false;
      if (tag === 'h2') blockType = 'h2';
      else if (tag === 'h3' || tag === 'h4') blockType = 'h3';
      else if (tag === 'blockquote') blockType = 'blockquote';
      else if (tag === 'p') {
        blockType = 'p';
        // 預設縮排兩格
        indent = true;
      }

      startBlock(blockType, indent);
      for (const c of node.children || []) walk(c, fmt);
      flushBlock();
      return;
    }

    // inline 元素
    if (tag === 'br') {
      pushText('', { ...fmt, lineBreak: true });
      return;
    }
    if (tag === 'img') {
      // 圖片：行內忽略（區塊由 figure / div.theme-image 處理）
      return;
    }
    if (tag === 'sup') {
      // footnote-ref
      if (cls.includes('footnote-ref')) {
        // 找 a.id 取得編號
        let fnId = null;
        function findA(n) {
          if (!n) return;
          if (n.type === ELEMENT_NODE && n.name === 'a') {
            const href = (n.attributes && n.attributes.href) || '';
            const m = href.match(/#footnote-(\d+)/);
            if (m) fnId = parseInt(m[1], 10);
          }
          if (n.children) for (const c of n.children) findA(c);
        }
        findA(node);
        if (fnId != null) {
          pushText('', { ...fmt, footnoteId: fnId });
          return;
        }
      }
      // 一般 sup：用 superscript run（簡化處理為 vertAlign）
      const inner = { ...fmt, superscript: true };
      for (const c of node.children || []) walk(c, inner);
      return;
    }
    if (tag === 'span') {
      const inner = { ...fmt };
      if (cls.includes('kaiti')) inner.kaiti = true;
      for (const c of node.children || []) walk(c, inner);
      return;
    }
    if (tag === 'strong' || tag === 'b') {
      for (const c of node.children || []) walk(c, { ...fmt, bold: true });
      return;
    }
    if (tag === 'em' || tag === 'i') {
      // 依 CLAUDE.md：<em> 視為標楷體；<i> 視為斜體
      const f = tag === 'em' ? { ...fmt, kaiti: true } : { ...fmt, italic: true };
      for (const c of node.children || []) walk(c, f);
      return;
    }
    if (tag === 'a') {
      // 連結：保留文字
      for (const c of node.children || []) walk(c, fmt);
      return;
    }
    if (tag === 'u') {
      for (const c of node.children || []) walk(c, { ...fmt, underline: true });
      return;
    }
    // 其餘 inline 直接遞迴
    for (const c of node.children || []) walk(c, fmt);
  }

  walk(root, {});
  flushBlock();

  return blocks;
}

// ------------ 區塊 → docx XML ------------
function runFromInline(run) {
  if (run.lineBreak && (!run.text || run.text === '')) {
    return `<w:r><w:br/></w:r>`;
  }
  let rPr = `${run.kaiti ? FONT_KAITI : FONT_BODY}`;
  if (run.bold) rPr += `<w:b/><w:bCs/>`;
  if (run.italic) rPr += `<w:i/><w:iCs/>`;
  if (run.underline) rPr += `<w:u w:val="single"/>`;
  if (run.superscript) rPr += `<w:vertAlign w:val="superscript"/>`;
  // size：保留預設
  let body = '';
  if (run.text) {
    body += `<w:t xml:space="preserve">${escXml(run.text)}</w:t>`;
  }
  // footnote reference 由呼叫端額外處理
  return `<w:r><w:rPr>${rPr}</w:rPr>${body}</w:r>`;
}

function paragraphFromBlock(block, opts = {}) {
  const { type, runs = [], indent } = block;
  if (type === 'divider') return pDivider();
  if (type === 'image-placeholder') {
    return `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${FONT_BODY}<w:i/><w:iCs/><w:color w:val="888888"/></w:rPr><w:t xml:space="preserve">【${escXml(block.alt || '圖片')}】</w:t></w:r></w:p>`;
  }
  if (type === 'h2') {
    const text = runs.map((r) => r.text || '').join('');
    return pH2(text);
  }
  if (type === 'h3') {
    const text = runs.map((r) => r.text || '').join('');
    return pH3(text);
  }
  if (type === 'figcaption') {
    const inner = runs.map((r) => runFromInline(r)).join('');
    return `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>${inner}</w:p>`;
  }
  if (type === 'book-quote') {
    const inner = runs.map((r) => runFromInline(r)).join('');
    return `<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="12" w:space="10" w:color="7295D2"/></w:pBdr><w:spacing w:line="360" w:lineRule="auto"/><w:ind w:left="200" w:right="200" w:firstLine="0"/></w:pPr>${inner}</w:p>`;
  }
  if (type === 'book-quote-rel') {
    const inner = runs.map((r) => runFromInline(r)).join('');
    return `<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="12" w:space="10" w:color="7295D2"/></w:pBdr><w:spacing w:line="360" w:lineRule="auto"/><w:ind w:left="200" w:right="200" w:firstLine="0"/><w:jc w:val="right"/></w:pPr>${inner}</w:p>`;
  }
  if (type === 'reference' || type === 'special') {
    const inner = runs.map((r) => runFromInline(r)).join('');
    const fill = type === 'reference' ? 'F2F2F2' : 'FFF8E1';
    return `<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="6" w:space="4" w:color="DDDDDD"/><w:left w:val="single" w:sz="6" w:space="4" w:color="DDDDDD"/><w:bottom w:val="single" w:sz="6" w:space="4" w:color="DDDDDD"/><w:right w:val="single" w:sz="6" w:space="4" w:color="DDDDDD"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="${fill}"/><w:spacing w:line="300" w:lineRule="auto"/><w:ind w:left="200" w:right="200"/></w:pPr>${inner}</w:p>`;
  }
  if (type === 'blockquote') {
    const inner = runs.map((r) => runFromInline(r)).join('');
    return `<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="12" w:space="10" w:color="CCCCCC"/></w:pBdr><w:spacing w:line="300" w:lineRule="auto"/><w:ind w:left="400"/></w:pPr>${inner}</w:p>`;
  }
  // p（含縮排）
  let pPr = `<w:spacing w:line="300" w:lineRule="auto"/>`;
  if (indent) pPr += `<w:ind w:firstLine="480"/>`; // 約兩字
  // 如果第一個 run 是「　　」（兩個全形空白），HTML 已經帶縮排，跳過 firstLine 以避免雙縮排
  let firstText = (runs[0] && runs[0].text) || '';
  if (/^　　/.test(firstText)) {
    pPr = `<w:spacing w:line="300" w:lineRule="auto"/>`;
  }
  // 處理 footnoteId run
  const inner = runs
    .map((r) => {
      if (r.footnoteId != null) {
        return `<w:r><w:rPr>${FONT_BODY}<w:rStyle w:val="a6"/></w:rPr><w:footnoteReference w:id="${r.footnoteId + 1}"/></w:r>`;
      }
      return runFromInline(r);
    })
    .join('');
  return `<w:p><w:pPr>${pPr}</w:pPr>${inner}</w:p>`;
}

// ------------ 整篇文章 → document.xml body 內容 ------------
function buildBodyXml(article, sectPrXml) {
  const { title, subtitle, author, author_title, content, footnotes } = article;
  let xml = '';
  // 標題
  xml += pTitle(title || '');
  if (subtitle) xml += pSubtitle(subtitle);
  // byline
  const bylineParts = [];
  if (author) bylineParts.push(author.replace(/<br\s*\/?\s*>/gi, '　'));
  if (author_title) bylineParts.push(author_title);
  if (bylineParts.length) xml += pByline(bylineParts.join('　'));
  xml += pEmpty();

  // 內容
  const blocks = parseArticleHtml(content, footnotes || []);
  for (const b of blocks) {
    xml += paragraphFromBlock(b);
  }

  // sectPr 一定要在 body 最後
  xml += sectPrXml;

  return xml;
}

// ------------ 目次（特殊版面） ------------
async function buildTocBody(client, sectPrXml) {
  const all = await client.query(
    `SELECT id, title, subtitle, category, author, page_start
     FROM articles WHERE id LIKE '8-%' ORDER BY sort_order NULLS LAST, id`,
  );
  let xml = '';
  xml += pTitle('目次');
  xml += pEmpty();

  // 分類分組（使用 category 與 id 序號決定章節歸屬，比照 7-0 結構）
  // 7-0 範例：先列前 5 篇，然後「特稿專區」、「主題廣場」、「多元講堂」分組
  // 因第八期分組差異不一定相同，這裡採平鋪式輸出，每篇兩行：
  //   編號 【類別】文章標題
  //   ──副標題｜作者｜pp. 頁碼
  let no = 0;
  for (const a of all.rows) {
    // 比照 7-0：跳過「目次」自己
    if (/目次$/.test(a.title)) continue;
    no += 1;
    // 從 id 抽純標題（去掉 8-N 前綴）；title 已經是純標題
    const num = String(no).padStart(2, '0');
    const cat = a.category ? `【${a.category}】` : '';
    const line1 = `${num} ${cat}${a.title}`;
    let line2 = '';
    if (a.subtitle) line2 += '──' + a.subtitle.replace(/<br\s*\/?\s*>/gi, '　');
    if (a.author) {
      const author = String(a.author).replace(/<br\s*\/?\s*>/gi, '、');
      line2 += (line2 ? '｜' : '──') + author;
    }
    if (a.page_start != null) {
      line2 += (line2 ? '｜' : '──') + `pp. ${a.page_start}`;
    }
    xml += `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr><w:r><w:rPr>${FONT_BODY}<w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escXml(line1)}</w:t></w:r></w:p>`;
    if (line2) {
      xml += `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/><w:ind w:firstLine="240"/></w:pPr><w:r><w:rPr>${FONT_BODY}<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${escXml(line2)}</w:t></w:r></w:p>`;
    }
  }

  xml += sectPrXml;
  return xml;
}

// ------------ 取出範本 sectPr ------------
function extractSectPr(documentXml) {
  const m = documentXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  return m ? m[0] : '';
}

function extractDocOpening(documentXml) {
  // 取 <w:document ... > 起始 tag（含所有 namespace）
  const m = documentXml.match(/<w:document[^>]*>/);
  return m ? m[0] : '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">';
}

// ------------ footnotes.xml ------------
function buildFootnotesXml(originalXml, footnotes) {
  // 保留 separator/continuationSeparator
  // 我們手刻：把原檔開頭、separator、continuationSeparator 留住，append 我們的 footnote
  const opening = originalXml.match(/<w:footnotes[^>]*>/);
  const openTag = opening
    ? opening[0]
    : '<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
  // 取兩個 system footnote
  const sys = (originalXml.match(/<w:footnote\s+w:type="(?:separator|continuationSeparator)"[\s\S]*?<\/w:footnote>/g) || []).join('');

  const items = (footnotes || []).map((fn, idx) => {
    const id = (fn.id != null ? fn.id : idx + 1) + 1; // shift 1：避開 separator/continuation 用的 -1, 0
    const text = decodeEntities(String(fn.text || ''))
      // strip HTML tags
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, (_, href, label) => {
        if (!label || label.trim() === href.trim()) return href;
        return `${label}（${href}）`;
      })
      .replace(/<[^>]+>/g, '')
      .trim();
    return (
      `<w:footnote w:id="${id}">` +
        `<w:p>` +
          `<w:pPr><w:pStyle w:val="a4"/></w:pPr>` +
          `<w:r><w:rPr><w:rStyle w:val="a6"/></w:rPr><w:footnoteRef/></w:r>` +
          `<w:r><w:rPr>${FONT_BODY}</w:rPr><w:t xml:space="preserve"> ${escXml(text)}</w:t></w:r>` +
        `</w:p>` +
      `</w:footnote>`
    );
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${openTag}${sys}${items}</w:footnotes>`;
}

// ------------ 主流程 ------------
async function main() {
  const articleId = process.argv[2];
  if (!articleId) {
    console.error('用法： node scripts/rebuild_issue_docx.cjs <article_id>');
    process.exit(1);
  }
  const tplRel = TEMPLATE_MAP[articleId];
  if (!tplRel) {
    console.error(`找不到 ${articleId} 對應的範本。可用：${Object.keys(TEMPLATE_MAP).join(', ')}`);
    process.exit(1);
  }
  const tplPath = path.join(STORE_DIR, tplRel);
  if (!fs.existsSync(tplPath)) {
    console.error(`範本不存在：${tplPath}`);
    process.exit(1);
  }

  // Supabase
  const client = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: 5432,
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const r = await client.query(
    `SELECT id, title, subtitle, author, author_title, category, content, footnotes
     FROM articles WHERE id=$1`,
    [articleId],
  );
  if (!r.rows[0]) {
    console.error(`Supabase 查不到文章：${articleId}`);
    await client.end();
    process.exit(1);
  }
  const article = r.rows[0];

  // 讀範本
  const buf = fs.readFileSync(tplPath);
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file('word/document.xml').async('string');
  const sectPr = extractSectPr(docXml);
  const docOpen = extractDocOpening(docXml);

  // 建新 body
  let bodyXml = '';
  if (articleId === '8-0目次') {
    bodyXml = await buildTocBody(client, sectPr);
  } else {
    bodyXml = buildBodyXml(article, sectPr);
  }
  const newDoc = `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>${docOpen}<w:body>${bodyXml}</w:body></w:document>`;
  zip.file('word/document.xml', newDoc);

  // footnotes
  if (zip.file('word/footnotes.xml')) {
    const fnOriginal = await zip.file('word/footnotes.xml').async('string');
    const newFn = buildFootnotesXml(fnOriginal, article.footnotes || []);
    zip.file('word/footnotes.xml', newFn);
  }

  // 輸出
  const outDir = path.join(STORE_DIR, '08-第八期');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outName = `${articleId}.docx`;
  const outPath = path.join(outDir, outName);
  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outPath, outBuf);
  console.log(`✅ 寫入：${outPath}（${(outBuf.length / 1024).toFixed(1)} KB）`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
