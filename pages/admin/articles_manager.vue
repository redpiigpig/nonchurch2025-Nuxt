<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { supabase } from "~/supabase";
import { useRouter, useRoute, onBeforeRouteLeave } from "vue-router";

definePageMeta({ layout: "admin", middleware: "auth" });
useHead({ title: "文章管理 - 無境界者後台" });

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const savingAll = ref(false);

const issuesOptions = ref([]);
const allArticles = ref([]);
const editedArticles = ref([]);
const selectedIssueId = ref(null);

// ── 分區定義 ────────────────────────────────────────────────────────
// DB 分區（文章儲存在 articles 表，section 欄位對應下列值）
const SECTION_ORDER = ["主題介紹", "特稿專區", "主題廣場", "多元講堂", "編輯資訊"];
const SECTION_LABELS = {
  "主題介紹": "📖 主題介紹",
  "特稿專區": "✍️ 特稿專區",
  "主題廣場": "🏛 主題廣場",
  "多元講堂": "🎙 多元講堂",
  "編輯資訊": "📋 編輯資訊",
};
const SECTION_NOTES = {
  "主題介紹": "編輯室報告、本期作者簡介、封面故事",
  "編輯資訊": "含投稿資訊／下期主題、編輯資訊／線上資訊（由期刊管理提供）",
};

// ── 資料載入 ─────────────────────────────────────────────────────────
const initData = async () => {
  loading.value = true;
  try {
    const { data: issuesData, error: ie } = await supabase
      .from("issues").select("id, title").order("id", { ascending: false });
    if (ie) throw ie;
    issuesOptions.value = issuesData;

    const qid = parseInt(route.query.issue);
    selectedIssueId.value = issuesOptions.value.some(i => i.id === qid)
      ? qid : issuesOptions.value[0]?.id;

    await fetchArticles();
  } catch (err) {
    alert("讀取資料失敗：" + err.message);
  } finally {
    loading.value = false;
  }
};

const fetchArticles = async () => {
  const { data, error } = await supabase
    .from("articles")
    .select("id, issue, title, subtitle, author, keyword, summary, seo, section, sort_order, page_start, proofread_status, proofread_by, proofread_date")
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const processed = data.map(a => ({
    ...a,
    idSuffix:        a.id.replace(/^\d+-/, ""),
    seo_image:       a.seo?.image || "",
    section:         SECTION_ORDER.includes(a.section) ? a.section : "主題介紹",
    sort_order:      a.sort_order ?? 0,
    page_start:      a.page_start ?? null,
    proofread_status: a.proofread_status || "pending",
    proofread_by:    a.proofread_by || "",
    proofread_date:  a.proofread_date || "",
    isSaving:        false,
  }));

  allArticles.value    = processed;
  editedArticles.value = JSON.parse(JSON.stringify(processed));
};

watch(selectedIssueId, val => {
  if (val) router.replace({ query: { ...route.query, issue: val } });
});

// ── 分區分組 ─────────────────────────────────────────────────────────
const groupedArticles = computed(() => {
  const groups = {};
  SECTION_ORDER.forEach(s => (groups[s] = []));

  editedArticles.value
    .filter(a => a.issue === selectedIssueId.value)
    .forEach(a => {
      const s = SECTION_ORDER.includes(a.section) ? a.section : "主題介紹";
      groups[s].push(a);
    });

  SECTION_ORDER.forEach(s =>
    groups[s].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  );
  return groups;
});

// 全期文章依分區順序排成一維陣列（供頁數連動使用）
const orderedArticles = computed(() => {
  const result = [];
  SECTION_ORDER.forEach(s => result.push(...(groupedArticles.value[s] || [])));
  return result;
});

const totalArticles = computed(() =>
  SECTION_ORDER.reduce((n, s) => n + (groupedArticles.value[s]?.length || 0), 0)
);

// ── 拖曳換區 ─────────────────────────────────────────────────────────
const draggedId   = ref(null);
const dropSection = ref(null);

