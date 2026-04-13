<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { supabase } from "~/supabase";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({
  title: "媒體庫管理 - 無境界者後台",
});

const BUCKET_NAME = "images";

// ─── 視圖切換 ───
const viewMode = ref("article"); // 'article' 專屬連動模式 | 'raw' 原始資料夾模式

// ==========================================
// 模式一：文章專屬連動模式 (Article Mode)
// ==========================================
const issuesList = ref([]);
const articlesList = ref([]);
const articleImages = ref([]);
const selectedIssue = ref(null);
const selectedArticle = ref(null);

const loadingUI = ref(false);
const uploadingArt = ref(false);
const fileInputArt = ref(null);

// 1. 載入期數與文章
const loadIssuesAndArticles = async () => {
  loadingUI.value = true;
  try {
    const { data: issues } = await supabase
      .from("issues")
      .select("id, title")
      .order("id", { ascending: false });
    issuesList.value = issues || [];

    if (issues?.length) {
      selectedIssue.value = issues[0].id;
      await loadArticles(issues[0].id);
    }
  } catch (err) {
    console.error(err);
  } finally {
    loadingUI.value = false;
  }
};

const loadArticles = async (issueId) => {
  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, sort_order")
    .eq("issue", issueId)
    .order("sort_order", { ascending: true });

  let list = articles || [];

  // 強制前端依據 ID 內的「數字」大小進行排序
  list.sort((a, b) => {
    const getSeq = (idStr) => {
      const match = idStr.match(/-(\d+)/);
      return match ? parseInt(match[1], 10) : 999;
    };
    const seqA = getSeq(a.id);
    const seqB = getSeq(b.id);
    if (seqA !== seqB) return seqA - seqB;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  articlesList.value = list;
  selectedArticle.value = list.length ? list[0] : null;
};

// 2. 載入某篇文章的圖片
const loadArticleImages = async () => {
  if (!selectedArticle.value || !selectedIssue.value) {
    articleImages.value = [];
    return;
  }
  loadingUI.value = true;

  try {
    const articleIdStr = selectedArticle.value.id;
    const match = articleIdStr.match(/^(\d+)-(\d+)/);
    if (!match) {
      articleImages.value = [];
      loadingUI.value = false;
      return;
    }
    const issueNum = match[1];
    const seqNum = match[2];

    const { data: dbAssets } = await supabase
      .from("media_assets")
      .select("*")
      .eq("article_id", articleIdStr)
      .order("sort_order", { ascending: true });

    let combinedImages = dbAssets ? [...dbAssets] : [];
    const existingUrls = combinedImages.map((img) => img.image_url);

    const response = await $fetch(`/api/media`, {
      method: "GET",
      query: { path: `articles/issue-${selectedIssue.value}` },
    });

    if (response.success && response.data) {
      const cloudinaryFiles = response.data;

      // 🌟 終極防護網：強制檔名「開頭」比對
      // ^ : 必須從開頭算起
      // (?:issue)? : 可能有 issue 也可能沒有
      // (?=[_\-\.]|$) : 數字結束後，只能接 _ 或 - 或 . 或直接結束
      const regex = new RegExp(
        `^(?:issue)?${issueNum}[_-]${seqNum}(?=[_\\-\\.]|$)`,
        "i",
      );

      const newFoundFromCloud = [];

      cloudinaryFiles.forEach((file) => {
        if (file.isFolder) return;

        if (regex.test(file.name) && !existingUrls.includes(file.url)) {
          // 抓取最後的數字作為排序 (支援有無副檔名)
          const orderMatch = file.name.match(/[_-](\d+)(?:\.[a-z0-9]+)?$/i);
          const rawOrder = orderMatch ? parseInt(orderMatch[1], 10) : 999;

          newFoundFromCloud.push({
            issue_id: selectedIssue.value,
            article_id: articleIdStr,
            cloudinary_id: file.fullPath,
            image_url: file.url,
            rawOrder: rawOrder,
          });
        }
      });

      if (newFoundFromCloud.length > 0) {
        newFoundFromCloud.sort((a, b) => a.rawOrder - b.rawOrder);

        let startOrder =
          combinedImages.length > 0
            ? Math.max(...combinedImages.map((img) => img.sort_order)) + 1
            : 1;

        const inserts = newFoundFromCloud.map((img) => ({
          issue_id: img.issue_id,
          article_id: img.article_id,
          cloudinary_id: img.cloudinary_id,
          image_url: img.image_url,
          sort_order: startOrder++,
        }));

        await supabase.from("media_assets").insert(inserts);

        const { data: updatedDb } = await supabase
          .from("media_assets")
          .select("*")
          .eq("article_id", articleIdStr)
          .order("sort_order", { ascending: true });
        combinedImages = updatedDb || [];
      }
    }

    articleImages.value = combinedImages;
  } catch (err) {
    console.error("載入圖片發生錯誤:", err);
  } finally {
    loadingUI.value = false;
  }
};

watch(selectedIssue, async (newVal) => {
  if (newVal) await loadArticles(newVal);
});
watch(selectedArticle, async () => {
  await loadArticleImages();
});

// 3. 上傳文章專屬圖片
const handleArtUploadClick = () => fileInputArt.value.click();

const uploadArtImage = async (event) => {
  const file = event.target.files[0];
  if (!file || !selectedArticle.value) return;

  uploadingArt.value = true;
  try {
    const match = selectedArticle.value.id.match(/^(\d+-\d+)/);
    const shortId = match ? match[1] : selectedArticle.value.id;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", `articles/issue-${selectedIssue.value}`);

    const uploadRes = await $fetch("/api/media", {
      method: "POST",
      body: formData,
    });
    if (!uploadRes.success) throw new Error(uploadRes.error);

    const cloudData = uploadRes.data;

    const nextOrder =
      articleImages.value.length > 0
        ? Math.max(...articleImages.value.map((i) => i.sort_order)) + 1
        : 1;

    const { error: dbErr } = await supabase.from("media_assets").insert({
      issue_id: selectedIssue.value,
      article_id: selectedArticle.value.id,
      cloudinary_id: cloudData.public_id,
      image_url: cloudData.secure_url,
      sort_order: nextOrder,
    });

    if (dbErr) throw dbErr;
    await loadArticleImages();
  } catch (err) {
    alert("上傳失敗：" + err.message);
  } finally {
    uploadingArt.value = false;
    event.target.value = "";
  }
};

// 4. 排序互換
const moveImage = async (index, direction) => {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= articleImages.value.length) return;

  const imgA = articleImages.value[index];
  const imgB = articleImages.value[newIndex];

  const tempOrder = imgA.sort_order;
  imgA.sort_order = imgB.sort_order;
  imgB.sort_order = tempOrder;

  loadingUI.value = true;
  await supabase.from("media_assets").upsert([
    { id: imgA.id, sort_order: imgA.sort_order },
    { id: imgB.id, sort_order: imgB.sort_order },
  ]);
  await loadArticleImages();
};

// 5. 刪除專屬圖片
const deleteArtImage = async (img) => {
  if (
    !confirm(`確定要刪除這張圖片嗎？\n(這也會同時從 Cloudinary 刪除實體檔案)`)
  )
    return;

  loadingUI.value = true;
  try {
    await $fetch("/api/media", {
      method: "PUT",
      body: {
        action: "delete",
        public_id: img.cloudinary_id,
        resource_type: "image",
      },
    });

    await supabase.from("media_assets").delete().eq("id", img.id);

    const { data: remaining } = await supabase
      .from("media_assets")
      .select("*")
      .eq("article_id", selectedArticle.value.id)
      .order("sort_order");
    if (remaining) {
      for (let i = 0; i < remaining.length; i++) {
        await supabase
          .from("media_assets")
          .update({ sort_order: i + 1 })
          .eq("id", remaining[i].id);
      }
    }

    await loadArticleImages();
  } catch (err) {
    alert("刪除失敗：" + err.message);
  } finally {
    loadingUI.value = false;
  }
};

// 🌟 直接複製真實的圖片 URL
const copyUrl = (url) => {
  navigator.clipboard.writeText(url);
  alert(`已複製圖片網址！📋\n${url}`);
};

// ==========================================
// 模式二：原始 Cloudinary 資料夾模式 (Raw Mode)
// ==========================================
const pathStack = ref([]);
const files = ref([]);
const loadingRaw = ref(false);
const uploadingRaw = ref(false);
const fileInputRaw = ref(null);
const selectedFile = ref(null);

const currentPath = computed(() => pathStack.value.join("/"));
const getPublicUrlRaw = (file) => (file ? file.url : "");

const fetchFiles = async () => {
  loadingRaw.value = true;
  files.value = [];
  selectedFile.value = null;

  try {
    const searchPath = currentPath.value || "";
    const response = await $fetch(`/api/media`, {
      method: "GET",
      query: { path: searchPath },
    });
    if (!response.success) throw new Error(response.error);

    files.value = response.data
      .map((file) => ({
        ...file,
        type: file.isFolder ? "folder" : file.format || "unknown",
        size: file.size ? (file.size / 1024).toFixed(1) + " KB" : "-",
        updated: file.updated_at
          ? new Date(file.updated_at).toLocaleString()
          : "-",
      }))
      .sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
  } catch (error) {
    alert("讀取失敗：" + error.message);
  } finally {
    loadingRaw.value = false;
  }
};

const handleRowDbClick = (file) => {
  if (file.isFolder) {
    pathStack.value.push(file.name);
    fetchFiles();
  }
};
const goToBreadcrumb = (index) => {
  pathStack.value = index === -1 ? [] : pathStack.value.slice(0, index + 1);
  fetchFiles();
};
const handleUploadClickRaw = () => fileInputRaw.value.click();

const uploadFileRaw = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  uploadingRaw.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", currentPath.value);
    const response = await $fetch("/api/media", {
      method: "POST",
      body: formData,
    });
    if (!response.success) throw new Error(response.error);
    alert("上傳成功！");
    fetchFiles();
  } catch (err) {
    alert("上傳失敗：" + err.message);
  } finally {
    uploadingRaw.value = false;
    event.target.value = "";
  }
};

