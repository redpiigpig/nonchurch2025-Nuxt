<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { Node, Extension, Mark, mergeAttributes } from "@tiptap/core";
import Italic from "@tiptap/extension-italic";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { supabase } from "~/supabase";

// ── 自訂 directive：像 v-html 但 focus 時不重繪（防止 contenteditable 游標跳位）
const vSafeHtml = {
  mounted(el, { value }) {
    el.innerHTML = value || "";
  },
  updated(el, { value }) {
    if (document.activeElement === el) return; // 使用者正在打字，跳過更新
    const v = value || "";
    if (el.innerHTML !== v) el.innerHTML = v;
  },
};

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

// ── 校對標記（早期宣告，供 AnnotationMarkers 閉包使用）────────────
const proofreadAnnotations = ref([]);
const proofreadStatus = ref("incomplete");

// ══════════════════════════════════════════════════════════════════
// EditorView.vue 區塊索引（中文對照）
//
// 【TipTap 自訂 Extension】              ~L.66
//   ItalicI     斜體（外文書名）<i>
//   KaiTi       標楷體 <span class="kaiti">（相容舊版 <em>）
//   FootnoteRef 腳注引用節點 <sup class="footnote-ref">
//   RawBlock    自訂 div/figure/table 不可分割區塊
//   ClassPreserver 保留 heading 的 class 屬性
//   AnnotationMarkers 校對標記小點裝飾
//
// 【HTML 工具函數】                       ~L.435
//   cleanHTML          還原 raw-block 佔位符為原始 HTML
//   cleanRemarkHtml    把意外存成 <sup> 的備註腳注轉回 [^N]
//   normalizeInlineTags 將純文字 <b> <i> <em> 等轉為真正格式
//
// 【Form 狀態 / 全域 ref】               ~L.498
//   form               文章所有欄位（id/title/remark/footnotes/content…）
//   isEditMode / loading / showSource
//
// 【主內文編輯器 editor】                ~L.578
//   useEditor() 完整 TipTap，含 FootnoteRef/RawBlock/校對標記
//   toggleSource       切換原始碼模式
//   reprocessInlineTags 重解析 <b><i> 等純文字標記
//
// 【備註欄 remarkEditor】                ~L.609
//   輕量 TipTap，僅支援 [^N] 腳注引用
//   insertRemarkFootnoteRef  [^] 按鈕 → 在游標處插入 [^N]
//
// 【文章載入 / 儲存】                    ~L.659
//   loadArticle(id)    從 Supabase 讀取並填入 form + editor
//   saveArticle()      存回 Supabase
//
// 【Word 下載 / 重上傳】                 ~L.800
//   exportToWord()     呼叫 /api/generate-docx 下載 Word
//   handleReupload()   重新上傳 Word 解析
//
// 【圖片管理】                           ~L.967
//   sortedMediaAssets  排序後的圖片列表
//   insertImageBlock   插入圖片區塊到 TipTap
//   moveMediaAsset     圖片上移/下移
//   handleMediaUpload  上傳新圖片到 Cloudinary
//
// 【腳注 / 連結】                        ~L.1143
//   insertFootnoteRef  主內文插入腳注引用（TipTap command）
//   insertLink / removeLink
//   insertRaw          插入自訂 HTML 區塊（RawBlock）
//
// 【迷你富文本（腳注欄 contenteditable）】~L.1189
//   activeMiniField    當前聚焦的腳注欄 div
//   onMiniBlur         失焦時清除 activeMiniField
//   applyMiniFormat    腳注欄 B/U 格式
//   wrapMiniTag        腳注欄 楷/I 包裹標籤
//
// 【校對標記審閱】                       ~L.1185
//   applyReplacement / resolveAnnotation / unresolveAnnotation
//
// 【ProseMirror 樣式覆蓋（:deep）】      ~L.2313
//   .ProseMirror       主編輯器字型、行距（text-indent: 2em）
//   .ProseMirror p     首行縮排 2em、段落間距
//   .ProseMirror h2/h3 小標題樣式
//
// 【備註欄 TipTap 樣式】                 ~L.2390
//   .remark-tiptap     對齊 input 的單行輸入框外觀
//   .remark-tiptap :deep(.ProseMirror)  text-indent:0、white-space:nowrap
//
// ══════════════════════════════════════════════════════════════════

// ── 自訂 Tiptap Extension ─────────────────────────────────────────

