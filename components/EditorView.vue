<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { marked } from "marked";
import { supabase } from "~/supabase";

// ── 目錄模式 ─────────────────────────────────────────────────────
// 依 article_type 欄位判斷，不依賴 ID 或 title
const isTocMode = computed(() => form.value.article_type === "toc");
const tocArticles = ref([]);
const tocSaving = ref({}); // { [id]: bool }

const loadTocArticles = async (issueId) => {
  const { data } = await supabase
    .from("articles")
    .select("id, title, author, page_start, section, sort_order")
    .eq("issue", issueId)
    .order("sort_order", { ascending: true });
  // 排除目錄文章本身
  tocArticles.value = (data || []).filter((a) => !/^\d+-0$/.test(a.id));
};

const saveTocPageStart = async (article) => {
  tocSaving.value[article.id] = true;
  const { error } = await supabase
    .from("articles")
    .update({ page_start: article.page_start })
    .eq("id", article.id);
  if (error) alert("儲存頁數失敗：" + error.message);
  tocSaving.value[article.id] = false;
};

const generateTocContent = () => {
  const lines = tocArticles.value.map((a) => {
    const page = a.page_start ? `**p.${a.page_start}**　` : "";
    const author = a.author ? `　／　${a.author}` : "";
    return `${page}${a.title}${author}`;
  });
  form.value.content = lines.join("\n\n");
};

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const isEditMode = ref(false);
const showPreview = ref(true);
const textareaRef = ref(null);
const previewRef = ref(null);

const form = ref({
  id: "",
  title: "",
  subtitle: "",
  issue: 5,
  issue_title: "誕神者",
  category: "",
  section: "",
  author: "",
  author_title: "",
  remark: "",
  summary: "",
  content: "",
  keyword: "",
  footnotes: [],
  media_assets: [], // 🌟 新增：存放圖片關聯資料
  prev_id: "",
  next_id: "",
  page_start: null,
  article_type: "regular",
});

const seoJson = ref('{\n  "description": "",\n  "keywords": ""\n}');

const categories = [
  { name: "專題文章", color: "#8b0000" },
  { name: "評論與回應", color: "#ff8000" },
  { name: "人物專訪", color: "#f0e137" },
  { name: "生命故事", color: "#46b175" },
  { name: "時事感想", color: "#4682b4" },
  { name: "文藝創作", color: "#27408b" },
  { name: "公告與剪影", color: "#6a5acd" },
  { name: "封面故事", color: "#7d6c29" },
  { name: "光影時刻", color: "#7d6c29" },
  { name: "實驗園地", color: "#db7093" },
  { name: "文獻與翻譯", color: "#6c3535" },
];

const categoryColor = computed(() => {
  const cat = categories.find((c) => c.name === form.value.category);
  return cat ? cat.color : "#444";
});

const isPublished = ref(false);
const proofreadAnnotations = ref([]);
const proofreadStatus = ref("pending");

// 期號 issues 對應表（供 issue 號連動 issue_title 使用）
const issuesMap = ref({}); // { 8: "地上神國與人間佛教", ... }

// 當 issue 號改變時，自動帶入對應的 issue_title
watch(
  () => form.value.issue,
  (newIssue) => {
    if (issuesMap.value[newIssue]) {
      form.value.issue_title = issuesMap.value[newIssue];
    }
  },
);

const loadArticle = async (id) => {
  loading.value = true;
  // 🌟 修正：JOIN media_assets 取得這篇文章的所有圖片
  const { data, error } = await supabase
    .from("articles")
    .select("*, media_assets(image_url, sort_order)")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    alert("載入失敗！");
    router.push("/admin/articles_manager");
  } else {
    isEditMode.value = true;
    form.value = {
      id: data.id || "",
      title: data.title || "",
      subtitle: data.subtitle || "",
      issue: data.issue || 5,
      issue_title: data.issue_title || issuesMap.value[data.issue] || "",
      category: data.category || "",
      section: data.section || "",
      author: data.author || "",
      author_title: data.author_title || "",
      remark: data.remark || "",
      summary: data.summary || "",
      content: data.content || "",
      keyword: data.keyword || "",
      footnotes: data.footnotes || [],
      media_assets: data.media_assets || [], // 🌟 存放媒體陣列
      prev_id: data.prev_id || "",
      next_id: data.next_id || "",
      page_start: data.page_start ?? null,
      article_type: data.article_type || "regular",
    };

    seoJson.value = data.seo ? JSON.stringify(data.seo, null, 2) : "{\n}";
    isPublished.value = data.is_published || false;
    proofreadAnnotations.value = data.proofread_annotations || [];
    proofreadStatus.value = data.proofread_status || "pending";
    await nextTick();
    buildProofreadPreview();

    // 目錄模式：載入同期文章列表
    if (data.article_type === "toc") {
      await loadTocArticles(data.issue);
    }
  }
  loading.value = false;
};

onMounted(async () => {
  // 載入 issues 對應表（供 issue 號連動 issue_title 使用）
  const { data: issuesData } = await supabase
    .from("issues")
    .select("id, title");
  if (issuesData) {
    issuesData.forEach((i) => {
      issuesMap.value[i.id] = i.title;
    });
  }
  // 若為編輯模式，載入文章
  const id = route.params.id || route.query.id;
  if (id) loadArticle(id);
});

