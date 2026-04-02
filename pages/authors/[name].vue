<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "~/supabase";
import { useLanguage } from "~/composables/useLanguage";

const { currentLang } = useLanguage();
const route = useRoute();

// ─── 多語字典 ─────────────────────────────────────────────────────
const detailTrans = {
  "zh-TW": {
    loading: "正在載入作者資料...",
    notFound: "找不到該位作者的資料 😖",
    clickFull: "（點擊看全文）",
    noArt: "這位作者目前還沒有發布文章。",
  },
  "zh-HK": {
    loading: "載入緊作者資料...",
    notFound: "搵唔到呢位作者嘅資料 😖",
    clickFull: "（撳入去睇全文）",
    noArt: "呢位作者目前仲未發布文章。",
  },
  "zh-CN": {
    loading: "正在载入作者数据...",
    notFound: "找不到该位作者的数据 😖",
    clickFull: "（点击看全文）",
    noArt: "这位作者目前还没有发布文章。",
  },
  en: {
    loading: "Loading...",
    notFound: "Author not found 😖",
    clickFull: "(Click to read full)",
    noArt: "No articles published yet.",
  },
  ja: {
    loading: "読み込み中...",
    notFound: "執筆者が見つかりません 😖",
    clickFull: "（クリックして全文を読む）",
    noArt: "まだ記事がありません。",
  },
  ko: {
    loading: "불러오는 중...",
    notFound: "작성자를 찾을 수 없습니다 😖",
    clickFull: "(클릭하여 전문 읽기)",
    noArt: "아직 작성된 기사가 없습니다.",
  },
};
const t = computed(
  () => detailTrans[currentLang.value] || detailTrans["zh-TW"],
);

