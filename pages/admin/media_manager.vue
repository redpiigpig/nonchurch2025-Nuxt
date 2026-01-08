<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "~/supabase";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({
  title: "媒體庫管理 - 無境界者後台",
});

const BUCKET_NAME = "images";

const pathStack = ref([]);
const files = ref([]);
const loading = ref(false);
const uploading = ref(false);
const fileInput = ref(null);
const selectedFile = ref(null);

const currentPath = computed(() => pathStack.value.join("/"));

const getPublicUrl = (path) => {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
};

const fetchFiles = async () => {
  loading.value = true;
  files.value = [];
  selectedFile.value = null;

  const searchPath = currentPath.value || "";

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(searchPath, {
      limit: 100,
      offset: 0,
    });

  if (error) {
    alert("讀取失敗：" + error.message);
  } else {
    files.value = data
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((file) => ({
        ...file,
        isFolder: !file.metadata || file.id === null,
        fullPath: searchPath ? `${searchPath}/${file.name}` : file.name,
        type:
          file.metadata?.mimetype || (file.id === null ? "folder" : "unknown"),
        size: file.metadata
          ? (file.metadata.size / 1024).toFixed(1) + " KB"
          : "-",
        updated: file.updated_at
          ? new Date(file.updated_at).toLocaleString()
          : "-",
      }));

    files.value.sort((a, b) => {
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }
  loading.value = false;
};

const handleRowClick = (file) => {
  selectedFile.value = file;
};

const handleRowDbClick = (file) => {
  if (file.isFolder) {
    pathStack.value.push(file.name);
    fetchFiles();
  }
};

const goToBreadcrumb = (index) => {
  if (index === -1) {
    pathStack.value = [];
  } else {
    pathStack.value = pathStack.value.slice(0, index + 1);
  }
  fetchFiles();
};

const handleUploadClick = () => fileInput.value.click();

const uploadFile = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  uploading.value = true;
  try {
    const targetPath = currentPath.value
      ? `${currentPath.value}/${file.name}`
      : file.name;
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(targetPath, file, {
        upsert: false,
      });
    if (error) throw error;
    alert("上傳成功！");
    fetchFiles();
  } catch (err) {
    alert("上傳失敗：" + err.message);
  } finally {
    uploading.value = false;
    event.target.value = "";
  }
};

const renameFile = async () => {
  if (!selectedFile.value) return;
  const file = selectedFile.value;
  const newName = prompt("請輸入新名稱 (請保留副檔名):", file.name);
  if (!newName || newName === file.name) return;
  loading.value = true;
  try {
    const parent = currentPath.value;
    const fromPath = parent ? `${parent}/${file.name}` : file.name;
    const toPath = parent ? `${parent}/${newName}` : newName;
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .move(fromPath, toPath);
    if (error) throw error;
    await fetchFiles();
  } catch (err) {
    alert("改名失敗：" + err.message);
  } finally {
    loading.value = false;
  }
};

const deleteFile = async () => {
  if (!selectedFile.value) return;
  const file = selectedFile.value;
  if (!confirm(`確定要刪除「${file.name}」嗎？`)) return;
  loading.value = true;
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([file.fullPath]);
    if (error) throw error;
    fetchFiles();
  } catch (err) {
    alert("刪除失敗：" + err.message);
  } finally {
    loading.value = false;
  }
};

const copyLink = (file) => {
  const target = file || selectedFile.value;
  if (!target) return;
  const url = getPublicUrl(target.fullPath);
  navigator.clipboard.writeText(url).then(() => {
    alert(`已複製連結！📋\n${target.name}`);
  });
};

onMounted(() => {
  fetchFiles();
});
</script>

