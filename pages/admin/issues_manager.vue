<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "~/supabase"; // 修正路徑

// ⭐ 新增：指定後台 Layout 與 權限驗證
definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({ title: "期刊主題管理 - 後台" });

const issues = ref([]);
const loading = ref(false);
const saving = ref(false);

// 編輯彈窗控制
const showModal = ref(false);
const editingIssue = ref({});

// 1. 讀取列表
const fetchIssues = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    alert("讀取失敗：" + error.message);
  } else {
    issues.value = data;
  }
  loading.value = false;
};

// 2. 開啟編輯模式
const openEditModal = (issue) => {
  // 深拷貝物件，避免直接修改列表顯示
  const tempIssue = JSON.parse(JSON.stringify(issue));

  // 特殊處理：將 author_order 陣列轉為字串 (用逗號分隔)，方便編輯
  if (Array.isArray(tempIssue.author_order)) {
    tempIssue.author_order_str = tempIssue.author_order.join("、");
  } else {
    tempIssue.author_order_str = "";
  }

  editingIssue.value = tempIssue;
  showModal.value = true;
};

// 3. 儲存修改
const saveIssue = async () => {
  saving.value = true;
  try {
    // 處理 author_order 字串轉陣列
    let orderArray = null;
    if (editingIssue.value.author_order_str) {
      orderArray = editingIssue.value.author_order_str
        .split(/[、,]/) // 支援頓號或逗號
        .map((s) => s.trim())
        .filter((s) => s);
    }

    const payload = {
      title: editingIssue.value.title,
      date: editingIssue.value.date,
      cover_img: editingIssue.value.cover_img,
      pdf_link: editingIssue.value.pdf_link,
      intro_home: editingIssue.value.intro_home,
      intro_cfp: editingIssue.value.intro_cfp,
      cfp_title: editingIssue.value.cfp_title,
      cfp_theme: editingIssue.value.cfp_theme,
      cfp_deadline: editingIssue.value.cfp_deadline,
      cfp_image: editingIssue.value.cfp_image,
      author_order: orderArray,
      is_published: editingIssue.value.is_published, // 允許直接修改發布狀態
    };

    const { error } = await supabase
      .from("issues")
      .update(payload)
      .eq("id", editingIssue.value.id);

    if (error) throw error;

    alert("儲存成功！");
    showModal.value = false;
    fetchIssues(); // 重新讀取
  } catch (err) {
    alert("儲存失敗：" + err.message);
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  fetchIssues();
});
</script>