const createFolder = async () => {
  const folderName = prompt("請輸入新資料夾名稱：");
  if (!folderName?.trim()) return;
  loadingRaw.value = true;
  try {
    const targetPath = currentPath.value
      ? `${currentPath.value}/${folderName.trim()}`
      : folderName.trim();
    const response = await $fetch("/api/media", {
      method: "PUT",
      body: { action: "create_folder", folder_path: targetPath },
    });
    if (!response.success) throw new Error(response.error);
    fetchFiles();
  } catch (err) {
    alert("建立失敗：" + err.message);
  } finally {
    loadingRaw.value = false;
  }
};

const renameFileRaw = async () => {
  if (!selectedFile.value || selectedFile.value.isFolder) return;
  const file = selectedFile.value;
  const newNameExt = prompt("請輸入新名稱 (請保留副檔名):", file.name);
  if (!newNameExt || newNameExt === file.name) return;
  const parent = currentPath.value;
  const newName =
    newNameExt.substring(0, newNameExt.lastIndexOf(".")) || newNameExt;
  const toPath = parent ? `${parent}/${newName}` : newName;
  loadingRaw.value = true;
  try {
    const response = await $fetch("/api/media", {
      method: "PUT",
      body: {
        action: "rename",
        from_id: file.fullPath,
        to_id: toPath,
        resource_type: file.resource_type,
      },
    });
    if (!response.success) throw new Error(response.error);
    await fetchFiles();
  } catch (err) {
    alert("改名失敗：" + err.message);
  } finally {
    loadingRaw.value = false;
  }
};