const onDragStart = (e, article) => {
  draggedId.value = article.id;
  e.dataTransfer.effectAllowed = "move";
};
const onDragOver = (e, section) => {
  e.preventDefault();
  dropSection.value = section;
};
const onDragLeave = e => {
  if (!e.currentTarget.contains(e.relatedTarget)) dropSection.value = null;
};
const onDrop = (e, section) => {
  e.preventDefault();
  const article = editedArticles.value.find(a => a.id === draggedId.value);
  if (article) {
    article.section = section;
    recalculateSortOrder();
  }
  draggedId.value   = null;
  dropSection.value = null;
};
const onDragEnd = () => { draggedId.value = null; dropSection.value = null; };

// 重新計算全期所有文章的 sort_order（依分區順序連續編號）
const recalculateSortOrder = () => {
  let order = 1;
  SECTION_ORDER.forEach(s => {
    editedArticles.value
      .filter(a => a.issue === selectedIssueId.value &&
        (SECTION_ORDER.includes(a.section) ? a.section : "一") === s)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .forEach(a => { a.sort_order = order++; });
  });
};

// 區內上下移動
const moveArticle = (article, dir) => {
  const list   = groupedArticles.value[article.section];
  const idx    = list.findIndex(a => a.id === article.id);
  const swapIdx = idx + dir;
  if (swapIdx < 0 || swapIdx >= list.length) return;

  const a = editedArticles.value.find(x => x.id === list[idx].id);
  const b = editedArticles.value.find(x => x.id === list[swapIdx].id);
  if (a && b) [a.sort_order, b.sort_order] = [b.sort_order, a.sort_order];
};

// ── 頁數連動 ─────────────────────────────────────────────────────────
const prevPageStart = ref({});

const onPageFocus = a => { prevPageStart.value[a.id] = a.page_start; };

const onPageBlur = a => {
  const prev  = prevPageStart.value[a.id];
  if (prev === undefined || prev === a.page_start) return;
  const delta = (a.page_start || 0) - (prev || 0);
  if (!delta) return;

  const ordered = orderedArticles.value;
  const idx     = ordered.findIndex(x => x.id === a.id);
  for (let i = idx + 1; i < ordered.length; i++) {
    if (ordered[i].page_start != null) {
      ordered[i].page_start = Math.max(1, (ordered[i].page_start || 1) + delta);
    }
  }
};

// ── 未儲存偵測 ───────────────────────────────────────────────────────
const isChanged = (item, orig) =>
  item.idSuffix   !== orig.id.replace(/^\d+-/, "")          ||
  item.title      !== orig.title                             ||
  item.subtitle   !== orig.subtitle                          ||
  item.author     !== orig.author                            ||
  item.keyword    !== orig.keyword                           ||
  item.summary    !== orig.summary                           ||
  item.seo_image  !== (orig.seo?.image || "")                ||
  item.section    !== (SECTION_ORDER.includes(orig.section) ? orig.section : "主題介紹") ||
  item.sort_order !== (orig.sort_order ?? 0)                 ||
  item.page_start !== (orig.page_start ?? null);

const hasUnsavedChanges = computed(() =>
  editedArticles.value.some(item => {
    const orig = allArticles.value.find(o => o.id === item.id);
    return orig && isChanged(item, orig);
  })
);

// ── 儲存 ────────────────────────────────────────────────────────────
const performUpdate = async (article) => {
  const newId  = `${article.issue}-${article.idSuffix}`;
  const updates = {
    title:      article.title,
    subtitle:   article.subtitle,
    author:     article.author,
    keyword:    article.keyword,
    summary:    article.summary,
    seo:        { ...(article.seo || {}), image: article.seo_image },
    section:    article.section,
    sort_order: article.sort_order,
    page_start: article.page_start,
  };

  if (newId !== article.id) {
    // ID rename：insert 新 + delete 舊
    const { data: full, error: re } = await supabase.from("articles").select("*").eq("id", article.id).single();
    if (re) throw re;
    const { error: ie } = await supabase.from("articles").insert({ ...full, ...updates, id: newId });
    if (ie) throw ie;
    const { error: de } = await supabase.from("articles").delete().eq("id", article.id);
    if (de) throw de;
    article.id = newId;
  } else {
    const { error } = await supabase.from("articles").update(updates).eq("id", article.id);
    if (error) throw error;
  }
};

const syncOriginal = (article) => {
  const i = allArticles.value.findIndex(o => o.id === article.id);
  if (i !== -1) allArticles.value[i] = JSON.parse(JSON.stringify(article));
};

