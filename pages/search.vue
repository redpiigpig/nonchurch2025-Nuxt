<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useLanguage } from "~/composables/useLanguage";
import { useEditorMode } from "~/composables/useEditorMode";
import { stripFootnoteReferences } from "~/utils/displayText";

const supabase = useSupabaseClient();
const { currentLang } = useLanguage();
const { isEditor } = useEditorMode();
const route = useRoute();
const router = useRouter();

const results = ref([]);
const rawLatestArticles = ref([]);
const loading = ref(false);
const inputQuery = ref("");
const inputType = ref("title");
const currentKeyword = ref("");
const currentField = ref("title");
const hotKeywords = ref([]);
const latestIssueId = ref(null);

// ─── 多語字典 ─────────────────────────────────────────────────────
const searchTranslations = {
  "zh-TW": {
    title: "搜尋",
    hot: (id) => `第 ${id} 期關鍵字：`,
    optTitle: "搜尋文章標題",
    optAuthor: "搜尋作者",
    optContent: "搜尋文章全文",
    optKeyword: "搜尋關鍵字",
    placeholder: "請輸入搜尋內容...",
    searchBtn: "搜尋",
    hint: "💡 提示：支援模糊搜尋，請選擇欄位並輸入關鍵字。",
    resultTitle: (q, f) => `用「${q}」搜尋${f}的結果`,
    count: (c) => `${c} 筆`,
    loading: "搜尋中🕊️...",
    noResult: "找不到相關內容，請嘗試其他關鍵字。",
    clickHint: "點擊觀看文章全文",
    issuePrefix: (id, t) => `第${id}期：${t}`,
    authorPrefix: "作者：",
    keywordPrefix: "🌿 關鍵字：",
  },
  "zh-HK": {
    title: "搜尋",
    hot: (id) => `第 ${id} 期關鍵字：`,
    optTitle: "搜尋文章標題",
    optAuthor: "搜尋作者",
    optContent: "搜尋文章全文",
    optKeyword: "搜尋關鍵字",
    placeholder: "請輸入搜尋內容...",
    searchBtn: "搜尋",
    hint: "💡 提示：支援模糊搜尋，請揀選欄位並輸入關鍵字。",
    resultTitle: (q, f) => `用「${q}」搜尋${f}嘅結果`,
    count: (c) => `${c} 筆`,
    loading: "搜尋緊🕊️...",
    noResult: "搵唔到相關內容，請嘗試其他關鍵字。",
    clickHint: "撳入去睇文章全文",
    issuePrefix: (id, t) => `第${id}期：${t}`,
    authorPrefix: "作者：",
    keywordPrefix: "🌿 關鍵字：",
  },
  "zh-CN": {
    title: "搜索",
    hot: (id) => `第 ${id} 期关键字：`,
    optTitle: "搜索文章标题",
    optAuthor: "搜索作者",
    optContent: "搜索文章全文",
    optKeyword: "搜索关键字",
    placeholder: "请输入搜索内容...",
    searchBtn: "搜索",
    hint: "💡 提示：支持模糊搜索，请选择字段并输入关键字。",
    resultTitle: (q, f) => `用"${q}"搜索${f}的结果`,
    count: (c) => `${c} 笔`,
    loading: "搜索中🕊️...",
    noResult: "找不到相关内容，请尝试其他关键字。",
    clickHint: "点击观看文章全文",
    issuePrefix: (id, t) => `第${id}期：${t}`,
    authorPrefix: "作者：",
    keywordPrefix: "🌿 关键字：",
  },
  en: {
    title: "Search",
    hot: (id) => `Vol.${id} Keywords:`,
    optTitle: "Search by Title",
    optAuthor: "Search by Author",
    optContent: "Search Full Text",
    optKeyword: "Search by Keyword",
    placeholder: "Enter search term...",
    searchBtn: "Search",
    hint: "💡 Hint: Fuzzy search is supported. Select a field and enter a keyword.",
    resultTitle: (q, f) => `Results for "${q}" in ${f}`,
    count: (c) => `${c} found`,
    loading: "Searching🕊️...",
    noResult: "No results found. Please try other keywords.",
    clickHint: "Click to read full article",
    issuePrefix: (id, t) => `Vol.${id}: ${t}`,
    authorPrefix: "Author: ",
    keywordPrefix: "🌿 Keywords: ",
  },
  ja: {
    title: "検索",
    hot: (id) => `第${id}号 キーワード：`,
    optTitle: "タイトルで検索",
    optAuthor: "執筆者で検索",
    optContent: "全文検索",
    optKeyword: "キーワード検索",
    placeholder: "検索キーワードを入力...",
    searchBtn: "検索",
    hint: "💡 ヒント：あいまい検索対応。検索対象を選択してキーワードを入力してください。",
    resultTitle: (q, f) => `「${q}」の検索結果（${f}）`,
    count: (c) => `${c} 件`,
    loading: "検索中🕊️...",
    noResult: "見つかりませんでした。別のキーワードをお試しください。",
    clickHint: "クリックして全文を読む",
    issuePrefix: (id, t) => `第${id}号：${t}`,
    authorPrefix: "執筆者：",
    keywordPrefix: "🌿 キーワード：",
  },
  ko: {
    title: "검색",
    hot: (id) => `제${id}호 키워드:`,
    optTitle: "제목으로 검색",
    optAuthor: "작성자로 검색",
    optContent: "본문 검색",
    optKeyword: "키워드로 검색",
    placeholder: "검색어 입력...",
    searchBtn: "검색",
    hint: "💡 힌트: 퍼지 검색 지원. 필드를 선택하고 키워드를 입력하세요.",
    resultTitle: (q, f) => `"${q}" 검색 결과 (${f})`,
    count: (c) => `${c} 건`,
    loading: "검색 중🕊️...",
    noResult: "결과가 없습니다. 다른 키워드를 시도해 보세요.",
    clickHint: "클릭하여 전문 읽기",
    issuePrefix: (id, t) => `제${id}호: ${t}`,
    authorPrefix: "작성자: ",
    keywordPrefix: "🌿 키워드: ",
  },
};
const t = computed(
  () => searchTranslations[currentLang.value] || searchTranslations["zh-TW"],
);
const fieldLabels = computed(() => ({
  title: t.value.optTitle,
  author: t.value.optAuthor,
  content: t.value.optContent,
  keyword: t.value.optKeyword,
}));