// 0a. ItalicI：獨立 <i> 斜體 mark（外文書名/專有詞彙）
const ItalicI = Italic.extend({
  name: "italicI",
  parseHTML() {
    return [{ tag: "i" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["i", mergeAttributes(HTMLAttributes)];
  },
});

// 0b. KaiTi：標楷體 mark，渲染為 <span class="kaiti">
//     向下相容：解析 <em>（舊版文章）和 <span class="kaiti">
const KaiTi = Mark.create({
  name: "kaiTi",
  parseHTML() {
    return [
      { tag: 'span.kaiti' },
      { tag: 'em' },  // 向下相容，舊版文章使用 <em>
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "kaiti" }), 0];
  },
});

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
  draggable: true,
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

      // ── 按鈕列（編輯 + 複製）────────────────────────────
      const btnBarTop = document.createElement("div");
      btnBarTop.className = "raw-block-btn-bar";

      // ── 編輯按鈕 ──────────────────────────────────────────
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️ 編輯";
      editBtn.type = "button";
      editBtn.className = "raw-block-edit-btn";

      // ── 複製按鈕 ──────────────────────────────────────────
      const copyBtn = document.createElement("button");
      copyBtn.textContent = "📋 複製";
      copyBtn.type = "button";
      copyBtn.className = "raw-block-copy-btn";

      copyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(currentHtml);
          copyBtn.textContent = "✅ 已複製";
          setTimeout(() => { copyBtn.textContent = "📋 複製"; }, 1800);
        } catch {
          copyBtn.textContent = "📋 複製";
        }
      });

      // ── 刪除按鈕 ──────────────────────────────────────────
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.type = "button";
      deleteBtn.className = "raw-block-delete-btn";
      deleteBtn.title = "刪除此區塊";

      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const pos = typeof getPos === "function" ? getPos() : null;
        if (typeof pos === "number") {
          const { tr } = editor.state;
          tr.delete(pos, pos + node.nodeSize);
          tr.setMeta("addToHistory", true);
          editor.view.dispatch(tr);
        }
      });

      // ── 拖曳把手 ──────────────────────────────────────────────
      const dragHandle = document.createElement("div");
      dragHandle.className = "raw-block-drag-handle";
      dragHandle.contentEditable = "false";
      dragHandle.draggable = true;
      dragHandle.title = "拖曳移動";
      dragHandle.textContent = "⠿";

      btnBarTop.appendChild(dragHandle);
      btnBarTop.appendChild(editBtn);
      btnBarTop.appendChild(copyBtn);
      btnBarTop.appendChild(deleteBtn);

      // ── 編輯區（初始隱藏）────────────────────────────────
      const editArea = document.createElement("div");
      editArea.className = "raw-block-edit-area";
      editArea.style.display = "none";

      const textarea = document.createElement("textarea");
      textarea.value = currentHtml;
      textarea.className = "raw-block-textarea";
      textarea.rows = 8;
      textarea.spellcheck = false;

      // 阻止所有輸入事件冒泡到 ProseMirror（雙重保險）
      ["keydown", "keypress", "keyup", "beforeinput", "input",
       "paste", "cut", "mousedown", "mouseup"].forEach((ev) => {
        textarea.addEventListener(ev, (e) => e.stopPropagation());
      });

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
        btnBarTop.style.display = "none";
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
        btnBarTop.style.display = "";
        preview.style.opacity = "";
      });

      cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        editArea.style.display = "none";
        btnBarTop.style.display = "";
        preview.style.opacity = "";
      });

      wrapper.appendChild(preview);
      wrapper.appendChild(btnBarTop);
      wrapper.appendChild(editArea);

      return {
        dom: wrapper,
        // 告訴 ProseMirror：不要處理這個 NodeView 內部的任何事件
        // 拖曳事件例外：讓 ProseMirror 處理 draggable 節點的搬移
        stopEvent(event) {
          if (dragHandle.contains(event.target)) return false;
          return wrapper.contains(event.target);
        },
        // 告訴 ProseMirror：忽略這個 NodeView 內部的 DOM 變更（textarea 打字不觸發重解析）
        ignoreMutation() {
          return true;
        },
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

// 4. AnnotationMarkers：在段落起點插入校對標記小點（ProseMirror Decoration）
const activeAnnId = ref(null);
const annPopupPos = ref({ x: 0, y: 0 });

const AnnotationMarkers = Extension.create({
  name: "annotationMarkers",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const annotations = proofreadAnnotations.value || [];
            const unresolved = annotations.filter((a) => !a.resolved);
            if (!unresolved.length) return DecorationSet.empty;

            const decorations = [];
            let blockIdx = 0;

            state.doc.forEach((node, offset) => {
              const annsForBlock = unresolved.filter(
                (a) => a.paragraphIndex === blockIdx,
              );
              if (annsForBlock.length) {
                const blockText = node.textContent;
                annsForBlock.forEach((ann) => {
                  // 文字反白 + 小點放在反白文字右上
                  let dotPos = offset + 1;
                  if (ann.selectedText) {
                    const charIdx = blockText.indexOf(ann.selectedText);
                    if (charIdx !== -1) {
                      const from = offset + 1 + charIdx;
                      const to = from + ann.selectedText.length;
                      decorations.push(
                        Decoration.inline(from, to, {
                          style: `background: ${ann.color}55; border-radius: 2px;`,
                          class: "ann-text-highlight",
                        }),
                      );
                      dotPos = to;
                    }
                  }
                  const dot = document.createElement("span");
                  dot.className = "ann-dot-marker";
                  dot.style.background = ann.color || "#ffeb3b";
                  dot.title = ann.note ? `校對：${ann.note}` : "校對標記";
                  dot.dataset.annId = String(ann.id);
                  dot.addEventListener("mousedown", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (activeAnnId.value === ann.id) {
                      activeAnnId.value = null;
                    } else {
                      activeAnnId.value = ann.id;
                      annPopupPos.value = { x: e.clientX, y: e.clientY };
                    }
                  });
                  decorations.push(Decoration.widget(dotPos, dot, { side: 1 }));
                });
              }
              blockIdx++;
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
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

// ── 將純文字形式的 HTML 標記還原成真正的格式 ────────────────────
// 備註欄（remark）清理：把意外存成 HTML 的 <sup class="footnote-ref"> 轉回純文字 [^N]
function cleanRemarkHtml(html) {
  if (!html) return html;
  // 把 <sup class="footnote-ref"><a ...>N</a></sup> 轉回 [^N]
  return html.replace(
    /<sup\s+class="footnote-ref"[^>]*><a[^>]*>(\d+)<\/a><\/sup>/gi,
    (_, n) => `[^${n}]`,
  );
}

// Phase 1：inline marks（使用者在 WYSIWYG 直接打 <b> 等）
// Phase 2：block HTML（貼上的 <figure>/<table>/<div> 整段被存成文字）
function normalizeInlineTags(html) {
  if (!html) return html;

  // ── Phase 1: inline marks ──────────────────────────────────────
  let result = html
    .replace(/&lt;b&gt;/g, "<strong>")
    .replace(/&lt;\/b&gt;/g, "</strong>")
    .replace(/&lt;strong&gt;/g, "<strong>")
    .replace(/&lt;\/strong&gt;/g, "</strong>")
    .replace(/&lt;i&gt;/g, "<i>")
    .replace(/&lt;\/i&gt;/g, "</i>")
    .replace(/&lt;em&gt;/g, '<span class="kaiti">')
    .replace(/&lt;\/em&gt;/g, "</span>")
    .replace(/&lt;u&gt;/g, "<u>")
    .replace(/&lt;\/u&gt;/g, "</u>");

  // ── Phase 2: block HTML ────────────────────────────────────────
  // 若一個 <p> 的全部內容都是 escaped block HTML，解包還原
  const BLOCK_RE = /^<(figure|table|div[\s>]|blockquote|iframe|video|audio)\b/i;
  result = result.replace(
    /<p(?:[^>]*)>([\s\S]*?)<\/p>/g,
    (match, inner) => {
      const trimmed = inner.trim();
      if (!trimmed.startsWith("&lt;")) return match;
      const decoded = trimmed
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"');
      return BLOCK_RE.test(decoded) ? decoded : match;
    },
  );

  return result;
}

// ── Form 狀態 ─────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const isEditMode = ref(false);
const showSource = ref(false);
const sourceHtml = ref("");
const autoSaveStatus = ref("idle"); // 'idle' | 'saving' | 'saved' | 'error'
let autoSaveTimer = null;

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
  { name: "時事評論", color: "#4682b4" },
  { name: "文藝創作", color: "#27408b" },
  { name: "公告與剪影", color: "#6a5acd" },
  { name: "封面故事", color: "#7d6c29" },
  { name: "光影時刻", color: "#7d6c29" },
  { name: "實驗園地", color: "#db7093" },
  { name: "文獻與翻譯", color: "#6c3535" },
];


const isPublished = ref(false);
const issuesMap = ref({});

// ── 工具列：捲動後切 fixed ──────────────────────────────────────────
const toolbarIsFixed = ref(false);
let _toolbarNaturalTop = 0; // 工具列在文件中的原始 Y 位置
let _scrollHandler = null;
const TOOLBAR_FIXED_TOP = 10;

const measureToolbarNaturalTop = async () => {
  if (!import.meta.client) return;
  await nextTick();
  const sidebar = document.querySelector(".toolbar-sidebar");
  if (sidebar) {
    _toolbarNaturalTop = Math.round(
      sidebar.getBoundingClientRect().top + window.scrollY,
    );
  }
};

// 文章載入後 header 多了按鈕，需重新量測
watch(isEditMode, (val) => { if (val) measureToolbarNaturalTop(); });

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
    StarterKit.configure({ heading: { levels: [2, 3] }, italic: false }),
    ItalicI,
    KaiTi,
    ClassPreserver,
    Underline,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Link.configure({ openOnClick: false, autolink: true }),
    FootnoteRef,
    RawBlock,
    AnnotationMarkers,
  ],
  content: "",
  onUpdate: ({ editor }) => {
    form.value.content = cleanHTML(editor.getHTML());
  },
});

