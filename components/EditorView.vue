<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { Mark, Node, Extension, mergeAttributes } from "@tiptap/core";
import { supabase } from "~/supabase";

// ── 目錄模式 ─────────────────────────────────────────────────────
const isTocMode = computed(() => form.value.article_type === "toc");
const tocArticles = ref([]);
const tocSaving = ref({});

const loadTocArticles = async (issueId) => {
  const { data } = await supabase
    .from("articles")
    .select("id, title, author, page_start, section, sort_order")
    .eq("issue", issueId)
    .order("sort_order", { ascending: true });
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
    const page = a.page_start ? `<strong>p.${a.page_start}</strong>　` : "";
    const author = a.author ? `　／　${a.author}` : "";
    return `<p>${page}${a.title}${author}</p>`;
  });
  const html = lines.join("\n");
  form.value.content = html;
  editor.value?.commands.setContent(html);
};

// ── 自訂 Tiptap Extension ─────────────────────────────────────────

// 1. FootnoteRef：保留腳注引用 <sup class="footnote-ref">
const FootnoteRef = Node.create({
  name: "footnoteRef",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      fnId: { default: null },
    };
  },
  parseHTML() {
    return [
      {
        tag: "sup.footnote-ref",
        getAttrs: (dom) => ({
          fnId: dom.querySelector("a")?.textContent?.trim() || null,
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const id = node.attrs.fnId || "?";
    return [
      "sup",
      { class: "footnote-ref" },
      [
        "a",
        {
          href: `#footnote-${id}`,
          id: `footnote-ref-${id}`,
        },
        id,
      ],
    ];
  },
});

// 2. RawBlock：保留自訂 div/figure/table 作為不可分割區塊
const RawBlock = Node.create({
  name: "rawBlock",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      html: { default: "" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[class]",
        getAttrs: (dom) => ({ html: dom.outerHTML }),
        priority: 60,
      },
      {
        tag: "figure",
        getAttrs: (dom) => ({ html: dom.outerHTML }),
      },
      {
        tag: "table",
        getAttrs: (dom) => ({ html: dom.outerHTML }),
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "div",
      {
        "data-raw-block": "1",
        "data-raw-html": encodeURIComponent(node.attrs.html),
      },
    ];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      // 解析 [[圖片N]] 佔位符為實際 URL
      const resolveHtml = (html) => {
        const assets = form.value?.media_assets || [];
        return html.replace(/src="\[\[圖片(\d+)\]\]"/g, (match, orderStr) => {
          const found = assets.find((m) => m.sort_order === parseInt(orderStr));
          return found ? `src="${found.image_url}"` : match;
        });
      };

      let currentHtml = node.attrs.html;

      // ── 外層 wrapper ──────────────────────────────────────
      const wrapper = document.createElement("div");
      wrapper.className = "raw-block-wrapper";

      // ── 預覽區 ────────────────────────────────────────────
      const preview = document.createElement("div");
      preview.className = "raw-block-view";
      preview.contentEditable = "false";
      preview.innerHTML = resolveHtml(currentHtml);

      // ── 編輯按鈕 ──────────────────────────────────────────
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️ 編輯";
      editBtn.type = "button";
      editBtn.className = "raw-block-edit-btn";

      // ── 編輯區（初始隱藏）────────────────────────────────
      const editArea = document.createElement("div");
      editArea.className = "raw-block-edit-area";
      editArea.style.display = "none";

      const textarea = document.createElement("textarea");
      textarea.value = currentHtml;
      textarea.className = "raw-block-textarea";
      textarea.rows = 8;
      textarea.spellcheck = false;

      const btnRow = document.createElement("div");
      btnRow.className = "raw-block-btn-row";

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "✅ 儲存";
      saveBtn.type = "button";
      saveBtn.className = "raw-block-save-btn";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "✖ 取消";
      cancelBtn.type = "button";
      cancelBtn.className = "raw-block-cancel-btn";

      btnRow.appendChild(saveBtn);
      btnRow.appendChild(cancelBtn);
      editArea.appendChild(textarea);
      editArea.appendChild(btnRow);

      // ── 事件 ──────────────────────────────────────────────
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        textarea.value = currentHtml;
        editArea.style.display = "block";
        editBtn.style.display = "none";
        preview.style.opacity = "0.4";
        textarea.focus();
      });

      saveBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const newHtml = textarea.value;
        if (typeof getPos === "function") {
          editor.chain().command(({ tr }) => {
            tr.setNodeMarkup(getPos(), undefined, { html: newHtml });
            return true;
          }).run();
        }
        currentHtml = newHtml;
        preview.innerHTML = resolveHtml(newHtml);
        editArea.style.display = "none";
        editBtn.style.display = "";
        preview.style.opacity = "";
      });

      cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        editArea.style.display = "none";
        editBtn.style.display = "";
        preview.style.opacity = "";
      });

      wrapper.appendChild(preview);
      wrapper.appendChild(editBtn);
      wrapper.appendChild(editArea);

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type.name !== "rawBlock") return false;
          currentHtml = updatedNode.attrs.html;
          preview.innerHTML = resolveHtml(currentHtml);
          textarea.value = currentHtml;
          return true;
        },
      };
    };
  },
});

