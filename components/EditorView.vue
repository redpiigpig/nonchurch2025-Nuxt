<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { marked } from "marked";
import { supabase } from "~/supabase";

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
  { name: "文獻與翻譯", color: "#6c3535" },
];

const categoryColor = computed(() => {
  const cat = categories.find((c) => c.name === form.value.category);
  return cat ? cat.color : "#444";
});

const isPublished = ref(false);

const loadArticle = async (id) => {
  loading.value = true;
  const { data, error } = await supabase
    .from("articles")
    .select("*")
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
      issue_title: data.issue_title || "",
      category: data.category || "",
      section: data.section || "",
      author: data.author || "",
      author_title: data.author_title || "",
      remark: data.remark || "",
      summary: data.summary || "",
      content: data.content || "",
      keyword: data.keyword || "",
      footnotes: data.footnotes || [],
      prev_id: data.prev_id || "",
      next_id: data.next_id || "",
    };

    seoJson.value = data.seo ? JSON.stringify(data.seo, null, 2) : "{\n}";
    isPublished.value = data.is_published || false;
  }
  loading.value = false;
};

onMounted(() => {
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
  return marked.parse(form.value.keyword);
});

const contentHtml = computed(() => {
  return generateFootnotesHtml(form.value.content, form.value.footnotes);
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
      keyword: form.value.keyword,
      content: form.value.content,
      footnotes: form.value.footnotes,
      issue: form.value.issue,
      issue_title: form.value.issue_title,
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
      originalText.substring(0, start) + prefix + selectedText + suffix + originalText.substring(end);
    newSelectionStart = start + prefix.length;
    newSelectionEnd = newSelectionStart + selectedText.length;
  } else {
    newText =
      originalText.substring(0, start) + prefix + defaultText + suffix + originalText.substring(end);
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
  const newText = originalText.substring(0, start) + template + originalText.substring(end);
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
  { label: "去除縮排", action: () => insertOrWrap('<p class="no-indent">', "</p>", "無縮排文字") },
  { label: "分隔線", action: () => insertBlock('\n<div class="custom-divider"></div>\n') },
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
      insertBlock(`\n\n<div class="theme-image"><img src="圖片網址" alt="主題圖片"></div>\n\n`),
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
      insertBlock(`\n\n<div class="reference-box"><strong>參考資料</strong><div style="margin-top: 1rem; margin-bottom: 1rem;">${listItems}</div></div>\n\n`);
    },
  },
  {
    label: "📊 表格",
    action: () => {
      let sizeInput = prompt("表格尺寸 (欄x列)", "2x5");
      let cols = 2, rows = 5;
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
        <!-- ✅ 下載 Word 按鈕（只在編輯模式顯示） -->
        <button
          v-if="isEditMode"
          class="btn btn-download"
          @click="exportToWord"
          :disabled="loading"
          title="下載為專業排版 Word 檔案"
        >
          📥 下載 Word
        </button>

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

        <div class="form-row">
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

        <div class="form-group">
          <label>文章摘要 (Summary / Description)</label>
          <textarea v-model="form.summary" rows="3"></textarea>
        </div>

        <div class="form-group">
          <label>關鍵字 (Markdown)</label>
          <textarea v-model="form.keyword" rows="2"></textarea>
        </div>

        <div class="form-group">
          <label>內文 (Markdown)</label>
          <div class="toolbar">
            <div class="toolbar-group">
              <button v-for="tool in tools" :key="tool.label" @click="tool.action" class="tool-btn" type="button">
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

        <div class="form-group">
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
          <div class="markdown-body" v-html="contentHtml"></div>
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
  position: absolute;
  right: 0;
  color: white;
  font-weight: bold;
  font-size: 1.6rem;
  border-radius: 4px;
  padding: 5px 15px;
  margin-top: -3rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.main-title {
  font-family: "Times New Roman", serif;
  font-size: 2.5rem;
  font-weight: bold;
  color: #444;
  text-align: left;
  margin-top: 40px;
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
</style>