// 校對標記變更時，觸發 ProseMirror 重新計算 decorations
watch(
  proofreadAnnotations,
  () => {
    if (editor.value?.view) {
      const { state, view } = editor.value;
      view.dispatch(state.tr);
    }
  },
  { deep: true },
);

// ── 備註欄專用 TipTap（輕量，支援腳注引用）──────────────────────────
const remarkEditor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: false, blockquote: false, horizontalRule: false,
      codeBlock: false, code: false, bulletList: false, orderedList: false,
      listItem: false,
    }),
  ],
  content: "<p></p>",
  onUpdate({ editor }) {
    const html = editor.getHTML();
    // 單段落時剝除 <p> 外殼，多段落保留完整 HTML
    form.value.remark = html.replace(/^<p>([\s\S]*)<\/p>$/, "$1");
  },
});

const insertRemarkFootnoteRef = () => {
  const num = prompt("腳注編號：", String(form.value.footnotes.length + 1));
  if (!num) return;
  remarkEditor.value?.chain().focus().insertContent(`[^${num}]`).run();
};

let _annClickOutside = null;

onBeforeUnmount(() => {
  editor.value?.destroy();
  remarkEditor.value?.destroy();
  if (_scrollHandler) window.removeEventListener("scroll", _scrollHandler);
  if (_annClickOutside) document.removeEventListener("mousedown", _annClickOutside);
});

// ── 原始碼切換 ────────────────────────────────────────────────────
const toggleSource = () => {
  if (!showSource.value) {
    sourceHtml.value = cleanHTML(editor.value?.getHTML() || "");
    showSource.value = true;
  } else {
    editor.value?.commands.setContent(sourceHtml.value);
    form.value.content = sourceHtml.value;
    showSource.value = false;
  }
};

// ── 手動重解析內文 inline HTML tag ────────────────────────────────
const reprocessInlineTags = () => {
  const html = normalizeInlineTags(cleanHTML(editor.value?.getHTML() || ""));
  editor.value?.commands.setContent(html);
};

// ── 載入文章 ──────────────────────────────────────────────────────
const loadArticle = async (id) => {
  loading.value = true;
  const { data, error } = await supabase
    .from("articles")
    .select("*, media_assets(id, image_url, sort_order, cloudinary_id)")
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
      remark: cleanRemarkHtml(data.remark || ""),
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
    proofreadStatus.value = data.proofread_status || "incomplete";

    editor.value?.commands.setContent(normalizeInlineTags(data.content || ""));

    await nextTick();
    const rawRemark = form.value.remark;
    const remarkContent = rawRemark.startsWith("<p")
      ? rawRemark
      : rawRemark ? `<p>${rawRemark}</p>` : "<p></p>";
    remarkEditor.value?.commands.setContent(remarkContent, false);

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

  // 初次量測（新文章模式，isEditMode 不會切換）
  await nextTick();
  measureToolbarNaturalTop();

  // 捲動時判斷是否切換 fixed
  _scrollHandler = () => {
    if (!_toolbarNaturalTop) return;
    toolbarIsFixed.value = window.scrollY > _toolbarNaturalTop - TOOLBAR_FIXED_TOP;
  };
  window.addEventListener("scroll", _scrollHandler, { passive: true });

  // 點擊彈窗外部關閉
  _annClickOutside = (e) => {
    if (activeAnnId.value === null) return;
    const popup = document.querySelector(".ann-popup");
    if (popup && popup.contains(e.target)) return;
    if (e.target.closest(".ann-dot-marker")) return;
    activeAnnId.value = null;
  };
  document.addEventListener("mousedown", _annClickOutside);
});

// ── 儲存 ─────────────────────────────────────────────────────────
const saveArticle = async (silent = false) => {
  if (!form.value.id) {
    if (!silent) alert("文章 ID 是必填項目！");
    return;
  }
  let seoParsed = {};
  try {
    seoParsed = JSON.parse(seoJson.value);
  } catch {
    if (!silent) alert("SEO JSON 格式錯誤，請檢查");
    return;
  }
  loading.value = true;
  autoSaveStatus.value = "saving";
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
    proofread_annotations: proofreadAnnotations.value,
    proofread_status: proofreadStatus.value,
    updated_at: new Date().toISOString(),
  };
  delete payload.media_assets;

  const { error } = await supabase
    .from("articles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    autoSaveStatus.value = "error";
    if (!silent) alert("儲存失敗！\n" + error.message);
  } else {
    autoSaveStatus.value = "saved";
    isEditMode.value = true;
    if (!silent) {
      setTimeout(() => { autoSaveStatus.value = "idle"; }, 3000);
    }
  }
  loading.value = false;
};

const markDraftDone = async () => {
  proofreadStatus.value = "pending";
  await saveArticle(false);
};

// ── 自動儲存（debounce 2s）────────────────────────────────────────
watch(
  [form, seoJson],
  () => {
    if (!isEditMode.value || !form.value.id) return;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      await saveArticle(true);
      setTimeout(() => { autoSaveStatus.value = "idle"; }, 3000);
    }, 2000);
  },
  { deep: true },
);

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

    let html = result.value.replace(
      /<img\b[^>]*\bsrc="data:[^"]*"[^>]*/gi,
      () => {
        imageCounter++;
        return `<img src="[[圖片${imageCounter}]]" alt=""`;
      },
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const newFootnotes = [];

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

    doc.querySelectorAll("p").forEach((p) => {
      const m = p.textContent.trim().match(/^\[\^(\d+)\][：:]\s*(.*)/);
      if (m) {
        newFootnotes.push({ id: parseInt(m[1]), text: m[2] });
        p.remove();
      }
    });

    doc.querySelectorAll("p").forEach((p) => {
      const inner = p.innerHTML.trim();
      if (/^<strong>[^<]*<\/strong>$/.test(inner) && p.textContent.length <= 40) {
        const h2 = doc.createElement("h2");
        h2.textContent = p.textContent;
        p.replaceWith(h2);
      }
    });

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
  const placeholder = `[[圖片${sortOrder}]]`;
  const editorInst = editor.value;
  if (!editorInst) return;

  if (style === "theme") {
    editorInst.commands.insertContent(`<div class="theme-image"><img src="${placeholder}" alt="主題圖片說明"></div>`);
    return;
  }
  if (style === "person") {
    editorInst.commands.insertContent(`<figure class="img-right px-300"><img src="${placeholder}" alt="受訪者姓名" style="border: 1px solid #000; outline: 4.5px solid #000; outline-offset: 1px;"></figure>`);
    return;
  }

  const figureClassMap = {
    left: "img-left px-300",
    center: "img-bottom px-600",
    right: "img-right px-300",
  };
  const newClass = figureClassMap[style];

  // 先在 editor 中找有沒有已包含這張圖的 rawBlock
  if (editorInst) {
    let foundPos = null;
    let foundNode = null;
    editorInst.state.doc.descendants((node, pos) => {
      if (
        node.type.name === "rawBlock" &&
        node.attrs.html.includes(placeholder)
      ) {
        foundPos = pos;
        foundNode = node;
        return false;
      }
    });

    if (foundNode !== null && foundPos !== null) {
      // 找到現有 figure → 只改 class，不插入新塊
      const newHtml = foundNode.attrs.html.replace(
        /(<figure\s+class=")[^"]*(")/,
        `$1${newClass}$2`,
      );
      editorInst
        .chain()
        .command(({ tr }) => {
          tr.setNodeMarkup(foundPos, undefined, { html: newHtml });
          return true;
        })
        .run();
      form.value.content = cleanHTML(editorInst.getHTML());
      return;
    }
  }

  // 找不到 → 在游標位置插入新 figure
  const templates = {
    left: `<figure class="img-left px-300"><img src="${placeholder}" alt="描述"><figcaption>圖片說明</figcaption></figure>`,
    center: `<figure class="img-bottom px-600"><img src="${placeholder}" alt="描述"><figcaption>圖片說明文字</figcaption></figure>`,
    right: `<figure class="img-right px-300"><img src="${placeholder}" alt="描述"><figcaption>圖片說明</figcaption></figure>`,
  };
  editorInst?.commands.insertContent(templates[style]);
};

