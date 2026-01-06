<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { marked } from "marked";
import markedFootnote from "marked-footnote";
// ⭐ 修改 1: 使用 ~ 符號來代表根目錄，路徑更穩定
import { supabase } from "~/supabase";

// MainLayout 會自動引入，或是像這樣明確引入也可以
import MainLayout from "~/components/MainLayout.vue";

marked.use(markedFootnote({ prefixId: "footnote-" }));

const route = useRoute();
const article = ref(null);
const loading = ref(true);
const issueImages = ref([]);

// SEO 資料設定 (Nuxt 專用寫法)
useHead({
  title: computed(() => {
    if (!article.value) return "載入中... - 無境界者雜誌";
    // 嘗試從 ID 去除標題來取得編號 (例如 "6-1 標題" -> "6-1")
    const number = article.value.id.replace(article.value.title, "").trim();
    return `${number} ${article.value.title} - 無境界者雜誌`;
  }),
  meta: computed(() => {
    if (!article.value || !article.value.seo) return [];
    const seo = article.value.seo;
    const og = seo.og || {};

    return [
      { name: "description", content: seo.description },
      { name: "keywords", content: seo.keywords },
      { name: "author", content: article.value.author },
      { name: "robots", content: seo.robots },
      { name: "google-site-verification", content: seo.googleVerification },
      // Open Graph
      { property: "og:title", content: og.title },
      { property: "og:description", content: og.description },
      { property: "og:image", content: og.image },
      { property: "og:url", content: og.url },
      { property: "og:type", content: og.type },
      { property: "og:site_name", content: og.site_name },
      { property: "og:locale", content: og.locale },
    ];
  }),
});

// 處理底部導航點擊 (維持原邏輯)
const handleNavClick = () => {
  if (import.meta.client) {
    // 確保只在瀏覽器端執行
    const currentState = window.history.state || {};
    window.history.replaceState({ ...currentState, forceTop: true }, "");
  }
};

const fetchArticleData = async (articleId) => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (error) throw error;

    return {
      ...data,
      authorTitle: data.author_title,
      issueTitle: data.issue_title,
      prev: data.prev_article,
      next: data.next_article,
      footnotes: data.footnotes || [],
    };
  } catch (error) {
    console.error(`載入文章 ${articleId} 失敗:`, error.message);
    return null;
  }
};

const fetchIssueImages = async (issueNumber) => {
  if (!issueNumber) return;
  const path = `articles/issue-${issueNumber}`;
  const { data, error } = await supabase.storage.from("images").list(path, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });

  if (!error && data) {
    issueImages.value = data;
  }
};

// 監聽路由變化 (當使用者點上一篇/下一篇時)
watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      loading.value = true;
      const fetchedArticle = await fetchArticleData(newId);
      if (fetchedArticle) {
        article.value = fetchedArticle;
        if (article.value.issue) {
          await fetchIssueImages(article.value.issue);
        }
      }
      loading.value = false;
    }
  }
);

onMounted(async () => {
  loading.value = true;
  // 處理預覽模式 (從 localStorage 讀取)
  if (route.name === "article-preview") {
    const localData = localStorage.getItem("preview_article");
    if (localData) {
      article.value = JSON.parse(localData);
      if (article.value.issue) {
        await fetchIssueImages(article.value.issue);
      }
      loading.value = false;
      return;
    }
  }

  // 正常載入
  const articleId = route.params.id;
  const fetchedArticle = await fetchArticleData(articleId);

  if (fetchedArticle) {
    article.value = fetchedArticle;
    if (article.value.issue) {
      await fetchIssueImages(article.value.issue);
    }
  }
  loading.value = false;
});

// 輔助函式：處理註腳連結
const formatTextWithFootnote = (text) => {
  if (!text) return "";
  return text.replace(/\[\^(\d+)\]/g, (match, id) => {
    return `<sup class="footnote-ref"><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`;
  });
};

// Markdown 解析
const htmlContent = computed(() => {
  if (!article.value || !article.value.content) return "";
  let fullText = article.value.content;

  // 替換註腳引用
  fullText = fullText.replace(/\[\^(\d+)\]/g, (match, id) => {
    return `<sup class="footnote-ref"><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`;
  });

  let parsedHtml = marked.parse(fullText, { gfm: true, breaks: true });

  // 替換圖片路徑 (Supabase Storage)
  parsedHtml = parsedHtml.replace(/src="([^"]+)"/g, (match, srcValue) => {
    if (
      srcValue.startsWith("http") ||
      srcValue.startsWith("data:") ||
      srcValue.startsWith("//")
    ) {
      return match;
    }
    if (!issueImages.value || issueImages.value.length === 0) {
      return match;
    }
    // 嘗試比對檔名
    const matchedFile = issueImages.value.find((file) => {
      const nameWithoutExt =
        file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      return file.name === srcValue || nameWithoutExt === srcValue;
    });

    if (matchedFile) {
      const fullPath = `articles/issue-${article.value.issue}/${matchedFile.name}`;
      const { data } = supabase.storage.from("images").getPublicUrl(fullPath);
      return `src="${data.publicUrl}"`;
    }
    return match;
  });

  // 產生註腳列表
  if (article.value.footnotes && article.value.footnotes.length > 0) {
    const listItems = article.value.footnotes
      .map((note) => {
        return `<li id="footnote-${note.id}">
          <p>
            ${note.text}
            <a href="#footnote-ref-${note.id}" class="footnote-backref">↩</a>
          </p>
        </li>`;
      })
      .join("");

    parsedHtml += `
      <div class="footnotes">
        <hr />
        <ol>${listItems}</ol>
      </div>
    `;
  }

  return parsedHtml;
});

