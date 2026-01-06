<script setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "~/supabase"; // 建議使用 ~ Alias
import MainLayout from "~/components/MainLayout.vue";
import { useEditorMode } from "~/composables/useEditorMode"; // Nuxt 其實會自動引入 composables，不寫這行也行
import { authors } from "~/data/authors.js";

const route = useRoute();
const router = useRouter();
const { isEditor } = useEditorMode();

const adminSelectedIssue = ref("");
const searchQuery = ref("");
const searchType = ref("title");
const emailTooltip = ref("點擊複製 Email");

// ----------------------------------------------------------------
// 1. SSR 資料獲取 (取代 onMounted)
// ----------------------------------------------------------------
const { data: pageData, refresh } = await useAsyncData(
  `home-issue-${route.params.issueNumber || "latest"}-${isEditor.value}`,
  async () => {
    // A. 抓取期刊列表
    let query = supabase
      .from("issues")
      .select("*")
      .order("id", { ascending: false });

    if (!isEditor.value) {
      query = query.eq("is_published", true);
    }

    const { data: issuesData, error: issuesError } = await query;
    if (issuesError) throw issuesError;

    const issuesList = issuesData || [];
    if (issuesList.length === 0)
      return {
        issues: [],
        target: null,
        content: [],
        summaries: {},
        keywords: [],
      };

    // B. 決定要顯示哪一期 (網址參數優先，否則最新一期)
    let target = null;
    if (route.params.issueNumber) {
      target = issuesList.find((i) => i.id == route.params.issueNumber);
    }
    if (!target) target = issuesList[0];

    // C. 抓取該期文章
    let content = [];
    let summaries = {};
    let keywords = [];

    if (target) {
      let artQuery = supabase
        .from("articles")
        .select("*")
        .eq("issue", target.id);
      if (!isEditor.value) {
        artQuery = artQuery.eq("is_published", true);
      }
      const { data: articles } = await artQuery;

      if (articles) {
        // 排序邏輯
        articles.sort((a, b) => {
          return a.id.localeCompare(b.id, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        });

        // 整理文章資料
        content = articles.map((a) => ({
          routeId: a.id,
          category: a.category,
          section: a.section,
          title: a.title,
          subtitle: a.subtitle,
          author: a.author_display || a.author,
          keyword: a.keyword,
          color: getCategoryColor(a.category),
        }));

        // 建立簡介對照表
        articles.forEach((a) => {
          summaries[a.id] = a.summary;
        });

        // 處理關鍵字 (隨機排序移到這裡做，避免 Hydration Mismatch)
        const allKeywords = content
          .map((a) => a.keyword)
          .filter((k) => k)
          .join("、")
          .split("、")
          .map((k) => k.replace("🌿", "").replace("關鍵字：", "").trim())
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
        keywords = uniqueKeywords.slice(0, 5);
      }
    }

    return {
      issues: issuesList,
      target: target,
      content: content,
      summaries: summaries,
      keywords: keywords,
    };
  },
  {
    watch: [() => route.params.issueNumber, isEditor], // 當期數或編輯模式改變時，自動重抓
  }
);

// 解構資料
const issuesList = computed(() => pageData.value?.issues || []);
const currentIssueData = computed(() => pageData.value?.target);
const currentIssueContent = computed(() => pageData.value?.content || []);
const articleSummaries = computed(() => pageData.value?.summaries || {});
const hotKeywords = computed(() => pageData.value?.keywords || []);

// ----------------------------------------------------------------
// 2. SEO 設定 (首頁縮圖關鍵)
// ----------------------------------------------------------------
useSeoMeta({
  title: () =>
    currentIssueData.value
      ? `第${currentIssueData.value.id}期 ${currentIssueData.value.title} - 無境界者雜誌`
      : "無境界者雜誌",
  description: () =>
    currentIssueData.value?.intro_home ||
    "無境界者雜誌 - 信仰與社會的自由論述平台",
  ogTitle: () => currentIssueData.value?.title,
  ogDescription: () => currentIssueData.value?.intro_home,
  // ⭐ 讓最新一期的封面成為分享縮圖
  ogImage: () =>
    currentIssueData.value?.cover_img || "https://你的網址/default-cover.png",
  twitterCard: "summary_large_image",
});

// ----------------------------------------------------------------
// 3. 輔助函式
// ----------------------------------------------------------------

const getCategoryColor = (category) => {
  const map = {
    專題文章: "#8b0000",
    評論與回應: "#ff8000",
    人物專訪: "#f0e137",
    生命故事: "#46b175",
    時事感想: "#4682b4",
    文藝創作: "#27408b",
    公告與剪影: "#6a5acd",
    封面故事: "#7d6c29",
  };
  return map[category] || "#999";
};

const getColorClass = (colorCode) => {
  const map = {
    "#8b0000": "red",
    "#ff8000": "orange",
    "#f0e137": "yellow",
    "#46b175": "green",
    "#4682b4": "blue",
    "#6a5acd": "purple",
  };
  return map[colorCode] || "red";
};

const currentIssue = computed(() => {
  if (!currentIssueData.value) return null;
  return {
    number: currentIssueData.value.id,
    title: currentIssueData.value.title,
    date: currentIssueData.value.date,
    coverImg: currentIssueData.value.cover_img,
    introHome: currentIssueData.value.intro_home,
    introCfp: currentIssueData.value.intro_cfp,
    pdfLink: currentIssueData.value.pdf_link,
    authorOrder: currentIssueData.value.author_order,
    content: currentIssueContent.value,
  };
});

// 同步 Admin 選單的值
watch(
  currentIssueData,
  (newVal) => {
    if (newVal) adminSelectedIssue.value = newVal.id;
  },
  { immediate: true }
);

const formattedIntroCfp = computed(() => {
  let text =
    currentIssue.value?.introCfp || "下一期將以精彩主題呈現，敬請期待。";
  text = text.replace(
    /（(.*?)）/,
    (match) =>
      `<span style="color: #ff8000; font-weight: bold;">${match}</span>`
  );
  text = text.replace(
    /「(.*?)」/,
    (match) =>
      `<span style="color: #007bff; font-weight: bold;">${match}</span>`
  );
  return text;
});

const coverStory = computed(() => {
  if (!currentIssue.value) return null;
  return currentIssue.value.content.find(
    (item) => item.category === "封面故事"
  );
});

const groupArticles = (headerText) => {
  if (!currentIssue.value) return [];
  return currentIssue.value.content.filter(
    (i) => i.section && i.section.trim() === headerText
  );
};

const specialFeatures = computed(() => groupArticles("特稿專區"));
const themePlaza = computed(() => groupArticles("主題廣場"));
const diverseLectures = computed(() => groupArticles("多元講堂"));

const currentIssueAuthors = computed(() => {
  if (!currentIssue.value || !authors) return [];
  const appearingNames = [
    ...new Set(currentIssue.value.content.map((a) => a.author)),
  ];

  let filteredAuthors = authors.filter((a) =>
    appearingNames.some((name) => name && name.includes(a.name))
  );

  const orderList = currentIssue.value.authorOrder;
  if (orderList && Array.isArray(orderList)) {
    filteredAuthors.sort((a, b) => {
      const indexA = orderList.indexOf(a.name);
      const indexB = orderList.indexOf(b.name);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.id - b.id;
    });
  } else {
    filteredAuthors.sort((a, b) => a.id - b.id);
  }
  return filteredAuthors;
});

const handleAdminIssueChange = () => {
  if (!adminSelectedIssue.value) return;
  const isAdminPath = route.path.startsWith("/admin");
  const targetPath = isAdminPath
    ? `/admin/home/issue/${adminSelectedIssue.value}`
    : `/home/issue/${adminSelectedIssue.value}`;
  router.push(targetPath);
};

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({
      name: "search",
      query: { q: searchQuery.value, type: searchType.value },
    });
  }
};

