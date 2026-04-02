<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from "vue";
import { supabase } from "~/supabase";
import { useRouter, useRoute, onBeforeRouteLeave } from "vue-router";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({
  title: "文章管理 - 無境界者後台",
});

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const savingAll = ref(false);

const issuesOptions = ref([]);
const allArticles = ref([]);
const editedArticles = ref([]);
const selectedIssueId = ref(null);

const initData = async () => {
  loading.value = true;
  try {
    const { data: issuesData, error: issuesError } = await supabase
      .from("issues")
      .select("id, title")
      .order("id", { ascending: false });

    if (issuesError) throw issuesError;
    issuesOptions.value = issuesData;

    const queryIssueId = parseInt(route.query.issue);
    const isValidId = issuesOptions.value.some((i) => i.id === queryIssueId);

    if (isValidId) {
      selectedIssueId.value = queryIssueId;
    } else if (issuesOptions.value.length > 0) {
      selectedIssueId.value = issuesOptions.value[0].id;
    }

    await fetchArticles();
  } catch (err) {
    alert("讀取資料失敗：" + err.message);
  } finally {
    loading.value = false;
  }
};

const fetchArticles = async () => {
  const { data: articlesData, error: articlesError } = await supabase
    .from("articles")
    .select("id, issue, title, subtitle, author, keyword, summary, seo")
    .order("id", { ascending: true });

  if (articlesError) throw articlesError;

  const processData = (data) => {
    return data.map((article) => {
      let seoImage = "";
      if (article.seo && typeof article.seo === "object") {
        seoImage = article.seo.image || "";
      }
      return {
        ...article,
        seo_image: seoImage,
        isSaving: false,
      };
    });
  };

  allArticles.value = processData(articlesData);
  editedArticles.value = JSON.parse(JSON.stringify(allArticles.value));
};

watch(selectedIssueId, (newVal) => {
  if (newVal) {
    router.replace({ query: { ...route.query, issue: newVal } });
  }
});

const filteredArticles = computed(() => {
  if (!selectedIssueId.value) return [];
  const list = editedArticles.value.filter(
    (a) => a.issue === selectedIssueId.value,
  );
  return list.sort((a, b) => {
    const getOrder = (idStr) => {
      const match = idStr.match(/-(\d+)/);
      return match ? parseInt(match[1]) : 999;
    };
    return getOrder(a.id) - getOrder(b.id);
  });
});

const hasUnsavedChanges = computed(() => {
  return editedArticles.value.some((newItem) => {
    const originalItem = allArticles.value.find((old) => old.id === newItem.id);
    if (!originalItem) return false;
    return (
      newItem.title !== originalItem.title ||
      newItem.subtitle !== originalItem.subtitle ||
      newItem.author !== originalItem.author ||
      newItem.keyword !== originalItem.keyword ||
      newItem.summary !== originalItem.summary ||
      newItem.seo_image !== originalItem.seo_image
    );
  });
});

const cleanId = (idStr) => {
  if (!idStr) return "";
  const match = idStr.match(/^\d+-\d+/);
  return match ? match[0] : idStr;
};

const saveRow = async (article) => {
  article.isSaving = true;
  try {
    await performUpdate(article);
    updateOriginalData(article);
    alert(`ID: ${cleanId(article.id)} 更新成功！✅`);
  } catch (err) {
    alert("儲存失敗：" + err.message);
  } finally {
    article.isSaving = false;
  }
};

const saveAll = async () => {
  if (!hasUnsavedChanges.value) {
    alert("目前沒有任何變更需要儲存。");
    return;
  }
  savingAll.value = true;
  let successCount = 0;
  let failCount = 0;

  const changedArticles = editedArticles.value.filter((newItem) => {
    const originalItem = allArticles.value.find((old) => old.id === newItem.id);
    if (!originalItem) return false;
    return (
      newItem.title !== originalItem.title ||
      newItem.subtitle !== originalItem.subtitle ||
      newItem.author !== originalItem.author ||
      newItem.keyword !== originalItem.keyword ||
      newItem.summary !== originalItem.summary ||
      newItem.seo_image !== originalItem.seo_image
    );
  });

  const promises = changedArticles.map(async (article) => {
    try {
      article.isSaving = true;
      await performUpdate(article);
      updateOriginalData(article);
      successCount++;
    } catch (err) {
      console.error(`ID ${article.id} save failed:`, err);
      failCount++;
    } finally {
      article.isSaving = false;
    }
  });

  await Promise.all(promises);
  savingAll.value = false;
  if (failCount === 0) {
    alert(`🎉 全部儲存成功！(共 ${successCount} 筆)`);
  } else {
    alert(`⚠️ 部分儲存完成。\n成功：${successCount} 筆\n失敗：${failCount} 筆`);
  }
};

