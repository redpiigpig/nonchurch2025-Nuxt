<script setup>
import { ref, onMounted } from "vue";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({
  title: "作者管理 - 無境界者後台",
});

const authors = ref([]);
const loading = ref(false);
const saving = ref(false);
const supabase = useSupabaseClient();

const showModal = ref(false);
const isEditing = ref(false);
const currentAuthor = ref({
  id: null,
  name: "",
  bio: "",
  author_image: "",
  years_str: "2025",
  is_published: false,
});

const fetchAuthors = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from("authors")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    alert("讀取失敗：" + error.message);
  } else {
    authors.value = data;
  }
  loading.value = false;
};

const openAddModal = () => {
  isEditing.value = false;
  currentAuthor.value = {
    id: null,
    name: "",
    bio: "",
    author_image: "",
    years_str: "2025",
    is_published: false,
  };
  showModal.value = true;
};

const openEditModal = (author) => {
  isEditing.value = true;
  const temp = JSON.parse(JSON.stringify(author));
  if (Array.isArray(temp.years)) {
    temp.years_str = temp.years.join(", ");
  } else {
    temp.years_str = "";
  }
  currentAuthor.value = temp;
  showModal.value = true;
};

const saveAuthor = async () => {
  if (!currentAuthor.value.name) {
    alert("請輸入作者姓名！");
    return;
  }
  saving.value = true;
  try {
    let yearsArray = [];
    if (currentAuthor.value.years_str) {
      yearsArray = currentAuthor.value.years_str
        .split(/[、,,，]/)
        .map((y) => parseInt(y.trim()))
        .filter((y) => !isNaN(y));
    }

    const payload = {
      name: currentAuthor.value.name,
      bio: currentAuthor.value.bio,
      author_image: currentAuthor.value.author_image,
      years: yearsArray,
      is_published: currentAuthor.value.is_published,
    };

    let error = null;
    if (isEditing.value) {
      const { data: updatedRows, error: updateErr } = await supabase
        .from("authors")
        .update(payload)
        .eq("id", currentAuthor.value.id)
        .select("id");
      error =
        updateErr ||
        (!updatedRows || updatedRows.length === 0
          ? new Error("未更新任何資料（可能登入已過期或權限不足）")
          : null);
    } else {
      const { data: insertedRows, error: insertErr } = await supabase
        .from("authors")
        .insert([payload])
        .select("id");
      error =
        insertErr ||
        (!insertedRows || insertedRows.length === 0
          ? new Error("未寫入任何資料（可能登入已過期或權限不足）")
          : null);
    }

    if (error) throw error;

    alert(isEditing.value ? "更新成功！" : "新增成功！(目前為隱藏狀態)");
    showModal.value = false;
    fetchAuthors();
  } catch (err) {
    alert("儲存失敗：" + err.message);
  } finally {
    saving.value = false;
  }
};

const deleteAuthor = async (id, name) => {
  if (!confirm(`確定要刪除作者「${name}」嗎？\n此動作無法復原！`)) return;
  const { error } = await supabase.from("authors").delete().eq("id", id).select("id");
  if (error) {
    alert("刪除失敗：" + error.message);
  } else {
    alert("已刪除！");
    fetchAuthors();
  }
};

onMounted(() => {
  fetchAuthors();
});
</script>