const saveRow = async (article) => {
  article.isSaving = true;
  try {
    await performUpdate(article);
    syncOriginal(article);
  } catch (err) {
    alert("儲存失敗：" + err.message);
  } finally {
    article.isSaving = false;
  }
};

const saveAll = async () => {
  if (!hasUnsavedChanges.value) return alert("目前沒有任何變更需要儲存。");
  savingAll.value = true;
  let ok = 0, fail = 0;

  const changed = editedArticles.value.filter(item => {
    const orig = allArticles.value.find(o => o.id === item.id);
    return orig && isChanged(item, orig);
  });

  await Promise.all(changed.map(async a => {
    try {
      a.isSaving = true;
      await performUpdate(a);
      syncOriginal(a);
      ok++;
    } catch { fail++; }
    finally { a.isSaving = false; }
  }));

  savingAll.value = false;
  alert(fail === 0 ? `🎉 全部儲存成功！(共 ${ok} 筆)` : `⚠️ 成功 ${ok} 筆，失敗 ${fail} 筆`);
};

const goToEditor = id => {
  if (hasUnsavedChanges.value && !confirm("有未儲存的變更，確定離開？")) return;
  router.push(`/admin/editor/${id}`);
};

// ── 新增文章 modal ───────────────────────────────────────────────────
const showAddModal = ref(false);
const addForm = ref({ seq: "", title: "", section: "主題介紹" });
const addSaving = ref(false);

const closeAddModal = () => {
  showAddModal.value = false;
  addForm.value = { seq: "", title: "", section: "主題介紹" };
};

