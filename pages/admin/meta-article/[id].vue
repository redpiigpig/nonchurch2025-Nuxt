<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "~/supabase";

definePageMeta({ layout: "admin", middleware: "auth" });

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const saving = ref(false);

const articleId = computed(() => route.params.id);

// ── 文章基本欄位 ──────────────────────────────────────────────────
const form = ref({
  id: "",
  title: "",
  issue: null,
  section: "",
  content: "",
  page_start: null,
  article_type: "regular",
});

// ── 類型偵測（依 article_type 欄位，不依賴 title 字串）────────────
const isSubmissionInfo = computed(() => form.value.article_type === "submission_info");
const isEditorialInfo = computed(() => form.value.article_type === "editorial_info");

const pageTitle = computed(() => {
  if (isSubmissionInfo.value) return "📮 投稿資訊編輯";
  if (isEditorialInfo.value) return "📋 編輯資訊編輯";
  return "📝 特殊文章編輯";
});

// ── CFP 資料（投稿資訊用）────────────────────────────────────────
const cfpData = ref(null);
const cfpLoading = ref(false);

const loadCfpData = async (issueId) => {
  cfpLoading.value = true;
  // 讀取「前一期」的 CFP（本期的投稿資訊來自上一期的下期預告）
  // 也讀本期，讓編輯者自行選擇
  const { data } = await supabase
    .from("issues")
    .select("id, title, cfp_title, cfp_deadline, cfp_theme, intro_cfp, cfp_image")
    .order("id", { ascending: false });
  cfpData.value = data || [];
  cfpLoading.value = false;
};

const selectedCfpIssueId = ref(null);
const selectedCfp = computed(() =>
  cfpData.value?.find((i) => i.id === selectedCfpIssueId.value),
);

const syncFromCfp = () => {
  const cfp = selectedCfp.value;
  if (!cfp) return alert("請先選擇要同步的期次");

  const parts = [];
  if (cfp.cfp_title) {
    parts.push(`<h2>☆下期徵稿主題：《${cfp.cfp_title}》</h2>`);
  }
  if (cfp.cfp_deadline) {
    parts.push(`<p>📌 截稿期限：${cfp.cfp_deadline}</p>`);
  }
  if (cfp.cfp_theme) {
    parts.push(`<p>${cfp.cfp_theme}</p>`);
  }
  if (cfp.intro_cfp) {
    parts.push(`<hr/><p>${cfp.intro_cfp}</p>`);
  }

  form.value.content = parts.join("\n");
  alert("✅ 已從 CFP 資料同步內文，請確認後儲存。");
};

// ── 財務資料（編輯資訊用）────────────────────────────────────────
const financeData = ref(null);
const financeLoading = ref(false);

const loadFinanceForIssue = async (issueId) => {
  financeLoading.value = true;
  try {
    const { loadPeriodWithBalance } = await import("~/utils/financeDb");
    financeData.value = await loadPeriodWithBalance(supabase, issueId);
  } finally {
    financeLoading.value = false;
  }
};

const syncFromFinance = async () => {
  // 重新從 DB 抓最新 issue 資料 + 最新 finance 資料，用 metaTemplate 重組 content
  const { data: issueRow, error: ie } = await supabase
    .from("issues")
    .select("id, title, date")
    .eq("id", form.value.issue)
    .single();
  if (ie) return alert("讀取期次失敗：" + ie.message);

  await loadFinanceForIssue(form.value.issue);
  const { buildEditorialInfoHtml } = await import("~/utils/metaTemplates");
  form.value.content = buildEditorialInfoHtml(issueRow, financeData.value);
  alert("✅ 已從財務明細同步內文，請確認後儲存。");
};

// ── 預覽（content 已是 HTML）──────────────────────────────────────
const previewHtml = computed(() => form.value.content || "");

// ── 載入 ─────────────────────────────────────────────────────────
const loadArticle = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, issue, section, content, page_start, article_type")
    .eq("id", articleId.value)
    .single();

  if (error) {
    alert("載入失敗：" + error.message);
    router.push("/admin/articles_manager");
    return;
  }

  form.value = {
    id: data.id,
    title: data.title || "",
    issue: data.issue,
    section: data.section || "",
    content: data.content || "",
    page_start: data.page_start ?? null,
    article_type: data.article_type || "regular",
  };

  // 投稿資訊：自動載入 CFP 清單
  if (data.article_type === "submission_info") {
    await loadCfpData(data.issue);
    // 預設選擇本期的上一期（通常是 CFP 的來源）
    if (cfpData.value?.length) {
      const currentIdx = cfpData.value.findIndex((i) => i.id === data.issue);
      selectedCfpIssueId.value =
        currentIdx >= 0 && currentIdx + 1 < cfpData.value.length
          ? cfpData.value[currentIdx + 1].id
          : cfpData.value[0]?.id;
    }
  }

  // 編輯資訊：自動載入當期財務資料
  if (data.article_type === "editorial_info") {
    await loadFinanceForIssue(data.issue);
  }

  loading.value = false;
};