// ─── SEO ─────────────────────────────────────────────────────────
useSeoMeta({
  title: () => t.value.title + " - 無境界者雜誌",
  ogTitle: () => t.value.title + " - 無境界者雜誌",
  robots: "noindex, follow",
});

// ─── 關鍵字：讀取翻譯欄位 ─────────────────────────────────────────
const extractKeywords = () => {
  if (!rawLatestArticles.value?.length) return;
  const langKey =
    currentLang.value === "default"
      ? "zh_TW"
      : currentLang.value.replace("-", "_");
  const allKeywords = rawLatestArticles.value
    .map((a) => {
      const trans = a.translations?.[langKey] || {};
      return trans.keyword || a.keyword || "";
    })
    .filter(Boolean)
    .join(",")
    .split(/[、,，]/)
    .map((k) =>
      k
        .replace(/🌿/g, "")
        .replace(/(關鍵字|关键字|Keywords|キーワード|키워드)\s*[:：]/gi, "")
        .trim(),
    )
    .filter((k) => k.length > 0);
  hotKeywords.value = [...new Set(allKeywords)]
    .sort(() => 0.5 - Math.random())
    .slice(0, 6);
};

const fetchLatestKeywords = async () => {
  try {
    const showDrafts = isEditor.value;
    let issueQ = supabase
      .from("issues")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);
    if (!showDrafts) issueQ = issueQ.eq("is_published", true);
    const { data: issues } = await issueQ;
    if (!issues?.length) return;
    latestIssueId.value = issues[0].id;

    let artQ = supabase
      .from("articles")
      .select("keyword, translations")
      .eq("issue", latestIssueId.value);
    if (!showDrafts) artQ = artQ.eq("is_published", true);
    const { data: articles } = await artQ;
    if (!articles) return;
    rawLatestArticles.value = articles;
    extractKeywords();
  } catch (err) {
    console.error("載入關鍵字失敗:", err);
  }
};