const deleteFileRaw = async () => {
  if (!selectedFile.value || selectedFile.value.isFolder)
    return alert(
      "目前僅支援刪除單一檔案。刪除資料夾請至 Cloudinary 後台操作。",
    );
  const file = selectedFile.value;
  if (!confirm(`確定要刪除「${file.name}」嗎？`)) return;
  loadingRaw.value = true;
  try {
    const response = await $fetch("/api/media", {
      method: "PUT",
      body: {
        action: "delete",
        public_id: file.fullPath,
        resource_type: file.resource_type,
      },
    });
    if (!response.success) throw new Error(response.error);
    fetchFiles();
  } catch (err) {
    alert("刪除失敗：" + err.message);
  } finally {
    loadingRaw.value = false;
  }
};

const copyLinkRaw = (file) => {
  const target = file || selectedFile.value;
  if (!target) return;
  navigator.clipboard
    .writeText(getPublicUrlRaw(target))
    .then(() => alert(`已複製連結！📋\n${target.name}`));
};

// ── 初始化 ──
onMounted(() => {
  loadIssuesAndArticles();
  fetchFiles();
});
</script>

<template>
  <div class="media-manager">
    <div class="header-section">
      <div class="header-text">
        <h2>🖼️ 媒體庫管理 (Cloudinary)</h2>
        <p class="desc">
          {{
            viewMode === "article"
              ? "選擇文章即可自動載入、上傳與排序所屬圖片。"
              : "直接管理 Cloudinary 雲端硬碟的原始資料夾結構。"
          }}
        </p>
      </div>
      <div class="mode-toggle">
        <button
          :class="{ active: viewMode === 'article' }"
          @click="viewMode = 'article'"
        >
          📚 文章連動模式
        </button>
        <button
          :class="{ active: viewMode === 'raw' }"
          @click="viewMode = 'raw'"
        >
          ☁️ 原始資料夾模式
        </button>
      </div>
    </div>

    <div v-if="viewMode === 'article'" class="article-mode-layout">
      <div class="sidebar-panel">
        <div class="selector-group">
          <label>1. 選擇期數</label>
          <select v-model="selectedIssue" class="styled-select">
            <option v-for="iss in issuesList" :key="iss.id" :value="iss.id">
              Vol.{{ iss.id }} - {{ iss.title }}
            </option>
          </select>
        </div>

        <div class="selector-group list-group">
          <label>2. 選擇文章 ({{ articlesList.length }} 篇)</label>
          <div class="article-list">
            <div
              v-for="art in articlesList"
              :key="art.id"
              class="article-item"
              :class="{ active: selectedArticle?.id === art.id }"
              @click="selectedArticle = art"
            >
              <strong>{{ art.id.split("-")[1] || art.id }}</strong>
              <span>{{ art.title || "(未命名)" }}</span>
            </div>
            <div v-if="!articlesList.length" class="empty-hint">
              本期尚無文章
            </div>
          </div>
        </div>
      </div>

      <div class="main-panel">
        <div class="panel-top-bar" v-if="selectedArticle">
          <h3>
            目前文章：{{ selectedArticle.id }}
            <span class="img-count">共 {{ articleImages.length }} 張圖</span>
          </h3>
          <input
            type="file"
            ref="fileInputArt"
            hidden
            accept="image/*"
            @change="uploadArtImage"
          />
          <button
            class="btn primary"
            @click="handleArtUploadClick"
            :disabled="uploadingArt"
          >
            {{ uploadingArt ? "上傳中..." : "＋ 新增圖片" }}
          </button>
        </div>

        <div v-if="loadingUI" class="loading-state">讀取中...</div>

        <div v-else-if="!selectedArticle" class="empty-state">
          請從左側選擇一篇文章 👉
        </div>

        <div v-else-if="articleImages.length === 0" class="empty-state">
          這篇文章還沒有關聯任何圖片 🍂<br />
          <small>如果有舊圖片，請確認檔名包含文章ID (例如 7-4)</small>
        </div>

        <div v-else class="image-grid">
          <div
            v-for="(img, idx) in articleImages"
            :key="img.id"
            class="image-card"
          >
            <div class="card-image-box">
              <img :src="img.image_url" alt="文章圖片" />
              <div class="order-badge">#{{ img.sort_order }}</div>
            </div>

            <div class="card-controls">
              <div class="move-btns">
                <button
                  @click="moveImage(idx, -1)"
                  :disabled="idx === 0"
                  title="往前移"
                >
                  ◀
                </button>
                <button
                  @click="moveImage(idx, 1)"
                  :disabled="idx === articleImages.length - 1"
                  title="往後移"
                >
                  ▶
                </button>
              </div>

              <button class="btn-md-copy link" @click="copyUrl(img.image_url)">
                🔗 複製圖片網址
              </button>

              <button class="btn-del" @click="deleteArtImage(img)" title="刪除">
                🗑️ 刪除圖片
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="viewMode === 'raw'" class="raw-mode-layout">
      <div class="toolbar">
        <div class="breadcrumbs">
          <span class="crumb root" @click="goToBreadcrumb(-1)">🏠 Home</span>
          <template v-for="(folder, index) in pathStack" :key="index">
            <span class="sep">/</span>
            <span class="crumb" @click="goToBreadcrumb(index)">{{
              folder
            }}</span>
          </template>
        </div>
        <div class="actions">
          <button class="btn outline" @click="createFolder">📁 新資料夾</button>
          <input
            type="file"
            ref="fileInputRaw"
            hidden
            @change="uploadFileRaw"
          />
          <button
            class="btn primary"
            @click="handleUploadClickRaw"
            :disabled="uploadingRaw"
          >
            {{ uploadingRaw ? "上傳中..." : "☁️ 上傳檔案" }}
          </button>
          <button class="btn outline" @click="fetchFiles" title="重新整理">
            🔄
          </button>
        </div>
      </div>

      <div class="split-view">
        <div class="file-list-panel">
          <div v-if="loadingRaw" class="loading">載入中...</div>
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
                :key="file.fullPath"
                :class="{
                  active: selectedFile && selectedFile.name === file.name,
                }"
                @click="selectedFile = file"
                @dblclick="handleRowDbClick(file)"
              >
                <td class="icon-cell">
                  <span v-if="file.isFolder">📁</span>
                  <span
                    v-else-if="
                      file.name.endsWith('.pdf') || file.name.endsWith('.docx')
                    "
                    >📄</span
                  >
                  <span v-else>🖼️</span>
                </td>
                <td class="name-cell" :title="file.name">{{ file.name }}</td>
                <td class="text-center" @click.stop>
                  <button
                    v-if="!file.isFolder"
                    class="btn-icon-copy"
                    title="複製連結"
                    @click="copyLinkRaw(file)"
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
              <div v-if="selectedFile.isFolder" class="large-icon folder">
                📁
              </div>
              <div
                v-else-if="
                  selectedFile.name.endsWith('.pdf') ||
                  selectedFile.name.endsWith('.docx')
                "
                class="large-icon pdf"
              >
                📄
              </div>
              <img
                v-else
                :key="selectedFile.fullPath"
                :src="getPublicUrlRaw(selectedFile)"
                class="preview-img"
                @error="
                  (e) =>
                    (e.target.src =
                      'https://placehold.co/400x300?text=Image+Load+Error')
                "
              />
            </div>
            <div class="meta-info">
              <div class="meta-row">
                <label>名稱</label><span>{{ selectedFile.name }}</span>
              </div>
              <div class="meta-row">
                <label>大小</label><span>{{ selectedFile.size }}</span>
              </div>
              <div class="meta-row">
                <label>類型</label><span>{{ selectedFile.type }}</span>
              </div>
              <div class="meta-row">
                <label>更新時間</label
                ><span class="date">{{ selectedFile.updated }}</span>
              </div>
            </div>
            <div class="action-buttons" v-if="!selectedFile.isFolder">
              <button class="btn full blue" @click="copyLinkRaw(null)">
                🔗 複製連結
              </button>
              <div class="btn-group">
                <button class="btn outline" @click="renameFileRaw">
                  ✎ 改名
                </button>
                <button class="btn outline red" @click="deleteFileRaw">
                  🗑️ 刪除
                </button>
              </div>
              <a
                :href="getPublicUrlRaw(selectedFile)"
                target="_blank"
                class="download-link"
                >在新分頁開啟原始檔案 ↗</a
              >
            </div>
            <div class="action-buttons" v-else>
              <button class="btn full" @click="handleRowDbClick(selectedFile)">
                📂 進入資料夾
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
  </div>