// ── 儲存 ─────────────────────────────────────────────────────────
const saveArticle = async () => {
  saving.value = true;
  const { error } = await supabase
    .from("articles")
    .update({
      content: form.value.content,
      page_start: form.value.page_start,
      updated_at: new Date().toISOString(),
    })
    .eq("id", form.value.id);

  if (error) {
    alert("儲存失敗：" + error.message);
  } else {
    alert("✅ 儲存成功！");
  }
  saving.value = false;
};

// ── 下載 Word ────────────────────────────────────────────────────
const exportToWord = async () => {
  loading.value = true;
  try {
    // meta 文章走 template 替換流程（render_meta_docx.py）：
    //   payload 含 article_type、當期 issue 完整 cfp 資料、editorial_info 還要附財務
    let articleData;
    if (form.value.article_type === "submission_info" || form.value.article_type === "editorial_info") {
      const { data: issueRow, error: ie } = await supabase
        .from("issues")
        .select("id, title, date, cfp_title, cfp_theme, cfp_deadline, cfp_image")
        .eq("id", form.value.issue)
        .single();
      if (ie) throw ie;
      let finance = null;
      if (form.value.article_type === "editorial_info") {
        const { loadPeriodWithBalance } = await import("~/utils/financeDb");
        finance = await loadPeriodWithBalance(supabase, form.value.issue);
      }
      articleData = {
        id: form.value.id,
        article_type: form.value.article_type,
        issue: issueRow,
        finance,
      };
    } else {
      articleData = {
        id: form.value.id,
        title: form.value.title,
        content: form.value.content,
        page_start: form.value.page_start,
        issue: form.value.issue,
      };
    }

    const response = await fetch("/api/export-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(articleData),
    });
    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 503 && errText.includes("Word export is disabled")) {
        throw new Error("此功能僅限本地環境下載（線上已停用 Word 匯出）");
      }
      throw new Error(`匯出服務錯誤（${response.status}）`);
    }
    const result = await response.json();

    if (result.success) {
      const binaryString = atob(result.file);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      alert(`✅ 已下載：${result.filename}`);
    } else {
      throw new Error(result.error || "生成失敗");
    }
  } catch (err) {
    alert("❌ 下載失敗：" + err.message);
  } finally {
    loading.value = false;
  }
};

onMounted(loadArticle);
</script>

<template>
  <div class="meta-editor">
    <!-- ── Header ── -->
    <div class="meta-header">
      <h2>{{ pageTitle }}</h2>
      <div class="meta-actions">
        <NuxtLink :to="`/admin/proofread/${articleId}`" class="btn btn-proofread">
          🔍 文章校對
        </NuxtLink>
        <button class="btn btn-download" @click="exportToWord" :disabled="loading">
          📥 下載 Word
        </button>
        <button class="btn btn-save" @click="saveArticle" :disabled="saving || loading">
          {{ saving ? "儲存中..." : "💾 儲存至資料庫" }}
        </button>
        <NuxtLink to="/admin/articles_manager" class="btn btn-cancel">
          回列表
        </NuxtLink>
      </div>
    </div>

    <div v-if="loading" class="loading">載入中...</div>

    <div v-else class="meta-layout">
      <!-- ── 左側：編輯欄位 ── -->
      <div class="form-pane">
        <!-- 基本資訊（唯讀） -->
        <div class="info-bar">
          <span class="info-tag">ID：{{ form.id }}</span>
          <span class="info-tag">期數：Vol.{{ form.issue }}</span>
          <span class="info-tag">分區：{{ form.section }}</span>
        </div>

        <!-- 頁數 -->
        <div class="form-group">
          <label>起始頁碼</label>
          <input
            type="number"
            v-model.number="form.page_start"
            class="page-input"
            min="1"
            placeholder="輸入頁碼"
          />
        </div>

        <!-- ── 投稿資訊：CFP 同步面板 ── -->
        <div v-if="isSubmissionInfo" class="cfp-panel">
          <div class="cfp-panel-header">
            <h3>🔄 從期刊主題管理同步 CFP 資料</h3>
          </div>
          <div v-if="cfpLoading" class="cfp-loading">讀取 CFP 資料中...</div>
          <div v-else class="cfp-content">
            <div class="form-group">
              <label>選擇來源期次（通常選上一期）</label>
              <select v-model="selectedCfpIssueId" class="cfp-select">
                <option v-for="issue in cfpData" :key="issue.id" :value="issue.id">
                  Vol.{{ issue.id }} — {{ issue.title }}
                  {{ issue.cfp_title ? `（下期：${issue.cfp_title}）` : "" }}
                </option>
              </select>
            </div>
            <div v-if="selectedCfp" class="cfp-preview">
              <p><strong>下期主題：</strong>{{ selectedCfp.cfp_title || "（未填）" }}</p>
              <p><strong>截稿日期：</strong>{{ selectedCfp.cfp_deadline || "（未填）" }}</p>
              <p v-if="selectedCfp.cfp_theme" class="cfp-theme-preview">
                {{ selectedCfp.cfp_theme.substring(0, 100) }}...
              </p>
            </div>
            <button class="btn-sync-cfp" @click="syncFromCfp">
              🔄 同步並生成內文
            </button>
          </div>
        </div>

        <!-- ── 編輯資訊：財務同步面板 ── -->
        <div v-if="isEditorialInfo" class="cfp-panel">
          <div class="cfp-panel-header">
            <h3>🔄 從財務明細管理同步本期財務徵信</h3>
          </div>
          <div v-if="financeLoading" class="cfp-loading">讀取財務資料中...</div>
          <div v-else class="cfp-content">
            <div v-if="financeData" class="cfp-preview">
              <p>
                <strong>日期區間：</strong>{{ financeData.dateRange || "（未填）" }}
              </p>
              <p>
                <strong>明細筆數：</strong>{{ financeData.rows?.length || 0 }}
              </p>
              <p v-if="financeData.rows?.length">
                <strong>期末結餘：</strong>{{ financeData.rows[financeData.rows.length - 1].balance?.toLocaleString("zh-TW") || "—" }}
              </p>
            </div>
            <div v-else class="cfp-preview" style="color: #999">
              本期尚無財務明細。請至
              <NuxtLink to="/admin/finance" style="color: #3182ce">💰 財務管理</NuxtLink>
              填入後再回此頁同步。
            </div>
            <button class="btn-sync-cfp" @click="syncFromFinance">
              🔄 同步並重新生成內文
            </button>
          </div>
        </div>

        <!-- 內文編輯器 -->
        <div class="form-group">
          <label>
            {{ isSubmissionInfo ? "投稿資訊內文 (Markdown)" : isEditorialInfo ? "編輯資訊內文 (Markdown)" : "內文 (Markdown)" }}
          </label>
          <textarea
            v-model="form.content"
            class="content-textarea"
            rows="28"
            placeholder="輸入 HTML 內文..."
          ></textarea>
        </div>
      </div>

      <!-- ── 右側：預覽 ── -->
      <div class="preview-pane">
        <div class="preview-header">預覽</div>
        <div class="article-content markdown-body" v-html="previewHtml"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meta-editor {
  padding: 20px;
  background: #f9f9f9;
  min-height: 100vh;
}

