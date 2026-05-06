<script setup>
import { ref, watch, onMounted, nextTick } from "vue";

// Nuxt 設定
definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({
  title: "期刊主題管理 - 無境界者後台",
});

const supabase = useSupabaseClient();
const issues = ref([]);
const allAuthors = ref([]);
const loading = ref(false);
const saving = ref(false);

// 編輯彈窗控制
const showModal = ref(false);
const editingIssue = ref({});

// ── 自動儲存狀態 ────────────────────────────────────────────────
const autoSaveStatus = ref("idle"); // 'idle' | 'saving' | 'saved' | 'error'
let autoSaveTimer = null;
let suppressAutoSave = true;

// ── 封面 / 封底 PDF 上傳 ──────────────────────────────────────────
const coverPdfInput = ref(null);
const backCoverPdfInput = ref(null);
const uploadingCoverPdf = ref(false);
const uploadingBackCoverPdf = ref(false);

const uploadIssuePdf = async (file, field) => {
  const isUploading = field === "cover_pdf" ? uploadingCoverPdf : uploadingBackCoverPdf;
  isUploading.value = true;
  try {
    const safeLabel = field === "cover_pdf" ? "cover" : "back-cover";
    const newFileName = `${safeLabel}-${editingIssue.value.id}.pdf`;
    const renamedFile = new File([file], newFileName, { type: file.type });

    const formData = new FormData();
    formData.append("file", renamedFile);
    formData.append("path", "covers");
    formData.append("filename", newFileName.replace(/\.pdf$/i, ""));

    const response = await $fetch("/api/media", { method: "POST", body: formData });
    if (!response.success) throw new Error(response.error);

    editingIssue.value[field] = response.data.secure_url;
    alert(`✅ 上傳成功！已命名為：${newFileName}\n（請記得按「確認儲存」）`);
  } catch (err) {
    alert("❌ 上傳失敗：" + err.message);
  } finally {
    isUploading.value = false;
  }
};

const handleCoverPdfUpload = (e) => {
  const file = e.target.files[0];
  if (file) uploadIssuePdf(file, "cover_pdf");
  e.target.value = "";
};
const handleBackCoverPdfUpload = (e) => {
  const file = e.target.files[0];
  if (file) uploadIssuePdf(file, "back_cover_pdf");
  e.target.value = "";
};

const clearPdfField = (field) => {
  editingIssue.value[field] = null;
};

// 1. 讀取列表
const fetchIssues = async () => {
  loading.value = true;
  const [issuesRes, authorsRes] = await Promise.all([
    supabase.from("issues").select("*").order("id", { ascending: false }),
    supabase
      .from("authors")
      .select("id, name, is_published")
      .order("id", { ascending: true }),
  ]);

  if (issuesRes.error) alert("讀取失敗：" + issuesRes.error.message);
  else issues.value = issuesRes.data;

  if (authorsRes.error) console.error("讀取作者失敗", authorsRes.error);
  else allAuthors.value = authorsRes.data;

  loading.value = false;
};

// 2. 開啟編輯模式
const openEditModal = async (issue) => {
  suppressAutoSave = true;
  const tempIssue = JSON.parse(JSON.stringify(issue));
  tempIssue.author_order_arr = Array.isArray(tempIssue.author_order)
    ? [...tempIssue.author_order]
    : [];
  editingIssue.value = tempIssue;
  showModal.value = true;
  autoSaveStatus.value = "idle";
  // 等 modal 渲染完，才開放 auto-save
  await nextTick();
  suppressAutoSave = false;
};

// ── 作者順序 picker 輔助函式 ─────────────────────────────────────
const addAuthorToOrder = (name) => {
  if (!editingIssue.value.author_order_arr) {
    editingIssue.value.author_order_arr = [];
  }
  if (!editingIssue.value.author_order_arr.includes(name)) {
    editingIssue.value.author_order_arr.push(name);
  }
};
const removeAuthorFromOrder = (idx) => {
  editingIssue.value.author_order_arr.splice(idx, 1);
};
const moveAuthorOrder = (idx, dir) => {
  const arr = editingIssue.value.author_order_arr;
  const target = idx + dir;
  if (target < 0 || target >= arr.length) return;
  const [item] = arr.splice(idx, 1);
  arr.splice(target, 0, item);
};

const closeEditModal = () => {
  suppressAutoSave = true;
  clearTimeout(autoSaveTimer);
  showModal.value = false;
};