// ── 圖片排序（上移/下移，交換 sort_order）───────────────────────
const mediaAssetsLoading = ref(false);

const moveMediaAsset = async (index, direction) => {
  const assets = [...(form.value.media_assets || [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= assets.length) return;

  const a = assets[index];
  const b = assets[swapIndex];
  const tmp = a.sort_order;
  a.sort_order = b.sort_order;
  b.sort_order = tmp;

  mediaAssetsLoading.value = true;
  const res = await fetch("/api/media-assets", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      updates: [
        { id: a.id, sort_order: a.sort_order },
        { id: b.id, sort_order: b.sort_order },
      ],
    }),
  });
  const data = await res.json();
  if (!data.success) alert("排序更新失敗：" + data.error);
  else form.value.media_assets = assets;
  mediaAssetsLoading.value = false;
};

// ── 圖片手動指定序號（整批重排）─────────────────────────────────
const reorderMediaAsset = async (img, newOrder) => {
  const assets = [...(form.value.media_assets || [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const clamped = Math.max(1, Math.min(Math.round(newOrder), assets.length));
  const fromIdx = assets.findIndex((a) => a.id === img.id);
  if (fromIdx === -1 || fromIdx === clamped - 1) return;

  const [item] = assets.splice(fromIdx, 1);
  assets.splice(clamped - 1, 0, item);
  assets.forEach((a, i) => { a.sort_order = i + 1; });

  mediaAssetsLoading.value = true;
  const res = await fetch("/api/media-assets", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      updates: assets.map((a) => ({ id: a.id, sort_order: a.sort_order })),
    }),
  });
  const data = await res.json();
  if (!data.success) alert("排序更新失敗：" + data.error);
  else form.value.media_assets = assets;
  mediaAssetsLoading.value = false;
};

// ── 新增圖片（支援多選）────────────────────────────────────────
const handleMediaUpload = async (event) => {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  if (!form.value.id) {
    alert("請先儲存文章後再上傳圖片");
    event.target.value = "";
    return;
  }

  const issue = form.value.issue;
  const idMatch = form.value.id.match(/^(\d+)-(\d+)/);
  const seq = idMatch ? `${idMatch[1]}-${idMatch[2]}` : form.value.id;
  const folder = `images/articles/issue-${issue}`;
  const maxOrder = Math.max(
    0,
    ...(form.value.media_assets || []).map((a) => a.sort_order),
  );

  mediaAssetsLoading.value = true;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const nextOrder = maxOrder + i + 1;
    const filename = `${seq}-${nextOrder}`;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", folder);
    fd.append("filename", filename);

    const uploadRes = await fetch("/api/media", { method: "POST", body: fd });
    const uploadData = await uploadRes.json();
    if (!uploadData.success) {
      alert(`圖片 ${file.name} 上傳失敗：${uploadData.error}`);
      continue;
    }

    const assetRes = await fetch("/api/media-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issue_id: issue,
        article_id: form.value.id,
        cloudinary_id: uploadData.data.public_id,
        image_url: uploadData.data.secure_url,
        sort_order: nextOrder,
      }),
    });
    const assetData = await assetRes.json();
    if (assetData.success) {
      form.value.media_assets = [...(form.value.media_assets || []), assetData.data];
    } else {
      alert(`圖片上傳成功但記錄寫入失敗：${assetData.error}`);
    }
  }
  mediaAssetsLoading.value = false;
  event.target.value = "";
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
  form.value.footnotes.forEach((fn, idx) => { fn.id = idx + 1; });
};

const moveFootnote = (index, direction) => {
  const arr = form.value.footnotes;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= arr.length) return;
  const [item] = arr.splice(index, 1);
  arr.splice(newIndex, 0, item);
  arr.forEach((fn, i) => { fn.id = i + 1; });
};

// ── 校對標記審閱 ─────────────────────────────────────────────────
const annReplaceTexts = ref({});
const annEditorNotes = ref({});

// ── 迷你富文本（腳注欄用）────────────────────────────────────────
const activeMiniField = ref(null);
const savedMiniRange = ref(null);  // 儲存選取範圍，讓格式按鈕點擊後可恢復

const saveMiniRange = () => {
  if (!activeMiniField.value) return;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    savedMiniRange.value = sel.getRangeAt(0).cloneRange();
  }
};

const restoreMiniRange = () => {
  if (!activeMiniField.value || !savedMiniRange.value) return false;
  activeMiniField.value.focus();
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedMiniRange.value);
  return true;
};

const onMiniBlur = (e) => {
  // 點格式按鈕前先存 range，blur 時若目標在工具列內則保留 activeMiniField
  saveMiniRange();
  if (!e.relatedTarget?.closest?.(".mini-format-bar")) {
    activeMiniField.value = null;
  }
};

const applyMiniFormat = (cmd) => {
  if (!restoreMiniRange()) return;
  document.execCommand(cmd, false, null);
  activeMiniField.value?.dispatchEvent(new Event("input", { bubbles: true }));
};

const wrapMiniTag = (tag, className = null) => {
  if (!restoreMiniRange()) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  try {
    const el = document.createElement(tag);
    if (className) el.className = className;
    range.surroundContents(el);
  } catch { /* 跨元素選取，靜默失敗 */ }
  activeMiniField.value?.dispatchEvent(new Event("input", { bubbles: true }));
};

const wrapMiniLink = () => {
  if (!savedMiniRange.value || !activeMiniField.value) return;
  const url = prompt("連結 URL：");
  if (!url) return;
  // prompt 會清掉 selection，需要先 restore
  restoreMiniRange();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  try {
    const el = document.createElement("a");
    el.href = url;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    range.surroundContents(el);
  } catch { /* 跨元素選取，靜默失敗 */ }
  activeMiniField.value?.dispatchEvent(new Event("input", { bubbles: true }));
};