const keywordContent = computed(() => {
  if (!article.value || !article.value.keyword) return "";
  return marked.parse(article.value.keyword);
});

const categoryColor = computed(() => {
  if (!article.value || !article.value.category) return "#ff8000";
  const colorMap = {
    專題文章: "#8b0000",
    評論與回應: "#ff8000",
    人物專訪: "#f0e137",
    生命故事: "#46b175",
    時事感想: "#4682b4",
    文藝創作: "#27408b",
    公告與剪影: "#6a5acd",
    封面故事: "#7d6c29",
    光影時刻: "#7d6c29",
    實驗園地: "#db7093",
  };
  return colorMap[article.value.category] || "#ff8000";
});

const issueLinkParams = computed(() => {
  if (!article.value || !article.value.issue) return {};
  const year = 2025 + Math.floor((article.value.issue - 1) / 6);
  return {
    path: "/articles",
    query: { year: year },
    hash: `#issue-${article.value.issue}`,
  };
});
</script>

<template>
  <MainLayout>
    <div v-if="loading" class="loading-state">
      正在載入文章內容 🕊️<span class="loading-dots"></span>
    </div>

    <div v-else-if="!article" class="not-found">
      <h2>找不到這篇文章😖</h2>
      <NuxtLink to="/articles" class="back-link">回文章列表</NuxtLink>
    </div>

    <article v-else class="article-content">
      <div class="title-header">
        <div
          v-if="article.category"
          class="featured-box"
          :style="{ backgroundColor: categoryColor }"
        >
          {{ article.category }}
        </div>

        <h1
          class="main-title"
          v-html="formatTextWithFootnote(article.title)"
        ></h1>
        <h1
          v-if="article.subtitle"
          class="sub-title"
          v-html="'──' + formatTextWithFootnote(article.subtitle)"
        ></h1>
      </div>

      <div class="divider-thick"></div>
      <div class="divider-gap"></div>
      <div class="divider-thin"></div>

      <div class="author-info">
        <p class="author-name">
          <span v-html="formatTextWithFootnote(article.author)"></span>
          <span
            class="author-title"
            v-html="formatTextWithFootnote(article.authorTitle)"
          ></span>
          <span
            v-if="article.remark"
            class="author-remark"
            v-html="formatTextWithFootnote(article.remark)"
          ></span>
        </p>
      </div>

      <div
        v-if="article.keyword"
        class="keyword-section"
        v-html="keywordContent"
      ></div>
      <br />
      <div class="markdown-body" v-html="htmlContent"></div>

      <div class="article-navigation">
        <div class="nav-item">
          <template v-if="article.prev">
            <strong>閱讀上一篇文章</strong>
            <NuxtLink
              v-if="article.prev.id"
              :to="`/articles/${article.prev.id}`"
              @click="handleNavClick"
            >
              {{ article.prev.title }}
            </NuxtLink>
            <span v-else>{{ article.prev.title }}</span>
          </template>
        </div>

        <div class="nav-item">
          <strong>回到本期雜誌目錄</strong>
          <NuxtLink :to="issueLinkParams" @click="handleNavClick">
            第{{ article.issue }}期：{{ article.issueTitle }}
          </NuxtLink>
        </div>

        <div class="nav-item">
          <template v-if="article.next">
            <strong>閱讀下一篇文章</strong>
            <NuxtLink
              v-if="article.next.id"
              :to="`/articles/${article.next.id}`"
              @click="handleNavClick"
            >
              {{ article.next.title }}
            </NuxtLink>
            <span v-else>{{ article.next.title }}</span>
          </template>
        </div>
      </div>
    </article>
  </MainLayout>
</template>

<style scoped>
/* 這裡不需要重寫 markdown-body 的樣式，因為 nuxt.config.ts 已經全域引入了 article.css */