const generateFootnotesHtml = (text, notes) => {
  if (!text) return "";
  let fullText = text.replace(
    /\[\^(\d+)\]/g,
    (_, id) =>
      `<sup class="footnote-ref"><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`,
  );
  let parsedHtml = marked.parse(fullText);
  if (notes && notes.length > 0) {
    const listItems = notes
      .map(
        (note) =>
          `<li id="footnote-${note.id}"><p>${note.text}<a href="#footnote-ref-${note.id}" class="footnote-backref">↩</a></p></li>`,
      )
      .join("");
    parsedHtml += `<div class="footnotes"><hr /><ol>${listItems}</ol></div>`;
  }
  return parsedHtml;
};

const keywordContent = computed(() => {
  if (!form.value.keyword) return "";
  const kw = form.value.keyword;
  const hasPrefix = /🌿|關鍵字/.test(kw);
  return marked.parse(hasPrefix ? kw : `🌿 **關鍵字：** ${kw}`);
});

const contentHtml = computed(() => {
  return generateFootnotesHtml(form.value.content, form.value.footnotes);
});

// ── 校對標記：文字內嵌高亮 + 標記圖示（同 ProofreadView 的 DOM 注入技術）──
const injectEditorHighlight = (
  container,
  startOff,
  endOff,
  color,
  annId,
  note,
) => {
  let offset = 0;
  const walk = (node) => {
    if (offset >= endOff) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.length;
      const nodeStart = offset;
      const nodeEnd = offset + len;
      offset += len;
      if (nodeEnd <= startOff || nodeStart >= endOff) return;
      const localStart = Math.max(0, startOff - nodeStart);
      const localEnd = Math.min(len, endOff - nodeStart);
      const before = node.textContent.slice(0, localStart);
      const middle = node.textContent.slice(localStart, localEnd);
      const after = node.textContent.slice(localEnd);
      const mark = document.createElement("mark");
      mark.style.cssText = `background:${color}bb;border-radius:2px;padding:0 1px;`;
      mark.dataset.annId = String(annId);
      const parent = node.parentNode;
      if (before) parent.insertBefore(document.createTextNode(before), node);
      parent.insertBefore(mark, node);
      mark.appendChild(document.createTextNode(middle));
      if (after) parent.insertBefore(document.createTextNode(after), node);
      parent.removeChild(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from(node.childNodes)) {
        if (offset >= endOff) break;
        walk(child);
      }
    }
  };
  walk(container);
};

// 預覽用 HTML（含文字高亮 + 標記圖示）
const proofreadPreviewHtml = ref("");

const buildProofreadPreview = () => {
  if (!import.meta.client || !form.value.content) {
    proofreadPreviewHtml.value = "";
    return;
  }
  if (!proofreadAnnotations.value.length) {
    proofreadPreviewHtml.value = "";
    return;
  }

  const paras = form.value.content.split(/\n\n+/).filter((p) => p.trim());
  let html = paras
    .map((para, idx) => {
      const withRefs = para.replace(
        /\[\^(\d+)\]/g,
        (_, id) =>
          `<sup class="footnote-ref"><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`,
      );
      const base = marked.parse(withRefs, { gfm: true, breaks: true });

      const anns = proofreadAnnotations.value.filter(
        (a) => a.paragraphIndex === idx,
      );
      if (!anns.length) return base;

      const div = document.createElement("div");
      div.innerHTML = base;

      // 由大到小注入，避免 offset 偏移
      const sorted = [...anns].sort((a, b) => b.startOffset - a.startOffset);
      for (const ann of sorted) {
        injectEditorHighlight(
          div,
          ann.startOffset,
          ann.endOffset,
          ann.color,
          ann.id,
          ann.note || "",
        );
        // 在 mark 後插入標記圖示
        const markEl = div.querySelector(`mark[data-ann-id="${ann.id}"]`);
        if (markEl) {
          const icon = document.createElement("span");
          icon.className = "ann-marker-icon";
          icon.style.background = ann.color;
          icon.textContent = "✎";
          if (ann.note) icon.dataset.note = ann.note;
          icon.title =
            ann.note ||
            `校對標記：${(ann.selectedText || "").substring(0, 20)}`;
          markEl.parentNode.insertBefore(icon, markEl.nextSibling);
        }
      }
      return div.innerHTML;
    })
    .join("");

  if (form.value.footnotes?.length) {
    const items = form.value.footnotes
      .map(
        (fn) =>
          `<li id="footnote-${fn.id}"><p>${fn.text}<a href="#footnote-ref-${fn.id}" class="footnote-backref">↩</a></p></li>`,
      )
      .join("");
    html += `<div class="footnotes"><hr /><ol>${items}</ol></div>`;
  }
  proofreadPreviewHtml.value = html;
};

watch(proofreadAnnotations, () => nextTick(buildProofreadPreview), {
  deep: true,
});
watch(
  () => form.value.content,
  () => nextTick(buildProofreadPreview),
);
watch(
  () => form.value.footnotes,
  () => nextTick(buildProofreadPreview),
  { deep: true },
);