const activeAnn = computed(() =>
  proofreadAnnotations.value.find((a) => a.id === activeAnnId.value) || null,
);

const annPopupStyle = computed(() => {
  if (!import.meta.client) return {};
  const { x, y } = annPopupPos.value;
  const W = 320;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x + 14;
  let top = y - 10;
  if (left + W > vw - 10) left = x - W - 14;
  if (left < 10) left = 10;
  if (top + 360 > vh - 10) top = vh - 370;
  if (top < 10) top = 10;
  return { left: left + "px", top: top + "px" };
});

const unresolvedAnnotations = computed(() =>
  proofreadAnnotations.value.filter((a) => !a.resolved),
);


const applyReplacement = (ann) => {
  const replaceWith = annReplaceTexts.value[ann.id] || "";
  if (!replaceWith.trim()) {
    alert("請輸入替換文字");
    return;
  }
  const selectedText = ann.selectedText;
  const currentHtml = form.value.content;
  if (currentHtml.includes(selectedText)) {
    const newHtml = currentHtml.replace(selectedText, replaceWith);
    editor.value?.commands.setContent(newHtml);
    form.value.content = newHtml;
    // 自動標記為已解決
    const idx = proofreadAnnotations.value.findIndex((a) => a.id === ann.id);
    if (idx !== -1) {
      proofreadAnnotations.value[idx] = {
        ...proofreadAnnotations.value[idx],
        resolved: true,
        editorNote: annEditorNotes.value[ann.id] || `已替換為：${replaceWith}`,
        editorAction: "adopted",
      };
    }
    activeAnnId.value = null;
  } else {
    alert("找不到標記的原文，可能內文已被修改，請手動更改。");
  }
};

const resolveAnnotation = async (ann) => {
  const idx = proofreadAnnotations.value.findIndex((a) => a.id === ann.id);
  if (idx === -1) return;
  proofreadAnnotations.value[idx] = {
    ...proofreadAnnotations.value[idx],
    resolved: true,
    editorNote: annEditorNotes.value[ann.id] || "",
    editorAction: "resolved",
  };
  // 自動儲存 annotations 回資料庫
  await supabase
    .from("articles")
    .update({ proofread_annotations: proofreadAnnotations.value })
    .eq("id", form.value.id);
  activeAnnId.value = null;
};

const unresolveAnnotation = async (id) => {
  const idx = proofreadAnnotations.value.findIndex((a) => a.id === id);
  if (idx === -1) return;
  proofreadAnnotations.value[idx] = {
    ...proofreadAnnotations.value[idx],
    resolved: false,
    editorNote: "",
    editorAction: "none",
  };
  await supabase
    .from("articles")
    .update({ proofread_annotations: proofreadAnnotations.value })
    .eq("id", form.value.id);
};

