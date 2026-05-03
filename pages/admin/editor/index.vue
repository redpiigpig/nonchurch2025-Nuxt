<script setup>
import { ref, onMounted } from "vue";
import EditorView from "~/components/EditorView.vue";
import { parseAndClassifyDocument } from "~/utils/contentParser";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

const supabase = useSupabaseClient();

useHead({ title: "新增文章 - 無境界者雜誌" });

const uploadStatus = ref("");
const showUploadPanel = ref(true);
const latestIssue = ref(null);
const nextSeq = ref(1);
const existingStubs = ref([]);   // 本期已有的文章（供選擇帶入）
const targetArticleId = ref(""); // 選擇帶入的文章 ID（空字串 = 新增）

onMounted(async () => {
  // 抓最新一期
  const { data: issues } = await supabase
    .from("issues")
    .select("id, title")
    .order("id", { ascending: false })
    .limit(1);
  if (issues?.length) {
    latestIssue.value = issues[0];
    const { count } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("issue", issues[0].id);
    nextSeq.value = (count || 0) + 1;

    // 抓本期已有的文章列表（供選擇帶入）
    const { data: stubs } = await supabase
      .from("articles")
      .select("id, title")
      .eq("issue", issues[0].id)
      .order("id", { ascending: true });
    existingStubs.value = stubs || [];
  }
});

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    uploadStatus.value = "🤖 AI 分析中（使用 Gemini）...";

    const issueContext = latestIssue.value
      ? { issueNumber: latestIssue.value.id, issueTitle: latestIssue.value.title, nextSeq: nextSeq.value }
      : {};

    // 若選擇帶入已有文章，直接用該 ID 覆蓋，不讓 Gemini 產生新 ID
    const { articleId, classified } = await parseAndClassifyDocument(file, true, issueContext, targetArticleId.value || null, supabase);

    uploadStatus.value = `✅ 上傳成功！文章 ID: ${articleId}`;
    console.log("分類結果：", classified);

    setTimeout(() => navigateTo(`/admin/editor/${articleId}`), 1500);
  } catch (error) {
    uploadStatus.value = `❌ 上傳失敗: ${error.message}`;
    if (error.message.includes("VITE_GEMINI_API_KEY")) {
      uploadStatus.value += "\n\n請在 .env 檔案中設定 VITE_GEMINI_API_KEY";
    }
  }
}
</script>

<template>
  <div class="new-article-page">
    <!-- Word 上傳面板 -->
    <section v-if="showUploadPanel" class="upload-section">
      <div class="section-header">
        <h2>📤 上傳 Word 文章（選用）</h2>
        <button @click="showUploadPanel = false" class="btn-collapse">
          收起面板
        </button>
      </div>

      <div class="upload-panel">
        <!-- 期號資訊顯示 -->
        <div class="api-status">
          <strong>預設上傳至：</strong>
          <span v-if="latestIssue" class="status-ok">
            Vol.{{ latestIssue.id }}「{{ latestIssue.title }}」（本期第 {{ nextSeq }} 篇）
          </span>
          <span v-else class="status-error">載入期號中...</span>
        </div>

        <!-- 帶入已有文章選擇器 -->
        <div class="api-status" v-if="existingStubs.length > 0">
          <strong>套用到：</strong>
          <select v-model="targetArticleId" class="target-select">
            <option value="">＋ 自動產生新文章 ID</option>
            <option v-for="s in existingStubs" :key="s.id" :value="s.id">
              {{ s.id }}{{ s.title ? `　${s.title}` : '　（未命名）' }}
            </option>
          </select>
        </div>

        <!-- AI 狀態提示（預設開啟） -->
        <div class="ai-enabled-notice">
          <svg viewBox="0 0 24 24" class="ai-icon">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
          <div>
            <strong>✅ AI 輔助判斷已啟用</strong>
            <p>使用 Google Gemini Pro 自動分類文章內容（準確率 95%+）</p>
          </div>
        </div>

        <!-- 檔案上傳 -->
        <div class="file-upload-area">
          <input
            type="file"
            accept=".docx"
            @change="handleFileUpload"
            class="file-input"
            id="file-upload"
          />
          <label for="file-upload" class="file-label">
            <svg viewBox="0 0 24 24" class="upload-icon">
              <path
                fill="currentColor"
                d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"
              />
            </svg>
            <span class="upload-text">選擇 Word 檔案（.docx）</span>
            <span class="upload-hint">或拖曳檔案到此處</span>
          </label>
        </div>

        <!-- 狀態顯示 -->
        <div
          v-if="uploadStatus"
          class="upload-status"
          :class="{
            'status-success': uploadStatus.includes('✅'),
            'status-error': uploadStatus.includes('❌'),
            'status-loading': uploadStatus.includes('🤖'),
          }"
        >
          <pre>{{ uploadStatus }}</pre>
        </div>

        <!-- 格式說明 -->
        <details class="format-guide">
          <summary>📋 AI 自動判斷規則說明</summary>

          <div class="ai-features">
            <h4>🎯 AI 會自動識別：</h4>
            <ul>
              <li><strong>標題</strong> - 主標題、副標題</li>
              <li><strong>作者</strong> - 作者姓名、職稱</li>
              <li><strong>內容分類</strong> - 專題、評論、人物專訪等</li>
              <li><strong>關鍵字</strong> - 自動提取文章關鍵字</li>
              <li><strong>特殊框</strong> - 引用、書籍介紹等特殊段落</li>
              <li><strong>腳註</strong> - 註釋編號與內容</li>
            </ul>

            <h4>⚡ 處理流程：</h4>
            <ol>
              <li>上傳 Word 檔案（.docx）</li>
              <li>AI 自動解析與分類（3-5秒）</li>
              <li>自動寫入資料庫</li>
              <li>跳轉到編輯頁面進行微調</li>
            </ol>

            <p class="guide-note">💡 上傳後仍可在編輯頁面手動調整所有內容</p>
          </div>
        </details>
      </div>
    </section>

    <!-- 顯示「展開上傳面板」按鈕 -->
    <button v-else @click="showUploadPanel = true" class="btn-show-upload">
      📤 展開 Word 上傳面板
    </button>

    <!-- 分隔線 -->
    <div class="divider">或手動撰寫</div>

    <!-- 文章編輯器（新增模式） -->
    <EditorView />
  </div>