<template>
  <div class="page-container">
    <h2>📅 期刊主題管理</h2>
    <p class="desc">
      設定每期的標題、封面圖、PDF連結、首頁介紹詞、徵稿主題等。
    </p>

    <div v-if="loading" class="loading">載入中...</div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th width="60">期數</th>
            <th>標題</th>
            <th>發刊日</th>
            <th>狀態</th>
            <th width="100">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="issue in issues" :key="issue.id">
            <td class="text-center">{{ issue.id }}</td>
            <td>{{ issue.title }}</td>
            <td>{{ issue.date }}</td>
            <td class="text-center">
              <span
                class="status-tag"
                :class="issue.is_published ? 'pub' : 'draft'"
              >
                {{ issue.is_published ? "已發布" : "隱藏中" }}
              </span>
            </td>
            <td class="text-center">
              <button @click="openEditModal(issue)" class="btn-edit">
                編輯
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal large-modal">
        <div class="modal-header">
          <h3>編輯 第 {{ editingIssue.id }} 期</h3>
          <button @click="showModal = false" class="btn-close">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-row">
            <div class="form-group half">
              <label>期刊標題</label>
              <input
                v-model="editingIssue.title"
                type="text"
                class="input-text"
              />
            </div>
            <div class="form-group half">
              <label>發刊日期</label>
              <input
                v-model="editingIssue.date"
                type="text"
                class="input-text"
                placeholder="YYYY.MM"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label>封面圖片連結 (Cover Image)</label>
              <input
                v-model="editingIssue.cover_img"
                type="text"
                class="input-text"
              />
              <div v-if="editingIssue.cover_img" class="preview-box">
                <img :src="editingIssue.cover_img" height="100" />
              </div>
            </div>
            <div class="form-group half">
              <label>PDF 下載連結</label>
              <input
                v-model="editingIssue.pdf_link"
                type="text"
                class="input-text"
              />
            </div>
          </div>

          <div class="form-group">
            <label>首頁介紹詞 (Intro Home)</label>
            <textarea
              v-model="editingIssue.intro_home"
              rows="4"
              class="input-area"
            ></textarea>
          </div>

          <hr />
          <h4>下期徵稿設定 (Next Issue CFP)</h4>

          <div class="form-row">
            <div class="form-group half">
              <label>徵稿標題</label>
              <input
                v-model="editingIssue.cfp_title"
                type="text"
                class="input-text"
              />
            </div>
            <div class="form-group half">
              <label>截稿日期</label>
              <input
                v-model="editingIssue.cfp_deadline"
                type="text"
                class="input-text"
              />
            </div>
          </div>

          <div class="form-group">
            <label>徵稿說明文案 (CFP Theme)</label>
            <textarea
              v-model="editingIssue.cfp_theme"
              rows="4"
              class="input-area"
            ></textarea>
          </div>

          <div class="form-group">
            <label>徵稿主題圖片連結 (CFP Image)</label>
            <input
              v-model="editingIssue.cfp_image"
              type="text"
              class="input-text"
            />
            <div v-if="editingIssue.cfp_image" class="preview-box">
              <img :src="editingIssue.cfp_image" height="100" />
            </div>
          </div>

          <div class="form-group">
            <label>作者排序 (首頁顯示順序)</label>
            <input
              v-model="editingIssue.author_order_str"
              type="text"
              class="input-text"
              placeholder="作者A、作者B、作者C (請用頓號或逗號分隔)"
            />
            <span class="hint"
              >※
              若不設定，將依照文章ID排序。此設定僅影響首頁「本期作者」區塊。</span
            >
          </div>

          <div class="form-group">
            <label>發布狀態</label>
            <label class="switch-label">
              <input type="checkbox" v-model="editingIssue.is_published" />
              <span class="status-text">{{
                editingIssue.is_published ? "公開 (Published)" : "隱藏 (Draft)"
              }}</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showModal = false" class="btn-cancel">取消</button>
          <button @click="saveIssue" class="btn-save" :disabled="saving">
            {{ saving ? "儲存中..." : "儲存變更" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 請保留 IssuesManager.vue 裡的所有 CSS */
.page-container {
  padding: 0 10px;
}
h2 {
  color: #2c3e50;
  margin-bottom: 5px;
}
.desc {
  color: #666;
  margin-bottom: 20px;
}
.loading {
  text-align: center;
  font-size: 1.2rem;
  color: #888;
  margin: 20px;
}
.table-wrapper {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  text-align: left;
}
th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #555;
}
.text-center {
  text-align: center;
}
.status-tag {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: bold;
}
.status-tag.pub {
  background-color: #d4edda;
  color: #155724;
}
.status-tag.draft {
  background-color: #fff3cd;
  color: #856404;
}
.btn-edit {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-edit:hover {
  background-color: #2980b9;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}
.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}
.modal-body {
  padding: 20px;
  overflow-y: auto;
}
.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-group {
  margin-bottom: 15px;
}
.form-row {
  display: flex;
  gap: 20px;
}
.form-group.half {
  flex: 1;
}
label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 0.95rem;
  color: #555;
}
.input-text {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.input-area {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
}
.hint {
  display: block;
  margin-top: 5px;
  font-size: 0.85rem;
  color: #888;
}
.preview-box {
  margin-top: 10px;
  padding: 5px;
  border: 1px dashed #ccc;
  display: inline-block;
}
.btn-save {
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.btn-save:disabled {
  background-color: #94d3a2;
}
.btn-cancel {
  padding: 10px 20px;
  background-color: #ccc;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.switch-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.switch-label input {
  margin-right: 10px;
  transform: scale(1.5);
}
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
