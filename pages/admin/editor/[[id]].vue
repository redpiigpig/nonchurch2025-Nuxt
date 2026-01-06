<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { marked } from "marked";
import { supabase } from "~/supabase";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({ title: "文章編輯 - 後台管理" });

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const isEditMode = ref(false);
const showPreview = ref(true);
const textareaRef = ref(null);
const previewRef = ref(null);
const issueImages = ref([]);

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
  prev_id: "",
  next_id: "",
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
];

const sections = ["", "特稿專區", "主題廣場", "多元講堂"];

const currentCategoryColor = computed(() => {
  const cat = categories.find((c) => c.name === form.value.category);
  return cat ? cat.color : "#ccc";
});

const fetchIssueImages = async () => {
  if (!form.value.issue) return;
  const path = `articles/issue-${form.value.issue}`;
  const { data, error } = await supabase.storage.from("images").list(path, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });
  if (!error && data) {
    issueImages.value = data;
  }
};

watch(
  () => form.value.issue,
  (newVal) => {
    if (newVal) fetchIssueImages();
  }
);

const previewContent = computed(() => {
  let fullText = form.value.content || "";
  fullText = fullText.replace(/\[\^(\d+)\]/g, (match, id) => {
    return `<sup class="footnote-ref"><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`;
  });
  const formattedContent = fullText.replace(/([^\n])\n([^\n])/g, "$1\n\n$2");
  let parsedHtml = marked.parse(formattedContent, { gfm: true, breaks: true });

  parsedHtml = parsedHtml.replace(/src="([^"]+)"/g, (match, srcValue) => {
    if (
      srcValue.startsWith("http") ||
      srcValue.startsWith("data:") ||
      srcValue.startsWith("//")
    ) {
      return match;
    }
    const matchedFile = issueImages.value.find((file) => {
      const nameWithoutExt =
        file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      return file.name === srcValue || nameWithoutExt === srcValue;
    });
    if (matchedFile) {
      const fullPath = `articles/issue-${form.value.issue}/${matchedFile.name}`;
      const { data } = supabase.storage.from("images").getPublicUrl(fullPath);
      return `src="${data.publicUrl}"`;
    }
    return match;
  });

  if (form.value.footnotes && form.value.footnotes.length > 0) {
    const listItems = form.value.footnotes
      .map((note) => {
        return `<li id="footnote-${note.id}"><p>${note.text}<a href="#footnote-ref-${note.id}" class="footnote-backref">↩</a></p></li>`;
      })
      .join("");
    parsedHtml += `<div class="footnotes"><hr /><ol>${listItems}</ol></div>`;
  }
  return parsedHtml;
});

const activeScrollRegion = ref(null);
const setActiveScroll = (region) => {
  activeScrollRegion.value = region;
};
const handleSyncScroll = (sourceType) => {
  if (activeScrollRegion.value !== sourceType) return;
  const editor = textareaRef.value;
  const preview = previewRef.value;
  if (!editor || !preview) return;
  let source, target;
  if (sourceType === "editor") {
    source = editor;
    target = preview;
  } else {
    source = preview;
    target = editor;
  }
  const percentage =
    source.scrollTop / (source.scrollHeight - source.clientHeight);
  target.scrollTop = percentage * (target.scrollHeight - target.clientHeight);
};

onMounted(async () => {
  if (route.params.id) {
    isEditMode.value = true;
    await loadArticle(route.params.id);
  } else if (route.query.issue) {
    form.value.issue = parseInt(route.query.issue);
    if (route.query.issueTitle) form.value.issue_title = route.query.issueTitle;
  }
  fetchIssueImages();
});

const loadArticle = async (id) => {
  loading.value = true;
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    alert("讀取失敗");
  } else {
    form.value = { ...data };
    if (!form.value.section) form.value.section = "";
    if (data.prev_article) form.value.prev_id = data.prev_article.id;
    if (data.next_article) form.value.next_id = data.next_article.id;
    if (!form.value.footnotes) form.value.footnotes = [];
    if (!form.value.summary) form.value.summary = "";
    if (data.seo) seoJson.value = JSON.stringify(data.seo, null, 2);
  }
  loading.value = false;
};