// 3. 儲存修改
const saveIssue = async (quiet = false) => {
  if (!editingIssue.value?.id) return;
  saving.value = true;
  if (quiet) autoSaveStatus.value = "saving";
  try {
    const authorArray = Array.isArray(editingIssue.value.author_order_arr)
      ? editingIssue.value.author_order_arr.filter(Boolean)
      : [];

    const updates = {
      title: editingIssue.value.title,
      date: editingIssue.value.date,
      cover_img: editingIssue.value.cover_img,
      pdf_link: editingIssue.value.pdf_link,
      cover_pdf: editingIssue.value.cover_pdf || null,
      back_cover_pdf: editingIssue.value.back_cover_pdf || null,
      intro_home: editingIssue.value.intro_home,
      author_order: authorArray,
      intro_cfp: editingIssue.value.intro_cfp,
      cfp_title: editingIssue.value.cfp_title,
      cfp_image: editingIssue.value.cfp_image,
      cfp_theme: editingIssue.value.cfp_theme,
      cfp_deadline: editingIssue.value.cfp_deadline,
    };

    const { data, error } = await supabase
      .from("issues")
      .update(updates)
      .eq("id", editingIssue.value.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("RLS 過濾為 0 row：可能登入逾期或權限不足");

    autoSaveStatus.value = "saved";
    if (!quiet) {
      alert(`第 ${editingIssue.value.id} 期資料更新成功！`);
      closeEditModal();
      fetchIssues();
    } else {
      // 自動儲存後同步本地 issues 陣列（避免關閉 modal 後列表不同步）
      const idx = issues.value.findIndex((i) => i.id === editingIssue.value.id);
      if (idx !== -1) {
        issues.value[idx] = { ...issues.value[idx], ...updates };
      }
    }
    setTimeout(() => {
      if (autoSaveStatus.value === "saved") autoSaveStatus.value = "idle";
    }, 3000);
  } catch (err) {
    autoSaveStatus.value = "error";
    if (quiet) console.error("[auto-save] issue 儲存失敗", err);
    else alert("儲存失敗：" + err.message);
  } finally {
    saving.value = false;
  }
};

// ── 自動儲存（debounce 2s，僅在 modal 開啟時）──────────────────
watch(
  editingIssue,
  () => {
    if (suppressAutoSave) return;
    if (!showModal.value) return;
    if (!editingIssue.value?.id) return;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => saveIssue(true), 2000);
  },
  { deep: true },
);

onMounted(() => {
  fetchIssues();
});
</script>

