<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "~/supabase"; // 修正路徑

// ⭐ 新增：指定後台 Layout 與 權限驗證
definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({ title: "媒體庫管理 - 後台" });

const BUCKET_NAME = "images";

// 狀態管理
const pathStack = ref([]);
const files = ref([]);
const loading = ref(false);
const uploading = ref(false);
const fileInput = ref(null);
const selectedFile = ref(null); // 當前選取的檔案

// 計算當前路徑字串
const currentPath = computed(() => pathStack.value.join("/"));

// 1. 取得公開連結
const getPublicUrl = (path) => {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
};

// 2. 讀取檔案列表
const fetchFiles = async () => {
  loading.value = true;
  files.value = [];
  selectedFile.value = null;

  const searchPath = currentPath.value || "";

  // Supabase 預設只能做基本的字母排序，所以我們抓回來後要在前端自己重排
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(searchPath, {
      limit: 100,
      offset: 0,
      // 這裡先不用 sort，等抓回來我們自己排
    });

  if (error) {
    alert("讀取失敗：" + error.message);
  } else {
    // 前端排序：資料夾在前，檔案在後
    files.value = data.sort((a, b) => {
      // 若一個是資料夾一個是檔案
      if (!a.metadata && b.metadata) return -1; // a 是資料夾
      if (a.metadata && !b.metadata) return 1; // b 是資料夾
      // 同類則照字母排
      return a.name.localeCompare(b.name);
    });
  }
  loading.value = false;
};

// 3. 進入資料夾
const enterFolder = (folderName) => {
  pathStack.value.push(folderName);
  fetchFiles();
};

// 4. 返回上一層
const goUp = () => {
  pathStack.value.pop();
  fetchFiles();
};

// 5. 點擊檔案 (顯示預覽)
const selectFile = (file) => {
  if (file.metadata) {
    // 是檔案
    const fullPath = currentPath.value
      ? `${currentPath.value}/${file.name}`
      : file.name;
    selectedFile.value = {
      ...file,
      url: getPublicUrl(fullPath),
      fullPath: fullPath,
    };
  } else {
    // 是資料夾 -> 進入
    enterFolder(file.name);
  }
};

// 6. 上傳檔案
const triggerUpload = () => {
  fileInput.value.click();
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  uploading.value = true;
  const fileName = file.name;
  const fullPath = currentPath.value
    ? `${currentPath.value}/${fileName}`
    : fileName;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fullPath, file, {
      upsert: true, // 允許覆蓋
    });

  if (error) {
    alert("上傳失敗：" + error.message);
  } else {
    // alert("上傳成功！");
    fetchFiles();
  }
  uploading.value = false;
  // 清空 input 避免重複選檔不觸發 change
  event.target.value = "";
};

// 7. 刪除檔案
const deleteFile = async () => {
  if (!selectedFile.value) return;
  if (!confirm(`確定要刪除 ${selectedFile.value.name} 嗎？`)) return;

  loading.value = true;
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([selectedFile.value.fullPath]);

  if (error) {
    alert("刪除失敗：" + error.message);
  } else {
    selectedFile.value = null;
    fetchFiles();
  }
  loading.value = false;
};

// 8. 複製連結
const copyLink = () => {
  if (!selectedFile.value) return;
  navigator.clipboard.writeText(selectedFile.value.url).then(() => {
    alert("連結已複製到剪貼簿！");
  });
};

// 9. 格式化檔案大小
const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 10. 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString();
};

onMounted(() => {
  fetchFiles();
});
</script>