const submitAddArticle = async () => {
  if (!addForm.value.seq.toString().trim()) return alert("請填寫序號");
  if (!addForm.value.title.trim()) return alert("請填寫標題");
  if (!selectedIssueId.value) return;

  const idSuffix = `${addForm.value.seq}${addForm.value.title.trim()}`;
  const newId = `${selectedIssueId.value}-${idSuffix}`;
  if (editedArticles.value.some(a => a.id === newId)) {
    return alert(`ID「${newId}」已存在`);
  }

  const section = addForm.value.section;
  const maxOrder = Math.max(0, ...editedArticles.value
    .filter(a => a.issue === selectedIssueId.value && a.section === section)
    .map(a => a.sort_order ?? 0));

  const stub = {
    id: newId,
    issue: selectedIssueId.value,
    title: addForm.value.title.trim(),
    subtitle: "", author: "", keyword: "", summary: "",
    seo: {}, section,
    sort_order: maxOrder + 1,
    page_start: null,
    idSuffix,
    seo_image: "", isSaving: false,
  };

  addSaving.value = true;
  try {
    const { error } = await supabase.from("articles").insert({
      id: stub.id, issue: stub.issue, title: stub.title,
      section: stub.section, sort_order: stub.sort_order,
      is_published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    editedArticles.value.push(stub);
    allArticles.value.push(JSON.parse(JSON.stringify(stub)));
    closeAddModal();
  } catch (err) {
    alert("新增失敗：" + err.message);
  } finally {
    addSaving.value = false;
  }
};

onBeforeRouteLeave((to, from, next) => {
  hasUnsavedChanges.value
    ? next(window.confirm("⚠️ 有未儲存的變更！確定要離開？"))
    : next();
});

const handleBeforeUnload = e => {
  if (hasUnsavedChanges.value) { e.preventDefault(); e.returnValue = ""; }
};

onMounted(() => { initData(); window.addEventListener("beforeunload", handleBeforeUnload); });
onBeforeUnmount(() => window.removeEventListener("beforeunload", handleBeforeUnload));
</script>

<template>
  <div class="articles-manager">
    <div class="header">
      <h2>📚 文章列表管理</h2>
      <p class="desc">
        拖曳文章列可換分區；點擊頁數欄位修改後按 Tab 或點擊其他地方，後續文章頁碼自動連動。
      </p>
    </div>

    <!-- 工具列 -->
    <div class="toolbar-container">
      <div class="toolbar-left">
        <label>選擇期數：</label>
        <div class="select-wrapper">
          <select v-model="selectedIssueId">
            <option v-for="issue in issuesOptions" :key="issue.id" :value="issue.id">
              Vol.{{ issue.id }} - {{ issue.title }}
            </option>
          </select>
        </div>
        <span class="count-badge">共 {{ totalArticles }} 篇文章</span>
        <button class="btn-new" @click="showAddModal = true">＋ 新增文章</button>
      </div>
      <div class="toolbar-right">
        <transition name="fade">
          <span v-if="hasUnsavedChanges" class="unsaved-warning">⚠️ 有未儲存的變更</span>
        </transition>
        <button
          class="btn-save-all"
          @click="saveAll"
          :disabled="!hasUnsavedChanges || savingAll"
          :class="{ 'btn-disabled': !hasUnsavedChanges }"
        >
          {{ savingAll ? "儲存中..." : "💾 一鍵儲存所有變更" }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">載入中...</div>

    <div v-else class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th width="24"></th>
            <th width="150">ID</th>
            <th width="72">頁數</th>
            <th>主標題</th>
            <th width="130">副標題</th>
            <th width="90">作者</th>
            <th width="110">關鍵字</th>
            <th width="210">摘要</th>
            <th width="90">校對狀態</th>
            <th width="80">操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="section in SECTION_ORDER" :key="section">

            <!-- 分區標題列 -->
            <tr
              class="section-divider-row"
              :class="{ 'drop-active': dropSection === section }"
              @dragover="onDragOver($event, section)"
              @dragleave="onDragLeave"
              @drop="onDrop($event, section)"
            >
              <td colspan="10">
                <span class="section-label">{{ SECTION_LABELS[section] }}</span>
                <span class="section-note" v-if="SECTION_NOTES[section]">{{ SECTION_NOTES[section] }}</span>
                <span class="section-count">{{ groupedArticles[section]?.length || 0 }} 篇</span>
              </td>
            </tr>

            <!-- 文章列 -->
            <tr
              v-for="(article, idx) in groupedArticles[section]"
              :key="article.id"
              draggable="true"
              @dragstart="onDragStart($event, article)"
              @dragend="onDragEnd"
              :class="{ dragging: draggedId === article.id }"
            >
              <td class="drag-handle" title="拖曳到其他分區">⠿</td>
              <td class="id-cell">
                <div class="id-cell-inner">
                  <span class="id-prefix">{{ article.issue }}-</span>
                  <input
                    type="text"
                    v-model="article.idSuffix"
                    class="table-input id-input"
                    :class="{ 'id-changed': (article.issue + '-' + article.idSuffix) !== article.id }"
                    :title="(article.issue + '-' + article.idSuffix) !== article.id ? '⚠️ ID 已變更，儲存後生效' : ''"
                  />
                </div>
              </td>
              <td>
                <input
                  type="number"
                  v-model.number="article.page_start"
                  class="table-input page-input"
                  min="1"
                  placeholder="—"
                  @focus="onPageFocus(article)"
                  @blur="onPageBlur(article)"
                />
              </td>
              <td><input type="text" v-model="article.title"    class="table-input" /></td>
              <td><input type="text" v-model="article.subtitle" class="table-input" /></td>
              <td><input type="text" v-model="article.author"   class="table-input" /></td>
              <td><input type="text" v-model="article.keyword"  class="table-input" /></td>
              <td><textarea v-model="article.summary" class="table-textarea" rows="2"></textarea></td>
              <td class="proofread-cell">
                <span
                  class="proofread-badge"
                  :class="{
                    'badge-pending':   article.proofread_status === 'pending',
                    'badge-progress':  article.proofread_status === 'in_progress',
                    'badge-done':      article.proofread_status === 'completed',
                  }"
                  :title="article.proofread_status === 'completed' ? `由 ${article.proofread_by} 於 ${article.proofread_date} 完成` : ''"
                >
                  {{ article.proofread_status === 'completed' ? '✅ 完成' : article.proofread_status === 'in_progress' ? '🔄 進行中' : '⬜ 待校對' }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="action-buttons">
                  <button class="btn-save" @click="saveRow(article)" :disabled="article.isSaving" title="儲存此列">
                    {{ article.isSaving ? "…" : "💾" }}
                  </button>
                  <button class="btn-edit" @click="goToEditor(article.id)" title="編輯內文">✏️</button>
                  <NuxtLink :to="`/admin/proofread/${article.id}`" class="btn-proofread" title="進入校對模式">🔍</NuxtLink>
                </div>
              </td>
            </tr>

            <!-- 空分區提示（同時是 drop 目標） -->
            <tr
              v-if="groupedArticles[section]?.length === 0"
              class="empty-row"
              :class="{ 'drop-active': dropSection === section }"
              @dragover="onDragOver($event, section)"
              @dragleave="onDragLeave"
              @drop="onDrop($event, section)"
            >
              <td colspan="10">將文章拖曳到此處</td>
            </tr>

          </template>
        </tbody>
      </table>
    </div>

    <!-- 新增文章 modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
      <div class="modal">
        <div class="modal-header">
          <h3>＋ 新增文章</h3>
          <button class="modal-close" @click="closeAddModal">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-row">
            <div class="modal-field" style="width: 90px">
              <label>序號</label>
              <input v-model="addForm.seq" type="number" min="1" placeholder="1" class="table-input" autofocus />
            </div>
            <div class="modal-field" style="flex: 1">
              <label>標題</label>
              <input v-model="addForm.title" type="text" placeholder="文章標題" class="table-input" />
            </div>
          </div>
          <div class="modal-field">
            <label>分區</label>
            <select v-model="addForm.section" class="table-input">
              <option v-for="s in SECTION_ORDER" :key="s" :value="s">{{ SECTION_LABELS[s] }}</option>
            </select>
          </div>
          <div class="modal-id-preview" v-if="addForm.seq && addForm.title">
            ID 將會是：<strong>{{ selectedIssueId }}-{{ addForm.seq }}{{ addForm.title }}</strong>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeAddModal">取消</button>
          <button class="btn-save-all" @click="submitAddArticle" :disabled="addSaving">
            {{ addSaving ? "新增中..." : "確認新增" }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.articles-manager {
  padding: 20px;
  max-width: 100%;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}
.header h2 { color: #2c3e50; margin-bottom: 5px; }
.desc { color: #666; font-size: 1rem; margin: 0; }

/* ── 工具列 ── */
.toolbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 24px;
  background: #f8f9fa;
  padding: 15px 20px;
  border-radius: 8px;
  border: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 12px; }

.select-wrapper select {
  padding: 8px 12px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-width: 240px;
  cursor: pointer;
  background: white;
}
.count-badge {
  background: #e9ecef;
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 0.9rem;
  color: #555;
  font-weight: bold;
}
.btn-new {
  padding: 8px 16px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-new:hover { background: #219150; }

.btn-save-all {
  background: #2c3e50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}
.btn-save-all:hover:not(:disabled) { background: #34495e; }
.btn-disabled { background: #bdc3c7 !important; cursor: not-allowed; }

.unsaved-warning {
  color: #e74c3c;
  font-weight: bold;
  font-size: 0.9rem;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}

.loading { text-align: center; font-size: 1.2rem; color: #666; margin: 40px; }

/* ── 表格 ── */
.table-wrapper {
  background: white;
  border-radius: 8px;
  overflow-x: auto;
  border: 2px solid #2c3e50;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1100px;
}
.data-table th, .data-table td {
  padding: 10px 8px;
  border: 1px solid #dee2e6;
  vertical-align: middle;
  text-align: left;
}
.data-table th {
  background: #2c3e50;
  color: white;
  font-weight: bold;
  font-size: 0.85rem;
  white-space: nowrap;
  border-color: #3d5166;
}

/* 分區標題列 */
.section-divider-row td {
  background: #f1f3f5;
  padding: 7px 12px;
  border: 1px solid #dee2e6;
  border-left: 4px solid #2c3e50;
}
.section-divider-row.drop-active td {
  background: #dbeafe;
  border-left-color: #3498db;
}
.section-label { font-weight: bold; color: #2c3e50; font-size: 0.95rem; margin-right: 8px; }
.section-note  { font-size: 0.8rem; color: #999; font-style: italic; margin-right: 8px; }
.section-count {
  background: #dee2e6;
  color: #555;
  font-size: 0.78rem;
  padding: 1px 7px;
  border-radius: 10px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: white;
  border-radius: 10px;
  width: 420px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}
.modal-header h3 { margin: 0; font-size: 1.1rem; color: #2c3e50; }
.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  line-height: 1;
}
.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.modal-field label { display: block; font-weight: bold; font-size: 0.85rem; color: #555; margin-bottom: 6px; }
.modal-row { display: flex; gap: 12px; align-items: flex-end; }
.modal-id-preview { font-size: 0.85rem; color: #666; background: #f8f9fa; padding: 8px 12px; border-radius: 6px; border: 1px solid #dee2e6; }
.modal-id-preview strong { color: #2c3e50; }
.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-cancel {
  padding: 8px 18px;
  background: #f1f3f5;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  cursor: pointer;
  color: #555;
}

/* 空分區提示列 */
.empty-row td {
  text-align: center;
  color: #bbb;
  font-size: 0.9rem;
  padding: 14px;
  font-style: italic;
  border: 1px solid #dee2e6;
}
.empty-row.drop-active td {
  color: #3498db;
  background: #f0f8ff;
}

/* 拖曳把手 */
.drag-handle {
  cursor: grab;
  color: #aaa;
  font-size: 1.2rem;
  text-align: center;
  user-select: none;
}
.drag-handle:active { cursor: grabbing; }

tr.dragging { opacity: 0.4; }

/* 區內排序 */
.order-cell { text-align: center; white-space: nowrap; }
.btn-order {
  background: none;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 0.7rem;
  cursor: pointer;
  line-height: 1;
  color: #666;
}
.btn-order:hover:not(:disabled) { background: #e9ecef; color: #333; }
.btn-order:disabled { opacity: 0.25; cursor: default; }

/* ID 欄位 */
.id-cell { vertical-align: middle; }
.id-cell-inner { display: flex; align-items: center; gap: 2px; }
.id-prefix {
  font-family: monospace;
  font-weight: bold;
  color: #999;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 0.85rem;
}
.id-input {
  font-family: monospace;
  font-size: 0.85rem;
  color: #007bff;
  font-weight: bold;
  min-width: 0;
  flex: 1;
}
.id-changed {
  border-color: #e67e22 !important;
  background: #fff8f0;
  color: #e67e22;
}

/* 頁數欄位 */
.page-input {
  width: 64px;
  text-align: center;
  padding: 6px 4px;
}

/* 一般輸入 */
.table-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border 0.15s;
}
.table-input:focus { border-color: #3498db; outline: none; }

.table-textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 52px;
}

/* 校對狀態 */
.proofread-cell { vertical-align: middle; text-align: center; }
.proofread-badge {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: bold;
  padding: 3px 8px;
  border-radius: 10px;
  white-space: nowrap;
}
.badge-pending  { background: #e9ecef; color: #666; }
.badge-progress { background: #fff3cd; color: #856404; }
.badge-done     { background: #d4edda; color: #155724; }

/* 操作按鈕 */
.actions-cell { vertical-align: middle; }
.action-buttons { display: flex; gap: 6px; justify-content: center; }
.btn-save, .btn-edit, .btn-proofread {
  border: none;
  border-radius: 4px;
  width: 34px;
  height: 34px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: transform 0.1s;
  text-decoration: none;
}
.btn-save  { background: #28a745; color: white; }
.btn-save:hover:not(:disabled)  { background: #218838; }
.btn-save:disabled  { background: #ccc; cursor: not-allowed; }
.btn-edit  { background: #17a2b8; color: white; }
.btn-edit:hover  { background: #138496; }
.btn-proofread { background: #11998e; color: white; }
.btn-proofread:hover { background: #0d7a70; }
.btn-save:active, .btn-edit:active, .btn-proofread:active { transform: scale(0.95); }

/* 空分區 */
.empty-zone {
  padding: 28px;
  text-align: center;
  color: #bbb;
  font-size: 0.95rem;
  border: 2px dashed #e0e0e0;
  margin: 12px;
  border-radius: 6px;
}
.section-block.drop-active .empty-zone {
  border-color: #3498db;
  color: #3498db;
}

.section-note {
  font-size: 0.8rem;
  color: #999;
  font-style: italic;
}

/* Fade 動畫 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

@media (max-width: 768px) {
  .toolbar-container { flex-direction: column; align-items: stretch; }
  .toolbar-left, .toolbar-right { flex-direction: column; width: 100%; }
  .btn-save-all { width: 100%; }
}
</style>