<template>
  <div class="issues-manager">
    <div class="issues-tabs">
      <NuxtLink to="/admin" exact-active-class="tab-active" class="tab-link">🚀 發布狀態</NuxtLink>
      <NuxtLink to="/admin/issues_manager" active-class="tab-active" class="tab-link">📋 主題設定</NuxtLink>
    </div>
    <div class="header">
      <h2>📅 期刊主題管理</h2>
      <p class="desc">
        在此編輯每一期的詳細資訊，包含封面連結、PDF
        下載點、首頁簡介、以及下期徵稿預告。
        <br />
      </p>
    </div>

    <div v-if="loading" class="loading">載入中...</div>

    <div class="table-container" v-else>
      <table>
        <thead>
          <tr>
            <th width="80">期數</th>
            <th>主題 (Title)</th>
            <th>發刊日期</th>
            <th>封面預覽</th>
            <th width="100">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in issues" :key="item.id">
            <td class="text-center">Vol.{{ item.id }}</td>
            <td>{{ item.title }}</td>
            <td>{{ item.date }}</td>
            <td class="text-center">
              <img
                v-if="item.cover_img"
                :src="item.cover_img"
                class="preview-thumb"
                alt="cover"
              />
              <span v-else class="no-img">無圖片</span>
            </td>
            <td class="text-center">
              <button class="btn-edit" @click="openEditModal(item)">
                編輯
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>編輯 第 {{ editingIssue.id }} 期內容</h3>
          <span class="autosave-status" :class="autoSaveStatus">
            <template v-if="autoSaveStatus === 'saving'">⏳ 儲存中…</template>
            <template v-else-if="autoSaveStatus === 'saved'">✅ 已自動儲存</template>
            <template v-else-if="autoSaveStatus === 'error'">❌ 自動儲存失敗</template>
            <template v-else>📝 修改後 2 秒自動儲存</template>
          </span>
          <button class="btn-close" @click="closeEditModal">×</button>
        </div>

        <div class="modal-body">
          <fieldset>
            <legend>📖 本期資訊</legend>
            <div class="form-row">
              <div class="form-group half">
                <label>期刊主題 (Title)</label>
                <input
                  type="text"
                  v-model="editingIssue.title"
                  class="input-text"
                />
              </div>
              <div class="form-group half">
                <label>發刊日期 (Date)</label>
                <input
                  type="text"
                  v-model="editingIssue.date"
                  placeholder="例如：2025年01-02月號"
                  class="input-text"
                />
              </div>
            </div>
            <div class="form-group">
              <label>封面圖片連結 (Cover Image URL)</label>
              <input
                type="text"
                v-model="editingIssue.cover_img"
                class="input-text"
                placeholder="https://..."
              />
              <div class="preview-box" v-if="editingIssue.cover_img">
                <img :src="editingIssue.cover_img" alt="Preview" />
              </div>
            </div>
            <div class="form-group">
              <label>整期 PDF 連結 (PDF Link)</label>
              <input
                type="text"
                v-model="editingIssue.pdf_link"
                class="input-text"
                placeholder="https://..."
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>📄 封面與封底 PDF</legend>
            <small class="hint" style="display:block; margin-bottom:12px;">
              上傳後自動存到 Cloudinary <code>covers/</code> 資料夾，供合併期刊 PDF 使用。
            </small>

            <!-- 隱藏的 file input -->
            <input
              ref="coverPdfInput"
              type="file"
              accept="application/pdf"
              style="display:none"
              @change="handleCoverPdfUpload"
            />
            <input
              ref="backCoverPdfInput"
              type="file"
              accept="application/pdf"
              style="display:none"
              @change="handleBackCoverPdfUpload"
            />

            <div class="form-row">
              <div class="form-group half">
                <label>封面 PDF (Cover PDF)</label>
                <div class="pdf-upload-row">
                  <input
                    type="text"
                    v-model="editingIssue.cover_pdf"
                    class="input-text"
                    placeholder="https://..."
                  />
                  <button
                    class="btn-upload-pdf"
                    @click="coverPdfInput.click()"
                    :disabled="uploadingCoverPdf"
                  >
                    {{ uploadingCoverPdf ? "上傳中..." : "📄 上傳" }}
                  </button>
                  <a
                    v-if="editingIssue.cover_pdf"
                    :href="editingIssue.cover_pdf"
                    target="_blank"
                    class="btn-preview-pdf"
                  >👀</a>
                  <button
                    v-if="editingIssue.cover_pdf"
                    class="btn-clear-pdf"
                    @click="clearPdfField('cover_pdf')"
                    title="清除連結"
                  >🗑️</button>
                </div>
              </div>
              <div class="form-group half">
                <label>封底 PDF (Back Cover PDF)</label>
                <div class="pdf-upload-row">
                  <input
                    type="text"
                    v-model="editingIssue.back_cover_pdf"
                    class="input-text"
                    placeholder="https://..."
                  />
                  <button
                    class="btn-upload-pdf"
                    @click="backCoverPdfInput.click()"
                    :disabled="uploadingBackCoverPdf"
                  >
                    {{ uploadingBackCoverPdf ? "上傳中..." : "📄 上傳" }}
                  </button>
                  <a
                    v-if="editingIssue.back_cover_pdf"
                    :href="editingIssue.back_cover_pdf"
                    target="_blank"
                    class="btn-preview-pdf"
                  >👀</a>
                  <button
                    v-if="editingIssue.back_cover_pdf"
                    class="btn-clear-pdf"
                    @click="clearPdfField('back_cover_pdf')"
                    title="清除連結"
                  >🗑️</button>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>首頁本期簡介 (Intro Home)</label>
              <textarea
                v-model="editingIssue.intro_home"
                rows="4"
                class="input-area"
              ></textarea>
            </div>
            <div class="form-group">
              <label>專欄作者順序 (Author Order)</label>
              <small class="hint" style="margin-bottom: 8px">
                左側點「＋」加入；右側用「↑」「↓」調整順序，「✕」移除。
                順序即為首頁「本期作者」顯示順序（未列入的會排在最後）。
              </small>
              <div class="author-picker">
                <div class="author-picker-col">
                  <div class="author-picker-title">可選作者</div>
                  <ul class="author-picker-list">
                    <li
                      v-for="a in allAuthors"
                      :key="a.id"
                      class="author-picker-item"
                      :class="{
                        disabled:
                          editingIssue.author_order_arr?.includes(a.name),
                      }"
                    >
                      <span class="ap-name">
                        {{ a.name }}
                        <span v-if="!a.is_published" class="ap-badge-hidden">
                          隱藏
                        </span>
                      </span>
                      <button
                        class="btn-ap-add"
                        :disabled="
                          editingIssue.author_order_arr?.includes(a.name)
                        "
                        @click="addAuthorToOrder(a.name)"
                        title="加入"
                      >＋</button>
                    </li>
                  </ul>
                </div>

                <div class="author-picker-col">
                  <div class="author-picker-title">
                    已選順序
                    <span class="ap-counter">
                      （{{ editingIssue.author_order_arr?.length || 0 }}）
                    </span>
                  </div>
                  <ul
                    v-if="editingIssue.author_order_arr?.length"
                    class="author-picker-list selected"
                  >
                    <li
                      v-for="(name, idx) in editingIssue.author_order_arr"
                      :key="idx"
                      class="author-picker-item"
                    >
                      <span class="ap-index">{{ idx + 1 }}.</span>
                      <span class="ap-name">{{ name }}</span>
                      <span class="ap-actions">
                        <button
                          class="btn-ap-move"
                          :disabled="idx === 0"
                          @click="moveAuthorOrder(idx, -1)"
                          title="上移"
                        >↑</button>
                        <button
                          class="btn-ap-move"
                          :disabled="idx === editingIssue.author_order_arr.length - 1"
                          @click="moveAuthorOrder(idx, 1)"
                          title="下移"
                        >↓</button>
                        <button
                          class="btn-ap-remove"
                          @click="removeAuthorFromOrder(idx)"
                          title="移除"
                        >✕</button>
                      </span>
                    </li>
                  </ul>
                  <p v-else class="author-picker-empty">尚未選擇任何作者</p>
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>📢 下期預告 / 徵稿 (CFP)</legend>
            <div class="form-row">
              <div class="form-group half">
                <label>下期主題 (CFP Title)</label>
                <input
                  type="text"
                  v-model="editingIssue.cfp_title"
                  class="input-text"
                />
              </div>
              <div class="form-group half">
                <label>截稿日期 (CFP Deadline)</label>
                <input
                  type="text"
                  v-model="editingIssue.cfp_deadline"
                  class="input-text"
                  placeholder="例如：2025年3月31日"
                />
              </div>
            </div>
            <div class="form-group">
              <label>下期預告圖片連結 (CFP Image URL)</label>
              <input
                type="text"
                v-model="editingIssue.cfp_image"
                class="input-text"
                placeholder="https://..."
              />
              <div class="preview-box" v-if="editingIssue.cfp_image">
                <img :src="editingIssue.cfp_image" alt="CFP Preview" />
              </div>
            </div>
            <div class="form-group">
              <label>本期內文中預告文字 (Intro CFP)</label>
              <textarea
                v-model="editingIssue.intro_cfp"
                rows="3"
                class="input-area"
                placeholder="這段文字會出現在本期首頁介紹的下方"
              ></textarea>
            </div>
            <div class="form-group">
              <label>下期主題完整說明 (CFP Theme)</label>
              <textarea
                v-model="editingIssue.cfp_theme"
                rows="6"
                class="input-area"
                placeholder="顯示於「投稿資訊」頁面的完整徵稿說明"
              ></textarea>
            </div>
          </fieldset>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="closeEditModal">關閉</button>
          <button class="btn-save" @click="saveIssue(false)" :disabled="saving">
            {{ saving ? "儲存中..." : "💾 立即儲存" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 完全保留您原始檔案的 CSS */
.issues-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
.issues-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 2px solid #ddd;
}
.tab-link {
  padding: 8px 20px;
  border-radius: 6px 6px 0 0;
  color: #666;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  border: 1px solid transparent;
  border-bottom: none;
  margin-bottom: -2px;
  transition: background 0.2s;
}
.tab-link:hover {
  background: #f0f0f0;
  color: #333;
}
.tab-active {
  background: white;
  color: #2c3e50 !important;
  border-color: #ddd;
  border-bottom-color: white !important;
  font-weight: bold;
}

.header {
  margin-bottom: 30px;
  text-align: center; /* ⭐ 這裡保留了置中設定 */
}

.header h2 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 1.8rem;
}

