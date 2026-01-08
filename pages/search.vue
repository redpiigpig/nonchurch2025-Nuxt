<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "~/supabase";
import { useEditorMode } from "~/composables/useEditorMode";

useSeoMeta({
  title: "搜尋 - 無境界者雜誌",
  robots: "noindex, follow",
});

const route = useRoute();
const router = useRouter();
const { isEditor } = useEditorMode();

const results = ref([]);
const loading = ref(false);
const inputQuery = ref("");
const inputType = ref("title");
const currentKeyword = ref("");
const currentField = ref("title");

const fieldLabels = {
  title: "文章標題",
  author: "作者",
  content: "文章全文",
  keyword: "關鍵字",
};

// ----------------------------------------------------------------
// 1. SSR 資料獲取：隨機關鍵字 (支援後台模式)
// ----------------------------------------------------------------
const { data: keywordData } = await useAsyncData(
  `search-hot-keywords-${isEditor.value}`, // Cache key 加入編輯狀態
  async () => {
    try {
      // A. 找最新一期 (根據權限決定是否過濾未發布)
      let issueQuery = supabase
        .from("issues")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);

      // 如果「不是」管理員，才過濾 published
      if (!isEditor.value) {
        issueQuery = issueQuery.eq("is_published", true);
      }

      const { data: issues } = await issueQuery;

      if (!issues || issues.length === 0)
        return { issueId: null, keywords: [] };
      const targetIssueId = issues[0].id;

      // B. 找該期文章關鍵字
      let articleQuery = supabase
        .from("articles")
        .select("keyword")
        .eq("issue", targetIssueId);

      // 同樣，不是管理員才過濾
      if (!isEditor.value) {
        articleQuery = articleQuery.eq("is_published", true);
      }

      const { data: articles } = await articleQuery;

      if (!articles) return { issueId: targetIssueId, keywords: [] };

      // C. 整理與隨機排序
      const allKeywords = articles
        .map((a) => a.keyword)
        .filter((k) => k)
        .join("、")
        .split(/[、,]/)
        .map((k) =>
          k
            .replace("🌿", "")
            .replace("關鍵字：", "")
            .replace("關鍵字:", "")
            .trim()
        )
        .filter((k) => k && k.length > 0);

      const uniqueKeywords = [...new Set(allKeywords)];
      // Fisher-Yates Shuffle
      for (let i = uniqueKeywords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueKeywords[i], uniqueKeywords[j]] = [
          uniqueKeywords[j],
          uniqueKeywords[i],
        ];
      }

      return {
        issueId: targetIssueId,
        keywords: uniqueKeywords.slice(0, 6),
      };
    } catch (err) {
      console.error("載入關鍵字失敗:", err);
      return { issueId: null, keywords: [] };
    }
  },
  {
    watch: [isEditor], // 當模式切換時重抓
  }
);

const latestIssueId = computed(() => keywordData.value?.issueId);
const hotKeywords = computed(() => keywordData.value?.keywords || []);

// ----------------------------------------------------------------
// 2. 搜尋功能 (Client-Side)
// ----------------------------------------------------------------

const clickTag = (tag) => {
  inputQuery.value = tag;
  inputType.value = "keyword";
  handleSearch();
};

const handleSearch = () => {
  if (!inputQuery.value.trim()) return;
  router.push({
    name: "search", // 這樣會自動保留目前的 admin 狀態 (如果是在 /admin/search 就會留在那)
    query: {
      q: inputQuery.value,
      type: inputType.value,
    },
  });
};

const fetchResults = async () => {
  const q = route.query.q || "";
  const type = route.query.type || "title";

  inputQuery.value = q;
  inputType.value = type;
  currentKeyword.value = q;
  currentField.value = type;

  if (!q) {
    results.value = [];
    return;
  }

  loading.value = true;
  try {
    // 注意：原本的 RPC search_articles 可能只會搜尋「已發布」的文章
    // 如果您希望後台能搜尋到草稿，您需要在 Supabase 資料庫修改這個 function，
    // 讓它接受一個 is_published 參數，或者建立一個 search_articles_admin。
    // 目前這裡維持原樣，但至少介面已經是後台模式了。
    const { data, error } = await supabase.rpc("search_articles", {
      search_text: q,
      field: type,
    });

    if (error) throw error;
    results.value = data;
  } catch (err) {
    console.error("搜尋錯誤", err);
  } finally {
    loading.value = false;
  }
};

// ... (以下 highlightFull, highlightSnippet, renderMarkers 等輔助函式保持不變) ...
// 為節省篇幅，這裡省略，請保留您原本檔案中的這些函式
// ...