// 🌟 核心預覽邏輯：將 [[圖片N]] 替換為真正的 Cloudinary 網址
const effectivePreviewHtml = computed(() => {
  let html =
    proofreadAnnotations.value.length && proofreadPreviewHtml.value
      ? proofreadPreviewHtml.value
      : contentHtml.value;

  const assets = form.value.media_assets || [];
  html = html.replace(/src="\[\[圖片(\d+)\]\]"/g, (match, orderStr) => {
    const order = parseInt(orderStr);
    const found = assets.find((m) => m.sort_order === order);
    return found ? `src="${found.image_url}"` : match;
  });

  return html;
});

const saveArticle = async () => {
  if (!form.value.id) {
    alert("文章 ID 是必填項目！");
    return;
  }

  let seoParsed = {};
  try {
    seoParsed = JSON.parse(seoJson.value);
  } catch (err) {
    alert("SEO JSON 格式錯誤，請檢查");
    return;
  }

  loading.value = true;
  const payload = {
    id: form.value.id,
    title: form.value.title,
    subtitle: form.value.subtitle,
    issue: form.value.issue,
    issue_title: form.value.issue_title,
    category: form.value.category,
    section: form.value.section,
    author: form.value.author,
    author_title: form.value.author_title,
    remark: form.value.remark,
    summary: form.value.summary,
    content: form.value.content,
    keyword: form.value.keyword,
    footnotes: form.value.footnotes,
    prev_id: form.value.prev_id || null,
    next_id: form.value.next_id || null,
    seo: seoParsed,
    is_published: isPublished.value,
    updated_at: new Date().toISOString(),
  };

  // 避免將前端顯示用的 media_assets 存回 articles
  delete payload.media_assets;

  const { error } = await supabase
    .from("articles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    console.error(error);
    alert("儲存失敗！\n" + error.message);
  } else {
    alert("✅ 儲存成功！");
    isEditMode.value = true;
  }
  loading.value = false;
};

// 📤 重新上傳 Word（只更新內文與註腳，不動其他欄位）
const reuploadInput = ref(null);

const triggerReupload = () => {
  reuploadInput.value?.click();
};

const handleReupload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (
    !confirm("確定要用新的 Word 覆蓋目前的內文與註腳嗎？（其他欄位不受影響）")
  ) {
    event.target.value = "";
    return;
  }

  loading.value = true;
  try {
    // 動態載入 mammoth
    const mammothModule = await import("mammoth");
    const mammoth = mammothModule.default ?? mammothModule;
    const arrayBuffer = await file.arrayBuffer();

    // 使用 styleMap 對應 Word 樣式；不傳 convertImage，改用 regex 替換 base64
    const result = await mammoth.convertToHtml({
      arrayBuffer,
      styleMap: [
        "p[style-name='標題'] => h1.title:fresh",
        "p[style-name='Heading 1'] => h1.title:fresh",
        "p[style-name='副標題'] => h2.subtitle:fresh",
        "p[style-name='Heading 2'] => h2.subtitle:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='引用'] => blockquote:fresh",
        "p[style-name='Quote'] => blockquote:fresh",
        "p[style-name='List Paragraph'] => blockquote:fresh",
      ],
    });
    let imageCounter = 0;
    const html = result.value.replace(
      /<img\b[^>]*\bsrc="data:[^"]*"[^>]*/gi,
      () => {
        imageCounter++;
        return `<img src="[[圖片${imageCounter}]]" alt=""`;
      },
    );

    // HTML 轉為 Markdown（保留段落結構）
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const newFootnotes = [];
    const contentParts = [];

    Array.from(doc.body.children).forEach((el) => {
      const tag = el.tagName;

      // mammoth 原生腳注清單 → 提取腳注
      if (tag === "OL" && el.classList.contains("footnotes")) {
        el.querySelectorAll("li").forEach((li) => {
          const idAttr = li.getAttribute("id") || "";
          const numMatch = idAttr.match(/footnote-(\d+)/);
          if (!numMatch) return;
          li.querySelectorAll('a[href^="#footnote-ref"]').forEach((a) => a.remove());
          const t = li.textContent.trim();
          if (t) newFootnotes.push({ id: parseInt(numMatch[1]), text: t });
        });
        return;
      }

      const text = el.textContent.trim();
      if (!text) return;

      // 舊式 [^N]: 腳注行
      const fnMatch = text.match(/^\[\^(\d+)\][：:]\s*(.*)/);
      if (fnMatch) {
        newFootnotes.push({ id: parseInt(fnMatch[1]), text: fnMatch[2] });
        return;
      }

      // 圖片佔位
      if (el.querySelector("img") || el.innerHTML.includes("[[圖片")) {
        const idMatch = form.value.id.match(/^(\d+)-(\d+)/);
        const seq = idMatch ? idMatch[2] : "0";
        const withFigure = el.outerHTML.replace(
          /\[\[圖片(\d+)\]\]/g,
          (_, n) =>
            `\n\n<figure class="img-bottom px-600"><img src="[[圖片${n}]]" alt="圖片 ${seq}-${n}"><figcaption>（圖片 ${seq}-${n}，待上傳）</figcaption></figure>\n\n`,
        );
        contentParts.push(withFigure);
      } else if (tag === "H1") {
        if (!el.classList.contains("title")) contentParts.push(`# ${text}`);
      } else if (tag === "H2") {
        if (!el.classList.contains("subtitle")) contentParts.push(`## ${text}`);
      } else if (tag === "H3") {
        contentParts.push(`### ${text}`);
      } else if (tag === "BLOCKQUOTE") {
        contentParts.push(`<blockquote>\n${text}\n</blockquote>`);
      } else if (tag === "P") {
        // 全粗體短段落 → 段落小標題
        const inner = el.innerHTML.trim();
        if (/^<strong>[^<]*<\/strong>$/.test(inner) && text.length <= 40) {
          contentParts.push(`## ${text}`);
        } else {
          // 行內格式轉 Markdown
          let md = "";
          el.childNodes.forEach((node) => {
            if (node.nodeType === 3) {
              md += node.textContent;
            } else if (node.nodeType === 1) {
              const t = node.tagName;
              const v = node.textContent;
              if (t === "STRONG" || t === "B") md += `**${v}**`;
              else if (t === "EM" || t === "I") md += `*${v}*`;
              else if (t === "SUP") {
                const m = v.match(/\[?(\d+)\]?/);
                md += m ? `[^${m[1]}]` : v;
              } else if (t === "A") {
                const href = node.getAttribute("href") || "";
                if (!href.startsWith("#footnote")) md += `[${v}](${href})`;
              } else {
                md += v;
              }
            }
          });
          contentParts.push(md.trim());
        }
      } else {
        contentParts.push(text);
      }
    });

    form.value.content = contentParts.join("\n\n");
    if (newFootnotes.length > 0) {
      form.value.footnotes = newFootnotes;
    }

    alert(
      `✅ 內文已更新！${imageCounter > 0 ? `（偵測到 ${imageCounter} 張圖片佔位）` : ""}請確認後儲存。`,
    );
  } catch (err) {
    alert("❌ 上傳失敗：" + err.message);
  } finally {
    loading.value = false;
    event.target.value = "";
  }
};