// 3. ClassPreserver：讓 paragraph/heading 保留 class 屬性（如 no-indent）
const ClassPreserver = Extension.create({
  name: "classPreserver",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          class: {
            default: null,
            parseHTML: (el) => el.getAttribute("class"),
            renderHTML: (attrs) => (attrs.class ? { class: attrs.class } : {}),
          },
        },
      },
    ];
  },
});

// ── 將 editor.getHTML() 的 raw-block 佔位符還原為原始 HTML ───────
function cleanHTML(raw) {
  return raw.replace(
    /<div data-raw-block="1" data-raw-html="([^"]*)"[^>]*><\/div>/g,
    (_, encoded) => {
      try {
        return decodeURIComponent(encoded);
      } catch {
        return _;
      }
    },
  );
}

// ── Form 狀態 ─────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const isEditMode = ref(false);
const showSource = ref(false);
const sourceHtml = ref("");

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
  media_assets: [],
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
const issuesMap = ref({});

watch(
  () => form.value.issue,
  (newIssue) => {
    if (issuesMap.value[newIssue]) {
      form.value.issue_title = issuesMap.value[newIssue];
    }
  },
);

// ── Tiptap 編輯器 ──────────────────────────────────────────────────
const editor = useEditor({
  extensions: [
    StarterKit.configure({ heading: { levels: [2, 3] } }),
    ClassPreserver,
    Underline,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Link.configure({ openOnClick: false, autolink: true }),
    FootnoteRef,
    RawBlock,
  ],
  content: "",
  onUpdate: ({ editor }) => {
    form.value.content = cleanHTML(editor.getHTML());
  },
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

// ── 原始碼切換 ────────────────────────────────────────────────────
const toggleSource = () => {
  if (!showSource.value) {
    // 切到原始碼：把 editor 內容輸出為 clean HTML
    sourceHtml.value = cleanHTML(editor.value?.getHTML() || "");
    showSource.value = true;
  } else {
    // 切回 WYSIWYG：把 textarea 的 HTML 載入 editor
    editor.value?.commands.setContent(sourceHtml.value);
    form.value.content = sourceHtml.value;
    showSource.value = false;
  }
};

// ── 載入文章 ──────────────────────────────────────────────────────
const loadArticle = async (id) => {
  loading.value = true;
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
      media_assets: data.media_assets || [],
      prev_id: data.prev_id || "",
      next_id: data.next_id || "",
      page_start: data.page_start ?? null,
      article_type: data.article_type || "regular",
    };

    seoJson.value = data.seo ? JSON.stringify(data.seo, null, 2) : "{\n}";
    isPublished.value = data.is_published || false;
    proofreadAnnotations.value = data.proofread_annotations || [];
    proofreadStatus.value = data.proofread_status || "pending";

    editor.value?.commands.setContent(data.content || "");

    if (data.article_type === "toc") {
      await loadTocArticles(data.issue);
    }
  }
  loading.value = false;
};

