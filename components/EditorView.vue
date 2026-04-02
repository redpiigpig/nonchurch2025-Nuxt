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
    <div class="editor-header">
      <h2>📝 文章編輯器</h2>
      <div class="actions">
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

/* 預覽區樣式 (沿用前台樣式) */
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
  font-size: 1.2rem;
  border-radius: 4px;
  padding: 5px 15px;
}
.main-title {
  font-size: 2rem;
  font-weight: bold;
  margin-top: 40px;
  padding-left: 2rem;
}
.sub-title {
  font-size: 1.5rem;
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
}
.author-name {
  font-size: 1.2rem;
}
.author-title,
.author-remark {
  display: block;
  font-size: 1rem;
  margin-top: 4px;
}
.keyword-section {
  background-color: #f7f7f7;
  padding: 15px;
  border-left: 4px solid #666;
  margin-bottom: 40px;
}
.keyword-section :deep(p) {
  margin: 0;
  font-size: 1.1rem;
}

/* Markdown 預覽區樣式 */
.preview-pane .markdown-body {
  font-size: 1.25rem;
  text-align: justify;
}
.preview-pane :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 2rem auto;
}
.preview-pane :deep(p) {
  text-indent: 2.5rem;
  margin-bottom: 1.5em;
}
.preview-pane :deep(h1),
.preview-pane :deep(h2),
.preview-pane :deep(h3),
.preview-pane :deep(h4) {
  text-indent: 0;
  text-align: left;
  display: block;
  font-size: 1.25rem;
  margin-bottom: 15px;
  color: #000;
  font-weight: bold;
}

/* 註釋系統 (Footnotes) */
.preview-pane :deep(.footnotes) {
  margin-top: 60px;
  padding-top: 20px;
  border-top: 2px solid #444;
  font-size: 1rem;
  color: #666;
}
.preview-pane :deep(.footnotes ol) {
  padding-left: 0;
  margin-left: -1rem;
  list-style: none;
  counter-reset: footnote-counter;
}
.preview-pane :deep(.footnotes li) {
  display: flex;
  align-items: baseline;
  counter-increment: footnote-counter;
  margin-bottom: 5px;
}
.preview-pane :deep(.footnotes li::before) {
  content: counter(footnote-counter);
  display: inline-block;
  width: 2em;
  flex-shrink: 0;
  color: #007bff;
  text-align: right;
  margin-right: 10px;
  cursor: pointer;
}
.preview-pane :deep(.footnotes li p) {
  margin: 0;
  text-indent: 0 !important;
  flex-grow: 1;
  text-align: justify;
}
.preview-pane :deep(.footnotes .footnote-backref) {
  text-decoration: none;
  border: none;
  color: #007bff;
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