const resolveNeighbor = async (idInput) => {
  if (!idInput || !idInput.trim()) return null;
  const { data } = await supabase
    .from("articles")
    .select("title")
    .eq("id", idInput)
    .single();
  if (data) return { id: idInput, title: data.title };
  const titleGuess = idInput.replace(/^\d+-\d+/, "");
  return { id: idInput, title: titleGuess || idInput };
};

const handlePreview = () => {
  const previewData = {
    ...form.value,
    authorTitle: form.value.author_title,
    issueTitle: form.value.issue_title,
    prev: form.value.prev_id
      ? { id: form.value.prev_id, title: "預覽中..." }
      : null,
    next: form.value.next_id
      ? { id: form.value.next_id, title: "預覽中..." }
      : null,
  };
  localStorage.setItem("preview_article", JSON.stringify(previewData));
  const routeData = router.resolve({ name: "article-preview" });
  window.open(routeData.href, "_blank");
};

const saveArticle = async () => {
  if (!form.value.id || !form.value.title) return alert("ID 和標題必填！");
  loading.value = true;
  try {
    const prevObj = await resolveNeighbor(form.value.prev_id);
    const nextObj = await resolveNeighbor(form.value.next_id);
    const payload = {
      ...form.value,
      prev_article: prevObj,
      next_article: nextObj,
      seo: JSON.parse(seoJson.value),
      updated_at: new Date(),
    };
    delete payload.prev_id;
    delete payload.next_id;
    const { error } = await supabase.from("articles").upsert(payload);
    if (error) throw error;
    alert("儲存成功！🎉");
    router.push(`/articles/${form.value.id}`);
  } catch (err) {
    alert("儲存失敗：" + err.message);
  } finally {
    loading.value = false;
  }
};

const addFootnote = () => {
  const nextId = form.value.footnotes.length + 1;
  form.value.footnotes.push({ id: nextId, text: "" });
};
const removeFootnote = (index) => {
  form.value.footnotes.splice(index, 1);
  reindexFootnotes();
};
const updateFootnoteOrder = (currentIndex, event) => {
  const newId = parseInt(event.target.value);
  if (isNaN(newId) || newId < 1) {
    event.target.value = currentIndex + 1;
    return;
  }
  let newIndex = newId - 1;
  if (newIndex >= form.value.footnotes.length)
    newIndex = form.value.footnotes.length - 1;
  if (newIndex === currentIndex) return;
  const item = form.value.footnotes.splice(currentIndex, 1)[0];
  form.value.footnotes.splice(newIndex, 0, item);
  reindexFootnotes();
};
const reindexFootnotes = () => {
  form.value.footnotes.forEach((note, idx) => {
    note.id = idx + 1;
  });
};

const insertOrWrap = async (
  prefix,
  suffix,
  defaultText = "文字",
  togglePrefix = null,
  toggleSuffix = null
) => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const originalText = form.value.content;
  const selectedText = originalText.substring(start, end);
  const checkPrefix = togglePrefix || prefix;
  const checkSuffix = toggleSuffix || suffix;
  let newText = "",
    newSelectionStart = 0,
    newSelectionEnd = 0;
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
  { label: "標楷體", action: () => insertOrWrap("*", "*", "標楷體文字") },
  { label: "註釋號碼", action: () => insertOrWrap("[^", "]", "1") },
  {
    label: "一般引言",
    action: () =>
      insertOrWrap(
        "<blockquote>\n",
        '\n<div class="rel">── 出處</div>\n</blockquote>\n',
        "引用的內文..."
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
    action: () =>
      insertOrWrap(
        '<span style="display: block; text-align: right;">',
        "</span>",
        "請在此輸入置右文字"
      ),
  },
  {
    label: "小字體",
    action: () =>
      insertOrWrap(
        '<span style="font-size: 1rem; font-family: serif;">',
        "</span>",
        "請在此輸入小字體文字"
      ),
  },
];