<template>
  <div class="authors-manager">
    <div class="header-row">
      <div>
        <h2>🧑‍🏫 作者管理</h2>
        <p class="desc">管理專欄作者的資料、簡介與頭像。</p>
      </div>
      <button class="btn-add" @click="openAddModal">＋ 新增作者</button>
    </div>

    <div v-if="loading" class="loading">載入中...</div>

    <div class="table-container" v-else>
      <table>
        <thead>
          <tr>
            <th width="60">ID</th>
            <th width="80">頭像</th>
            <th width="120">姓名</th>
            <th>簡介 (Bio)</th>
            <th width="100">所屬年份</th>
            <th width="80">狀態</th>
            <th width="140">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="author in authors" :key="author.id">
            <td class="text-center">{{ author.id }}</td>
            <td class="text-center">
              <div
                class="avatar-thumb"
                :style="{
                  backgroundImage: author.author_image
                    ? `url(${author.author_image})`
                    : 'none',
                }"
              >
                <span v-if="!author.author_image">無</span>
              </div>
            </td>
            <td style="font-weight: bold">{{ author.name }}</td>
            <td class="bio-cell">{{ author.bio }}</td>
            <td class="text-center">
              <span v-if="author.years && author.years.length">
                {{ author.years.join(", ") }}
              </span>
              <span v-else class="text-muted">-</span>
            </td>
            <td class="text-center">
              <span
                :class="['badge', author.is_published ? 'published' : 'draft']"
              >
                {{ author.is_published ? "公開" : "隱藏" }}
              </span>
            </td>
            <td class="text-center actions">
              <button class="btn-edit" @click="openEditModal(author)">
                編輯
              </button>
              <button
                class="btn-delete"
                @click="deleteAuthor(author.id, author.name)"
              >
                刪除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isEditing ? "編輯作者" : "新增作者" }}</h3>
          <button class="btn-close" @click="showModal = false">×</button>
        </div>

        <div class="modal-body">
          <div class="form-row">
            <div class="avatar-preview-section">
              <div
                class="avatar-preview-circle"
                :style="{
                  backgroundImage: currentAuthor.author_image
                    ? `url(${currentAuthor.author_image})`
                    : 'none',
                }"
              >
                <span v-if="!currentAuthor.author_image">預覽</span>
              </div>
              <p class="preview-label">頭像預覽</p>
            </div>

            <div class="form-section">
              <div class="form-group">
                <label>作者姓名 (Name)</label>
                <input
                  type="text"
                  v-model="currentAuthor.name"
                  class="input-text"
                  placeholder="輸入姓名"
                />
              </div>

              <div class="form-group">
                <label>所屬年份 (Years)</label>
                <input
                  type="text"
                  v-model="currentAuthor.years_str"
                  class="input-text"
                  placeholder="例如：2025, 2026"
                />
                <small class="hint"
                  >請輸入年份數字，若有多個年份請用逗號分隔。</small
                >
              </div>

              <div class="form-group">
                <label>大頭貼連結 (Image URL)</label>
                <input
                  type="text"
                  v-model="currentAuthor.author_image"
                  class="input-text"
                  placeholder="https://..."
                />
              </div>

              <div class="form-group">
                <label>狀態</label>
                <div class="radio-group">
                  <label>
                    <input
                      type="radio"
                      :value="true"
                      v-model="currentAuthor.is_published"
                    />
                    公開
                  </label>
                  <label style="margin-left: 15px">
                    <input
                      type="radio"
                      :value="false"
                      v-model="currentAuthor.is_published"
                    />
                    隱藏
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>作者簡介 (Bio)</label>
            <textarea
              v-model="currentAuthor.bio"
              rows="5"
              class="input-area"
              placeholder="請輸入作者簡介..."
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="showModal = false">取消</button>
          <button class="btn-save" @click="saveAuthor" :disabled="saving">
            {{ saving ? "處理中..." : "確認儲存" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS 完全保留 */
.authors-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-row {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
  min-height: 60px;
}

.header-row > div {
  text-align: center;
}

.header-row h2 {
  color: #2c3e50;
  margin-bottom: 5px;
  font-size: 1.8rem;
}

.desc {
  color: #666;
  margin: 0;
}

.btn-add {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background-color: #2c3e50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

.btn-add:hover {
  background-color: #34495e;
}

.btn-edit {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 5px;
}
.btn-edit:hover {
  background-color: #2980b9;
}

.btn-delete {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-delete:hover {
  background-color: #c0392b;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}
th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #444;
}
.text-center {
  text-align: center;
}
.bio-cell {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #666;
}

.avatar-thumb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #eee;
  background-size: cover;
  background-position: center;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: #999;
}

.badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}
.published {
  background: #d4edda;
  color: #155724;
}
.draft {
  background: #f8d7da;
  color: #721c24;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 20px;
}

.modal {
  background: white;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 20px;
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
  font-size: 2rem;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 30px;
  overflow-y: auto;
  flex: 1;
}

.form-row {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
}
.avatar-preview-section {
  width: 120px;
  text-align: center;
  flex-shrink: 0;
}
.avatar-preview-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: #f0f0f0;
  border: 2px dashed #ccc;
  background-size: cover;
  background-position: center;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}
.form-section {
  flex: 1;
}

.form-group {
  margin-bottom: 15px;
}
label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
  color: #555;
}
.input-text,
.input-area {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.hint {
  color: #888;
  font-size: 0.85rem;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-cancel {
  padding: 10px 20px;
  background: #ccc;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-save {
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}
.btn-save:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    gap: 15px;
    height: auto;
  }
  .btn-add {
    position: static;
    transform: none;
    margin-top: 10px;
  }
  .form-row {
    flex-direction: column;
  }
  .avatar-preview-section {
    margin: 0 auto 20px auto;
  }
}
</style>
