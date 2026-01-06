<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { supabase } from "~/supabase"; // 修正路徑
import { useRouter, useRoute, onBeforeRouteLeave } from "vue-router"; // 修正 import

// ⭐ 新增：指定後台 Layout 與 權限驗證
definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({ title: "文章管理 - 後台" });

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const savingAll = ref(false); // 控制全體儲存按鈕狀態

// 資料狀態
const issuesOptions = ref([]);
const allArticles = ref([]); // 原始資料 (用來比對變更)
const editedArticles = ref([]); // 編輯中的資料
const selectedIssueId = ref(null);

// 初始化
const initData = async () => {
  loading.value = true;
  try {
    // A. 抓取期數
    const { data: issuesData, error: issuesError } = await supabase
      .from("issues")
      .select("id, title")
      .order("id", { ascending: false });

    if (issuesError) throw issuesError;
    issuesOptions.value = issuesData;

    // B. 決定預設期數 (優先看網址參數)
    const queryIssueId = parseInt(route.query.issue);
    const isValidId = issuesOptions.value.some((i) => i.id === queryIssueId);

    if (isValidId) {
      selectedIssueId.value = queryIssueId;
    } else if (issuesOptions.value.length > 0) {
      // 預設抓最新一期
      selectedIssueId.value = issuesOptions.value[0].id;
    }
  } catch (err) {
    alert("載入期數失敗：" + err.message);
  } finally {
    loading.value = false;
  }
};

// 讀取該期文章
const fetchArticles = async () => {
  if (!selectedIssueId.value) return;
  loading.value = true;

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, author, category, section, is_published, created_at")
      .eq("issue", selectedIssueId.value)
      .order("id", { ascending: true }); // 預設照 ID 排

    if (error) throw error;

    // 深拷貝兩份，一份留底比對，一份給畫面編輯
    allArticles.value = JSON.parse(JSON.stringify(data));
    editedArticles.value = JSON.parse(JSON.stringify(data));
  } catch (err) {
    alert("載入文章失敗：" + err.message);
  } finally {
    loading.value = false;
  }
};

// 監聽期數切換
watch(selectedIssueId, (newId) => {
  if (newId) {
    // 更新網址但不刷新頁面 (方便分享連結)
    router.replace({ query: { issue: newId } });
    fetchArticles();
  }
});

// 判斷單一文章是否有變更
const isModified = (index) => {
  const original = allArticles.value[index];
  const current = editedArticles.value[index];
  if (!original || !current) return false;

  return (
    original.title !== current.title ||
    original.author !== current.author ||
    original.category !== current.category ||
    original.section !== current.section ||
    original.is_published !== current.is_published ||
    original.id !== current.id // 雖然 ID 通常不改，但以防萬一
  );
};

// 計算是否有任何變更 (控制全體儲存按鈕)
const hasAnyChanges = computed(() => {
  return editedArticles.value.some((_, index) => isModified(index));
});

// 單筆儲存
const saveSingle = async (index) => {
  const item = editedArticles.value[index];
  const originalItem = allArticles.value[index];

  // 簡單驗證
  if (!item.title || !item.id) {
    alert("標題與 ID 為必填！");
    return;
  }

  try {
    const { error } = await supabase
      .from("articles")
      .update({
        title: item.title,
        author: item.author,
        category: item.category,
        section: item.section,
        is_published: item.is_published,
      })
      .eq("id", originalItem.id); // 使用原始 ID 當 Key

    if (error) throw error;

    // 成功後更新原始資料狀態
    allArticles.value[index] = JSON.parse(JSON.stringify(item));
    // 這裡不做 alert 避免太吵，可以用 toast 提示，這裡暫時改變按鈕顏色代表成功
  } catch (err) {
    alert(`儲存 ${item.id} 失敗：${err.message}`);
  }
};

// 全體儲存
const saveAll = async () => {
  if (!hasAnyChanges.value) return;
  savingAll.value = true;

  const promises = [];
  editedArticles.value.forEach((item, index) => {
    if (isModified(index)) {
      promises.push(saveSingle(index));
    }
  });

  await Promise.all(promises);
  alert("所有變更已儲存！");
  savingAll.value = false;
};

// 跳轉到詳細編輯器
const goToEditor = (articleId) => {
  // 檢查是否有未儲存內容
  if (hasAnyChanges.value) {
    if (!confirm("您有尚未儲存的列表變更，離開後將會遺失。確定離開？")) {
      return;
    }
  }
  router.push(`/admin/editor/${articleId}`);
};