// 💾 下載專業排版 Word 檔案（呼叫 Python API）
const exportToWord = async () => {
  try {
    loading.value = true;

    // 準備文章資料
    const articleData = {
      id: form.value.id,
      title: form.value.title,
      subtitle: form.value.subtitle,
      category: form.value.category,
      author: form.value.author,
      author_title: form.value.author_title,
      remark: form.value.remark,
      keyword: form.value.keyword,
      content: form.value.content,
      footnotes: form.value.footnotes,
      issue: form.value.issue,
      issue_title: form.value.issue_title,
      page_start: form.value.page_start,
    };

    console.log("📤 準備下載 Word:", articleData.id);

    // 呼叫 API 生成 Word
    const response = await fetch("/api/export-word", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(articleData),
    });

    const result = await response.json();

    if (result.success) {
      // 將 Base64 轉為 Blob
      const binaryString = atob(result.file);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // 下載檔案
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);

      loading.value = false;
      alert(`✅ 已下載專業排版：${result.filename}`);
    } else {
      throw new Error(result.error || "生成失敗");
    }
  } catch (error) {
    loading.value = false;
    alert(`❌ 下載失敗：${error.message}`);
    console.error("Export error:", error);
  }
};

const addFootnote = () => {
  const newId = form.value.footnotes.length + 1;
  form.value.footnotes.push({ id: newId, text: "" });
};

const removeFootnote = (index) => {
  form.value.footnotes.splice(index, 1);
  form.value.footnotes.forEach((fn, idx) => {
    fn.id = idx + 1;
  });
};

// ── 工具列：插入 / 包裹文字 ──────────────────────────────────────
const insertOrWrap = async (
  prefix,
  suffix,
  defaultText = "文字",
  togglePrefix = null,
  toggleSuffix = null,
) => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const originalText = form.value.content;
  const selectedText = originalText.substring(start, end);
  const checkPrefix = togglePrefix || prefix;
  const checkSuffix = toggleSuffix || suffix;
  let newText, newSelectionStart, newSelectionEnd;
  const isWrapped =
    originalText.substring(start - checkPrefix.length, start) === checkPrefix &&
    originalText.substring(end, end + checkSuffix.length) === checkSuffix;
  if (isWrapped) {
    newText =
      originalText.substring(0, start - checkPrefix.length) +
      selectedText +
      originalText.substring(end + checkSuffix.length);
    newSelectionStart = start - checkPrefix.length;
    newSelectionEnd = newSelectionStart + selectedText.length;
  } else if (selectedText.length > 0) {
    newText =
      originalText.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      originalText.substring(end);
    newSelectionStart = start + prefix.length;
    newSelectionEnd = newSelectionStart + selectedText.length;
  } else {
    newText =
      originalText.substring(0, start) +
      prefix +
      defaultText +
      suffix +
      originalText.substring(end);
    newSelectionStart = start + prefix.length;
    newSelectionEnd = newSelectionStart + defaultText.length;
  }
  form.value.content = newText;
  await nextTick();
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
};

const insertBlock = async (template) => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const originalText = form.value.content;
  const newText =
    originalText.substring(0, start) + template + originalText.substring(end);
  form.value.content = newText;
  await nextTick();
  textarea.focus({ preventScroll: true });
  textarea.selectionStart = textarea.selectionEnd = start + template.length;
};

