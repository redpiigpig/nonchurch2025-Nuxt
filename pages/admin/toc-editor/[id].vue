<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "~/supabase";

definePageMeta({ layout: "admin", middleware: "auth" });
useHead({ title: "目次編輯 - 無境界者後台" });

const route = useRoute();
const router = useRouter();
const tocId = computed(() => route.params.id);

const tocMeta = ref(null);
const articles = ref([]);
const loading = ref(true);
const saving = ref(false);

const SECTION_ORDER = ["主題介紹", "特稿專區", "主題廣場", "多元講堂", "編輯資訊"];
const SECTIONS_WITH_LABEL = new Set(["特稿專區", "主題廣場", "多元講堂"]);
const SECTIONS_WITH_SEPARATOR = new Set(["特稿專區", "主題廣場", "多元講堂", "編輯資訊"]);

onMounted(async () => {
  const { data: toc, error: te } = await supabase
    .from("articles")
    .select("id, issue, title")
    .eq("id", tocId.value)
    .single();
  if (te || !toc) {
    alert("找不到目次文章");
    loading.value = false;
    return;
  }
  tocMeta.value = toc;

  const { data, error } = await supabase
    .from("articles")
    .select("id, title, subtitle, author, author_display, category, section, sort_order, page_start, article_type")
    .eq("issue", toc.issue)
    .neq("article_type", "toc");
  if (error) { alert("載入文章失敗：" + error.message); loading.value = false; return; }

  articles.value = (data || []).map((a) => ({
    ...a,
    author: a.author_display || a.author || "",
    section: SECTION_ORDER.includes(a.section) ? a.section : "主題介紹",
    _seq: parseInt(a.id.match(/-(\d+)/)?.[1] || a.sort_order || 999),
    page_start: a.page_start ?? null,
  })).sort((a, b) => a._seq - b._seq);

  loading.value = false;
});

// Ordered flat list with continuous sequence numbers
const orderedArticles = computed(() => {
  const result = [];
  for (const s of SECTION_ORDER) {
    const arts = articles.value.filter((a) => a.section === s);
    result.push(...arts);
  }
  return result.map((a, i) => ({ ...a, tocSeq: i + 1 }));
});

// Display rows: section separators interleaved with article rows
const displayRows = computed(() => {
  const rows = [];
  let lastSection = null;
  for (const a of orderedArticles.value) {
    if (a.section !== lastSection) {
      if (SECTIONS_WITH_SEPARATOR.has(a.section)) {
        rows.push({ type: "separator", section: a.section, showLabel: SECTIONS_WITH_LABEL.has(a.section) });
      }
      lastSection = a.section;
    }
    rows.push({ type: "article", data: a });
  }
  return rows;
});

// Propagate page delta to following articles (same logic as articles_manager)
const prevPageStart = ref({});
const onPageFocus = (art) => {
  prevPageStart.value[art.id] = art.page_start;
};
const onPageBlur = (art) => {
  const prev = prevPageStart.value[art.id];
  if (prev === undefined || prev === art.page_start) return;
  const delta = (art.page_start || 0) - (prev || 0);
  if (!delta) return;
  const idx = orderedArticles.value.findIndex((a) => a.id === art.id);
  for (let i = idx + 1; i < orderedArticles.value.length; i++) {
    const target = articles.value.find((a) => a.id === orderedArticles.value[i].id);
    if (target && target.page_start != null) {
      target.page_start = Math.max(1, (target.page_start || 1) + delta);
    }
  }
};

const CATEGORY_COLORS = {
  "封面故事": "#7d6c29", "專題文章": "#C00000",
  "人物專訪": "#FFC000", "評論與回應": "#ED7D31",
  "生命故事": "#46b175", "公告與剪影": "#6a5acd",
  "時事評論": "#0070C0", "時事感想": "#0070C0",
  "文藝創作": "#27408b", "光影時刻": "#7d6c29",
  "實驗園地": "#db7093", "文獻與翻譯": "#548235",
};