.title-header {
  position: relative;
  margin-bottom: 20px;
}
.featured-box {
  position: absolute;
  right: 0;
  color: white;
  font-weight: bold;
  font-size: 1.6rem;
  border-radius: 4px;
  padding: 5px 15px;
  margin-top: -3rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.main-title {
  font-family: "Times New Roman", serif;
  font-size: 2.5rem;
  font-weight: bold;
  color: #444;
  text-align: left;
  margin-top: 40px;
  line-height: 1.4;
  padding-left: 2rem;
}
.sub-title {
  font-family: "Times New Roman", serif;
  font-size: 2rem;
  font-weight: bold;
  color: #444;
  margin-top: 10px;
  text-align: left;
  padding-left: 6rem;
}
.divider-thick {
  height: 3px;
  background: #444;
  width: 100%;
}
.divider-gap {
  height: 3px;
}
.divider-thin {
  height: 1px;
  background: #444;
  width: 100%;
  margin-bottom: 20px;
}
.author-info {
  text-align: right;
  margin-bottom: 40px;
  font-family: "Times New Roman", serif;
}
.author-name {
  font-size: 1.2rem;
  color: #444;
}
.author-title {
  display: block;
  font-size: 1.2rem;
  color: #444;
  margin-top: 4px;
}
.author-remark {
  display: block;
  font-size: 1.2rem;
  color: #444;
  margin-top: 10px;
}
.not-found {
  text-align: center;
  padding: 60px;
  color: #666;
}
.back-link {
  display: inline-block;
  margin-top: 20px;
  color: #007bff;
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.back-link:hover {
  border-bottom-color: #007bff;
}
.article-navigation {
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  margin-top: 3rem;
  padding: 20px 0;
  border-top: 1px solid #ddd;
  text-align: center;
  gap: 1.5rem;
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 60px;
}
.nav-item strong {
  display: block;
  margin-bottom: 8px;
  color: #444;
  font-size: 1.2rem;
}
.nav-item a {
  text-decoration: none;
  color: #007bff;
  font-size: 1.2rem;
  font-family: "Times New Roman", serif;
  max-width: 20ch;
  word-wrap: break-word;
  text-align: center;
  line-height: 1.4;
}
.nav-item a:hover {
  text-decoration: underline;
  color: #0056b3;
}
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  font-size: 2.5rem;
  color: #888;
  font-family: "Times New Roman", serif;
  font-weight: bold;
}
.loading-dots::after {
  content: "";
  animation: dots-cycle 2s infinite steps(1);
}
@keyframes dots-cycle {
  0% {
    content: "";
  }
  15% {
    content: ".";
  }
  30% {
    content: "..";
  }
  45% {
    content: "...";
  }
  60% {
    content: "....";
  }
  75% {
    content: ".....";
  }
  90% {
    content: "......";
  }
}
:deep(.footnotes) {
  margin-top: 60px;
  padding-top: 20px;
  border-top: 2px solid #444;
  font-size: 1rem;
  color: #666;
}
:deep(.footnotes h2),
:deep(.footnotes hr) {
  display: none;
}
:deep(.footnotes ol) {
  padding-left: 0;
  margin-left: -1rem;
  list-style: none;
  counter-reset: footnote-counter;
}
:deep(.footnotes li) {
  display: flex;
  align-items: baseline;
  position: relative;
  margin-bottom: 0px;
  padding-left: 0;
  counter-increment: footnote-counter;
  line-height: 1.6;
}
:deep(.footnotes li::before) {
  content: counter(footnote-counter);
  display: inline-block;
  width: 2em;
  flex-shrink: 0;
  text-align: right;
  color: #007bff;
  font-family: "Times New Roman", serif;
  position: static;
  cursor: pointer;
}
:deep(.footnotes li::before:hover) {
  color: #0056b3;
  font-weight: bold;
  text-decoration: underline;
}
:deep(.footnotes li p) {
  margin: 0;
  text-indent: 0 !important;
  flex-grow: 1;
  padding-left: 10px;
  font-family: "Times New Roman", serif;
  color: #444;
  text-align: justify;
  min-width: 0;
  word-wrap: break-word;
  overflow-wrap: anywhere;
  word-break: break-word;
}
:deep(.footnotes .footnote-backref) {
  text-decoration: none;
  border: none;
  color: #007bff;
  margin-left: 5px;
  font-family: sans-serif;
}
:deep(.footnotes .footnote-backref:hover) {
  color: #0056b3;
}
@media (max-width: 768px) {
  .featured-box {
    position: relative;
    display: inline-block;
    float: right;
    margin: 0 0 20px auto;
    font-size: 1.2rem;
  }
  .main-title {
    font-size: 2.5rem;
    clear: both;
    padding-left: 0;
  }
  .sub-title {
    font-size: 2rem;
    padding-left: 0;
  }
  .article-navigation {
    flex-direction: column;
    gap: 2rem;
  }
  .nav-item {
    width: 100%;
    border-bottom: 1px solid #eee;
    padding-bottom: 15px;
  }
  .nav-item:last-child {
    border-bottom: none;
  }
  .loading-state {
    text-align: center;
    padding: 60px;
    font-size: 1.5rem;
    color: #444;
  }
}
</style>