const highlightFull = (content, searchTerm) => {
  if (!content) return "";
  if (!searchTerm) return content;
  const regex = new RegExp(`(${searchTerm})`, "gi");
  return content.replace(regex, '<span class="highlight-text">$1</span>');
};

const highlightSnippet = (content, searchTerm) => {
  if (!content) return "";
  let processed = content
    .replace(/\[\^(\d+)\]/g, '<sup class="search-footnote">$1</sup>')
    .replace(
      /(^|\s)#{2,3}\s+(.*?)(?=\n|$)/g,
      '<div class="search-header">$2</div>'
    )
    .replace(/<(strong|b)>(.*?)<\/\1>/gi, "___BOLD___$2___END_BOLD___")
    .replace(/<i>(.*?)<\/i>/gi, "___ITALIC___$1___END_ITALIC___")
    .replace(/(^|\n)#{2,3}\s+(.*?)(?=\n|$)/g, "___HEADER___$2___END_HEADER___")
    .replace(/\*\*(.*?)\*\*/g, "___BOLD___$1___END_BOLD___")
    .replace(/\*(.*?)\*/g, "___KAITI___$1___END_KAITI___");

  processed = processed
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!searchTerm) return renderMarkers(processed.substring(0, 300)) + "...";

  const lowerContent = processed.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const index = lowerContent.indexOf(lowerTerm);

  if (index === -1) return renderMarkers(processed.substring(0, 250)) + "...";

  const start = Math.max(0, index - 150);
  const end = Math.min(processed.length, index + searchTerm.length + 150);
  let snippet = processed.substring(start, end);

  if (start > 0) snippet = "..." + snippet;
  if (end < processed.length) snippet = snippet + "...";

  const regex = new RegExp(`(${searchTerm})`, "gi");
  snippet = snippet.replace(regex, '<span class="highlight-text">$1</span>');

  return renderMarkers(snippet);
};

const renderMarkers = (text) => {
  return text
    .replace(
      /___HEADER___(.*?)___END_HEADER___/g,
      '<div class="snippet-header">$1</div>'
    )
    .replace(/___BOLD___(.*?)___END_BOLD___/g, "<b>$1</b>")
    .replace(
      /___KAITI___(.*?)___END_KAITI___/g,
      '<span class="snippet-kaiti">$1</span>'
    )
    .replace(/___ITALIC___(.*?)___END_ITALIC___/g, "<i>$1</i>");
};

watch(() => route.query, fetchResults);

onMounted(() => {
  fetchResults();
});
</script>

<template>
  <div class="search-page-container">
    <div class="search-header-section">
      <h1 class="page-title"><span class="search-icon">🔍</span> 搜尋</h1>

      <div class="hot-keywords-section" v-if="hotKeywords.length > 0">
        <span class="hot-label">第 {{ latestIssueId }} 期關鍵字：</span>
        <span v-if="isEditor" style="font-size: 0.8em; color: red"
          >(包含草稿)</span
        >

        <div class="tags-wrapper">
          <a
            v-for="tag in hotKeywords"
            :key="tag"
            href="#"
            class="keyword-tag"
            @click.prevent="clickTag(tag)"
          >
            #{{ tag }}
          </a>
        </div>
      </div>

      <div class="search-box">
        <select v-model="inputType" class="search-select">
          <option value="title">搜尋文章標題</option>
          <option value="author">搜尋作者</option>
          <option value="content">搜尋文章全文</option>
          <option value="keyword">搜尋關鍵字</option>
        </select>

        <input
          v-model="inputQuery"
          @keyup.enter="handleSearch"
          type="text"
          placeholder="請輸入搜尋內容..."
          class="search-input"
        />

        <button @click="handleSearch" class="btn">搜尋</button>
      </div>

      <div class="hint-text">
        💡 提示：支援模糊搜尋，請選擇欄位並輸入關鍵字。
      </div>
    </div>

    <hr class="divider" />

    <div v-if="currentKeyword">
      <div class="result-status">
        <h2>
          用 <span class="query-tag">「{{ currentKeyword }}」</span> 搜尋{{
            fieldLabels[currentField]
          }}的結果
          <span class="count-tag">{{ results.length }} 筆</span>
        </h2>
      </div>

      <div v-if="loading" class="loading-state">搜尋中🕊️...</div>

      <div v-else-if="results.length === 0" class="no-result">
        找不到相關內容，請嘗試其他關鍵字。
      </div>

      <div v-else class="results-list">
        <div
          v-for="article in results"
          :key="article.id"
          class="result-card"
          title="點擊觀看文章全文"
        >
          <NuxtLink :to="`/articles/${article.id}`" class="card-link">
            <div class="meta-info">
              第{{ article.issue }}期：{{ article.issue_title }}
            </div>

            <div class="title-row">
              <h3 class="article-title-group">
                <span
                  v-html="highlightFull(article.title, currentKeyword)"
                ></span>
                <span v-if="article.subtitle" class="title-separator">──</span>
                <span
                  v-if="article.subtitle"
                  class="article-subtitle"
                  v-html="highlightFull(article.subtitle, currentKeyword)"
                ></span>
              </h3>

              <div class="article-author">
                作者：<span
                  v-html="highlightFull(article.author, currentKeyword)"
                ></span>
              </div>
            </div>

            <div
              v-if="currentField === 'keyword' && article.keyword"
              class="keyword-row"
            >
              🌿 關鍵字：<span
                v-html="highlightFull(article.keyword, currentKeyword)"
              ></span>
            </div>

            <div
              class="article-snippet"
              v-html="highlightSnippet(article.content, currentKeyword)"
            ></div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS 保持原本的即可，不用更動 */
