<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "~/supabase"; // 修正路徑

// ⭐ 新增：指定後台 Layout 與 權限驗證
definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({ title: "作者管理 - 後台" });

const authors = ref([]);
const loading = ref(false);
const saving = ref(false);

// 彈窗控制
const showModal = ref(false);
const isEditing = ref(false); // true=編輯模式, false=新增模式
const currentAuthor = ref({
  id: null,
  name: "",
  bio: "",
  author_image: "",
  years_str: "2025",
  is_published: false, // 預設狀態
});

// 1. 讀取作者列表
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

// 2. 開啟新增彈窗
const openAddModal = () => {
  isEditing.value = false;
  currentAuthor.value = {
    id: null,
    name: "",
    bio: "",
    author_image: "",
    years_str: "2025", // 預設帶入今年
    is_published: false,
  };
  showModal.value = true;
};

// 3. 開啟編輯彈窗
const openEditModal = (author) => {
  isEditing.value = true;
  const years = author.years || [];
  currentAuthor.value = {
    ...author,
    years_str: years.join(", "),
  };
  showModal.value = true;
};

// 4. 儲存 (新增或更新)
const saveAuthor = async () => {
  if (!currentAuthor.value.name) {
    alert("請輸入作者姓名");
    return;
  }

  saving.value = true;

  // 處理年份字串轉陣列
  const yearsArray = currentAuthor.value.years_str
    .split(/[,，、]/) // 支援多種分隔符
    .map((y) => parseInt(y.trim()))
    .filter((y) => !isNaN(y));

  const payload = {
    name: currentAuthor.value.name,
    bio: currentAuthor.value.bio,
    author_image: currentAuthor.value.author_image,
    years: yearsArray,
    is_published: currentAuthor.value.is_published,
  };

  try {
    if (isEditing.value) {
      // 更新
      const { error } = await supabase
        .from("authors")
        .update(payload)
        .eq("id", currentAuthor.value.id);
      if (error) throw error;
    } else {
      // 新增
      const { error } = await supabase.from("authors").insert([payload]);
      if (error) throw error;
    }

    alert("儲存成功！");
    showModal.value = false;
    fetchAuthors();
  } catch (err) {
    alert("儲存失敗：" + err.message);
  } finally {
    saving.value = false;
  }
};

// 5. 刪除作者 (小心使用)
const deleteAuthor = async (id) => {
  if (!confirm("確定要刪除這位作者嗎？此操作無法復原！")) return;

  try {
    const { error } = await supabase.from("authors").delete().eq("id", id);
    if (error) throw error;
    alert("已刪除");
    fetchAuthors();
  } catch (err) {
    alert("刪除失敗 (可能還有關聯文章)：" + err.message);
  }
};

onMounted(() => {
  fetchAuthors();
});
</script>

<template>
  <div class="page-container">
    <div class="header">
      <h2>🧑‍🏫 專欄作者管理</h2>
      <button @click="openAddModal" class="btn-add">＋ 新增作者</button>
    </div>

    <div v-if="loading" class="loading">載入中...</div>

    <div class="grid-container">
      <div v-for="author in authors" :key="author.id" class="author-card">
        <div class="card-status" :class="{ published: author.is_published }">
          {{ author.is_published ? "公開" : "隱藏" }}
        </div>
        <img
          :src="author.author_image || 'https://via.placeholder.com/150'"
          class="avatar"
        />
        <h3>{{ author.name }}</h3>
        <p class="years">年度：{{ (author.years || []).join(", ") }}</p>
        <div class="actions">
          <button @click="openEditModal(author)" class="btn-edit">編輯</button>
          <button @click="deleteAuthor(author.id)" class="btn-del">刪除</button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <h3>{{ isEditing ? "編輯作者" : "新增作者" }}</h3>

        <div class="modal-body">
          <div class="form-cols">
            <div class="avatar-section">
              <div
                class="avatar-circle"
                :style="{
                  backgroundImage: `url(${currentAuthor.author_image})`,
                }"
              >
                <span v-if="!currentAuthor.author_image">無照片</span>
              </div>
            </div>
            <div class="form-section">
              <div class="form-group">
                <label>姓名</label>
                <input
                  v-model="currentAuthor.name"
                  type="text"
                  class="input-text"
                />
              </div>
              <div class="form-group">
                <label>大頭貼連結 (URL)</label>
                <input
                  v-model="currentAuthor.author_image"
                  type="text"
                  class="input-text"
                  placeholder="https://..."
                />
              </div>
              <div class="form-group">
                <label>參與年度 (用逗號分隔)</label>
                <input
                  v-model="currentAuthor.years_str"
                  type="text"
                  class="input-text"
                  placeholder="2025, 2026"
                />
              </div>
              <div class="form-group">
                <label>公開狀態</label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="currentAuthor.is_published" />
                  <span>{{
                    currentAuthor.is_published ? "設為公開" : "暫時隱藏"
                  }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>簡介 (Bio)</label>
            <textarea
              v-model="currentAuthor.bio"
              rows="5"
              class="input-area"
            ></textarea>
            <p class="hint">支援換行，會在前台顯示。</p>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showModal = false" class="btn-cancel">取消</button>
          <button @click="saveAuthor" class="btn-save" :disabled="saving">
            {{ saving ? "儲存中..." : "確認儲存" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 請保留 AuthorsManager.vue 裡的所有 CSS */
.page-container {
  padding: 0 10px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.btn-add {
  background-color: #2c3e50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}
.btn-add:hover {
  background-color: #34495e;
}
.loading {
  text-align: center;
  color: #888;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}
.author-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  position: relative;
  transition: transform 0.2s;
}
.author-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1);
}
.card-status {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: #eee;
  color: #999;
}
.card-status.published {
  background: #d4edda;
  color: #155724;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #f0f0f0;
  margin-bottom: 10px;
}
.years {
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 15px;
}
.actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}
.btn-edit {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-del {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

/* Modal */
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
  max-width: 600px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}
.modal h3 {
  margin: 0;
  padding: 20px;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
  border-radius: 8px 8px 0 0;
}
.modal-body {
  padding: 20px;
}
.form-cols {
  display: flex;
  gap: 20px;
}
.avatar-section {
  flex-shrink: 0;
}
.avatar-circle {
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
.btn-save {
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-cancel {
  padding: 10px 20px;
  background-color: #ccc;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
@media (max-width: 600px) {
  .form-cols {
    flex-direction: column;
    align-items: center;
  }
}
</style>