const components = [
  {
    label: "📚 書籍簡介",
    action: () =>
      insertBlock(
        `\n\n<div class="book-box"><div class="book-info"><strong>書籍資訊</strong><br />【書名】...<br />【作者】...<br />【出版】...</div><div class="book-image"><img src="檔名" alt="封面" /></div></div>\n\n`
      ),
  },
  {
    label: "❝ 書本引言",
    action: () =>
      insertBlock(
        `\n\n<div class="book-quote">引用的內文...<div class="book-quote-rel"> ──《書名》，頁數 </div></div>\n\n`
      ),
  },
  {
    label: "🖼️ 主題圖片",
    action: () =>
      insertBlock(
        `\n\n<div class="theme-image"><img src="檔名" alt="主題圖片"></div>\n\n`
      ),
  },
  {
    label: "🖼️ 圖片(左)",
    action: () =>
      insertBlock(
        `\n\n<figure class="img-left px-300"><img src="檔名" alt="描述"><figcaption>圖片說明</figcaption></figure>\n\n`
      ),
  },
  {
    label: "🖼️ 圖片(中)",
    action: () =>
      insertBlock(
        `\n\n<figure class="img-bottom px-600"><img src="檔名" alt="描述"><figcaption>圖片說明文字</figcaption></figure>\n\n`
      ),
  },
  {
    label: "🖼️ 圖片(右)",
    action: () =>
      insertBlock(
        `\n\n<figure class="img-right px-300"><img src="檔名" alt="描述"><figcaption>圖片說明</figcaption></figure>\n\n`
      ),
  },
  {
    label: "👤 作者簡介",
    action: () =>
      insertBlock(
        `\n\n<div class="author-profile"><img src="檔名" alt="作者頭像"><div><h3>作者名稱</h3><p>作者簡介內容...</p></div></div>\n\n`
      ),
  },
  {
    label: "ℹ️ 資訊卡片",
    action: () =>
      insertBlock(
        `\n\n<div class="info-card"><div class="info-card-inner"><img src="Logo檔名" alt="Logo"><div><h3>標題</h3><div class="info-card-links"><a href="#" target="_blank">連結1</a></div></div></div></div>\n\n`
      ),
  },
  {
    label: "📜 參考資料",
    action: () => {
      let numRows = prompt("請輸入列數", "2");
      numRows = parseInt(numRows) || 2;
      let listItems = "";
      for (let i = 1; i <= numRows; i++)
        listItems += `<div style="text-indent: -1.5rem; padding-left: 1.5rem; margin-bottom: 1rem; line-height: 1.8;">•&nbsp;&nbsp;資料來源${i}...</div>`;
      insertBlock(
        `\n\n<div class="reference-box"><strong>參考資料</strong><div style="margin-top: 1rem; margin-bottom: 1rem;">${listItems}</div></div>\n\n`
      );
    },
  },
  {
    label: "📊 表格",
    action: () =>
      insertBlock(
        `\n\n<table class="data-table">\n<thead><tr><th>標題1</th><th>標題2</th></tr></thead>\n<tbody><tr><td>內容 1-1</td><td>內容 1-2</td></tr></tbody>\n</table>\n\n`
      ),
  },
];
</script>