.desc {
  color: #666;
  line-height: 1.6;
  margin: 0 auto;
  max-width: 800px;
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
  padding: 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #444;
}

.text-center {
  text-align: center;
}

.preview-thumb {
  height: 50px;
  width: auto;
  border-radius: 4px;
  border: 1px solid #ddd;
}
.no-img {
  font-size: 0.8rem;
  color: #ccc;
}

.btn-edit {
  padding: 6px 12px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: 0.2s;
}
.btn-edit:hover {
  background: #2980b9;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 20px;
}

.modal {
  background: white;
  width: 100%;
  max-width: 800px;
  height: 90vh;
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
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

fieldset {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
}

legend {
  font-weight: bold;
  color: #3498db;
  padding: 0 10px;
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

.pdf-upload-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.pdf-upload-row .input-text {
  flex: 1;
  min-width: 0;
}
.btn-upload-pdf {
  white-space: nowrap;
  padding: 8px 12px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: 0.2s;
}
.btn-upload-pdf:hover:not(:disabled) {
  background: #219a52;
}
.btn-upload-pdf:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-preview-pdf {
  font-size: 1.2rem;
  text-decoration: none;
  padding: 4px 6px;
}
.btn-clear-pdf {
  font-size: 1.1rem;
  padding: 4px 6px;
  background: none;
  border: 1px solid #e74c3c;
  border-radius: 4px;
  cursor: pointer;
  color: #e74c3c;
  line-height: 1;
  transition: 0.2s;
}
.btn-clear-pdf:hover {
  background: #fdf0ef;
}

.preview-box {
  margin-top: 10px;
  padding: 5px;
  border: 1px dashed #ccc;
  border-radius: 4px;
  display: inline-block;
  background: #f9f9f9;
}
.preview-box img {
  max-height: 150px;
  max-width: 100%;
  display: block;
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

.autosave-status {
  font-size: 0.82rem;
  padding: 4px 10px;
  border-radius: 12px;
  background: #f0f0f0;
  color: #666;
  white-space: nowrap;
  margin-left: auto;
  margin-right: 12px;
}
.autosave-status.saving { background: #fff3cd; color: #856404; }
.autosave-status.saved  { background: #d4edda; color: #155724; }
.autosave-status.error  { background: #f8d7da; color: #721c24; }

/* 作者順序 picker */
.author-picker {
  display: flex;
  gap: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fafbfc;
  padding: 12px;
}
.author-picker-col {
  flex: 1;
  min-width: 0;
}
.author-picker-title {
  font-weight: bold;
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e1e8ed;
}
.ap-counter {
  font-weight: normal;
  color: #888;
  font-size: 0.85rem;
}
.author-picker-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 280px;
  overflow-y: auto;
  background: white;
  border-radius: 4px;
}
.author-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid #f1f3f5;
  font-size: 0.9rem;
}
.author-picker-item:last-child {
  border-bottom: none;
}
.author-picker-item.disabled {
  opacity: 0.4;
}
.ap-name {
  flex: 1;
  color: #2c3e50;
  word-break: break-all;
}
.ap-badge-hidden {
  font-size: 0.7rem;
  color: #c0392b;
  background: #fdf0ef;
  padding: 1px 5px;
  border-radius: 8px;
  margin-left: 4px;
}
.ap-index {
  color: #999;
  font-family: "Times New Roman", serif;
  min-width: 24px;
  font-size: 0.85rem;
}
.ap-actions {
  display: flex;
  gap: 4px;
}
.btn-ap-add,
.btn-ap-move,
.btn-ap-remove {
  border: 1px solid #bdc3c7;
  background: white;
  color: #2c3e50;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  padding: 0;
}
.btn-ap-add:hover:not(:disabled),
.btn-ap-move:hover:not(:disabled) {
  background: #ecf0f1;
}
.btn-ap-add:disabled,
.btn-ap-move:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.btn-ap-remove {
  border-color: #e74c3c;
  color: #e74c3c;
}
.btn-ap-remove:hover {
  background: #fdf0ef;
}
.author-picker-empty {
  color: #999;
  font-size: 0.85rem;
  padding: 20px 10px;
  text-align: center;
  margin: 0;
  background: white;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