const tools = [
  { label: "H2 副標", action: () => insertOrWrap("## ", "\n", "輸入標題") },
  { label: "H3 小標", action: () => insertOrWrap("### ", "\n", "輸入標題") },
  { label: "粗體", action: () => insertOrWrap(" **", "** ", "粗體文字") },
  { label: "斜體", action: () => insertOrWrap("<i>", "</i>", "斜體文字") },
  { label: "楷書體", action: () => insertOrWrap("*", "*", "楷書體文字") },
  { label: "註腳標碼", action: () => insertOrWrap("[^", "]", "1") },
  {
    label: "一般引言",
    action: () =>
      insertOrWrap(
        "<blockquote>\n",
        '\n<div class="rel">── 出處</div>\n</blockquote>\n',
        "引用的內容...",
      ),
  },
  {
    label: "去除縮排",
    action: () => insertOrWrap('<p class="no-indent">', "</p>", "無縮排文字"),
  },
  {
    label: "分隔線",
    action: () => insertBlock('\n<div class="custom-divider"></div>\n'),
  },
  {
    label: "置右",
    action: () => {
      const prefix = '<span style="display: block; text-align: right;">';
      const suffix = "</span>";
      insertOrWrap(prefix, suffix, "請在此輸入置右文字", prefix, suffix);
    },
  },
  {
    label: "小字體",
    action: () => {
      const prefix = '<span style="font-size: 1rem; font-family: serif;">';
      const suffix = "</span>";
      insertOrWrap(prefix, suffix, "請在此輸入小字體文字", prefix, suffix);
    },
  },
  {
    label: "🌏 結尾",
    action: () => insertBlock("🌏\uFE0E"),
  },
];

const editorComponents = [
  {
    label: "📚 書籍簡介",
    action: () =>
      insertBlock(
        `\n\n<div class="book-box"><div class="book-info"><strong>書籍資訊</strong><br />《書名》...<br />《作者》...<br />《出版》...</div><div class="book-image"><img src="圖片網址" alt="封面" /></div></div>\n\n`,
      ),
  },
  {
    label: "✍ 書本引言",
    action: () =>
      insertBlock(
        `\n\n<div class="book-quote">引用的內容...<div class="book-quote-rel"> ──《書名》，頁數 </div></div>\n\n`,
      ),
  },
  {
    label: "🖼️ 主題圖片",
    action: () =>
      insertBlock(
        `\n\n<div class="theme-image"><img src="圖片網址" alt="主題圖片"></div>\n\n`,
      ),
  },
  {
    label: "🖼️ 圖片(左)",
    action: () =>
      insertBlock(
        `\n\n<figure class="img-left px-300"><img src="圖片網址" alt="描述"><figcaption>圖片說明</figcaption></figure>\n\n`,
      ),
  },
  {
    label: "🖼️ 圖片(中)",
    action: () =>
      insertBlock(
        `\n\n<figure class="img-bottom px-600"><img src="圖片網址" alt="描述"><figcaption>圖片說明文字</figcaption></figure>\n\n`,
      ),
  },
  {
    label: "🖼️ 圖片(右)",
    action: () =>
      insertBlock(
        `\n\n<figure class="img-right px-300"><img src="圖片網址" alt="描述"><figcaption>圖片說明</figcaption></figure>\n\n`,
      ),
  },
  {
    label: "🤝 作者簡介",
    action: () =>
      insertBlock(
        `\n\n<div class="author-profile"><img src="圖片網址" alt="作者頭像"><div><h3>作者名稱</h3><p>作者簡介內容...</p></div></div>\n\n`,
      ),
  },
  {
    label: "ℹ️ 資訊卡片",
    action: () =>
      insertBlock(
        `\n\n<div class="info-card"><div class="info-card-inner"><img src="Logo圖片網址" alt="Logo"><div><h3>標題</h3><div class="info-card-links"><a href="#" target="_blank">連結1</a></div></div></div></div>\n\n`,
      ),
  },
  {
    label: "📋 參考資料",
    action: () => {
      let numRows = prompt("請輸入列數", "2");
      numRows = parseInt(numRows) || 2;
      let listItems = "";
      for (let i = 1; i <= numRows; i++) {
        listItems += `<div style="text-indent: -1.5rem; padding-left: 1.5rem; margin-bottom: 1rem; line-height: 1.8;">•&nbsp;&nbsp;資料來源${i}...</div>`;
      }
      insertBlock(
        `\n\n<div class="reference-box"><strong>參考資料</strong><div style="margin-top: 1rem; margin-bottom: 1rem;">${listItems}</div></div>\n\n`,
      );
    },
  },
  {
    label: "📊 表格",
    action: () => {
      let sizeInput = prompt("表格尺寸 (欄x列)", "2x5");
      let cols = 2,
        rows = 5;
      if (sizeInput) {
        const p = sizeInput.toLowerCase().split(/[x*]/);
        cols = parseInt(p[0]) || 2;
        rows = parseInt(p[1]) || 5;
      }
      let h = "<thead><tr>";
      for (let i = 1; i <= cols; i++) h += `<th>標題${i}</th>`;
      h += "</tr></thead>";
      let b = "<tbody>";
      for (let r = 1; r <= rows; r++) {
        b += "<tr>";
        for (let c = 1; c <= cols; c++) b += `<td>內容 ${r}-${c}</td>`;
        b += "</tr>";
      }
      b += "</tbody>";
      insertBlock(`\n\n<table class="data-table">\n${h}\n${b}\n</table>\n\n`);
    },
  },
];
</script>