/** 目次 HTML 內文轉義，避免標題等含 <>&" 破壞標籤結構 */
const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Generate HTML content for the toc article
const generateHTML = () => {
  const parts = [];
  let lastSection = null;
  for (const a of orderedArticles.value) {
    if (a.section !== lastSection) {
      if (SECTIONS_WITH_SEPARATOR.has(a.section)) {
        parts.push('<div class="custom-divider"></div>');
        if (SECTIONS_WITH_LABEL.has(a.section)) {
          parts.push(`<h3>${a.section}</h3>`);
        }
      }
      lastSection = a.section;
    }
    const seqStr = String(a.tocSeq).padStart(2, "0");
    const color = a.category ? (CATEGORY_COLORS[a.category] || "#000000") : null;
    const catTag = a.category
      ? `<span class="toc-cat" style="color:${color};font-size:10pt">【${escapeHtml(a.category)}】</span>`
      : "";
    const subtitlePart = a.subtitle ? `<br>──${escapeHtml(a.subtitle)}` : "";
    const page = a.page_start != null ? a.page_start : "—";
    const author = a.author ? `｜${escapeHtml(a.author)}` : "";
    parts.push(
      `<p class="toc-line"><strong>${seqStr}</strong> ${catTag}<span class="toc-article-title">${escapeHtml(a.title)}</span>${subtitlePart}${author}｜pp. ${page}</p>`,
    );
  }
  return parts.join("\n");
};

// ── 下載 Word ──────────────────────────────────────────────────
const exporting = ref(false);

const exportToWord = async () => {
  exporting.value = true;
  try {
    const content = generateHTML();
    const articleData = {
      id: tocId.value,
      article_type: "toc",
      title: "目次",
      subtitle: "",
      category: "",
      author: "",
      author_title: "",
      remark: "",
      keyword: "",
      content,
      footnotes: [],
      issue: tocMeta.value?.issue ?? null,
      issue_title: "",
      page_start: null,
    };
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
      const bytes = new Uint8Array(
        atob(result.file).split("").map((c) => c.charCodeAt(0))
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
    } else {
      alert("❌ 匯出失敗：" + result.error);
    }
  } catch (err) {
    alert("❌ 匯出失敗：" + err.message);
  } finally {
    exporting.value = false;
  }
};

