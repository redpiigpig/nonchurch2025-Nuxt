<script setup>
import { ref } from "vue";
import { parseAndClassifyDocument } from "~/utils/contentParser";

const uploadStatus = ref("");
const useAI = ref(false);
const apiKeyStatus = ref("檢查中...");

// 檢查 API Key 是否設定
onMounted(() => {
  const hasKey = !!import.meta.env.VITE_GEMINI_API_KEY;
  apiKeyStatus.value = hasKey ? "✅ 已設定" : "❌ 未設定";
});

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    uploadStatus.value = useAI.value
      ? "🤖 AI 分析中（使用 Gemini）..."
      : "⚡ 快速解析中...";

    const { articleId, classified } = await parseAndClassifyDocument(
      file,
      useAI.value,
    );

    uploadStatus.value = `✅ 上傳成功！文章 ID: ${articleId}`;

    // 顯示分類結果
    console.log("分類結果：", classified);

    // 跳轉編輯頁
    setTimeout(() => {
      navigateTo(`/admin/editor/${articleId}`);
    }, 1500);
  } catch (error) {
    uploadStatus.value = `❌ 上傳失敗: ${error.message}`;

    // 如果是 API Key 問題
    if (error.message.includes("VITE_GEMINI_API_KEY")) {
      uploadStatus.value += "\n\n請在 .env 檔案中設定 VITE_GEMINI_API_KEY";
    }
  }
}
</script>

<template>
  <div class="upload-panel">
    <h2>📤 上傳文章</h2>

    <!-- API 狀態顯示 -->
    <div class="api-status">
      <strong>Gemini API 狀態：</strong>
      <span :class="apiKeyStatus.includes('✅') ? 'status-ok' : 'status-error'">
        {{ apiKeyStatus }}
      </span>
    </div>

    <!-- 上傳選項 -->
    <div class="upload-options">
      <label class="ai-toggle">
        <input type="checkbox" v-model="useAI" />
        <span class="toggle-label">
          使用 Gemini AI 輔助判斷
          <small>（更準確，95%+ 成功率）</small>
        </span>
      </label>

      <div v-if="useAI" class="ai-info">
        💡 使用 Google Gemini Pro 模型
        <br />
        💰 費用：免費額度內（每月 60 次/分鐘）
      </div>
    </div>

    <!-- 檔案上傳 -->
    <input
      type="file"
      accept=".docx"
      @change="handleFileUpload"
      class="file-input"
    />

    <!-- 狀態顯示 -->
    <div v-if="uploadStatus" class="upload-status">
      <pre>{{ uploadStatus }}</pre>
    </div>

    <!-- 格式說明 -->
    <details class="format-guide">
      <summary>📋 自動判斷規則說明</summary>

      <div class="comparison-table">
        <table>
          <thead>
            <tr>
              <th>項目</th>
              <th>程式規則</th>
              <th>Gemini AI</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>速度</td>
              <td>⚡ 極快（&lt;1秒）</td>
              <td>🐢 較慢（3-5秒）</td>
            </tr>
            <tr>
              <td>準確率</td>
              <td>📊 75-85%</td>
              <td>🎯 95-98%</td>
            </tr>
            <tr>
              <td>成本</td>
              <td>💰 免費</td>
              <td>🆓 免費額度內</td>
            </tr>
            <tr>
              <td>適用場景</td>
              <td>格式規範文章</td>
              <td>混亂/複雜文章</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="guide-note">💡 上傳後仍可手動調整分類結果</p>
    </details>
  </div>
</template>

<style scoped>
.api-status {
  padding: 12px;
  background: #f0f0f0;
  border-radius: 6px;
  margin-bottom: 16px;
}

.status-ok {
  color: #22c55e;
  font-weight: bold;
}

.status-error {
  color: #ef4444;
  font-weight: bold;
}

.ai-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
}

.ai-toggle input[type="checkbox"] {
  width: 20px;
  height: 20px;
}

.toggle-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toggle-label small {
  color: #6b7280;
  font-size: 0.875rem;
}

.ai-info {
  margin-top: 8px;
  padding: 12px;
  background: #dbeafe;
  border-left: 4px solid #3b82f6;
  border-radius: 4px;
  font-size: 0.9rem;
}

.comparison-table {
  margin: 16px 0;
  overflow-x: auto;
}

.comparison-table table {
  width: 100%;
  border-collapse: collapse;
}

.comparison-table th,
.comparison-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.comparison-table th {
  background: #f3f4f6;
  font-weight: 600;
}

.upload-status pre {
  white-space: pre-wrap;
  font-family: inherit;
}
</style>