const performUpdate = async (article) => {
  const originalSeo = article.seo || {};
  const updatedSeo = { ...originalSeo, image: article.seo_image };
  const updates = {
    title: article.title,
    subtitle: article.subtitle,
    author: article.author,
    keyword: article.keyword,
    summary: article.summary,
    seo: updatedSeo,
  };
  const { error } = await supabase
    .from("articles")
    .update(updates)
    .eq("id", article.id);
  if (error) throw error;
};

const updateOriginalData = (updatedItem) => {
  const index = allArticles.value.findIndex(
    (item) => item.id === updatedItem.id,
  );
  if (index !== -1) {
    allArticles.value[index] = JSON.parse(JSON.stringify(updatedItem));
  }
};

const goToEditor = (id) => {
  if (hasUnsavedChanges.value) {
    if (
      !confirm(
        "您有未儲存的變更，確定要離開去編輯單一文章嗎？\n(未儲存的變更將會遺失)",
      )
    )
      return;
  }
  router.push(`/admin/editor/${id}`);
};

onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value) {
    const answer = window.confirm(
      "⚠️ 您有未儲存的變更！\n確定要離開此頁面嗎？",
    );
    if (answer) next();
    else next(false);
  } else {
    next();
  }
});

const handleBeforeUnload = (e) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault();
    e.returnValue = "";
  }
};