<template>
  <div class="editor-layout">
    <header class="editor-header">
      <div class="header-left">
        <button class="btn-back" @click="router.back()">← 返回</button>
        <h2>{{ isEditMode ? "編輯文章" : "撰寫新文章" }}</h2>
      </div>
      <div class="header-right">
        <button class="btn-preview-page" @click="handlePreview">
          📑 預覽頁面
        </button>
        <button class="btn-save" @click="saveArticle" :disabled="loading">
          {{ loading ? "處理中..." : "💾 儲存文章" }}
        </button>
      </div>
    </header>

    <div class="editor-content">
      <section class="editor-card collapsed-group">
        <div class="card-header-wrapper">
          <div class="card-title">基本資料設定</div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group full-width">
              <div style="display: flex; gap: 15px">
                <div style="flex: 2">
                  <label>文章 ID</label
                  ><input
                    v-model="form.id"
                    :disabled="isEditMode"
                    class="input-field"
                    placeholder="例如: 5-14文章標題"
                  />
                </div>
                <div style="flex: 1; position: relative">
                  <label>文章分類</label>
                  <div class="select-wrapper">
                    <div
                      class="color-dot"
                      :style="{ backgroundColor: currentCategoryColor }"
                    ></div>
                    <select
                      v-model="form.category"
                      class="input-field select-field"
                    >
                      <option value="">（無分類）</option>
                      <option
                        v-for="cat in categories"
                        :key="cat.name"
                        :value="cat.name"
                      >
                        {{ cat.name }}
                      </option>
                    </select>
                  </div>
                </div>
                <div style="flex: 1">
                  <label>文章區塊 (Section)</label
                  ><select v-model="form.section" class="input-field">
                    <option value="">（無）</option>
                    <option
                      v-for="sec in sections"
                      :key="sec"
                      :value="sec"
                      v-show="sec !== ''"
                    >
                      {{ sec }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
            <div class="form-group full-width">
              <label>主標題</label
              ><input v-model="form.title" class="input-field title-input" />
            </div>
            <div class="form-group full-width">
              <label>副標題</label
              ><input v-model="form.subtitle" class="input-field" />
            </div>
            <div class="form-group full-width">
              <div style="display: flex; gap: 20px; align-items: flex-end">
                <div style="flex: 0 0 100px">
                  <label>期數</label
                  ><input
                    v-model="form.issue"
                    type="number"
                    class="input-field"
                  />
                </div>
                <div style="flex: 1">
                  <label>期數標題</label
                  ><input v-model="form.issue_title" class="input-field" />
                </div>
              </div>
            </div>
            <div class="form-group full-width">
              <div style="display: flex; gap: 15px">
                <div style="flex: 1">
                  <label>作者</label
                  ><input v-model="form.author" class="input-field" />
                </div>
                <div style="flex: 1">
                  <label>職稱 (Title)</label
                  ><input v-model="form.author_title" class="input-field" />
                </div>
                <div style="flex: 1">
                  <label>備註 (Remark)</label
                  ><input v-model="form.remark" class="input-field" />
                </div>
              </div>
            </div>
            <div class="form-group full-width">
              <label>關鍵字</label
              ><input
                v-model="form.keyword"
                class="input-field"
                placeholder="**🌿 關鍵字**：..."
              />
            </div>
            <div class="form-group full-width">
              <label>文章簡介 (Summary)</label
              ><textarea
                v-model="form.summary"
                class="summary-textarea"
                placeholder="請輸入吸引人的文章摘要..."
              ></textarea>
            </div>
            <div class="form-group">
              <label>上一篇文章 ID (Prev)</label
              ><input
                v-model="form.prev_id"
                class="input-field"
                placeholder="輸入 ID 例如: 5-12權力..."
              />
            </div>
            <div class="form-group">
              <label>下一篇文章 ID (Next)</label
              ><input
                v-model="form.next_id"
                class="input-field"
                placeholder="輸入 ID 例如: 5-14未來..."
              />
            </div>
          </div>
        </div>
      </section>

      <section class="editor-card full-editor-card">
        <div class="card-header-wrapper">
          <div class="card-title-row">
            <span class="card-title-text">文章內文 (Markdown)</span>
            <button
              class="btn-preview-inline"
              @click="showPreview = !showPreview"
            >
              {{ showPreview ? "👁️ 關閉預覽" : "👁️ 開啟預覽" }}
            </button>
          </div>
        </div>
        <div class="toolbar">
          <div class="toolbar-group">
            <button
              v-for="tool in tools"
              :key="tool.label"
              @click="tool.action"
              class="tool-btn"
            >
              {{ tool.label }}
            </button>
          </div>
          <div class="toolbar-divider"></div>
          <div class="toolbar-group">
            <span class="group-label">插入組件：</span>
            <button
              v-for="comp in components"
              :key="comp.label"
              @click="comp.action"
              class="tool-btn comp-btn"
            >
              {{ comp.label }}
            </button>
          </div>
        </div>
        <div
          class="editor-split-view"
          :class="{ 'preview-active': showPreview }"
        >
          <div class="editor-pane">
            <textarea
              ref="textareaRef"
              v-model="form.content"
              class="markdown-textarea main-editor"
              placeholder="預設文章內容會自動縮排兩字..."
              @mouseenter="setActiveScroll('editor')"
              @touchstart="setActiveScroll('editor')"
              @scroll="handleSyncScroll('editor')"
            ></textarea>
          </div>
          <div
            v-if="showPreview"
            class="preview-pane"
            ref="previewRef"
            @mouseenter="setActiveScroll('preview')"
            @touchstart="setActiveScroll('preview')"
            @scroll="handleSyncScroll('preview')"
          >
            <div class="preview-header">即時預覽</div>
            <div class="markdown-body" v-html="previewContent"></div>
          </div>
        </div>
      </section>

      <section class="editor-card">
        <div class="card-header-wrapper">
          <div class="card-title">
            註釋管理
            <button @click="addFootnote" class="btn-mini-add">+ 新增</button>
          </div>
        </div>
        <div class="card-body">
          <div class="footnotes-list">
            <div
              v-for="(note, index) in form.footnotes"
              :key="index"
              class="footnote-row"
            >
              <input
                type="number"
                class="note-number-input"
                :value="note.id"
                @change="(e) => updateFootnoteOrder(index, e)"
              />
              <input v-model="note.text" class="input-field note-input" />
              <button
                @click="removeFootnote(index)"
                class="btn-icon-del"
                title="刪除"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="editor-card collapsed-group">
        <div class="card-header-wrapper">
          <div class="card-title">SEO 設定</div>
        </div>
        <div class="card-body">
          <textarea v-model="seoJson" class="json-textarea"></textarea>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* 請保留原本 EditorView.vue 的所有 CSS */
input,
textarea,
select {
  box-sizing: border-box;
  max-width: 100%;
}
.editor-layout {
  background-color: #f4f6f8;
  min-height: 100vh;
  padding-bottom: 60px;
  width: 1200px;
  overflow-x: hidden;
}
.editor-header {
  position: sticky;
  top: 0px;
  z-index: 90;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(5px);
  border-bottom: 1px solid #ddd;
  padding: 10px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
@media (max-width: 768px) {
  .editor-header {
    top: 0;
    padding: 10px 15px;
  }
}
.header-left h2 {
  font-size: 1.2rem;
  margin: 0;
  color: #333;
  margin-left: 15px;
}
.editor-content {
  max-width: 1200px;
  margin: 20px auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
}
.editor-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  border: 1px solid #eaeaea;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
.card-header-wrapper {
  border-bottom: 1px solid #eee;
  padding: 15px 20px;
  background-color: #fafafa;
}
.card-body {
  padding: 20px;
}
.card-title {
  font-size: 1.1rem;
  font-weight: bold;
  color: #2c3e50;
  border-left: 4px solid #007bff;
  padding-left: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
}
.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 4px solid #007bff;
  padding-left: 10px;
}
.card-title-text {
  font-size: 1.1rem;
  font-weight: bold;
  color: #2c3e50;
}
.btn-preview-inline {
  background-color: #f0f7ff;
  color: #007bff;
  border: 1px solid #cce5ff;
  padding: 5px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.btn-preview-inline:hover {
  background-color: #d6eaff;
}
.editor-split-view {
  display: flex;
  height: 700px;
  border: 1px solid #ddd;
  border-top: none;
  overflow: hidden;
}
.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: none;
}
.preview-active .editor-pane {
  border-right: 2px solid #ccc;
}
.main-editor {
  width: 100%;
  height: 100%;
  padding: 20px;
  border: none;
  outline: none;
  resize: none;
  font-family: "Menlo", "Consolas", monospace;
  font-size: 15px;
  line-height: 1.6;
  background-color: #fff;
}
.preview-pane {
  flex: 1;
  background-color: #fff;
  overflow-y: auto;
  padding: 30px;
  position: relative;
}
.preview-header {
  position: absolute;
  top: 0;
  right: 0;
  background: #eee;
  padding: 5px 10px;
  font-size: 0.8rem;
  color: #666;
  border-bottom-left-radius: 5px;
}
.toolbar {
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
  padding: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.toolbar-group {
  display: flex;
  gap: 5px;
  align-items: center;
  flex-wrap: wrap;
}
.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #ccc;
  margin: 0 10px;
}
.group-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: bold;
}
.tool-btn {
  background: white;
  border: 1px solid #ccc;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
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
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  width: 100%;
}
.full-width {
  grid-column: 1 / -1;
}
.form-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: bold;
  color: #555;
  margin-bottom: 5px;
}
.input-field {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.title-input {
  font-size: 1.1rem;
  font-weight: bold;
}
.select-wrapper {
  position: relative;
}
.select-field {
  padding-left: 35px;
}
.color-dot {
  position: absolute;
  left: 10px;
  top: 10px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
}
.json-textarea {
  width: 100%;
  min-height: 300px;
  padding: 15px;
  background-color: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.9rem;
  border: 1px solid #1e293b;
}
.summary-textarea {
  width: 100%;
  min-height: 100px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
  background-color: #fafafa;
}
.summary-textarea:focus {
  outline: none;
  border-color: #007bff;
  background-color: white;
}
.btn-save {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
}
.btn-save:hover {
  background: #218838;
}
.btn-save:disabled {
  background: #ccc;
}
.btn-preview-page {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
  margin-right: 15px;
}
.btn-preview-page:hover {
  background: #138496;
}
.btn-back {
  border: 1px solid #ccc;
  background: transparent;
  padding: 5px 15px;
  border-radius: 15px;
  cursor: pointer;
}
.btn-back:hover {
  background: #f0f0f0;
  color: #333;
}
.footnotes-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.footnote-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.note-number-input {
  width: 50px;
  text-align: center;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-weight: bold;
  background-color: #eee;
}
.note-number-input:focus {
  background-color: white;
  border-color: #007bff;
}
.btn-mini-add {
  background: #e7f1ff;
  border: none;
  color: #007bff;
  padding: 5px 10px;
  border-radius: 15px;
  cursor: pointer;
  font-size: 0.8rem;
  margin-left: 10px;
}
.btn-icon-del {
  border: none;
  background: none;
  color: #ccc;
  cursor: pointer;
  width: 24px;
  height: 24px;
}
.btn-icon-del:hover {
  color: red;
}
@media (max-width: 1024px) {
  .editor-split-view {
    flex-direction: column;
    height: auto;
  }
  .editor-pane {
    height: 500px;
    border-right: none;
    border-bottom: 1px solid #ddd;
  }
  .preview-pane {
    height: 500px;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* 預覽區樣式 (保留原本 CSS) */
.preview-pane .markdown-body {
  font-family: "Times New Roman", serif;
  font-size: 1.2rem;
  line-height: 1.8;
  color: #333;
  text-align: justify;
}
.preview-pane .markdown-body p {
  margin-bottom: 1rem;
  text-indent: 2em;
}
.preview-pane .markdown-body .no-indent {
  text-indent: 0 !important;
}
.preview-pane .markdown-body strong {
  font-weight: bold;
}
.preview-pane .markdown-body a {
  color: #007bff;
  text-decoration: none;
}
.preview-pane .markdown-body a:hover {
  color: #0056b3;
  text-decoration: underline;
}
.preview-pane .markdown-body h2 {
  font-size: 1.8rem;
  margin-top: 2.5rem;
  border-bottom: none;
  font-weight: bold;
  color: #333;
}
.preview-pane .markdown-body h3 {
  font-size: 1.4rem;
  margin-top: 2rem;
  font-weight: bold;
  color: #333;
}
.preview-pane .markdown-body img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 30px auto;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}
.preview-pane .book-box {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin: 30px 2em;
  padding: 20px 30px;
  background-color: #f9f9f9;
  border-left: 5px solid #378b13;
  border-radius: 5px;
}
.preview-pane .book-info {
  flex: 2;
  font-family: "Times New Roman", serif;
}
.preview-pane .book-image {
  flex: 1;
  text-align: center;
}
.preview-pane .book-image img {
  margin: 0;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  width: 100%;
}
.preview-pane .book-quote {
  background-color: rgba(0, 0, 0, 0.03);
  border-left: 5px solid #8b4513;
  margin: 30px 2em 60px 2em;
  padding: 20px 30px;
  font-family: "Times New Roman", serif;
  font-size: 1.2rem;
  font-weight: bold;
  color: #444;
}
.preview-pane .book-quote-rel {
  display: block;
  text-align: right;
  font-size: 1.2rem;
  margin-top: 1.5rem;
  color: #444;
  font-weight: bold;
  font-style: normal;
}
.preview-pane .info-card {
  background-color: #f5faff;
  border: 1px solid #ddd;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  padding: 20px;
  float: right;
  width: 320px;
  margin: 10px 0 20px 30px;
}
.preview-pane .info-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  text-align: center;
}
.preview-pane .info-card img {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #eee;
}
.preview-pane .info-card h3 {
  font-size: 1.5rem;
  margin: 0;
  color: #333;
}
.preview-pane .info-card-links a {
  display: inline-block;
  padding: 5px 12px;
  background: #f5f5f5;
  color: #555;
  border-radius: 20px;
  font-size: 0.9rem;
}
.preview-pane .reference-box {
  background-color: #f9f9f9;
  border-left: 5px solid #378b13;
  border-radius: 5px;
  margin: 30px 2em;
  padding: 20px 30px;
  font-family: "Times New Roman", serif;
}
.preview-pane .reference-box strong {
  display: block;
  font-size: 1.25rem;
  margin-bottom: 15px;
  color: #000;
  font-weight: bold;
}
.preview-pane .footnotes {
  margin-top: 60px;
  padding-top: 20px;
  border-top: 2px solid #444;
  font-size: 1rem;
  color: #666;
}
.preview-pane .footnotes ol {
  padding-left: 0;
  margin-left: -1rem;
  list-style: none;
  counter-reset: footnote-counter;
}
.preview-pane .footnotes li {
  display: flex;
  align-items: baseline;
  counter-increment: footnote-counter;
  margin-bottom: 5px;
}
.preview-pane .footnotes li::before {
  content: counter(footnote-counter);
  display: inline-block;
  width: 2em;
  flex-shrink: 0;
  color: #007bff;
  text-align: right;
  margin-right: 10px;
  cursor: pointer;
}
.preview-pane .footnotes li p {
  margin: 0;
  text-indent: 0 !important;
  flex-grow: 1;
  text-align: justify;
}
.preview-pane .footnotes .footnote-backref {
  text-decoration: none;
  border: none;
  color: #007bff;
  margin-left: 5px;
  font-family: sans-serif;
}
.preview-pane .footnote-ref a {
  color: #007bff !important;
  text-decoration: none;
  font-weight: normal;
}
.preview-pane .custom-divider {
  width: 100%;
  height: 2px;
  background: #ccc;
  margin: 40px auto;
}
@media (max-width: 768px) {
  .preview-pane .book-box {
    flex-direction: column;
    text-align: left;
    padding: 15px;
    margin: 20px 0;
  }
  .preview-pane .info-card {
    float: none;
    width: 100%;
    margin: 20px auto;
  }
}
</style>