</template>

<style scoped>
/* ── 共用排版 ── */
.media-manager {
  padding: 20px;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  background-color: #f4f6f9;
  min-height: 0;
}
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 15px 25px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}
.header-text h2 {
  margin: 0 0 5px 0;
  color: #2c3e50;
}
.header-text .desc {
  color: #666;
  font-size: 1rem;
  margin: 0;
}

.mode-toggle {
  display: flex;
  background: #e9ecef;
  padding: 4px;
  border-radius: 8px;
}
.mode-toggle button {
  border: none;
  background: transparent;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: bold;
  color: #666;
  cursor: pointer;
  transition: 0.2s;
}
.mode-toggle button.active {
  background: #fff;
  color: #2c3e50;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* ── 模式一：文章專屬模式 ── */
.article-mode-layout {
  flex: 1;
  display: flex;
  gap: 20px;
  overflow: hidden;
}
.sidebar-panel {
  width: 300px;
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.selector-group {
  margin-bottom: 20px;
}

.selector-group.list-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
  min-height: 0;
}

.selector-group label {
  display: block;
  font-weight: bold;
  color: #34495e;
  margin-bottom: 10px;
  font-size: 1.05rem;
}
.styled-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  outline: none;
}
.article-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 6px;
  background: #fafafa;
}
.article-item {
  padding: 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: 0.15s;
}
.article-item:hover {
  background: #f0f4f8;
}
.article-item.active {
  background: #e3f2fd;
  border-left: 4px solid #3498db;
}
.article-item strong {
  font-size: 0.9rem;
  color: #2c3e50;
  margin-bottom: 4px;
}
.article-item span {
  font-size: 0.85rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 🌟 右側面板與網格修正區 🌟 */
.main-panel {
  flex: 1;
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.panel-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}
.panel-top-bar h3 {
  margin: 0;
  color: #2c3e50;
}
.img-count {
  font-size: 0.9rem;
  color: #888;
  margin-left: 10px;
  font-weight: normal;
  background: #eee;
  padding: 2px 8px;
  border-radius: 12px;
}

.image-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  align-content: start;
  gap: 24px;
  padding: 10px;
}