<template>
  <div class="editor-wrapper">
    <div class="editor-header">
      <h2>📝 文章編輯器</h2>
      <div class="actions">
        <template v-if="isEditMode">
          <input
            ref="reuploadInput"
            type="file"
            accept=".docx"
            style="display: none"
            @change="handleReupload"
          />
          <button
            class="btn btn-reupload"
            @click="triggerReupload"
            :disabled="loading"
            title="以新版 Word 覆蓋內文與註腳"
          >
            📤 更新內文
          </button>
        </template>

        <button
          v-if="isEditMode"
          class="btn btn-download"
          @click="exportToWord"
          :disabled="loading"
          title="下載為專業排版 Word 檔案"
        >
          📥 下載 Word
        </button>

        <NuxtLink
          v-if="isEditMode"
          :to="`/admin/proofread/${form.id}`"
          class="btn btn-proofread"
          title="進入文章校對模式"
        >
          🔍 文章校對<span
            v-if="proofreadAnnotations.length"
            class="proofread-badge"
            >{{ proofreadAnnotations.length }}</span
          >
        </NuxtLink>

        <label class="publish-label">
          <input type="checkbox" v-model="isPublished" />
          公開發布
        </label>
        <button class="btn btn-save" @click="saveArticle" :disabled="loading">
          {{ loading ? "儲存中..." : "💾 儲存至資料庫" }}
        </button>
        <NuxtLink to="/admin/articles_manager" class="btn btn-cancel"
          >回列表</NuxtLink
        >
      </div>
    </div>

    <!-- ── 目錄模式：文章列表面板 ── -->
    <div v-if="isTocMode" class="toc-panel">
      <div class="toc-panel-header">
        <h3>📋 目錄 — 同期文章列表</h3>
        <span class="toc-hint">可直接修改各篇頁數，失焦後自動儲存</span>
        <button class="btn-gen-toc" @click="generateTocContent" type="button">
          ✨ 從列表生成目錄內文
        </button>
      </div>
      <table class="toc-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>標題</th>
            <th>作者</th>
            <th width="70">起始頁</th>
            <th width="60">狀態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in tocArticles" :key="a.id">
            <td class="toc-id">{{ a.id }}</td>
            <td>{{ a.title }}</td>
            <td>{{ a.author }}</td>
            <td>
              <input
                type="number"
                v-model.number="a.page_start"
                class="toc-page-input"
                min="1"
                @blur="saveTocPageStart(a)"
              />
            </td>
            <td class="toc-saving">
              {{ tocSaving[a.id] ? "儲存..." : "" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="editor-layout">
      <div class="form-pane">
        <div class="form-group">
          <label>文章 ID (必填，不可重複)</label>
          <input
            v-model="form.id"
            placeholder="例如：5-13話語與肉身"
            :readonly="isEditMode"
          />
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label>主標題 (Title)</label>
            <input v-model="form.title" placeholder="主標題" />
          </div>
          <div class="form-group half">
            <label>副標題 (Subtitle)</label>
            <input v-model="form.subtitle" placeholder="副標題" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group quarter">
            <label>期數 (Issue)</label>
            <input v-model.number="form.issue" type="number" />
          </div>
          <div class="form-group quarter">
            <label>期數標題</label>
            <input v-model="form.issue_title" />
          </div>
          <div class="form-group quarter">
            <label>分類 (Category)</label>
            <select v-model="form.category">
              <option value="">(無)</option>
              <option
                v-for="cat in categories"
                :key="cat.name"
                :value="cat.name"
              >
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="form-group quarter">
            <label>次分類 (Section)</label>
            <input v-model="form.section" />
          </div>
        </div>

        <div v-if="!isTocMode" class="form-row">
          <div class="form-group third">
            <label>作者 (Author)</label>
            <input v-model="form.author" />
          </div>
          <div class="form-group third">
            <label>作者頭銜</label>
            <input v-model="form.author_title" />
          </div>
          <div class="form-group third">
            <label>備註 (Remark)</label>
            <input v-model="form.remark" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label>上一篇 ID</label>
            <input v-model="form.prev_id" />
          </div>
          <div class="form-group half">
            <label>下一篇 ID</label>
            <input v-model="form.next_id" />
          </div>
        </div>

        <div v-if="!isTocMode" class="form-group">
          <label>文章摘要 (Summary / Description)</label>
          <textarea v-model="form.summary" rows="3"></textarea>
        </div>

        <div v-if="!isTocMode" class="form-group">
          <label>關鍵字 (Markdown)</label>
          <textarea v-model="form.keyword" rows="2"></textarea>
        </div>

        <div class="form-group">
          <label>內文 (Markdown)</label>
          <div class="toolbar">
            <div class="toolbar-group">
              <button
                v-for="tool in tools"
                :key="tool.label"
                @click="tool.action"
                class="tool-btn"
                type="button"
              >
                {{ tool.label }}
              </button>
            </div>
            <div class="toolbar-divider"></div>
            <div class="toolbar-group">
              <span class="group-label">插入元件：</span>
              <button
                v-for="comp in editorComponents"
                :key="comp.label"
                @click="comp.action"
                class="tool-btn comp-btn"
                type="button"
              >
                {{ comp.label }}
              </button>
            </div>
          </div>
          <textarea
            v-model="form.content"
            ref="textareaRef"
            rows="20"
          ></textarea>
        </div>

        <div v-if="!isTocMode" class="form-group">
          <label>SEO 資料 (JSON 格式)</label>
          <textarea v-model="seoJson" rows="6" class="code-font"></textarea>
        </div>

        <div class="form-group">
          <label>註腳 (Footnotes)</label>
          <div
            v-for="(fn, index) in form.footnotes"
            :key="index"
            class="footnote-item"
          >
            <span class="fn-id">[{{ fn.id }}]</span>
            <input v-model="fn.text" placeholder="輸入註腳內容" />
            <button
              class="btn btn-sm btn-danger"
              @click="removeFootnote(index)"
            >
              X
            </button>
          </div>
          <button class="btn btn-sm" @click="addFootnote">+ 新增註腳</button>
        </div>
      </div>

      <div class="preview-pane" ref="previewRef">
        <div class="article-content">
          <div class="title-header">
            <div
              v-if="form.category"
              class="featured-box"
              :style="{ backgroundColor: categoryColor }"
            >
              {{ form.category }}
            </div>
            <h1 class="main-title">{{ form.title }}</h1>
            <h1 v-if="form.subtitle" class="sub-title">
              ──{{ form.subtitle }}
            </h1>
          </div>

          <div class="divider-thick"></div>
          <div class="divider-gap"></div>
          <div class="divider-thin"></div>

          <div class="author-info">
            <p class="author-name">
              <span>{{ form.author }}</span>
              <span class="author-title">{{ form.author_title }}</span>
              <span v-if="form.remark" class="author-remark">{{
                form.remark
              }}</span>
            </p>
          </div>

          <div
            v-if="form.keyword"
            class="keyword-section"
            v-html="keywordContent"
          ></div>

          <br />
          <div v-if="proofreadAnnotations.length" class="proofread-notice">
            <span class="proofread-notice-icon">🔍</span>
            <span
              >有
              <strong>{{ proofreadAnnotations.length }}</strong> 條校對標記（{{
                proofreadStatus === "completed"
                  ? "✅ 已校對完成"
                  : proofreadStatus === "in_progress"
                    ? "🔄 校對中"
                    : "⬜ 待校對"
              }}）</span
            >
            <NuxtLink
              :to="`/admin/proofread/${form.id}`"
              class="proofread-notice-link"
              >查看校對頁面 →</NuxtLink
            >
          </div>
          <div class="markdown-body" v-html="effectivePreviewHtml"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-wrapper {
  padding: 20px;
  background: #f9f9f9;
  min-height: 100vh;
}
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
.editor-header h2 {
  margin: 0;
  color: #333;
}
.actions {
  display: flex;
  gap: 15px;
  align-items: center;
}
.publish-label {
  font-weight: bold;
  cursor: pointer;
  color: #d35400;
}
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  text-decoration: none;
}
.btn-save {
  background: #28a745;
  color: white;
}
.btn-cancel {
  background: #95a5a6;
  color: white;
}
.btn-sm {
  padding: 4px 8px;
  font-size: 0.8rem;
}
.btn-danger {
  background: #e74c3c;
  color: white;
  margin-left: 10px;
}
.btn-reupload {
  padding: 10px 20px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
}
.btn-reupload:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
}
.btn-reupload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-download {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}
.btn-download:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
.btn-download:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-proofread {
  position: relative;
  padding: 10px 20px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.btn-proofread:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);
  color: white;
}
.proofread-badge {
  background: white;
  color: #11998e;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 10px;
  padding: 1px 6px;
  min-width: 18px;
  text-align: center;
}
.proofread-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fffbea;
  border: 1px solid #f5e642;
  border-radius: 6px;
  padding: 8px 14px;
  margin-bottom: 12px;
  font-size: 0.9rem;
  color: #555;
}
.proofread-notice-icon {
  font-size: 1rem;
}
.proofread-notice-link {
  margin-left: auto;
  color: #11998e;
  font-weight: bold;
  text-decoration: none;
  font-size: 0.85rem;
}
.proofread-notice-link:hover {
  text-decoration: underline;
}
/* 校對標記圖示（編輯器預覽用） */
:deep(mark) {
  border-radius: 2px;
  padding: 0 1px;
}
:deep(.ann-marker-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  color: white;
  font-size: 9px;
  font-weight: bold;
  cursor: help;
  vertical-align: middle;
  margin: 0 2px;
  position: relative;
}
:deep(.ann-marker-icon::after) {
  content: attr(data-note);
  display: none;
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: #2c3e50;
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  width: 200px;
  line-height: 1.5;
  z-index: 100;
  pointer-events: none;
  white-space: normal;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
:deep(.ann-marker-icon:hover::after) {
  display: block;
}

.editor-layout {
  display: flex;
  gap: 20px;
  height: calc(100vh - 120px);
}
.form-pane,
.preview-pane {
  flex: 1;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  overflow-y: auto;
}

.form-group {
  margin-bottom: 15px;
}
.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}
.form-row .form-group {
  margin-bottom: 0;
}
.half {
  flex: 1;
}
.third {
  flex: 1;
}
.quarter {
  flex: 1;
}