.meta-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
.meta-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.3rem;
}
.meta-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: background 0.2s;
}
.btn-save {
  background: #2c3e50;
  color: white;
}
.btn-save:hover:not(:disabled) { background: #34495e; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-download {
  background: #8e44ad;
  color: white;
}
.btn-download:hover:not(:disabled) { background: #7d3c98; }
.btn-proofread {
  background: #11998e;
  color: white;
}
.btn-proofread:hover { background: #0d7a70; }
.btn-cancel {
  background: #f1f3f5;
  color: #555;
  border: 1px solid #dee2e6;
}
.btn-cancel:hover { background: #e2e6ea; }

.loading {
  text-align: center;
  color: #888;
  font-size: 1.1rem;
  padding: 40px;
}

.meta-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  height: calc(100vh - 120px);
}

/* ── 表單欄位 ── */
.form-pane {
  background: white;
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.info-tag {
  background: #f1f3f5;
  color: #555;
  font-size: 0.82rem;
  padding: 4px 10px;
  border-radius: 12px;
  font-family: monospace;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-weight: bold;
  font-size: 0.9rem;
  color: #444;
}

.page-input {
  width: 120px;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  text-align: center;
}

.content-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: monospace;
  resize: vertical;
  line-height: 1.6;
  box-sizing: border-box;
}
.content-textarea:focus {
  border-color: #3498db;
  outline: none;
}

/* ── CFP 同步面板 ── */
.cfp-panel {
  background: #f0f9ff;
  border: 1px solid #bee3f8;
  border-radius: 8px;
  padding: 16px;
}
.cfp-panel-header h3 {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: #2b6cb0;
}
.cfp-loading {
  color: #888;
  font-size: 0.9rem;
}
.cfp-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cfp-select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #bee3f8;
  border-radius: 4px;
  font-size: 0.9rem;
}
.cfp-preview {
  background: white;
  border: 1px solid #bee3f8;
  border-radius: 6px;
  padding: 12px;
  font-size: 0.85rem;
  color: #444;
}
.cfp-preview p {
  margin: 4px 0;
}
.cfp-theme-preview {
  color: #888;
  font-style: italic;
}
.btn-sync-cfp {
  padding: 9px 18px;
  background: #3182ce;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
  align-self: flex-start;
}
.btn-sync-cfp:hover {
  background: #2b6cb0;
}

/* ── 預覽 ── */
.preview-pane {
  background: white;
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.preview-header {
  font-size: 0.8rem;
  font-weight: bold;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

@media (max-width: 900px) {
  .meta-layout {
    grid-template-columns: 1fr;
    height: auto;
  }
  .preview-pane {
    display: none;
  }
}
</style>