onMounted(() => {
  initData();
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>

<template>
  <div class="articles-manager">
    <div class="header">
      <h2>📚 文章列表管理</h2>
      <p class="desc">
        快速批次修正文章標題、摘要與 SEO 設定。<br />
        修改後請點擊上方「一鍵儲存」或各列右側的「💾」。
      </p>
    </div>

    <div class="toolbar-container">
      <div class="toolbar-left">
        <label for="issue-select">選擇期數：</label>
        <div class="select-wrapper">
          <select id="issue-select" v-model="selectedIssueId">
            <option
              v-for="issue in issuesOptions"
              :key="issue.id"
              :value="issue.id"
            >
              Vol.{{ issue.id }} - {{ issue.title }}
            </option>
          </select>
        </div>
        <span class="count-badge" v-if="selectedIssueId">
          共 {{ filteredArticles.length }} 篇文章
        </span>
      </div>

      <div class="toolbar-right">
        <transition name="fade">
          <span v-if="hasUnsavedChanges" class="unsaved-warning"
            >⚠️ 有未儲存的變更</span
          >
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
            <th width="80">ID</th>
            <th width="150">主標題</th>
            <th width="150">副標題</th>
            <th width="100">作者</th>
            <th width="120">關鍵字</th>
            <th width="250">文章摘要 (Summary)</th>
            <th width="200">SEO 縮圖連結</th>
            <th width="100">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="article in filteredArticles" :key="article.id">
            <td
              class="text-center read-only-id"
              @click="goToEditor(article.id)"
              title="點擊進入編輯器"
            >
              {{ cleanId(article.id) }}
            </td>

            <td>
              <input type="text" v-model="article.title" class="table-input" />
            </td>
            <td>
              <input
                type="text"
                v-model="article.subtitle"
                class="table-input"
              />
            </td>
            <td>
              <input type="text" v-model="article.author" class="table-input" />
            </td>
            <td>
              <input
                type="text"
                v-model="article.keyword"
                class="table-input"
              />
            </td>
            <td>
              <textarea
                v-model="article.summary"
                class="table-textarea"
                rows="2"
              ></textarea>
            </td>
            <td>
              <!-- 有值：顯示文章連結與預覽圖；無值：可手動輸入 -->
              <template v-if="article.seo_image">
                <a :href="article.seo_image" target="_blank" class="seo-link"
                  >🔗 查看圖片</a
                >
                <div class="mini-preview">
                  <img :src="article.seo_image" alt="preview" />
                </div>
                <button
                  class="btn-clear-seo"
                  @click="article.seo_image = ''"
                  title="清除"
                >
                  ✕
                </button>
              </template>
              <input
                v-else
                type="text"
                v-model="article.seo_image"
                class="table-input"
                placeholder="https://..."
              />
            </td>

            <td class="actions-cell">
              <div class="action-buttons">
                <button
                  class="btn-save"
                  @click="saveRow(article)"
                  :disabled="article.isSaving"
                  title="儲存此列"
                >
                  {{ article.isSaving ? "..." : "💾" }}
                </button>
                <button
                  class="btn-edit"
                  @click="goToEditor(article.id)"
                  title="編輯內文"
                >
                  ✏️
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="filteredArticles.length === 0">
            <td colspan="8" class="empty-state">
              本期尚無文章，請前往「新增文章」開始撰寫。
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* CSS 完全保留 */
.articles-manager {
  padding: 20px;
  max-width: 100%;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}
.header h2 {
  color: #2c3e50;
  margin-bottom: 5px;
}
.desc {
  color: #666;
  font-size: 1.2rem;
  margin: 0;
}

.toolbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  background: #f8f9fa;
  padding: 15px 20px;
  border-radius: 8px;
  border: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.select-wrapper select {
  padding: 8px 12px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-width: 250px;
  cursor: pointer;
  background-color: white;
}

.count-badge {
  background-color: #e9ecef;
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 0.9rem;
  color: #555;
  font-weight: bold;
}

.btn-save-all {
  background-color: #2c3e50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
.btn-save-all:hover {
  background-color: #34495e;
}
.btn-save-all:active {
  transform: translateY(1px);
}
.btn-disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
  box-shadow: none;
}
.btn-disabled:hover {
  background-color: #bdc3c7;
}

.unsaved-warning {
  color: #e74c3c;
  font-weight: bold;
  font-size: 0.9rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}

.loading {
  text-align: center;
  font-size: 1.2rem;
  color: #666;
  margin: 40px;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #eee;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  min-width: 1200px;
}

.data-table th,
.data-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #eee;
  vertical-align: top;
  text-align: left;
}

.data-table th {
  background-color: #f1f3f5;
  font-weight: bold;
  color: #495057;
  white-space: nowrap;
  position: sticky;
  top: 0;
}

.text-center {
  text-align: center;
}

.table-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  transition: border 0.2s;
}
.table-input:focus {
  border-color: #3498db;
  outline: none;
}

.table-textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  resize: vertical;
  min-height: 60px;
}

.read-only-id {
  font-family: monospace;
  font-size: 1.1rem;
  color: #007bff;
  cursor: pointer;
  font-weight: bold;
}
.read-only-id:hover {
  text-decoration: underline;
  background-color: #f0f7ff;
}

.mini-preview {
  margin-top: 5px;
}
.mini-preview img {
  height: 40px;
  border-radius: 4px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.seo-link {
  display: inline-block;
  font-size: 0.85rem;
  color: #007bff;
  text-decoration: none;
  margin-bottom: 4px;
}
.seo-link:hover {
  text-decoration: underline;
}
.btn-clear-seo {
  display: block;
  margin-top: 4px;
  background: none;
  border: 1px solid #ccc;
  border-radius: 4px;
  color: #999;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 1px 6px;
}
.btn-clear-seo:hover {
  color: #c0392b;
  border-color: #c0392b;
}

.actions-cell {
  vertical-align: middle;
}
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-save,
.btn-edit {
  border: none;
  border-radius: 4px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: transform 0.1s;
}

.btn-save {
  background-color: #28a745;
  color: white;
}
.btn-save:hover {
  background-color: #218838;
}
.btn-save:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-edit {
  background-color: #17a2b8;
  color: white;
}
.btn-edit:hover {
  background-color: #138496;
}

.btn-save:active,
.btn-edit:active {
  transform: scale(0.95);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
  font-style: italic;
}

@media (max-width: 768px) {
  .toolbar-container {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-left,
  .toolbar-right {
    flex-direction: column;
    width: 100%;
  }
  .btn-save-all {
    width: 100%;
  }
}
</style>