/* 這裡請貼上原本的 style 區塊 */
.search-page-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 0 20px;
}
.search-header-section {
  text-align: center;
  margin-bottom: 20px;
}
.page-title {
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 20px;
  font-weight: bold;
}
.search-icon {
  font-size: 2rem;
  vertical-align: middle;
}
.hot-keywords-section {
  margin-bottom: 25px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.hot-label {
  font-weight: bold;
  color: #555;
  font-size: 1.1rem;
}
.tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
.keyword-tag {
  color: #007bff;
  text-decoration: none;
  font-family: "Times New Roman", serif;
  font-size: 1.1rem;
  transition: color 0.2s;
}
.keyword-tag:hover {
  text-decoration: underline;
  color: #0056b3;
}
.search-box {
  display: inline-flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.search-select,
.search-input,
.btn {
  height: 42px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 1rem;
}
.search-input {
  width: 300px;
  padding: 0 10px;
  font-family: "Times New Roman", serif;
}
.btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0 25px;
  cursor: pointer;
  font-weight: bold;
}
.btn:hover {
  background-color: #218838;
}
.hint-text {
  font-size: 0.95rem;
  color: #856404;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  display: inline-block;
  padding: 8px 15px;
  border-radius: 6px;
  margin-top: 10px;
}
.divider {
  border: 0;
  height: 1px;
  background: #eee;
  margin: 30px 0;
}
.result-status h2 {
  font-size: 1.2rem;
  color: #555;
  margin-bottom: 20px;
}
.query-tag {
  color: #007bff;
  font-weight: bold;
}
.count-tag {
  margin-left: 10px;
  font-size: 0.9rem;
  background: #eee;
  padding: 2px 8px;
  border-radius: 10px;
  color: #666;
}
.loading-state,
.no-result {
  text-align: center;
  padding: 40px;
  color: #888;
  font-size: 1.5rem;
  font-weight: bold;
}
.result-card {
  background: white;
  margin-bottom: 20px;
  padding: 25px;
  border-radius: 8px;
  border: 1px solid #eee;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
  cursor: pointer;
}
.result-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  border-color: #28a745;
}
.card-link {
  text-decoration: none;
  color: inherit;
  display: block;
}
.meta-info {
  font-size: 0.9rem;
  color: #aaa;
  margin-bottom: 8px;
}
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 15px;
  margin-bottom: 8px;
}
.article-title-group {
  font-size: 1.5rem;
  color: #007bff;
  margin: 0;
  font-family: "Times New Roman", serif;
  line-height: 1.4;
  flex-grow: 1;
}
.article-subtitle {
  color: #007bff;
  font-weight: bold;
  font-size: 1.3rem;
}
.title-separator {
  margin: 0 5px;
  color: #007bff;
}
.article-author {
  font-size: 1rem;
  color: #555;
  font-family: "Times New Roman", serif;
  white-space: normal;
  word-wrap: break-word;
}
.article-snippet {
  font-size: 1.05rem;
  color: #333;
  line-height: 1.7;
  font-family: "Times New Roman", serif;
  border-left: 4px solid #eee;
  padding-left: 15px;
  margin-top: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.search-footnote {
  color: #007bff;
  font-weight: bold;
  font-size: 0.8em;
  vertical-align: super;
  margin-left: 2px;
  cursor: default;
}
.keyword-row {
  font-size: 1rem;
  color: #2e8b57;
  margin-bottom: 10px;
  font-family: "Times New Roman", serif;
  font-weight: bold;
}
@media (max-width: 768px) {
  .search-input,
  .search-select,
  .btn {
    width: 100%;
  }
  .title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  .article-author {
    font-size: 0.9rem;
    color: #888;
  }
}
</style>