<template>
  <div class="media-manager">
    <div class="header">
      <h2>🖼️ 媒體庫管理</h2>
      <p class="desc">左側點擊「🔗」可直接複製連結，雙擊資料夾可進入。</p>
    </div>

    <div class="toolbar">
      <div class="breadcrumbs">
        <span class="crumb root" @click="goToBreadcrumb(-1)">🏠 Home</span>
        <template v-for="(folder, index) in pathStack" :key="index">
          <span class="sep">/</span>
          <span class="crumb" @click="goToBreadcrumb(index)">{{ folder }}</span>
        </template>
      </div>
      <div class="actions">
        <input type="file" ref="fileInput" hidden @change="uploadFile" />
        <button
          class="btn primary"
          @click="handleUploadClick"
          :disabled="uploading"
        >
          {{ uploading ? "上傳中..." : "☁️ 上傳檔案" }}
        </button>
        <button class="btn outline" @click="fetchFiles">🔄</button>
      </div>
    </div>

    <div class="split-view">
      <div class="file-list-panel">
        <div v-if="loading" class="loading">載入中...</div>
        <div v-else-if="files.length === 0" class="empty-state">
          此資料夾是空的 🍂
        </div>

        <table v-else class="file-table">
          <thead>
            <tr>
              <th width="40"></th>
              <th>名稱</th>
              <th width="50" class="text-center">連結</th>
              <th width="80" class="mobile-hide">大小</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="file in files"
              :key="file.id || file.name"
              :class="{
                active: selectedFile && selectedFile.name === file.name,
              }"
              @click="handleRowClick(file)"
              @dblclick="handleRowDbClick(file)"
            >
              <td class="icon-cell">
                <span v-if="file.isFolder">📁</span>
                <span v-else-if="file.name.endsWith('.pdf')">📄</span>
                <span v-else>🖼️</span>
              </td>
              <td class="name-cell" :title="file.name">{{ file.name }}</td>

              <td class="text-center" @click.stop>
                <button
                  v-if="!file.isFolder"
                  class="btn-icon-copy"
                  title="複製連結"
                  @click="copyLink(file)"
                >
                  🔗
                </button>
              </td>

              <td class="meta-cell mobile-hide">{{ file.size }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="preview-panel">
        <div v-if="selectedFile" class="preview-content">
          <div class="preview-header">
            <h3>檔案詳情</h3>
            <button class="close-btn" @click="selectedFile = null">×</button>
          </div>

          <div class="preview-box">
            <div v-if="selectedFile.isFolder" class="large-icon folder">📁</div>
            <div
              v-else-if="selectedFile.name.endsWith('.pdf')"
              class="large-icon pdf"
            >
              📄
            </div>

            <img
              v-else
              :key="selectedFile.fullPath"
              :src="getPublicUrl(selectedFile.fullPath)"
              class="preview-img"
              alt="Preview"
              @error="
                (e) =>
                  (e.target.src =
                    'https://placehold.co/400x300?text=Image+Load+Error')
              "
            />
          </div>

          <div class="meta-info">
            <div class="meta-row">
              <label>名稱</label>
              <span>{{ selectedFile.name }}</span>
            </div>
            <div class="meta-row">
              <label>大小</label>
              <span>{{ selectedFile.size }}</span>
            </div>
            <div class="meta-row">
              <label>類型</label>
              <span>{{ selectedFile.type }}</span>
            </div>
            <div class="meta-row">
              <label>更新時間</label>
              <span class="date">{{ selectedFile.updated }}</span>
            </div>
          </div>

          <div class="action-buttons" v-if="!selectedFile.isFolder">
            <button class="btn full blue" @click="copyLink(null)">
              🔗 複製連結
            </button>
            <div class="btn-group">
              <button class="btn outline" @click="renameFile">✎ 改名</button>
              <button class="btn outline red" @click="deleteFile">
                🗑️ 刪除
              </button>
            </div>

            <a
              :href="getPublicUrl(selectedFile.fullPath)"
              target="_blank"
              class="download-link"
            >
              在新分頁開啟原始圖片 ↗
            </a>
          </div>

          <div class="action-buttons" v-else>
            <button class="btn full" @click="handleRowDbClick(selectedFile)">
              📂 進入資料夾
            </button>
            <button
              class="btn outline red"
              @click="deleteFile"
              style="margin-top: 10px"
            >
              🗑️ 刪除資料夾
            </button>
          </div>
        </div>

        <div v-else class="no-selection">
          <span class="placeholder-icon">👈</span>
          <p>請從左側列表點選檔案</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.media-manager {
  padding: 20px;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  background-color: #f4f6f9;
}
.header {
  text-align: center;
  margin-bottom: 15px;
}
.header h2 {
  margin: 0;
  color: #2c3e50;
}
.desc {
  color: #666;
  font-size: 1.2rem;
  margin: 5px 0 0 0;
}

.toolbar {
  background: white;
  padding: 10px 20px;
  border: 1px solid #ddd;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.breadcrumbs {
  display: flex;
  align-items: center;
  font-size: 1.2rem;
  color: #555;
}
.crumb {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.crumb:hover {
  background: #eee;
  color: #000;
}
.root {
  color: #007bff;
  font-weight: bold;
}
.sep {
  color: #999;
  margin: 0 5px;
}
.actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: 0.2s;
}
.btn.primary {
  background: #2c3e50;
  color: white;
}
.btn.primary:hover {
  background: #34495e;
}
.btn.outline {
  background: white;
  border: 1px solid #ccc;
  color: #555;
}
.btn.outline:hover {
  background: #f8f9fa;
  border-color: #bbb;
}
.btn.blue {
  background: #007bff;
  color: white;
}
.btn.blue:hover {
  background: #0056b3;
}
.btn.red {
  color: #e74c3c;
  border-color: #e74c3c;
}
.btn.red:hover {
  background: #fff5f5;
}
.btn.full {
  width: 100%;
}
.btn-group {
  display: flex;
  gap: 10px;
}
.btn-group button {
  flex: 1;
}

.btn-icon-copy {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 0.9rem;
  transition: all 0.2s;
  color: #555;
}
.btn-icon-copy:hover {
  background: #2c3e50;
  color: white;
  border-color: #2c3e50;
}

.split-view {
  flex: 1;
  display: flex;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.file-list-panel {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  border-right: 1px solid #eee;
}

.preview-panel {
  flex: 1;
  min-width: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.file-table th {
  background: #f9fafb;
  padding: 12px 10px;
  text-align: left;
  font-size: 0.9rem;
  color: #666;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}
.file-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 1.2rem;
  cursor: pointer;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}
.file-table tr:hover {
  background: #f8f9fa;
}
.file-table tr.active {
  background: #e7f1ff;
  border-left: 3px solid #007bff;
}
.icon-cell {
  text-align: center;
  font-size: 1.2rem;
  width: 40px;
}
.text-center {
  text-align: center;
}
.name-cell {
  font-weight: 500;
}
.meta-cell {
  font-size: 0.85rem;
  color: #888;
}

.preview-content {
  padding: 30px;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.preview-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.preview-box {
  width: 100%;
  min-height: 350px;
  flex: 1;
  background: #f8f9fa;
  border: 1px solid #eee;
  border-radius: 8px;
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
  object-fit: contain;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.large-icon {
  font-size: 5rem;
}

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

.download-link {
  text-align: center;
  display: block;
  margin-top: 15px;
  color: #007bff;
  font-size: 0.9rem;
  text-decoration: none;
}
.download-link:hover {
  text-decoration: underline;
}

.loading,
.empty-state,
.no-selection {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}
.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 15px;
  opacity: 0.3;
}

@media (max-width: 768px) {
  .split-view {
    flex-direction: column;
  }
  .mobile-hide {
    display: none;
  }
  .preview-panel {
    border-left: none;
    border-top: 1px solid #ddd;
    height: 50vh;
  }
}
</style>