const save = async () => {
  saving.value = true;
  try {
    // Save page_start for all articles
    await Promise.all(
      articles.value.map((a) =>
        supabase.from("articles").update({ page_start: a.page_start }).eq("id", a.id)
      )
    );
    // Save generated HTML + ensure title is「目次」
    const content = generateHTML();
    const { error } = await supabase
      .from("articles")
      .update({ content, title: "目次" })
      .eq("id", tocId.value);
    if (error) throw error;
    if (tocMeta.value) tocMeta.value.title = "目次";
    alert("✅ 目次已儲存");
  } catch (err) {
    alert("❌ 儲存失敗：" + err.message);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="toc-editor">
    <div class="toc-header">
      <button class="btn-back" @click="router.back()">← 返回</button>
      <div class="toc-title-row">
        <h2>目次編輯</h2>
        <span v-if="tocMeta" class="issue-badge">Vol.{{ tocMeta.issue }}</span>
      </div>
      <button class="btn-export" :disabled="exporting || loading" @click="exportToWord">
        {{ exporting ? "匯出中..." : "📥 下載 Word" }}
      </button>
      <button class="btn-save" :disabled="saving || loading" @click="save">
        {{ saving ? "儲存中..." : "💾 儲存目次" }}
      </button>
    </div>

    <div v-if="loading" class="loading">載入中...</div>

    <div v-else class="toc-body">
      <p v-if="tocMeta && tocMeta.title !== '目次'" class="hint-warn">
        ⚠️ 目前標題為「{{ tocMeta.title }}」，儲存後將自動改為「目次」。
      </p>
      <p class="hint">頁數欄位可直接編輯；離開欄位後，後續文章頁數會自動依差值平移。</p>

      <div class="toc-list">
        <template v-for="(row, i) in displayRows" :key="i">
          <!-- 分區分隔線 -->
          <div v-if="row.type === 'separator'" class="toc-separator">
            <div class="sep-line"></div>
            <span v-if="row.showLabel" class="sep-label">{{ row.section }}</span>
          </div>

          <!-- 文章行 -->
          <div v-else class="toc-row">
            <span class="toc-seq">{{ String(row.data.tocSeq).padStart(2, "0") }}</span>
            <div class="toc-content">
              <span v-if="row.data.category" class="toc-cat">【{{ row.data.category }}】</span>
              <span class="toc-article-title">{{ row.data.title || "（無標題）" }}</span>
              <span v-if="row.data.subtitle" class="toc-subtitle">──{{ row.data.subtitle }}</span>
              <span v-if="row.data.author" class="toc-author">｜{{ row.data.author }}</span>
              <span class="toc-pp">｜pp.&nbsp;</span>
              <input
                type="number"
                class="page-input"
                v-model.number="row.data.page_start"
                min="1"
                placeholder="—"
                @focus="onPageFocus(row.data)"
                @blur="onPageBlur(row.data)"
              />
            </div>
          </div>
        </template>

        <div v-if="orderedArticles.length === 0" class="toc-empty">
          本期尚無文章（目次以外）
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toc-editor {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.toc-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  background: #f8f9fa;
  padding: 14px 20px;
  border-radius: 8px;
  border: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}
.toc-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}
.toc-title-row h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #2c3e50;
}
.issue-badge {
  background: #2c3e50;
  color: white;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: bold;
}
.btn-back {
  padding: 7px 14px;
  background: #e9ecef;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #444;
  white-space: nowrap;
}
.btn-back:hover { background: #dee2e6; }

.btn-export {
  padding: 9px 16px;
  background: #17a2b8;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}
.btn-export:hover:not(:disabled) { background: #138496; }
.btn-export:disabled { background: #bdc3c7; cursor: not-allowed; }

.btn-save {
  padding: 9px 20px;
  background: #2c3e50;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}
.btn-save:hover:not(:disabled) { background: #34495e; }
.btn-save:disabled { background: #bdc3c7; cursor: not-allowed; }

.loading {
  text-align: center;
  color: #888;
  font-size: 1.1rem;
  margin: 60px 0;
}
.hint-warn {
  font-size: 0.85rem;
  color: #856404;
  background: #fff3cd;
  border: 1px solid #ffeeba;
  padding: 8px 14px;
  border-radius: 6px;
  margin-bottom: 10px;
}
.hint {
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 20px;
  font-style: italic;
}

/* ── TOC list ── */
.toc-list {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.1rem;
  line-height: 1.9;
}

.toc-separator {
  margin: 1.2rem 0 0.4rem;
}
.sep-line {
  border-top: 1px solid rgba(0, 0, 0, 0.35);
  margin-bottom: 0.3rem;
}
.sep-label {
  display: block;
  text-align: center;
  font-weight: bold;
  color: #333;
  font-size: 14pt;
  margin-bottom: 0.2rem;
}

.toc-row {
  display: flex;
  align-items: baseline;
  gap: 0.5em;
  margin-bottom: 0.15rem;
  padding-left: 0.5rem;
}
.toc-seq {
  font-weight: bold;
  color: #2c3e50;
  font-family: monospace;
  font-size: 12pt;
  flex-shrink: 0;
  min-width: 2em;
}
.toc-content {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0;
  flex: 1;
  line-height: 1.8;
}
.toc-cat {
  color: #666;
  margin-right: 0.1em;
  font-size: 10pt;
}
.toc-article-title {
  color: #111;
  font-size: 13pt;
}
.toc-subtitle {
  color: #555;
  font-size: 12pt;
}
.toc-author {
  color: #444;
  font-size: 12pt;
}
.toc-pp {
  color: #444;
  white-space: nowrap;
  font-size: 12pt;
}
.page-input {
  width: 52px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 0.95rem;
  font-family: monospace;
  text-align: center;
  color: #2c3e50;
  font-weight: bold;
  background: #f8f9fa;
}
.page-input:focus {
  outline: none;
  border-color: #3498db;
  background: white;
}
.toc-empty {
  text-align: center;
  color: #aaa;
  padding: 40px 0;
  font-size: 0.95rem;
}
</style>