onMounted(async () => {
  const { data: issuesData } = await supabase.from("issues").select("id, title");
  if (issuesData) {
    issuesData.forEach((i) => {
      issuesMap.value[i.id] = i.title;
    });
  }
  const id = route.params.id || route.query.id;
  if (id) loadArticle(id);
});

// ── 儲存 ─────────────────────────────────────────────────────────
const saveArticle = async () => {
  if (!form.value.id) {
    alert("文章 ID 是必填項目！");
    return;
  }
  let seoParsed = {};
  try {
    seoParsed = JSON.parse(seoJson.value);
  } catch {
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
  delete payload.media_assets;

  const { error } = await supabase
    .from("articles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    alert("儲存失敗！\n" + error.message);
  } else {
    alert("✅ 儲存成功！");
    isEditMode.value = true;
  }
  loading.value = false;
};

// ── Word 重新上傳（直接存 HTML，不轉 markdown）────────────────────
const reuploadInput = ref(null);

const triggerReupload = () => {
  reuploadInput.value?.click();
};

const handleReupload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm("確定要用新的 Word 覆蓋目前的內文與註腳嗎？（其他欄位不受影響）")) {
    event.target.value = "";
    return;
  }
  loading.value = true;
  try {
    const mammothModule = await import("mammoth");
    const mammoth = mammothModule.default ?? mammothModule;
    const arrayBuffer = await file.arrayBuffer();

    let imageCounter = 0;
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
      ],
    });

    // 替換 base64 圖片為 [[圖片N]] 佔位符
    let html = result.value.replace(
      /<img\b[^>]*\bsrc="data:[^"]*"[^>]*/gi,
      () => {
        imageCounter++;
        return `<img src="[[圖片${imageCounter}]]" alt=""`;
      },
    );

    // 解析 DOM 做後處理
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const newFootnotes = [];

    // 提取腳注列表
    const footnotesOl = doc.querySelector("ol.footnotes");
    if (footnotesOl) {
      footnotesOl.querySelectorAll("li").forEach((li) => {
        const idAttr = li.getAttribute("id") || "";
        const numMatch = idAttr.match(/footnote-(\d+)/);
        if (!numMatch) return;
        li.querySelectorAll('a[href^="#footnote-ref"]').forEach((a) => a.remove());
        const t = li.textContent.trim();
        if (t) newFootnotes.push({ id: parseInt(numMatch[1]), text: t });
      });
      footnotesOl.parentElement?.removeChild(footnotesOl);
    }

    // 舊式 [^N]: 腳注行 → 移除並記錄
    doc.querySelectorAll("p").forEach((p) => {
      const m = p.textContent.trim().match(/^\[\^(\d+)\][：:]\s*(.*)/);
      if (m) {
        newFootnotes.push({ id: parseInt(m[1]), text: m[2] });
        p.remove();
      }
    });

    // 短全粗體段落 → 轉 h2
    doc.querySelectorAll("p").forEach((p) => {
      const inner = p.innerHTML.trim();
      if (/^<strong>[^<]*<\/strong>$/.test(inner) && p.textContent.length <= 40) {
        const h2 = doc.createElement("h2");
        h2.textContent = p.textContent;
        p.replaceWith(h2);
      }
    });

    // 圖片 → 包進 figure
    const idMatch = form.value.id.match(/^(\d+)-(\d+)/);
    const seq = idMatch ? idMatch[2] : "0";
    doc.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (!src.startsWith("[[圖片")) return;
      const n = src.match(/\[\[圖片(\d+)\]\]/)?.[1] || "?";
      const figure = doc.createElement("figure");
      figure.className = "img-bottom px-600";
      figure.innerHTML = `<img src="${src}" alt="圖片 ${seq}-${n}"><figcaption>（圖片 ${seq}-${n}，待上傳）</figcaption>`;
      img.closest("p")?.replaceWith(figure) || img.replaceWith(figure);
    });

    const cleanedHtml = doc.body.innerHTML;
    editor.value?.commands.setContent(cleanedHtml);
    form.value.content = cleanedHtml;

    if (newFootnotes.length > 0) {
      newFootnotes.sort((a, b) => a.id - b.id);
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

// ── 下載 Word ────────────────────────────────────────────────────
const exportToWord = async () => {
  try {
    loading.value = true;
    const assets = form.value.media_assets || [];
    const resolvedContent = form.value.content.replace(
      /\[\[圖片(\d+)\]\]/g,
      (match, orderStr) => {
        const found = assets.find((m) => m.sort_order === parseInt(orderStr));
        return found ? found.image_url : match;
      },
    );
    const articleData = {
      id: form.value.id,
      title: form.value.title,
      subtitle: form.value.subtitle,
      category: form.value.category,
      author: form.value.author,
      author_title: form.value.author_title,
      remark: form.value.remark,
      keyword: form.value.keyword,
      content: resolvedContent,
      footnotes: form.value.footnotes,
      issue: form.value.issue,
      issue_title: form.value.issue_title,
      page_start: form.value.page_start,
    };
    const response = await fetch("/api/export-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(articleData),
    });
    const result = await response.json();
    if (result.success) {
      const bytes = new Uint8Array(
        atob(result.file)
          .split("")
          .map((c) => c.charCodeAt(0)),
      );
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      alert(`✅ 已下載：${result.filename}`);
    } else {
      throw new Error(result.error || "生成失敗");
    }
  } catch (err) {
    alert(`❌ 下載失敗：${err.message}`);
  } finally {
    loading.value = false;
  }
};