// 路由守衛：離開前警告
onBeforeRouteLeave((to, from, next) => {
  if (hasAnyChanges.value) {
    const answer = window.confirm("您有尚未儲存的變更，確定要離開嗎？");
    if (answer) {
      next();
    } else {
      next(false);
    }
  } else {
    next();
  }
});

onMounted(() => {
  initData();
});
</script>

<template>
  <div class="page-container">
    <div class="header">
      <div class="left">
        <h2>📚 文章管理</h2>
        <div class="issue-selector">
          <label>選擇期數：</label>
          <select v-model="selectedIssueId" class="issue-select">
            <option
              v-for="issue in issuesOptions"
              :key="issue.id"
              :value="issue.id"
            >
              Vol.{{ issue.id }} {{ issue.title }}
            </option>
          </select>
        </div>
      </div>
      <div class="right">
        <button
          @click="saveAll"
          class="btn-save-all"
          :disabled="!hasAnyChanges || savingAll"
        >
          {{ savingAll ? "儲存中..." : "💾 儲存本頁變更" }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">載入中...</div>

    <div v-else class="table-container">
      <table class="article-table">
        <thead>
          <tr>
            <th width="50">#</th>
            <th width="120">ID</th>
            <th>標題</th>
            <th width="120">作者</th>
            <th width="100">分類</th>
            <th width="100">區塊</th>
            <th width="80">公開</th>
            <th width="100">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in editedArticles"
            :key="item.id"
            :class="{ modified: isModified(index) }"
          >
            <td class="text-center">{{ index + 1 }}</td>
            <td>
              <span
                @click="goToEditor(item.id)"
                class="read-only-id"
                title="點擊進入詳細編輯"
              >
                {{ item.id }}
              </span>
            </td>
            <td>
              <input type="text" v-model="item.title" class="cell-input" />
            </td>
            <td>
              <input type="text" v-model="item.author" class="cell-input" />
            </td>
            <td>
              <select v-model="item.category" class="cell-select">
                <option value="">(無)</option>
                <option value="專題文章">專題文章</option>
                <option value="評論與回應">評論與回應</option>
                <option value="人物專訪">人物專訪</option>
                <option value="生命故事">生命故事</option>
                <option value="時事感想">時事感想</option>
                <option value="文藝創作">文藝創作</option>
                <option value="公告與剪影">公告與剪影</option>
                <option value="封面故事">封面故事</option>
                <option value="光影時刻">光影時刻</option>
                <option value="實驗園地">實驗園地</option>
              </select>
            </td>
            <td>
              <select v-model="item.section" class="cell-select">
                <option value="">(無)</option>
                <option value="特稿專區">特稿專區</option>
                <option value="主題廣場">主題廣場</option>
                <option value="多元講堂">多元講堂</option>
              </select>
            </td>
            <td class="text-center actions-cell">
              <input type="checkbox" v-model="item.is_published" />
            </td>
            <td class="text-center actions-cell">
              <div class="action-buttons">
                <button
                  v-if="isModified(index)"
                  @click="saveSingle(index)"
                  class="btn-save"
                  title="儲存此行"
                >
                  💾
                </button>
                <button
                  @click="goToEditor(item.id)"
                  class="btn-edit"
                  title="詳細編輯"
                >
                  ✎
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* 請保留 ArticlesManager.vue 裡的所有 CSS */
.page-container {
  padding: 0 10px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
.left {
  display: flex;
  align-items: center;
  gap: 20px;
}
h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}
.issue-select {
  padding: 8px;
  font-size: 1rem;
  border-radius: 4px;
  border: 1px solid #ccc;
}
.btn-save-all {
  background-color: #e67e22;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-save-all:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.btn-save-all:hover:not(:disabled) {
  opacity: 0.9;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #888;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}
.article-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}
.article-table th,
.article-table td {
  padding: 10px;
  border-bottom: 1px solid #eee;
  text-align: left;
  vertical-align: middle;
}
.article-table th {
  background-color: #f8f9fa;
  color: #555;
  font-weight: bold;
}
.article-table tr:hover {
  background-color: #f9f9f9;
}
/* 修改過的行顯示黃色背景 */
.article-table tr.modified {
  background-color: #fff8e1;
}

.cell-input,
.cell-select {
  width: 100%;
  padding: 6px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  font-size: 0.95rem;
}
.cell-input:focus,
.cell-select:focus {
  border-color: #3498db;
  background: white;
  outline: none;
}
.cell-input:hover,
.cell-select:hover {
  border-color: #eee;
}

.text-center {
  text-align: center;
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
.btn-edit {
  background-color: #3498db;
  color: white;
}
.btn-save:hover,
.btn-edit:hover {
  transform: scale(1.1);
}
</style>