const colorLabel = (color) => {
  const map = {
    "#ffeb3b": "黃｜一般",
    "#ff9800": "橙｜需重寫",
    "#f44336": "紅｜有錯誤",
    "#4caf50": "綠｜待確認",
    "#2196f3": "藍｜補充",
  };
  return map[color] || "標記";
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
        <button
          v-if="isEditMode && proofreadStatus === 'incomplete'"
          class="btn btn-draft-done"
          :disabled="loading"
          @click="markDraftDone"
        >
          ✏️ 初稿完成
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
        <span class="autosave-status" :class="autoSaveStatus">
          <template v-if="autoSaveStatus === 'saving'">⏳ 儲存中…</template>
          <template v-else-if="autoSaveStatus === 'saved'">✅ 已儲存</template>
          <template v-else-if="autoSaveStatus === 'error'">❌ 儲存失敗</template>
        </span>
        <button class="btn btn-save" @click="saveArticle(false)" :disabled="loading">
          💾 手動儲存
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

    <!-- ── 主體：左側工具列 + 右側內容 ── -->
    <div class="editor-main-row">

      <!-- ── 左側 sticky 工具列 ── -->
      <div v-if="!showSource && editor" class="toolbar-sidebar">
        <div class="tiptap-toolbar" :class="{ 'is-fixed': toolbarIsFixed }">

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
              :class="{ active: editor?.isActive('kaiTi') }"
              @click="editor?.chain().focus().toggleMark('kaiTi').run()"
              title="標楷體 <span class=&quot;kaiti&quot;>"
            >楷</button>
            <button
              type="button"
              class="tool-btn"
              :class="{ active: editor?.isActive('italicI') }"
              @click="editor?.chain().focus().toggleMark('italicI').run()"
              title="斜體 <i>"
            ><i>I</i></button>
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
            <button type="button" class="tool-btn" @click="insertLink" title="插入連結">🔗</button>
            <button type="button" class="tool-btn" @click="removeLink" title="移除連結">✂️</button>
          </div>

          <div class="toolbar-sep"></div>

          <div class="toolbar-group">
            <button
              type="button"
              class="tool-btn"
              @click="editor?.chain().focus().setHorizontalRule().run()"
              title="分隔線"
            >—</button>
            <button
              type="button"
              class="tool-btn"
              @click="insertRaw(`<p class='no-indent'>無縮排文字</p>`)"
              title="去縮排"
            >¶</button>
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

          <div class="toolbar-sep"></div>

          <!-- 插入元件 -->
          <div class="toolbar-section-label">插入：</div>
          <div class="toolbar-insert-col">
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<blockquote><p>引用的內容...</p><div class='rel'>── 出處</div></blockquote>`)">
              💬 一般引言
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<div class='book-quote'>引用的內容...<div class='book-quote-rel'> ──《書名》，頁數 </div></div>`)">
              ✍ 書本引言
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<div class='book-box'><div class='book-info'><strong>書籍資訊</strong><br />《書名》...<br />《作者》...<br />《出版》...</div><div class='book-image'><img src='圖片網址' alt='封面' /></div></div>`)">
              📚 書籍簡介
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<figure class='img-bottom px-600'><img src='圖片網址' alt='圖片說明'><figcaption>圖片說明</figcaption></figure>`)">
              🖼 一般圖片
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<figure class='img-right px-300'><img src='圖片網址' alt='受訪者姓名' style='border: 1px solid #000; outline: 4.5px solid #000; outline-offset: 1px;'></figure>`)">
              👤 受訪者照片
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<div class='theme-image'><img src='圖片網址' alt='主題圖片說明'></div>`)">
              🎨 主題圖片
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw(`<div class='info-card'><div class='info-card-inner'><img src='圖片網址' alt='名稱'><div><h3>名稱</h3><div class='info-card-links'><a href='連結網址' target='_blank'>臉書粉專</a><a href='連結網址' target='_blank'>官方網站</a></div></div></div></div>`)">
              📋 粉專介紹
            </button>
            <button type="button" class="tool-btn comp-btn"
              @click="insertRaw('🌏\uFE0E')">
              🌏 結尾
            </button>
          </div>

          <!-- 文章圖片快速插入 -->
          <template v-if="isEditMode">
            <div class="toolbar-sep"></div>
            <div class="toolbar-section-label media-label-row">
              <span>圖片：</span>
              <label class="media-add-btn" title="新增圖片（可多選）" :class="{ disabled: mediaAssetsLoading }">
                ＋
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style="display:none"
                  :disabled="mediaAssetsLoading"
                  @change="handleMediaUpload"
                />
              </label>
            </div>
            <div class="toolbar-media-col">
              <div v-if="sortedMediaAssets.length === 0" class="media-empty">（尚無圖片）</div>
              <div
                v-for="(img, idx) in sortedMediaAssets"
                :key="img.id ?? img.sort_order"
                class="media-insert-item"
              >
                <img :src="img.image_url" class="media-thumb" :title="`圖片 ${img.sort_order}`" />
                <input
                  type="number"
                  class="media-order-input"
                  :value="img.sort_order"
                  min="1"
                  :max="sortedMediaAssets.length"
                  :disabled="mediaAssetsLoading"
                  @change="reorderMediaAsset(img, +$event.target.value)"
                />
                <div class="media-move-btns">
                  <button
                    type="button"
                    class="tool-btn move-btn"
                    :disabled="idx === 0 || mediaAssetsLoading"
                    @click="moveMediaAsset(idx, -1)"
                    title="上移"
                  >▲</button>
                  <button
                    type="button"
                    class="tool-btn move-btn"
                    :disabled="idx === sortedMediaAssets.length - 1 || mediaAssetsLoading"
                    @click="moveMediaAsset(idx, 1)"
                    title="下移"
                  >▼</button>
                </div>
                <button type="button" class="tool-btn img-btn" @click="insertImageBlock(img.sort_order, 'left')">左</button>
                <button type="button" class="tool-btn img-btn" @click="insertImageBlock(img.sort_order, 'center')">中</button>
                <button type="button" class="tool-btn img-btn" @click="insertImageBlock(img.sort_order, 'right')">右</button>
                <button type="button" class="tool-btn img-btn img-btn-theme" @click="insertImageBlock(img.sort_order, 'theme')" title="插入為主題圖片">主</button>
                <button type="button" class="tool-btn img-btn img-btn-person" @click="insertImageBlock(img.sort_order, 'person')" title="插入為受訪者照片">人</button>
              </div>
            </div>
          </template>

        </div>
      </div>

      <!-- ── 右側：表單 + 編輯器 ── -->
      <div class="editor-content-col">
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
              <label>
                備註 (Remark)
                <button type="button" class="btn-remark-fn" @mousedown.prevent="insertRemarkFootnoteRef" title="插入腳注引用">[^]</button>
              </label>
              <editor-content :editor="remarkEditor" class="remark-tiptap" />
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
                v-if="!showSource"
                type="button"
                class="btn-source btn-reparse"
                @click="reprocessInlineTags"
                title="將內文中以純文字打的 &lt;b&gt;、&lt;i&gt; 等轉為真正的格式"
              >♻ 重解析標記</button>
              <button
                type="button"
                class="btn-source"
                :class="{ active: showSource }"
                @click="toggleSource"
              >
                {{ showSource ? "✏️ 切回編輯" : "🔧 原始碼" }}
              </button>
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

            <!-- 迷你格式工具列（腳注欄用） -->
            <div class="mini-format-bar" v-show="activeMiniField">
              <button type="button" @mousedown.prevent="applyMiniFormat('bold')"><strong>B</strong></button>
              <button type="button" @mousedown.prevent="wrapMiniTag('span', 'kaiti')">楷</button>
              <button type="button" @mousedown.prevent="wrapMiniTag('i')"><i>I</i></button>
              <button type="button" @mousedown.prevent="applyMiniFormat('underline')"><u>U</u></button>
              <button type="button" @mousedown.prevent="wrapMiniLink">🔗</button>
            </div>

            <div v-for="(fn, index) in form.footnotes" :key="fn.id" class="footnote-item">
              <span class="fn-id">[{{ fn.id }}]</span>
              <div
                contenteditable="true"
                class="mini-editor-field"
                @focus="activeMiniField = $event.target"
                @blur="onMiniBlur"
                @mouseup="saveMiniRange"
                @keyup="saveMiniRange"
                @input="fn.text = $event.target.innerHTML"
                v-safe-html="fn.text"
              ></div>
              <div class="fn-move-btns">
                <button class="btn btn-sm" :disabled="index === 0" @click="moveFootnote(index, -1)" title="上移">▲</button>
                <button class="btn btn-sm" :disabled="index === form.footnotes.length - 1" @click="moveFootnote(index, 1)" title="下移">▼</button>
              </div>
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
    </div>
  </div>

  <!-- ── 校對標記浮動對話框 ── -->
  <Teleport to="body">
    <div
      v-if="activeAnn"
      class="ann-popup"
      :style="annPopupStyle"
      @mousedown.stop
    >
      <!-- Header -->
      <div class="ann-popup-header">
        <span class="ann-popup-dot" :style="{ background: activeAnn.color }"></span>
        <span class="ann-popup-para">§{{ activeAnn.paragraphIndex + 1 }}</span>
        <span v-if="activeAnn.resolved" class="ann-popup-resolved-tag">✓ 已解決</span>
        <button class="ann-popup-close" @click="activeAnnId = null">×</button>
      </div>

      <!-- 標記文字 -->
      <div class="ann-popup-selected" :style="{ background: activeAnn.color + '44' }">
        「{{ activeAnn.selectedText }}」
      </div>

      <!-- 校對員備注 -->
      <div v-if="activeAnn.note" class="ann-popup-note">
        <span class="ann-popup-note-label">校對：</span>{{ activeAnn.note }}
      </div>

      <!-- 未解決操作 -->
      <template v-if="!activeAnn.resolved">
        <div class="ann-popup-replace-row">
          <input
            v-model="annReplaceTexts[activeAnn.id]"
            placeholder="替換為..."
            class="ann-popup-input"
          />
          <button class="btn-popup-apply" @click="applyReplacement(activeAnn)">替換</button>
        </div>
        <textarea
          v-model="annEditorNotes[activeAnn.id]"
          placeholder="回覆校對員..."
          class="ann-popup-reply"
          rows="2"
        ></textarea>
        <button class="btn-popup-resolve" @click="resolveAnnotation(activeAnn)">
          ✓ 標記解決
        </button>
      </template>

      <!-- 已解決 -->
      <template v-else>
        <div v-if="activeAnn.editorNote" class="ann-popup-editor-note">
          <span class="ann-popup-note-label">編輯：</span>{{ activeAnn.editorNote }}
        </div>
        <div class="ann-popup-action-row">
          <span v-if="activeAnn.editorAction === 'adopted'" class="ann-action-tag adopted">✅ 已採用</span>
          <span v-else class="ann-action-tag resolved">✓ 已標記解決</span>
          <button class="btn-popup-unresolve" @click="unresolveAnnotation(activeAnn.id)">↩ 重開</button>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.editor-wrapper {
  padding: 12px 16px;
  background: #f9f9f9;
  min-height: 100vh;
  max-width: 1400px;
  margin: 0 auto;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  background: white;
  padding: 12px 20px;
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
.autosave-status {
  font-size: 0.85rem;
  min-width: 80px;
  text-align: right;
  opacity: 0;
  transition: opacity 0.3s;
}
.autosave-status.saving,
.autosave-status.saved,
.autosave-status.error { opacity: 1; }
.autosave-status.error { color: #e74c3c; }
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

.btn-draft-done {
  background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%);
  color: #333;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}
.btn-draft-done:hover:not(:disabled) {
  transform: translateY(-2px);
  opacity: 0.9;
}
.btn-draft-done:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  margin-bottom: 16px;
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

/* ── 主體雙欄佈局 ── */
.editor-main-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* ── 左側工具列 ── */
.toolbar-sidebar {
  width: 200px;
  flex-shrink: 0;
  align-self: flex-start;
}

.tiptap-toolbar {
  width: 100%;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* 預設：正常排版，不超出螢幕底部 */
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  scrollbar-width: none;
}

.tiptap-toolbar::-webkit-scrollbar { display: none; }

/* 捲動後切換成 fixed，AppHeader 已捲走，距頂端 10px */
.tiptap-toolbar.is-fixed {
  position: fixed;
  top: 10px;
  left: calc(250px + 40px + 16px);
  width: 200px;
  max-height: calc(100vh - 20px);
}

.toolbar-group {
  display: flex;
  gap: 3px;
  align-items: center;
  flex-wrap: wrap;
  padding-bottom: 6px;
  border-bottom: 1px solid #e2e4e7;
}

.toolbar-sep {
  height: 0;
  width: 100%;
  margin: 2px 0;
}

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

.img-btn { padding: 2px 5px !important; font-size: 0.72rem !important; }
.img-btn-theme { background: #e8f4f8 !important; color: #0070C0 !important; }
.img-btn-person { background: #fef0e6 !important; color: #cc6600 !important; }

.toolbar-section-label {
  font-size: 0.75rem;
  color: #888;
  font-weight: 600;
  padding: 2px 2px 0;
}

.toolbar-insert-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.toolbar-insert-col .comp-btn {
  width: 100%;
  text-align: left;
  padding: 5px 8px;
}

.toolbar-media-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.media-insert-item {
  display: flex;
  align-items: center;
  gap: 3px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 3px 5px;
}

.media-thumb {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border-radius: 3px;
}

.media-order-input {
  width: 32px;
  font-size: 0.72rem;
  text-align: center;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 1px 2px;
  color: #555;
  appearance: textfield;
  -moz-appearance: textfield;
}
.media-order-input::-webkit-inner-spin-button,
.media-order-input::-webkit-outer-spin-button { opacity: 1; }

.media-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.media-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: #4caf50;
  color: white;
  border-radius: 4px;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.media-add-btn:hover { background: #388e3c; }
.media-add-btn.disabled { background: #aaa; cursor: not-allowed; }

.media-move-btns {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.move-btn {
  font-size: 0.6rem !important;
  padding: 1px 4px !important;
  line-height: 1.2;
  min-width: 18px;
}
.move-btn:disabled { opacity: 0.3; cursor: default; }

.media-empty { font-size: 0.72rem; color: #aaa; padding: 4px 2px; }

/* ── 右側內容欄 ── */
.editor-content-col {
  flex: 1;
  min-width: 0;
}

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

.btn-reparse { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
.btn-reparse:hover { background: #f59e0b; color: white; border-color: #f59e0b; }

/* ── Tiptap 編輯器本體 ── */
.tiptap-editor-container {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: white;
  min-height: 500px;
}

.tiptap-editor {
  padding: 20px 24px;
  max-width: 1080px;
  min-height: 500px;
  outline: none;
}

:deep(.ProseMirror) {
  outline: none;
  min-height: 460px;
  font-family: "Times New Roman", serif;
  font-size: 1.2rem;
  line-height: 1.8;
  color: #444;
}

:deep(.ProseMirror p) {
  text-indent: 2em;
  margin-bottom: 1rem;
}

:deep(.ProseMirror h2) {
  font-size: 1.8rem;
  font-weight: bold;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  line-height: 1.4;
  text-indent: 0;
}

:deep(.ProseMirror h3) {
  font-size: 1.4rem;
  font-weight: bold;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  line-height: 1.4;
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

:deep(.ProseMirror-focused) {
  box-shadow: none;
}

/* ── 校對標記小點 ── */
:deep(.ann-dot-marker) {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  cursor: pointer;
  border: 1px solid rgba(0,0,0,0.2);
  vertical-align: super;
  font-size: 0;
  margin-left: 1px;
  transition: transform 0.15s;
  position: relative;
  top: 1px;
}

:deep(.ann-dot-marker:hover) {
  transform: scale(1.5);
}

/* ── RawBlock 外觀 ── */
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

:deep(.raw-block-btn-bar) {
  display: flex;
  gap: 4px;
  margin: 4px 0 0 auto;
  width: fit-content;
}

:deep(.raw-block-edit-btn) {
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

:deep(.raw-block-copy-btn) {
  padding: 3px 10px;
  font-size: 12px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

:deep(.raw-block-copy-btn:hover) {
  background: #4f46e5;
}

:deep(.raw-block-drag-handle) {
  padding: 3px 6px;
  font-size: 14px;
  color: #aaa;
  cursor: grab;
  user-select: none;
  border-radius: 4px;
}
:deep(.raw-block-drag-handle:hover) { color: #555; background: #f0f0f0; }
:deep(.raw-block-drag-handle:active) { cursor: grabbing; }

:deep(.raw-block-delete-btn) {
  padding: 3px 8px;
  font-size: 12px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

:deep(.raw-block-delete-btn:hover) {
  background: #dc2626;
  color: white;
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

:deep(.raw-block-save-btn) { background: #16a34a; color: white; }
:deep(.raw-block-cancel-btn) { background: #9ca3af; color: white; }

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
.fn-move-btns {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fn-move-btns .btn {
  padding: 1px 4px !important;
  font-size: 0.65rem !important;
  line-height: 1.2;
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

.mini-editor-field {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 32px;
  line-height: 1.6;
  outline: none;
  background: #fff;
  word-break: break-word;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.mini-editor-field:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99,102,241,0.15);
}

.mini-format-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}

.mini-format-bar button {
  padding: 3px 9px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f8f9fa;
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1.4;
}

.mini-format-bar button:hover {
  background: #e0e7ff;
  border-color: #6366f1;
}

/* ── 備註 TipTap 編輯器 ── */
.btn-remark-fn {
  margin-left: 6px;
  padding: 1px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f8f9fa;
  cursor: pointer;
  font-size: 0.78rem;
  line-height: 1.4;
  vertical-align: middle;
}

.btn-remark-fn:hover {
  background: #e0e7ff;
  border-color: #6366f1;
}

.remark-tiptap {
  display: block;
  width: 100%;
  box-sizing: border-box;
}

.remark-tiptap :deep(> div) {
  display: block;
  width: 100%;
  box-sizing: border-box;
}

.remark-tiptap :deep(.ProseMirror) {
  width: 100%;
  height: 37px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: inherit;
  line-height: normal;
  color: inherit;
  box-sizing: border-box;
  background: #fff;
  min-height: unset;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  outline: none;
}

.remark-tiptap :deep(.ProseMirror):focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.remark-tiptap :deep(.ProseMirror)::-webkit-scrollbar {
  display: none;
}

.remark-tiptap :deep(.ProseMirror p) {
  margin: 0;
  text-indent: 0;
  white-space: nowrap;
}

/* ── 校對標記審閱面板 ── */
.ann-review-section {
  margin-top: 8px;
  margin-bottom: 18px;
  border: 1px solid #e0e7ff;
  border-radius: 8px;
  overflow: hidden;
}

.ann-review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f0f4ff;
  border-bottom: 1px solid #e0e7ff;
}

.ann-review-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: #3730a3;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ann-count-badge {
  font-size: 0.78rem;
  font-weight: 600;
  background: #fbbf24;
  color: #78350f;
  border-radius: 10px;
  padding: 2px 8px;
}

.ann-count-badge.all_done {
  background: #bbf7d0;
  color: #14532d;
}

.ann-color-legend {
  display: flex;
  gap: 4px;
  align-items: center;
}

.ann-legend-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.15);
}

.ann-list {
  display: flex;
  flex-direction: column;
}

.ann-card {
  border-bottom: 1px solid #e0e7ff;
  transition: background 0.15s;
}

.ann-card:last-child { border-bottom: none; }
.ann-card.resolved { opacity: 0.7; }
.ann-card.active { background: #f8faff; }

.ann-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  cursor: pointer;
  user-select: none;
}

.ann-summary:hover { background: #eef2ff; }

.ann-dot-inline {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.15);
}

.ann-para-tag {
  font-size: 0.75rem;
  color: #6366f1;
  font-weight: 600;
  white-space: nowrap;
  background: #e0e7ff;
  padding: 1px 5px;
  border-radius: 4px;
}

.ann-text-preview {
  font-size: 0.85rem;
  color: #555;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
}

.ann-resolved-badge {
  font-size: 0.75rem;
  color: #16a34a;
  font-weight: 600;
  white-space: nowrap;
}

.ann-expand-icon {
  font-size: 0.7rem;
  color: #aaa;
  margin-left: auto;
}

.ann-body {
  padding: 12px 16px;
  background: #fbfcff;
  border-top: 1px solid #e0e7ff;
}

.ann-info-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.ann-field {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.88rem;
}

.ann-field-label {
  color: #777;
  white-space: nowrap;
  font-weight: 600;
}

.ann-highlighted {
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 0.88rem;
}

.ann-note-text {
  color: #444;
  font-size: 0.88rem;
}

.ann-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ann-action-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #555;
  display: block;
  margin-bottom: 4px;
}

.ann-replace-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ann-replace-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #a5b4fc;
  border-radius: 6px;
  font-size: 0.88rem;
  outline: none;
}

.ann-replace-input:focus { border-color: #6366f1; }

.btn-ann-apply {
  padding: 6px 14px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.btn-ann-apply:hover { background: #4338ca; }

.ann-note-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.88rem;
  resize: vertical;
  box-sizing: border-box;
}

.ann-resolve-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #16a34a;
  cursor: pointer;
}

.ann-resolve-label input { cursor: pointer; }

.ann-resolved-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ann-editor-response {
  font-size: 0.88rem;
  color: #444;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 6px 10px;
}

.ann-action-tag {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
}

.ann-action-tag.adopted { background: #d1fae5; color: #065f46; }

.btn-ann-unresolve {
  padding: 4px 12px;
  background: #f3f4f6;
  color: #555;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.82rem;
  width: fit-content;
}

.btn-ann-unresolve:hover { background: #e5e7eb; }

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

/* ── 校對標記浮動對話框 ── */
.ann-popup {
  position: fixed;
  z-index: 9999;
  width: 320px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1);
  border: 1px solid #e0e7ff;
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 0.88rem;
}

.ann-popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ann-popup-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.15);
}

.ann-popup-para {
  font-size: 0.75rem;
  font-weight: 700;
  color: #6366f1;
  background: #e0e7ff;
  padding: 1px 6px;
  border-radius: 4px;
}

.ann-popup-resolved-tag {
  font-size: 0.75rem;
  font-weight: 700;
  color: #16a34a;
  background: #dcfce7;
  padding: 1px 6px;
  border-radius: 4px;
}

.ann-popup-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 1.2rem;
  line-height: 1;
  color: #aaa;
  cursor: pointer;
  padding: 0 4px;
}
.ann-popup-close:hover { color: #333; }

.ann-popup-selected {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #222;
  line-height: 1.5;
  word-break: break-all;
}

.ann-popup-note {
  font-size: 0.85rem;
  color: #444;
  line-height: 1.5;
}

.ann-popup-note-label {
  font-weight: 700;
  color: #6b7280;
  margin-right: 2px;
}

.ann-popup-replace-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ann-popup-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #a5b4fc;
  border-radius: 6px;
  font-size: 0.85rem;
  outline: none;
  min-width: 0;
}
.ann-popup-input:focus { border-color: #6366f1; }

.btn-popup-apply {
  padding: 6px 12px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.83rem;
  font-weight: 700;
  white-space: nowrap;
}
.btn-popup-apply:hover { background: #4338ca; }

.ann-popup-reply {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.85rem;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
}

.btn-popup-resolve {
  padding: 7px 0;
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 700;
  text-align: center;
}
.btn-popup-resolve:hover { background: #bbf7d0; }

.ann-popup-editor-note {
  font-size: 0.85rem;
  color: #444;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 6px 10px;
  line-height: 1.5;
}

.ann-popup-action-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ann-action-tag.resolved { background: #f0f9ff; color: #0369a1; }

.btn-popup-unresolve {
  margin-left: auto;
  padding: 4px 12px;
  background: #f3f4f6;
  color: #555;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.82rem;
}
.btn-popup-unresolve:hover { background: #e5e7eb; }

.code-font { font-family: "Consolas", "Monaco", monospace; font-size: 0.85rem; }

@media (max-width: 900px) {
  .editor-main-row { flex-direction: column; }
  .toolbar-sidebar {
    width: 100%;
    position: static; /* 手機版回到正常流 */
  }
  .tiptap-toolbar {
    max-height: none;
    flex-direction: row;
    flex-wrap: wrap;
  }
  .toolbar-insert-col, .toolbar-media-col {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .toolbar-sep {
    width: 1px;
    height: 22px;
    margin: 0 3px;
  }
}

@media (max-width: 768px) {
  .form-row { flex-direction: column; }
  .form-group.half,
  .form-group.quarter,
  .form-group.third { flex: none; width: 100%; }
  .editor-header { flex-direction: column; gap: 12px; align-items: flex-start; }
  .actions { flex-wrap: wrap; }
}
</style>