// ── 圖片插入 ─────────────────────────────────────────────────────
const sortedMediaAssets = computed(() =>
  [...(form.value.media_assets || [])].sort((a, b) => a.sort_order - b.sort_order),
);

const insertImageBlock = (sortOrder, style) => {
  const templates = {
    left: `<figure class="img-left px-300"><img src="[[圖片${sortOrder}]]" alt="描述"><figcaption>圖片說明</figcaption></figure>`,
    center: `<figure class="img-bottom px-600"><img src="[[圖片${sortOrder}]]" alt="描述"><figcaption>圖片說明文字</figcaption></figure>`,
    right: `<figure class="img-right px-300"><img src="[[圖片${sortOrder}]]" alt="描述"><figcaption>圖片說明</figcaption></figure>`,
  };
  editor.value?.commands.insertContent(templates[style]);
};

// ── 腳注引用插入 ──────────────────────────────────────────────────
const insertFootnoteRef = () => {
  const num = prompt("腳注編號：", String(form.value.footnotes.length + 1));
  if (!num) return;
  editor.value
    ?.chain()
    .focus()
    .insertContent(
      `<sup class="footnote-ref"><a href="#footnote-${num}" id="footnote-ref-${num}">${num}</a></sup>`,
    )
    .run();
};

// ── 連結插入 ─────────────────────────────────────────────────────
const insertLink = () => {
  const url = prompt("URL：");
  if (!url) return;
  editor.value?.chain().focus().setLink({ href: url, target: "_blank" }).run();
};

const removeLink = () => {
  editor.value?.chain().focus().unsetLink().run();
};

// ── 特殊元件插入 ──────────────────────────────────────────────────
const insertRaw = (html) => {
  editor.value?.commands.insertContent(html);
};

// ── 腳注管理 ─────────────────────────────────────────────────────
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
</script>