// ─── 搜尋（含 Supabase jsonb translations 欄位）──────────────────
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
    const langKey =
      currentLang.value === "default"
        ? "zh_TW"
        : currentLang.value.replace("-", "_");
    const safeQ = q.replace(/'/g, "''");

    let query = supabase
      .from("articles")
      .select(
        "id, title, subtitle, author, author_display, content, keyword, issue, issues(title, translations), translations",
      )
      .eq("is_published", true);

    if (type === "title") {
      query = query.or(
        `title.ilike.%${safeQ}%,subtitle.ilike.%${safeQ}%,translations->${langKey}->>title.ilike.%${safeQ}%,translations->${langKey}->>subtitle.ilike.%${safeQ}%`,
      );
    } else if (type === "author") {
      query = query.or(
        `author.ilike.%${safeQ}%,author_display.ilike.%${safeQ}%,translations->${langKey}->>author.ilike.%${safeQ}%,translations->${langKey}->>author_display.ilike.%${safeQ}%`,
      );
    } else if (type === "keyword") {
      query = query.or(
        `keyword.ilike.%${safeQ}%,translations->${langKey}->>keyword.ilike.%${safeQ}%`,
      );
    } else if (type === "content") {
      query = query.ilike("content", `%${safeQ}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    results.value = data || [];
  } catch (err) {
    console.error("搜尋錯誤", err);
  } finally {
    loading.value = false;
  }
};

// displayResults：套用 translations 翻譯
const displayResults = computed(() => {
  const langKey =
    currentLang.value === "default"
      ? "zh_TW"
      : currentLang.value.replace("-", "_");
  return results.value.map((a) => {
    const tArt = a.translations?.[langKey] || {};
    const tIss = a.issues?.translations?.[langKey] || {};
    return {
      ...a,
      displayTitle: stripFootnoteReferences(tArt.title || a.title),
      displaySubtitle: stripFootnoteReferences(tArt.subtitle || a.subtitle),
      displayAuthor:
        tArt.author_display || tArt.author || a.author_display || a.author,
      displayKeyword: tArt.keyword || a.keyword,
      displayIssueTitle: tIss.title || a.issues?.title,
    };
  });
});

const highlightFull = (content, searchTerm) => {
  if (!content) return "";
  if (!searchTerm) return content;
  return content.replace(
    new RegExp(`(${searchTerm})`, "gi"),
    '<span class="highlight-text">$1</span>',
  );
};

const highlightSnippet = (content, searchTerm) => {
  if (!content) return "";
  let processed = content
    .replace(/\[\^(\d+)\]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!searchTerm) return processed.substring(0, 200) + "...";
  const index = processed.toLowerCase().indexOf(searchTerm.toLowerCase());
  if (index === -1) return processed.substring(0, 200) + "...";
  const start = Math.max(0, index - 100);
  const end = Math.min(processed.length, index + searchTerm.length + 100);
  const snippet =
    (start > 0 ? "..." : "") +
    processed.substring(start, end) +
    (end < processed.length ? "..." : "");
  return snippet.replace(
    new RegExp(`(${searchTerm})`, "gi"),
    '<span class="highlight-text">$1</span>',
  );
};

const clickTag = (tag) => {
  inputQuery.value = tag;
  inputType.value = "keyword";
  handleSearch();
};
const handleSearch = () => {
  if (!inputQuery.value.trim()) return;
  router.push({
    name: "search",
    query: { q: inputQuery.value, type: inputType.value },
  });
};

watch(() => route.query, fetchResults);
watch(currentLang, extractKeywords);

onMounted(() => {
  fetchLatestKeywords();
  fetchResults();
});
</script>

<template>
  <div class="search-page-container">
    <div class="search-header-section">
      <h1 class="page-title">
        <span class="search-icon">🔍</span> {{ t.title }}
      </h1>

      <div class="hot-keywords-section" v-if="hotKeywords.length > 0">
        <span class="hot-label">{{ t.hot(latestIssueId) }}</span>
        <div class="tags-wrapper">
          <a
            v-for="tag in hotKeywords"
            :key="tag"
            href="#"
            class="keyword-tag"
            @click.prevent="clickTag(tag)"
            >#{{ tag }}</a
          >
        </div>
      </div>

      <div class="search-box">
        <select v-model="inputType" class="search-select">
          <option value="title">{{ t.optTitle }}</option>
          <option value="author">{{ t.optAuthor }}</option>
          <option value="content">{{ t.optContent }}</option>
          <option value="keyword">{{ t.optKeyword }}</option>
        </select>
        <input
          v-model="inputQuery"
          @keyup.enter="handleSearch"
          type="text"
          :placeholder="t.placeholder"
          class="search-input"
        />
        <button @click="handleSearch" class="btn">{{ t.searchBtn }}</button>
      </div>
      <div class="hint-text">{{ t.hint }}</div>
    </div>

    <hr class="divider" />

    <div v-if="currentKeyword">
      <div class="result-status">
        <h2>
          {{ t.resultTitle(currentKeyword, fieldLabels[currentField]) }}
          <span class="count-tag">{{ t.count(displayResults.length) }}</span>
        </h2>
      </div>
      <div v-if="loading" class="loading-state">{{ t.loading }}</div>
      <div v-else-if="displayResults.length === 0" class="no-result">
        {{ t.noResult }}
      </div>

      <div v-else class="results-list">
        <div
          v-for="article in displayResults"
          :key="article.id"
          class="result-card"
          :title="t.clickHint"
        >
          <NuxtLink :to="`/articles/${article.id}`" class="card-link">
            <div class="meta-info">
              {{ t.issuePrefix(article.issue, article.displayIssueTitle) }}
            </div>
            <div class="title-row">
              <h3 class="article-title-group">
                <span
                  v-html="highlightFull(article.displayTitle, currentKeyword)"
                ></span>
                <span v-if="article.displaySubtitle" class="title-separator"
                  >──</span
                >
                <span
                  v-if="article.displaySubtitle"
                  class="article-subtitle"
                  v-html="
                    highlightFull(article.displaySubtitle, currentKeyword)
                  "
                ></span>
              </h3>
              <div class="article-author">
                {{ t.authorPrefix }}
                <span
                  v-html="highlightFull(article.displayAuthor, currentKeyword)"
                ></span>
              </div>
            </div>
            <div
              v-if="currentField === 'keyword' && article.displayKeyword"
              class="keyword-row"
            >
              {{ t.keywordPrefix
              }}<span
                v-html="highlightFull(article.displayKeyword, currentKeyword)"
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

<style>
.highlight-text {
  color: #003366;
  font-weight: bold;
  background-color: rgba(255, 255, 0, 0.3);
  padding: 0 2px;
  border-radius: 2px;
}
</style>

<style scoped>
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
  transition:
    transform 0.2s,
    box-shadow 0.2s;
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