<template>
  <div class="page-container">
    <h2>🖼️ 媒體庫管理 (Images)</h2>

    <div class="breadcrumb">
      <button
        @click="
          pathStack = [];
          fetchFiles();
        "
        :disabled="pathStack.length === 0"
      >
        根目錄
      </button>
      <span v-for="(folder, index) in pathStack" :key="index">
        / {{ folder }}
      </span>
    </div>

    <div class="toolbar">
      <button v-if="pathStack.length > 0" @click="goUp" class="btn-up">
        ⬆ 上一層
      </button>
      <div class="upload-box">
        <input
          type="file"
          ref="fileInput"
          @change="handleFileUpload"
          style="display: none"
        />
        <button @click="triggerUpload" class="btn-upload" :disabled="uploading">
          {{ uploading ? "上傳中..." : "📤 上傳檔案" }}
        </button>
      </div>
    </div>

    <div class="media-layout">
      <div class="file-list">
        <div v-if="loading" class="loading">載入中...</div>
        <div
          v-else
          v-for="file in files"
          :key="file.id"
          class="file-item"
          :class="{ active: selectedFile && selectedFile.name === file.name }"
          @click="selectFile(file)"
        >
          <div class="icon">
            {{ file.metadata ? "📄" : "📁" }}
          </div>
          <div class="name">{{ file.name }}</div>
        </div>
        <div v-if="!loading && files.length === 0" class="empty">
          此資料夾是空的
        </div>
      </div>

      <div class="file-preview" v-if="selectedFile">
        <h3>檔案詳情</h3>
        <div class="preview-box">
          <img :src="selectedFile.url" class="preview-img" />
        </div>

        <div class="meta-info">
          <div class="meta-row">
            <label>檔名：</label>
            <span>{{ selectedFile.name }}</span>
          </div>
          <div class="meta-row">
            <label>類型：</label>
            <span>{{ selectedFile.metadata.mimetype }}</span>
          </div>
          <div class="meta-row">
            <label>大小：</label>
            <span>{{ formatSize(selectedFile.metadata.size) }}</span>
          </div>
          <div class="meta-row">
            <label>修改時間：</label>
            <span class="date">{{
              formatDate(selectedFile.updated_at || selectedFile.created_at)
            }}</span>
          </div>
        </div>

        <div class="action-buttons">
          <button @click="copyLink" class="btn-copy">📋 複製連結</button>
          <a :href="selectedFile.url" target="_blank" class="btn-open"
            >🔗 開啟</a
          >
          <button @click="deleteFile" class="btn-del">🗑️ 刪除</button>
        </div>
      </div>

      <div class="file-preview empty-state" v-else>
        <div class="large-icon">👈</div>
        <p>請選擇左側檔案以檢視詳情</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 請保留 MediaManager.vue 裡的所有 CSS */
.page-container {
  padding: 0 10px;
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
}
h2 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.breadcrumb {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 5px;
  margin-bottom: 10px;
  font-family: monospace;
  font-size: 1.1rem;
}
.breadcrumb button {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1rem;
  padding: 0;
}
.breadcrumb button:disabled {
  color: #666;
  cursor: default;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
.btn-up,
.btn-upload {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.btn-up {
  background-color: #95a5a6;
  color: white;
}
.btn-upload {
  background-color: #3498db;
  color: white;
}

.media-layout {
  display: flex;
  gap: 20px;
  flex: 1;
  overflow: hidden; /* 防止撐開 */
}

/* 左側列表 */
.file-list {
  flex: 2;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow-y: auto;
  padding: 10px;
}
.file-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}
.file-item:hover {
  background-color: #f9f9f9;
}
.file-item.active {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
}
.icon {
  font-size: 1.5rem;
  margin-right: 15px;
}
.name {
  font-size: 1rem;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.loading,
.empty {
  padding: 20px;
  text-align: center;
  color: #888;
}

/* 右側預覽 */
.file-preview {
  flex: 1;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}
.file-preview.empty-state {
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  color: #aaa;
}

.preview-box {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 20px;
  position: relative;
}

.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* 保持比例 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.large-icon {
  font-size: 5rem;
}

/* Metadata */
.meta-info {
  margin-bottom: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}
.meta-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 0.95rem;
  border-bottom: 1px dashed #f0f0f0;
  padding-bottom: 5px;
}
.meta-row label {
  color: #888;
}
.meta-row span {
  color: #333;
  font-weight: 500;
  text-align: right;
  word-break: break-all;
  max-width: 60%;
}
.meta-row .date {
  font-size: 0.85rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.btn-copy,
.btn-open,
.btn-del {
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: bold;
}
.btn-copy {
  background-color: #2ecc71;
  color: white;
}
.btn-open {
  background-color: #34495e;
  color: white;
}
.btn-del {
  background-color: #e74c3c;
  color: white;
}
</style>