.image-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.card-image-box {
  position: relative;
  width: 100%;
  height: 180px;
  flex-shrink: 0;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #eee;
  border-radius: 8px 8px 0 0;
}

.card-image-box img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  padding: 5px;
}

.order-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 15px;
  font-size: 0.9rem;
  z-index: 2;
}

.card-controls {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: white;
  border-radius: 0 0 8px 8px;
}
.move-btns {
  display: flex;
  gap: 5px;
}
.move-btns button {
  flex: 1;
  padding: 6px;
  border: 1px solid #ccc;
  background: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
  color: #555;
}
.move-btns button:hover:not(:disabled) {
  background: #e9ecef;
}
.move-btns button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-md-copy {
  border: none;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.85rem;
  transition: background 0.2s;
}
.btn-md-copy.link {
  background: #e3f2fd;
  color: #1565c0;
}
.btn-md-copy.link:hover {
  background: #bbdefb;
}

.btn-del {
  background: #fff;
  border: 1px solid #ffcdd2;
  color: #c62828;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.btn-del:hover {
  background: #ffebee;
}

/* ── 模式二：原始資料夾模式 ── */
.raw-mode-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.toolbar {
  background: white;
  padding: 10px 20px;
  border: 1px solid #ddd;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
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
  min-height: 0;
}
.file-list-panel {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  border-right: 1px solid #eee;
}
.preview-panel {
  width: 350px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
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
  font-size: 1.1rem;
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
  display: flex;
  flex-direction: column;
  height: 100%;
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
  min-height: 250px;
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

.loading-state,
.empty-state,
.no-selection {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 1.1rem;
  line-height: 1.6;
  text-align: center;
}
.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 15px;
  opacity: 0.3;
}

@media (max-width: 768px) {
  .article-mode-layout {
    flex-direction: column;
    overflow: auto;
  }
  .sidebar-panel {
    width: 100%;
    flex-shrink: 0;
  }
  .main-panel {
    min-height: 500px;
  }
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
    width: 100%;
  }
}
</style>