const getArticleOrder = (id) => {
  const match = (id || "").match(/-(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

// ─── 資料抓取 (使用 useAsyncData 支援 SSR SEO) ────────────────────────
const { data: asyncData, pending: loading } = await useAsyncData(
  `author-${route.params.name}`,
  async () => {
    const authorName = route.params.name;
    if (!authorName) return null;
    try {
      const { data: authorData, error: authorError } = await supabase
        .from("authors")
        .select("*")
        .eq("name", authorName)
        .single();
      if (authorError) throw authorError;

      const { data: articlesData, error: articlesError } = await supabase
        .from("articles")
        .select(
          `id, title, subtitle, summary, author, category, issue, translations, issues (id, title, date, translations)`,
        )
        .or(
          `author.ilike.%${authorData.name}%,author_display.ilike.%${authorData.name}%`,
        )
        .neq("title", "編輯室報告");
      if (articlesError) throw articlesError;

      const sorted = (articlesData || []).sort((a, b) => {
        if ((a.issue || 0) !== (b.issue || 0))
          return (b.issue || 0) - (a.issue || 0);
        return getArticleOrder(a.id) - getArticleOrder(b.id);
      });

      return { author: authorData, articles: sorted };
    } catch (err) {
      console.error("Error:", err.message);
      return null;
    }
  },
  { watch: [() => route.params.name] }, // 當路由改變時重新觸發
);

const author = computed(() => asyncData.value?.author || null);
const rawAuthorArticles = computed(() => asyncData.value?.articles || []);

// displayAuthor：套用 Supabase translations
const displayAuthor = computed(() => {
  if (!author.value) return null;
  const langKey =
    currentLang.value === "default"
      ? "zh_TW"
      : currentLang.value.replace("-", "_");
  const trans = author.value.translations?.[langKey] || {};
  return {
    ...author.value,
    displayName: trans.name || author.value.name,
    displayBio: trans.bio || author.value.bio,
  };
});

// displayArticles：套用文章與期數翻譯
const displayArticles = computed(() => {
  const langKey =
    currentLang.value === "default"
      ? "zh_TW"
      : currentLang.value.replace("-", "_");
  return rawAuthorArticles.value.map((a) => {
    const tArt = a.translations?.[langKey] || {};
    const tIss = a.issues?.translations?.[langKey] || {};
    return {
      id: a.id,
      title: tArt.title || a.title,
      subtitle: tArt.subtitle || a.subtitle,
      summary: tArt.summary || a.summary,
      issueId: a.issues?.id,
      issueTitle: tIss.title || a.issues?.title,
      issueDate: tIss.date || a.issues?.date,
    };
  });
});

// ─── SEO (page 層) ─────────────────────────────────────────────────────────
useSeoMeta({
  title: () =>
    displayAuthor.value
      ? `${displayAuthor.value.displayName} - 無境界者雜誌`
      : "無境界者雜誌",
  ogTitle: () =>
    displayAuthor.value
      ? `${displayAuthor.value.displayName} - 無境界者雜誌`
      : "無境界者雜誌",
  description: () => displayAuthor.value?.displayBio || "無境界者雜誌專欄作者",
  ogDescription: () =>
    displayAuthor.value?.displayBio || "無境界者雜誌專欄作者",
  ogImage: () =>
    displayAuthor.value?.author_image ||
    "https://res.cloudinary.com/nonchurch2025/image/upload/default-seo.jpg",
  twitterCard: "summary_large_image",
});
</script>

<template>
  <div v-if="loading" class="loading-state">
    <p>{{ t.loading }}</p>
  </div>
  <div v-else-if="!displayAuthor" class="no-data">
    <p>{{ t.notFound }}</p>
  </div>

  <div v-else class="author-detail-container">
    <section class="author-container">
      <div class="author-left">
        <img
          :src="displayAuthor.author_image"
          :alt="displayAuthor.displayName"
          class="author-photo"
        />
      </div>
      <div class="author-info">
        <h2>{{ displayAuthor.displayName }}</h2>
        <p style="white-space: pre-line">{{ displayAuthor.displayBio }}</p>
      </div>
    </section>

    <div class="main-divider"></div>

    <div class="article-list-section">
      <ul class="article-list" v-if="displayArticles.length > 0">
        <li v-for="(article, index) in displayArticles" :key="article.id">
          <div class="article-meta">
            <span class="issue"
              >Vol. {{ article.issueId }} {{ article.issueTitle }}</span
            >
            <span class="separator">｜</span>
            <span class="date">{{ article.issueDate }}</span>
          </div>
          <h4 class="article-title-wrapper">
            <NuxtLink
              :to="`/articles/${article.id}`"
              class="title-link"
              :title="t.clickFull"
            >
              <span class="main-title">{{ article.title }}</span>
              <span v-if="article.subtitle" class="sub-title">
                ──{{ article.subtitle }}
              </span>
              <span class="click-hint">{{ t.clickFull }}</span>
            </NuxtLink>
          </h4>
          <p class="article-summary">{{ article.summary }}</p>
          <hr class="divider" v-if="index < displayArticles.length - 1" />
        </li>
      </ul>
      <div v-else class="no-articles">
        <p>{{ t.noArt }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.author-detail-container {
  max-width: 900px;
  margin: 0 auto;
}
.loading-state,
.no-data,
.no-articles {
  text-align: center;
  font-size: 1.2rem;
  color: #666;
  padding: 50px 0;
}
.author-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 40px;
  margin-bottom: 30px;
}
.author-left {
  flex-shrink: 0;
}
.author-photo {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid black;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.author-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.author-info h2 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 15px;
  font-weight: bold;
  text-align: left;
  font-family: "Times New Roman", serif;
}
.author-info p {
  color: #555;
  font-size: 1.2rem;
  line-height: 1.8;
  text-align: justify;
  margin: 0;
}
.main-divider {
  height: 4px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  margin: 30px 0;
}
.article-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.article-list li {
  margin-bottom: 20px;
}
.article-meta {
  font-size: 0.95rem;
  color: #666;
  margin-bottom: 8px;
  font-family: "Times New Roman", serif;
}
.separator {
  margin: 0 8px;
  color: #ccc;
}
.article-title-wrapper {
  margin: 10px 0;
  line-height: 1.4;
  text-align: left;
}
.title-link {
  text-decoration: none;
  color: #1e90ff;
  display: inline-block;
  transition: color 0.2s;
}
.title-link:hover {
  text-decoration: underline;
  color: #0056b3;
}
.click-hint {
  font-size: 0.8em;
  margin-left: 8px;
  color: #555;
  font-weight: normal;
  opacity: 0;
  transition: opacity 0.3s;
}
.title-link:hover .click-hint {
  opacity: 1;
}
.main-title {
  font-size: 1.5rem;
  font-weight: bold;
}
.sub-title {
  font-size: 1.1rem;
  font-weight: normal;
  margin-left: 5px;
}
.article-summary {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #555;
  text-align: justify;
  text-indent: 2rem;
  margin-top: 10px;
  margin-bottom: 20px;
}
.divider {
  border: 0;
  border-top: 1px dashed #ccc;
  margin: 30px 0;
}
@media (max-width: 768px) {
  .author-container {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .author-info h2 {
    text-align: center;
  }
  .author-photo {
    width: 180px;
    height: 180px;
  }
  .article-meta {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .separator {
    display: none;
  }
  .title-link {
    display: block;
  }
  .sub-title {
    display: block;
    margin-left: 0;
    margin-top: 5px;
  }
}
</style>