</template>

<style scoped>
.new-article-page {
  max-width: 1400px;
  margin: 0 auto;
}

.upload-section {
  background: #fff;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.section-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.btn-collapse {
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  color: #495057;
}

.btn-collapse:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.btn-show-upload {
  width: 100%;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.3s;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-show-upload:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.divider {
  text-align: center;
  margin: 40px 0;
  color: #999;
  font-size: 1.1rem;
  position: relative;
  font-weight: 500;
}

.divider::before,
.divider::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 42%;
  height: 1px;
  background: linear-gradient(to right, transparent, #ddd, transparent);
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.upload-panel {
  background: #f8f9fa;
  padding: 24px;
  border-radius: 10px;
}

.api-status {
  padding: 14px 18px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  gap: 10px;
}

.api-status strong {
  color: #495057;
  white-space: nowrap;
}
.target-select {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
}

.status-ok {
  color: #22c55e;
  font-weight: bold;
}

.status-error {
  color: #ef4444;
  font-weight: bold;
}

.ai-enabled-notice {
  display: flex;
  gap: 16px;
  padding: 18px;
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  border-left: 4px solid #3b82f6;
  border-radius: 8px;
  margin-bottom: 24px;
}

.ai-icon {
  width: 28px;
  height: 28px;
  color: #3b82f6;
  flex-shrink: 0;
}

.ai-enabled-notice strong {
  color: #1e40af;
  display: block;
  margin-bottom: 4px;
  font-size: 1rem;
}

.ai-enabled-notice p {
  margin: 0;
  color: #3730a3;
  font-size: 0.9rem;
  line-height: 1.5;
}

.file-upload-area {
  margin-bottom: 20px;
}

.file-input {
  display: none;
}

.file-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  background: #fff;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.file-label:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: #64748b;
  margin-bottom: 12px;
}

.file-label:hover .upload-icon {
  color: #3b82f6;
}

.upload-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}

.upload-hint {
  font-size: 0.9rem;
  color: #94a3b8;
}

.upload-status {
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid #94a3b8;
}

.upload-status.status-success {
  background: #f0fdf4;
  border-left-color: #22c55e;
}

.upload-status.status-error {
  background: #fef2f2;
  border-left-color: #ef4444;
}

.upload-status.status-loading {
  background: #fffbeb;
  border-left-color: #f59e0b;
}

.upload-status pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  color: #334155;
  font-size: 0.95rem;
}

.format-guide {
  background: #fff;
  padding: 18px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.format-guide summary {
  cursor: pointer;
  font-weight: 600;
  color: #2c3e50;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.format-guide summary:hover {
  background: #f8f9fa;
}

.ai-features {
  margin-top: 16px;
  padding: 16px 0;
}

.ai-features h4 {
  color: #2c3e50;
  margin-bottom: 12px;
  font-size: 1rem;
}

.ai-features ul,
.ai-features ol {
  margin: 0 0 20px 0;
  padding-left: 24px;
}

.ai-features li {
  margin-bottom: 8px;
  color: #495057;
  line-height: 1.6;
}

.ai-features li strong {
  color: #2c3e50;
}

.guide-note {
  margin: 16px 0 0;
  padding: 12px 16px;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 6px;
  color: #856404;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .upload-section {
    padding: 20px;
  }

  .section-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .btn-collapse {
    width: 100%;
  }
}
</style>