label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
  color: #555;
  font-size: 0.9rem;
}
input,
textarea,
select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: inherit;
}
textarea {
  resize: vertical;
}
.code-font {
  font-family: monospace;
  font-size: 0.9rem;
  background: #f4f4f4;
}
input[readonly] {
  background: #e9ecef;
  cursor: not-allowed;
}

/* 工具列 */
.toolbar {
  background: #f8f9fa;
  border: 1px solid #ccc;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  padding: 8px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.toolbar + textarea {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.toolbar-group {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}
.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #ccc;
  margin: 0 6px;
  flex-shrink: 0;
}
.group-label {
  font-size: 0.8rem;
  color: #666;
  font-weight: bold;
  white-space: nowrap;
}
.tool-btn {
  background: white;
  border: 1px solid #ccc;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.tool-btn:hover {
  background: #e2e6ea;
  border-color: #adb5bd;
}
.comp-btn {
  color: #0056b3;
  background: #f0f7ff;
  border-color: #cce5ff;
}
.comp-btn:hover {
  background: #d6eaff;
}

.footnote-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.fn-id {
  width: 40px;
  font-weight: bold;
  color: #555;
}

/* 預覽區樣式：與 articles/[id].vue 保持一致 */
.preview-pane {
  font-family: "Times New Roman", serif;
  color: #444;
  line-height: 1.8;
}
.title-header {
  position: relative;
  margin-bottom: 20px;
}
.featured-box {
  display: inline-block;
  float: right;
  color: white;
  font-weight: bold;
  font-size: 1.6rem;
  border-radius: 4px;
  padding: 5px 15px;
  margin-bottom: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.main-title {
  font-family: "Times New Roman", serif;
  font-size: 2.5rem;
  font-weight: bold;
  color: #444;
  text-align: left;
  clear: both;
  margin-top: 0;
  line-height: 1.4;
  padding-left: 2rem;
}
.sub-title {
  font-family: "Times New Roman", serif;
  font-size: 2rem;
  font-weight: bold;
  color: #444;
  margin-top: 10px;
  text-align: left;
  padding-left: 6rem;
}
.divider-thick {
  height: 3px;
  background: #444;
  width: 100%;
}
.divider-gap {
  height: 3px;
}
.divider-thin {
  height: 1px;
  background: #444;
  width: 100%;
  margin-bottom: 20px;
}
.author-info {
  text-align: right;
  margin-bottom: 40px;
  font-family: "Times New Roman", serif;
}
.author-name {
  font-size: 1.2rem;
  color: #444;
}
.author-title,
.author-remark {
  display: block;
  font-size: 1.2rem;
  color: #444;
  margin-top: 4px;
}
/* keyword-section 沿用 article.css 的全局樣式，不再覆蓋 */
.keyword-section :deep(p) {
  margin: 0;
}

/* Markdown 預覽區：覆蓋任何不一致之處，其餘繼承全域 article.css */
.preview-pane :deep(p) {
  text-indent: 2em;
  margin-bottom: 1rem;
}
.preview-pane :deep(h2) {
  font-size: 1.8rem;
  font-weight: bold;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  text-indent: 0;
}
.preview-pane :deep(h3) {
  font-size: 1.4rem;
  font-weight: bold;
  margin-top: 2rem;
  margin-bottom: 1rem;
  text-indent: 0;
}
.preview-pane :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 30px auto;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

@media (max-width: 1024px) {
  .editor-layout {
    flex-direction: column;
    height: auto;
  }
  .preview-pane {
    display: none;
  } /* 手機版隱藏預覽 */
}

/* ── 目錄模式面板 ── */
.toc-panel {
  background: #fef9e7;
  border: 2px solid #f0c040;
  border-radius: 10px;
  padding: 18px 20px;
  margin-bottom: 20px;
}
.toc-panel-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.toc-panel-header h3 {
  margin: 0;
  color: #7d6008;
  font-size: 1rem;
}
.toc-hint {
  font-size: 0.82rem;
  color: #a08040;
  flex: 1;
}
.btn-gen-toc {
  padding: 7px 14px;
  background: #e67e22;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}
.btn-gen-toc:hover {
  background: #ca6f1e;
}
.toc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.toc-table th,
.toc-table td {
  padding: 6px 10px;
  border: 1px solid #f0c040;
  vertical-align: middle;
}
.toc-table th {
  background: #fdebd0;
  color: #7d4e10;
  font-weight: bold;
  text-align: left;
}
.toc-id {
  font-family: monospace;
  font-size: 0.8rem;
  color: #999;
}
.toc-page-input {
  width: 60px;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-align: center;
  font-size: 0.9rem;
}
.toc-saving {
  font-size: 0.78rem;
  color: #888;
}
</style>