<template>
  <div class="editor-wrapper">
    <!-- ── Header ── -->
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
          <button class="btn btn-reupload" @click="triggerReupload" :disabled="loading">
            📤 更新內文
          </button>
        </template>
        <button v-if="isEditMode" class="btn btn-download" @click="exportToWord" :disabled="loading">
          📥 下載 Word
        </button>
        <NuxtLink
          v-if="isEditMode"
          :to="`/admin/proofread/${form.id}`"
          class="btn btn-proofread"
        >
          🔍 文章校對
          <span v-if="proofreadAnnotations.length" class="proofread-badge">
            {{ proofreadAnnotations.length }}
          </span>
        </NuxtLink>
        <label class="publish-label">
          <input type="checkbox" v-model="isPublished" />
          公開發布
        </label>
        <button class="btn btn-save" @click="saveArticle" :disabled="loading">
          {{ loading ? "儲存中..." : "💾 儲存至資料庫" }}
        </button>
        <NuxtLink to="/admin/articles_manager" class="btn btn-cancel">回列表</NuxtLink>
      </div>
    </div>

    <!-- ── 目錄模式 ── -->
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
            <th>ID</th><th>標題</th><th>作者</th>
            <th width="70">起始頁</th><th width="60">狀態</th>
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
            <td class="toc-saving">{{ tocSaving[a.id] ? "儲存..." : "" }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── 主體 ── -->
    <div class="editor-layout">
      <!-- ── 表單欄位 ── -->
      <div class="form-group">
        <label>文章 ID (必填，不可重複)</label>
        <input v-model="form.id" placeholder="例如：5-13話語與肉身" :readonly="isEditMode" />
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
            <option v-for="cat in categories" :key="cat.name" :value="cat.name">
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
        <label>文章摘要 (Summary)</label>
        <textarea v-model="form.summary" rows="3"></textarea>
      </div>

      <div v-if="!isTocMode" class="form-group">
        <label>關鍵字</label>
        <textarea v-model="form.keyword" rows="2"></textarea>
      </div>

      <!-- ── WYSIWYG 編輯器 ── -->
      <div class="form-group">
        <div class="content-label-row">
          <label>內文</label>
          <button
            type="button"
            class="btn-source"
            :class="{ active: showSource }"
            @click="toggleSource"
          >
            {{ showSource ? "✏️ 切回編輯" : "🔧 原始碼" }}
          </button>
        </div>

        <!-- 工具列 -->
        <div v-if="!showSource" class="tiptap-toolbar">
          <div class="toolbar-group">
            <button
              type="button"
              class="tool-btn"
              :class="{ active: editor?.isActive('heading', { level: 2 }) }"
              @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
              title="H2 副標"
            >H2</button>
            <button
              type="button"
              class="tool-btn"
              :class="{ active: editor?.isActive('heading', { level: 3 }) }"
              @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
              title="H3 小標"
            >H3</button>
          </div>

          <div class="toolbar-sep"></div>

          <div class="toolbar-group">
            <button
              type="button"
              class="tool-btn"
              :class="{ active: editor?.isActive('bold') }"
              @click="editor?.chain().focus().toggleBold().run()"
              title="粗體 (Ctrl+B)"
            ><strong>B</strong></button>
            <button
              type="button"
              class="tool-btn kaiti-btn"
              :class="{ active: editor?.isActive('italic') }"
              @click="editor?.chain().focus().toggleItalic().run()"
              title="楷書體（*文字*）"
            >楷</button>
            <button
              type="button"
              class="tool-btn"
              :class="{ active: editor?.isActive('underline') }"
              @click="editor?.chain().focus().toggleUnderline().run()"
              title="底線 (Ctrl+U)"
            ><u>U</u></button>
          </div>

          <div class="toolbar-sep"></div>

          <div class="toolbar-group">
            <button
              type="button"
              class="tool-btn"
              @click="insertLink"
              title="插入連結"
            >🔗</button>
            <button
              type="button"
              class="tool-btn"
              @click="removeLink"
              title="移除連結"
            >✂️</button>
          </div>

          <div class="toolbar-sep"></div>

          <div class="toolbar-group">
            <button
              type="button"
              class="tool-btn"
              :class="{ active: editor?.isActive('blockquote') }"
              @click="editor?.chain().focus().toggleBlockquote().run()"
              title="引言"
            >❝</button>
            <button
              type="button"
              class="tool-btn"
              @click="editor?.chain().focus().setHorizontalRule().run()"
              title="分隔線"
            >—</button>
            <button
              type="button"
              class="tool-btn"
              @click="insertFootnoteRef"
              title="插入腳注引用"
            >[^]</button>
          </div>

          <div class="toolbar-sep"></div>

          <div class="toolbar-group">
            <button
              type="button"
              class="tool-btn"
              @click="editor?.chain().focus().setTextAlign('left').run()"
              title="靠左"
            >≡</button>
            <button
              type="button"
              class="tool-btn"
              @click="editor?.chain().focus().setTextAlign('center').run()"
              title="置中"
            >≡̄</button>
            <button
              type="button"
              class="tool-btn"
              @click="editor?.chain().focus().setTextAlign('right').run()"
              title="靠右"
            >≡→</button>
          </div>

          <!-- 插入元件列 -->
          <div class="toolbar-full-row">
            <span class="group-label">插入：</span>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<div class='book-quote'>引用的內容...<div class='book-quote-rel'> ──《書名》，頁數 </div></div>`)">
              ✍ 書本引言
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<div class='book-box'><div class='book-info'><strong>書籍資訊</strong><br />《書名》...<br />《作者》...<br />《出版》...</div><div class='book-image'><img src='圖片網址' alt='封面' /></div></div>`)">
              📚 書籍簡介
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<blockquote><p>引用的內容...</p><div class='rel'>── 出處</div></blockquote>`)">
              💬 一般引言
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<div class='custom-divider'></div>`)">
              ── 分隔
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<p class='no-indent'>無縮排文字</p>`)">
              ¶ 去縮排
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<span style='display:block;text-align:right;'>置右文字</span>`)">
              → 置右
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw('🌏\uFE0E')">
              🌏 結尾
            </button>
          </div>

          <!-- 文章圖片快速插入 -->
          <div v-if="sortedMediaAssets.length > 0" class="media-insert-bar">
            <span class="group-label">文章圖片：</span>
            <div v-for="img in sortedMediaAssets" :key="img.sort_order" class="media-insert-item">
              <img :src="img.image_url" class="media-thumb" :title="`圖片 ${img.sort_order}`" />
              <span class="media-order">#{{ img.sort_order }}</span>
              <button type="button" class="tool-btn img-btn" @click="insertImageBlock(img.sort_order, 'left')">左</button>
              <button type="button" class="tool-btn img-btn" @click="insertImageBlock(img.sort_order, 'center')">中</button>
              <button type="button" class="tool-btn img-btn" @click="insertImageBlock(img.sort_order, 'right')">右</button>
            </div>
          </div>
        </div>

        <!-- Tiptap 編輯器本體 -->
        <div v-if="!showSource" class="tiptap-editor-container">
          <editor-content :editor="editor" class="tiptap-editor article-content markdown-body" />
        </div>

        <!-- 原始碼模式 -->
        <div v-if="showSource" class="source-mode">
          <div class="source-hint">直接編輯 HTML 原始碼，完成後點「切回編輯」</div>
          <textarea v-model="sourceHtml" class="source-textarea" rows="30"></textarea>
        </div>
      </div>

      <!-- ── SEO ── -->
      <div v-if="!isTocMode" class="form-group">
        <label>SEO 資料 (JSON 格式)</label>
        <textarea v-model="seoJson" rows="6" class="code-font"></textarea>
      </div>

      <!-- ── 腳注 ── -->
      <div class="form-group">
        <label>
          註腳 (Footnotes)
          <span class="footnote-hint">在內文中插入 [^N] 引用</span>
        </label>
        <div v-for="(fn, index) in form.footnotes" :key="index" class="footnote-item">
          <span class="fn-id">[{{ fn.id }}]</span>
          <input v-model="fn.text" placeholder="輸入註腳內容" />
          <button class="btn btn-sm btn-danger" @click="removeFootnote(index)">X</button>
        </div>
        <button class="btn btn-sm" @click="addFootnote">+ 新增註腳</button>
      </div>

      <!-- ── 校對通知 ── -->
      <div v-if="proofreadAnnotations.length" class="proofread-notice">
        <span>有 <strong>{{ proofreadAnnotations.length }}</strong> 條校對標記（{{
          proofreadStatus === "completed" ? "✅ 已校對完成"
          : proofreadStatus === "in_progress" ? "🔄 校對中"
          : "⬜ 待校對"
        }}）</span>
        <NuxtLink :to="`/admin/proofread/${form.id}`" class="proofread-notice-link">
          查看校對頁面 →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-wrapper {
  padding: 20px;
  background: #f9f9f9;
  min-height: 100vh;
  max-width: 960px;
  margin: 0 auto;
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
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.publish-label {
  font-weight: bold;
  cursor: pointer;
  color: #d35400;
  white-space: nowrap;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  text-decoration: none;
  font-size: 0.9rem;
}

.btn-save { background: #28a745; color: white; }
.btn-cancel { background: #95a5a6; color: white; }
.btn-sm { padding: 4px 8px; font-size: 0.8rem; }
.btn-danger { background: #e74c3c; color: white; margin-left: 10px; }

.btn-reupload {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-download {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-proofread {
  position: relative;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-reupload:hover:not(:disabled),
.btn-download:hover:not(:disabled),
.btn-proofread:hover {
  transform: translateY(-2px);
  opacity: 0.9;
  color: white;
}

.btn-reupload:disabled,
.btn-download:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.proofread-badge {
  background: white;
  color: #11998e;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 10px;
  padding: 1px 6px;
}

/* ── 目錄模式 ── */
.toc-panel {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

.toc-panel-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toc-panel-header h3 { margin: 0; color: #333; }
.toc-hint { color: #888; font-size: 0.85rem; }

.btn-gen-toc {
  margin-left: auto;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f093fb 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.toc-table { width: 100%; border-collapse: collapse; }
.toc-table th, .toc-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
  font-size: 0.9rem;
}
.toc-table th { background: #f8f8f8; font-weight: 600; color: #555; }
.toc-id { color: #888; font-size: 0.8rem; }
.toc-page-input { width: 60px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; }
.toc-saving { color: #888; font-size: 0.8rem; }

/* ── 主體 ── */
.editor-layout {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

.form-group { margin-bottom: 18px; }
.form-group label {
  display: block;
  font-weight: 600;
  color: #444;
  margin-bottom: 6px;
  font-size: 0.9rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.form-row { display: flex; gap: 12px; margin-bottom: 18px; }
.form-group.half { flex: 1; margin-bottom: 0; }
.form-group.quarter { flex: 1; margin-bottom: 0; }
.form-group.third { flex: 1; margin-bottom: 0; }

/* ── 內文編輯器區域 ── */
.content-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.content-label-row label { margin-bottom: 0; }

.btn-source {
  padding: 6px 14px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-source.active,
.btn-source:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

/* ── Tiptap 工具列 ── */
.tiptap-toolbar {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  padding: 8px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.toolbar-group { display: flex; gap: 3px; align-items: center; }
.toolbar-sep { width: 1px; height: 22px; background: #dee2e6; margin: 0 4px; }

.tool-btn {
  padding: 4px 9px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: #444;
  transition: all 0.15s;
  white-space: nowrap;
}

.tool-btn:hover { background: #e9ecef; border-color: #adb5bd; }
.tool-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; }

.kaiti-btn { font-family: "DFKai-SB", "標楷體", serif; }

.comp-btn { background: #f0f4ff; border-color: #c7d2fe; color: #4338ca; }
.comp-btn:hover { background: #e0e7ff; }

.img-btn { padding: 3px 7px; font-size: 0.78rem; }

.group-label {
  font-size: 0.8rem;
  color: #888;
  font-weight: 600;
  white-space: nowrap;
}

.toolbar-full-row {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding-top: 6px;
  border-top: 1px solid #eee;
  margin-top: 4px;
}

.media-insert-bar {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #eee;
  margin-top: 4px;
}

.media-insert-item {
  display: flex;
  align-items: center;
  gap: 3px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 3px 6px;
}

.media-thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 3px;
}

.media-order { font-size: 0.75rem; color: #888; }

/* ── Tiptap 編輯器本體 ── */
.tiptap-editor-container {
  border: 1px solid #dee2e6;
  border-radius: 0 0 8px 8px;
  background: white;
  min-height: 500px;
}

.tiptap-editor {
  padding: 20px 24px;
  min-height: 500px;
  outline: none;
}

/* 讓 Tiptap 編輯器內容使用文章字體 */
:deep(.ProseMirror) {
  outline: none;
  min-height: 460px;
  font-family: "Times New Roman", "NSimSun", serif;
  font-size: 1rem;
  line-height: 1.8;
  color: #333;
}

:deep(.ProseMirror p) {
  text-indent: 2em;
  margin-bottom: 0.8rem;
}

:deep(.ProseMirror h2) {
  font-size: 1.2rem;
  font-weight: bold;
  margin: 1.5rem 0 0.8rem;
  text-indent: 0;
}

:deep(.ProseMirror h3) {
  font-size: 1rem;
  font-weight: bold;
  margin: 1.2rem 0 0.6rem;
  text-indent: 0;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid #ccc;
  padding-left: 1.2em;
  margin: 1em 0;
  color: #555;
  font-family: "DFKai-SB", "標楷體", serif;
}

:deep(.ProseMirror em) {
  font-style: normal;
  font-family: "DFKai-SB", "標楷體", serif;
  color: #555;
}

:deep(.ProseMirror hr) {
  border: none;
  border-top: 1px solid #ccc;
  margin: 1.5rem 0;
}

:deep(.ProseMirror a) {
  color: #3b82f6;
  text-decoration: underline;
}

:deep(.ProseMirror sup) {
  font-size: 0.8em;
  line-height: 0;
}

/* 游標對焦框 */
:deep(.ProseMirror-focused) {
  box-shadow: none;
}

/* RawBlock 外觀 */
:deep(.raw-block-wrapper) {
  position: relative;
  margin: 12px 0;
}

:deep(.raw-block-view) {
  border: 2px dashed #c7d2fe;
  border-radius: 6px;
  padding: 4px;
  background: #f8f9ff;
  position: relative;
  transition: opacity 0.2s;
}

:deep(.raw-block-view::before) {
  content: "自訂區塊";
  position: absolute;
  top: -10px;
  left: 8px;
  background: #4338ca;
  color: white;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: sans-serif;
}

:deep(.raw-block-edit-btn) {
  display: block;
  margin: 4px 0 0 auto;
  padding: 3px 10px;
  font-size: 12px;
  background: #4338ca;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

:deep(.raw-block-edit-btn:hover) {
  background: #3730a3;
}

:deep(.raw-block-edit-area) {
  margin-top: 6px;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  padding: 8px;
  background: #f0f4ff;
}

:deep(.raw-block-textarea) {
  width: 100%;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid #a5b4fc;
  border-radius: 4px;
  padding: 6px;
  resize: vertical;
  box-sizing: border-box;
}

:deep(.raw-block-btn-row) {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

:deep(.raw-block-save-btn),
:deep(.raw-block-cancel-btn) {
  padding: 4px 14px;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

:deep(.raw-block-save-btn) {
  background: #16a34a;
  color: white;
}

:deep(.raw-block-cancel-btn) {
  background: #9ca3af;
  color: white;
}

/* 原始碼模式 */
.source-mode { border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
.source-hint {
  background: #fff3cd;
  padding: 8px 14px;
  font-size: 0.85rem;
  color: #856404;
  border-bottom: 1px solid #ffc107;
}

.source-textarea {
  width: 100%;
  padding: 16px;
  border: none;
  font-family: "Consolas", "Monaco", monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  resize: vertical;
  box-sizing: border-box;
  background: #1e1e1e;
  color: #d4d4d4;
}

/* ── 腳注 ── */
.footnote-hint {
  font-weight: normal;
  font-size: 0.8rem;
  color: #888;
  margin-left: 8px;
}

.footnote-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.fn-id {
  font-weight: bold;
  color: #3b82f6;
  white-space: nowrap;
  min-width: 28px;
}

.footnote-item input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

/* ── 校對通知 ── */
.proofread-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fffbea;
  border: 1px solid #f5e642;
  border-radius: 6px;
  padding: 8px 14px;
  margin-top: 12px;
  font-size: 0.9rem;
  color: #555;
}

.proofread-notice-link {
  margin-left: auto;
  color: #11998e;
  font-weight: bold;
  text-decoration: none;
  font-size: 0.85rem;
}

.code-font { font-family: "Consolas", "Monaco", monospace; font-size: 0.85rem; }

@media (max-width: 768px) {
  .form-row { flex-direction: column; }
  .form-group.half,
  .form-group.quarter,
  .form-group.third { flex: none; width: 100%; }
  .editor-header { flex-direction: column; gap: 12px; align-items: flex-start; }
  .actions { flex-wrap: wrap; }
}
</style>