const copyEmail = () => {
  // 需在客戶端執行
  if (import.meta.client) {
    navigator.clipboard.writeText("nonchurch2025@gmail.com").then(() => {
      emailTooltip.value = "已複製！";
      setTimeout(() => {
        emailTooltip.value = "點擊複製 Email";
      }, 2000);
    });
  }
};
</script>

<template>
  <MainLayout>
    <h1 class="page-main-title">
      <span class="emoji">🎉</span>
      {{
        route.params.issueNumber
          ? `第${route.params.issueNumber}期回顧`
          : "當期雜誌"
      }}
      <span class="emoji">🎉</span>
    </h1>
    <div class="main-divider"></div>

    <div v-if="isEditor" class="admin-toolbar">
      <span class="toolbar-label">🔧 管理員導航：</span>
      <select
        v-model="adminSelectedIssue"
        @change="handleAdminIssueChange"
        class="admin-select"
      >
        <option v-for="issue in issuesList" :key="issue.id" :value="issue.id">
          Vol.{{ issue.id }} - {{ issue.title }}
          {{ !issue.is_published ? "(草稿)" : "" }}
        </option>
      </select>
    </div>

    <div v-if="!currentIssue && !pageData" class="loading-state">
      正在載入首頁 🕊️<span class="loading-dots"></span>
    </div>

    <div v-else-if="!currentIssue" class="not-found-state">
      <h2>找不到該期雜誌資料 😖</h2>
      <p v-if="!isEditor">可能尚未發布，敬請期待。</p>
      <NuxtLink to="/" class="btn">回最新一期</NuxtLink>
    </div>

    <div v-else class="home-container">
      <section id="current-issue" class="current-issue">
        <div class="left">
          <a
            :href="currentIssue?.pdfLink || '#'"
            target="_blank"
            title="下載本期 PDF 檔"
          >
            <img
              :src="currentIssue?.coverImg"
              :alt="currentIssue?.title"
              class="magazine-cover"
            />
          </a>
          <p class="cover-description">點擊封面下載 PDF</p>
        </div>

        <div class="right">
          <h3>
            <NuxtLink
              :to="`/articles#issue-${currentIssue?.number}`"
              class="title-link"
            >
              第{{ currentIssue?.number }}期《{{ currentIssue?.title }}》
            </NuxtLink>
            <span class="date">{{ currentIssue?.date }}</span>
          </h3>

          <p
            v-for="(paragraph, index) in (currentIssue?.introHome || '').split(
              '\n'
            )"
            :key="index"
            class="issue-desc"
          >
            {{ paragraph }}
          </p>

          <div class="cover-story" v-if="coverStory">
            <span class="icon">📰</span>
            <NuxtLink :to="`/articles/${coverStory.routeId}`">
              封面故事：{{ coverStory.title }}
            </NuxtLink>
          </div>
        </div>
      </section>

      <section
        id="special-features"
        class="diverse-lectures"
        v-if="specialFeatures.length > 0"
      >
        <h2><span class="unicode-icon">🎙️</span>特稿專區</h2>
        <div class="article-container two-cols">
          <NuxtLink
            v-for="article in specialFeatures"
            :key="article.routeId"
            :to="`/articles/${article.routeId}`"
            class="article-link"
          >
            <div class="article">
              <span
                class="article-type"
                :class="getColorClass(article.color)"
                >{{ article.category }}</span
              >
              <h3>{{ article.title }}</h3>
              <h4 v-if="article.subtitle">──{{ article.subtitle }}</h4>
              <br />
              <b class="author-name">{{ article.author }}</b>
              <p class="article-summary">
                {{ articleSummaries[article.routeId] || "..." }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <section id="theme-plaza" class="articles" v-if="themePlaza.length > 0">
        <h2><span class="unicode-icon">🏛️</span>主題廣場</h2>
        <div class="article-container three-cols">
          <NuxtLink
            v-for="article in themePlaza"
            :key="article.routeId"
            :to="`/articles/${article.routeId}`"
            class="article-link"
          >
            <div class="article">
              <span
                class="article-type"
                :class="getColorClass(article.color)"
                >{{ article.category }}</span
              >
              <h3>{{ article.title }}</h3>
              <h4 v-if="article.subtitle">──{{ article.subtitle }}</h4>
              <br />
              <b class="author-name">{{ article.author }}</b>
              <p class="article-summary">
                {{ articleSummaries[article.routeId] || "..." }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <section
        id="diverse-lectures"
        class="diverse-lectures"
        v-if="diverseLectures.length > 0"
      >
        <h2><span class="unicode-icon">🎓</span>多元講堂</h2>
        <div class="article-container three-cols">
          <NuxtLink
            v-for="article in diverseLectures"
            :key="article.routeId"
            :to="`/articles/${article.routeId}`"
            class="article-link"
          >
            <div class="article">
              <span
                class="article-type"
                :class="getColorClass(article.color)"
                >{{ article.category }}</span
              >
              <h3>{{ article.title }}</h3>
              <h4 v-if="article.subtitle">──{{ article.subtitle }}</h4>
              <br />
              <b class="author-name">{{ article.author }}</b>
              <p class="article-summary">
                {{ articleSummaries[article.routeId] || "..." }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <section
        id="authors"
        class="authors"
        v-if="currentIssueAuthors.length > 0"
      >
        <h2><span class="unicode-icon">✍️</span>本期作者</h2>
        <br />
        <div class="author-container">
          <div
            v-for="author in currentIssueAuthors"
            :key="author.id"
            class="author"
          >
            <NuxtLink
              :to="'/authors/' + author.name"
              :data-tooltip="'閱讀此作者其他文章'"
            >
              <img
                :src="author.author_image || author.avatar"
                :alt="author.name"
              />
            </NuxtLink>
            <h4>{{ author.name }}</h4>
          </div>
        </div>
      </section>

      <section id="submission" class="next-preview-submission">
        <div class="card-content">
          <h3>徵稿公告</h3>
          <p class="next-issue-text" v-html="formattedIntroCfp"></p>
          <NuxtLink to="/submit" class="btn">投稿資訊</NuxtLink>
        </div>

        <div class="call-for-submission">
          <h3>線上訂閱</h3>
          <p>
            《無境界者》雜誌是一個不以教會為本位的自由信仰論述平台，亦是一個實驗性質的線上雜誌，會定期在雙數月月底發刊。歡迎讀者留下您的電子信箱訂閱本雜誌，每期發刊時，編輯室就會將當月的連結與PDF檔發送給您！
          </p>
          <a
            href="https://forms.gle/aWSBFRfQ74QY13nw8"
            target="_blank"
            class="btn"
            >線上訂閱</a
          >
        </div>
      </section>

      <section id="search" class="search">
        <h2><span class="construction-icon">🔍</span> 搜尋</h2>
        <br />
        <div class="search-links" v-if="hotKeywords.length > 0">
          <span style="font-weight: bold; color: #666; margin-right: 5px"
            >本期關鍵字：</span
          >
          <a
            v-for="tag in hotKeywords"
            :key="tag"
            href="#"
            @click.prevent="
              searchQuery = tag;
              searchType = 'keyword';
              handleSearch();
            "
            class="keyword-link"
          >
            #{{ tag }}
          </a>
        </div>
        <div class="search-box">
          <select v-model="searchType" class="search-select">
            <option value="title">搜尋文章標題</option>
            <option value="author">搜尋作者</option>
            <option value="content">搜尋文章全文</option>
            <option value="keyword">搜尋關鍵字</option>
          </select>
          <input
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="請輸入搜尋內容..."
            class="search-input"
          />
          <button @click="handleSearch" class="btn-search">搜尋</button>
        </div>
        <div class="search-info-box">
          💡 提示：支援模糊搜尋，請選擇欄位並輸入關鍵字。
        </div>
      </section>

      <section id="contact" class="contact">
        <h2><span class="unicode-icon">📧</span>聯繫我們</h2>
        <div class="social-links">
          <a
            href="https://www.facebook.com/profile.php?id=61573500811055"
            target="_blank"
            class="social-btn facebook"
            data-tooltip="前往 Facebook 粉專"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"
              />
            </svg>
          </a>
          <a
            href="https://www.instagram.com/nonchurch2025/"
            target="_blank"
            class="social-btn instagram"
            data-tooltip="追蹤 Instagram @nonchurch2025"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069-3.204 0-3.584-.012-4.849-.069-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
              />
            </svg>
          </a>
          <a
            href="https://www.threads.net/@nonchurch2025"
            target="_blank"
            class="social-btn threads"
            data-tooltip="追蹤 Threads @nonchurch2025"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12.186 19.314c-4.664 0-7.797-3.083-7.797-7.399 0-4.475 3.327-7.863 8.356-7.863 5.487 0 8.01 3.585 8.01 7.294 0 3.235-1.688 6.151-4.802 6.151-1.799 0-2.716-1.077-2.716-2.316 0-.251.026-.503.064-.753.488-3.197.876-5.83.876-6.155 0-1.155-.729-1.696-1.571-1.696-1.447 0-2.583 1.76-2.583 4.498 0 2.336.809 3.567 1.996 3.567.893 0 1.748-.564 2.285-1.472l.965.626c-.845 1.464-2.189 2.378-3.791 2.378-2.188 0-3.528-1.799-3.528-4.708 0-2.073.681-4.819 3.961-4.819 3.903 0 5.672 2.763 5.672 6.273 0 2.503-1.477 4.708-3.419 4.708-1.571 0-2.288-.93-2.364-1.559h-.075c-.566 1.156-1.747 1.835-3.067 1.835-2.275 0-3.832-1.683-3.832-4.072 0-2.903 2.149-5.328 6.008-5.328 1.056 0 2.061.163 2.651.352.012.088-.476 3.003-1.054 6.756-.051.327-.089.666-.089.967 0 2.036 2.061 2.036 2.324 2.036 3.557 0 5.672-3.217 5.672-7.513 0-4.902-3.455-8.879-9.591-8.879C5.433 1.083 1.25 5.511 1.25 11.915c0 5.761 3.94 9.117 8.358 9.117 2.212 0 4.148-.704 5.379-1.42l-.564-1.545c-1.396.842-3.13 1.247-4.793 1.247z"
              />
            </svg>
          </a>
          <a
            href="#"
            @click.prevent="copyEmail"
            class="social-btn email"
            :data-tooltip="emailTooltip"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
              />
            </svg>
          </a>
        </div>
      </section>
    </div>
  </MainLayout>
</template>

<style scoped>
/* =================================================================
   1. 後台工具列
   ================================================================= */
.admin-toolbar {
  background-color: #fff3cd;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  border: 1px solid #ffeeba;
  justify-content: center;
}
.toolbar-label {
  font-weight: bold;
  color: #856404;
  margin-right: 10px;
}
.admin-select {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  font-size: 1rem;
}

section {
  padding: 2rem;
  margin: 0 0 2rem 0;
}

h2 {
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.btn {
  display: block;
  width: fit-content;
  margin: 1rem auto 0;
  padding: 0.5rem 1.5rem;
  background-color: #4caf50;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  text-align: center;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn:hover {
  background-color: #45a049;
  transform: translateY(-3px);
}

/* =================================================================
   2. 當期雜誌
   ================================================================= */
.current-issue {
  display: flex;
  gap: 2rem;
  background: #fcc9d6;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin: 0 30px;
}

.current-issue .left {
  flex: 0 0 40%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.magazine-cover {
  width: 100%;
  max-width: 400px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}
.magazine-cover:hover {
  transform: scale(1.05);
}

.cover-description {
  margin-top: 1rem;
  color: #666;
  font-size: 1rem;
}

.current-issue .right {
  flex: 1;
  text-align: left;
}

.title-link {
  font-size: 1.6rem;
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.3s ease;
}
.title-link:hover {
  color: #0056b3;
  text-decoration: underline;
}

.date {
  font-size: 1.2rem;
  color: #ff8000;
  font-weight: bold;
  margin-top: 5px;
  display: inline-block;
  align-items: right;
}

.issue-desc {
  line-height: 1.8;
  white-space: pre-line;
  color: #444;
  margin-top: 1rem;
  font-size: 1.2rem;
  text-indent: 2rem;
}

.cover-story {
  margin-top: auto;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
}
.cover-story a {
  color: #8b4513;
  text-decoration: none;
}
.cover-story .icon {
  font-size: 1.5rem;
  margin-right: 8px;
}

/* =================================================================
   3. 文章卡片與網格系統
   ================================================================= */
.diverse-lectures {
  background: #ffffff;
  border-radius: 8px;
  padding: 2rem;
  margin: 2rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.article-container {
  display: grid;
  gap: 2rem;
  row-gap: 5rem;
  margin: 2rem auto;
}

.two-cols {
  grid-template-columns: repeat(2, 1fr);
}
.three-cols {
  grid-template-columns: repeat(3, minmax(280px, 1fr));
}

.article-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.article {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  height: 100%;
  min-height: 10rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.article:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.article::after {
  content: "閱讀本文";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
}

.article-link:hover .article::after {
  opacity: 1;
  transform: translate(-50%, -50%) translateY(-5px);
}

.article h3 {
  color: #007bff;
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
  font-weight: bold;
}
.article h4 {
  color: #007bff;
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 1rem;
}
.author-name {
  color: #444;
  font-weight: bold;
  margin-bottom: 1rem;
  display: block;
}

.article-summary {
  font-size: 1.1rem;
  color: #444;
  line-height: 1.6;
  margin-top: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-indent: 2rem;
}

.article-type {
  position: absolute;
  top: -10px;
  left: -10px;
  font-size: 0.9rem;
  font-weight: bold;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.article-type.red {
  background-color: #8b0000;
}
.article-type.orange {
  background-color: #ff8000;
}
.article-type.yellow {
  background-color: #b8860b;
}
.article-type.green {
  background-color: #2e8b57;
}
.article-type.blue {
  background-color: #4682b4;
}
.article-type.purple {
  background-color: #6a5acd;
}

/* =================================================================
   4. 作者頭像
   ================================================================= */
.authors {
  padding: 3rem;
}
.author-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  justify-content: center;
}
.author {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s ease;
}
.author img {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.author:hover img {
  transform: translateY(-5px);
}
.author h4 {
  margin-top: 1rem;
  font-size: 1.4rem;
  color: #333;
}
.author a {
  position: relative;
  text-decoration: none;
}
/* Tooltip 樣式 */
.author a::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: -2.5rem;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
}
.author a:hover::after {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(-5px);
}

/* =================================================================
   5. 徵稿與搜尋、社群
   ================================================================= */
.next-preview-submission {
  display: flex;
  justify-content: center;
  gap: 4rem;
  flex-wrap: wrap;
}
.card-content,
.call-for-submission {
  flex: 1;
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}
.card-content h3,
.call-for-submission h3 {
  text-align: center;
  margin-bottom: 1.5rem;
}
.next-issue-text,
.call-for-submission p {
  flex: 1;
  font-size: 1.2rem;
  color: #555;
  line-height: 1.8;
}
.next-issue-text {
  text-align: justify;
  text-indent: 2rem;
}
.call-for-submission p {
  text-indent: 2rem;
}

/* 搜尋區塊 */
.search {
  text-align: center;
  border-radius: 8px;
  padding: 2rem;
}
.search-info-box {
  margin-top: 1rem;
  padding: 0.5rem;
  background-color: rgba(255, 165, 0, 0.2);
  border: 1px solid rgba(255, 165, 0, 0.5);
  border-radius: 10px;
  color: #555;
  font-weight: bold;
  display: inline-block;
  font-size: 1rem;
}
.search-links {
  margin-bottom: 10px;
  font-size: 1.1rem;
}
.keyword-link {
  display: inline-block;
  margin: 0 0.5rem;
  color: #007bff;
  text-decoration: none;
}
.keyword-link:hover {
  text-decoration: underline;
}

.search-box {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}
.search-select,
.search-input,
.btn-search {
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 5px;
  font-size: 1rem;
}
.search-input {
  width: 300px;
  height: 40px;
}
.btn-search {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0 1.5rem;
  cursor: pointer;
}

/* 聯繫與社群按鈕 */
.contact {
  text-align: center;
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.social-links {
  display: flex;
  justify-content: center;
  gap: 25px;
  margin-top: 20px;
}
.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #f0f0f0;
  color: #555;
  transition: all 0.3s ease;
  position: relative;
}
.social-btn svg {
  width: 28px;
  height: 28px;
  fill: currentColor;
}
.social-btn:hover {
  transform: translateY(-5px);
}
.social-btn.facebook:hover {
  background-color: #1877f2;
  color: white;
  box-shadow: 0 5px 15px rgba(24, 119, 242, 0.4);
}
.social-btn.instagram:hover {
  background: radial-gradient(
    circle at 30% 107%,
    #fdf497 0%,
    #fdf497 5%,
    #fd5949 45%,
    #d6249f 60%,
    #285aeb 90%
  );
  color: white;
  box-shadow: 0 5px 15px rgba(214, 36, 159, 0.4);
}
.social-btn.threads:hover {
  background-color: #000000;
  color: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
}
.social-btn.email:hover {
  background-color: #db4437;
  color: white;
  box-shadow: 0 5px 15px rgba(219, 68, 55, 0.4);
}
/* Tooltip for Social Buttons */
.social-btn::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 0.85rem;
  padding: 5px 10px;
  border-radius: 5px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none;
  font-family: Arial, sans-serif;
  z-index: 10;
}
.social-btn:hover::after {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(-5px);
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  font-size: 2rem;
  color: #888;
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

@media (max-width: 1024px) {
  .two-cols,
  .three-cols {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  h2 {
    font-size: 2rem;
  }
  .current-issue {
    flex-direction: column;
    margin: 0;
  }
  .two-cols,
  .three-cols {
    grid-template-columns: 1fr;
  }
  .next-preview-submission {
    flex-direction: column;
    gap: 2rem;
    padding: 0;
    margin: 2rem 0;
  }
  .search-box {
    flex-direction: column;
  }
  .search-input {
    width: 100%;
  }
  .search-links {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
  }
  .search-links a:nth-of-type(n + 4) {
    display: none;
  }
  .author-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  .author img {
    width: 135px;
    height: 135px;
  }
  .authors {
    padding: 0.5rem;
  }
  .diverse-lectures {
    margin: 2rem 0;
  }
  .articles {
    padding: 0;
    margin-bottom: 2rem;
  }
}
</style>
