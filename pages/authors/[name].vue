<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "~/supabase";
import MainLayout from "~/components/MainLayout.vue";

const route = useRoute();
const author = ref(null);
const authorArticles = ref([]);
const loading = ref(true);

useHead({
  title: computed(() =>
    author.value ? `${author.value.name} - 無境界者雜誌` : "載入中..."
  ),
});

const getArticleOrder = (id) => {
  if (!id) return 0;
  const match = id.match(/-(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

const fetchData = async () => {
  const authorName = route.params.name;
  if (!authorName) return;

  try {
    loading.value = true;

    const { data: authorData, error: authorError } = await supabase
      .from("authors")
      .select("*")
      .eq("name", authorName)
      .single();

    if (authorError) throw authorError;
    author.value = authorData;

    if (authorData) {
      const { data: articlesData, error: articlesError } = await supabase
        .from("articles")
        .select(
          `
          id,
          title,
          subtitle,
          summary,
          author,
          category,
          issue,
          issues (
            id,
            title,
            date
          )
        `
        )
        .or(
          `author.ilike.%${authorData.name}%,author_display.ilike.%${authorData.name}%`
        )
        .neq("title", "編輯室報告");

      if (articlesError) throw articlesError;

      const sortedData = (articlesData || []).sort((a, b) => {
        const issueA = a.issue || 0;
        const issueB = b.issue || 0;
        if (issueA !== issueB) {
          return issueB - issueA;
        }
        const orderA = getArticleOrder(a.id);
        const orderB = getArticleOrder(b.id);
        return orderA - orderB;
      });

      authorArticles.value = sortedData;
    }
  } catch (error) {
    console.error("Error fetching author details:", error.message);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

watch(
  () => route.params.name,
  () => fetchData()
);
</script>

<template>
  <MainLayout>
    <div v-if="loading" class="loading-state">
      <p>正在載入作者資料...</p>
    </div>

    <div v-else-if="!author" class="no-data">
      <p>找不到該位作者的資料 😖</p>
    </div>

    <div v-else class="author-detail-container">
      <section class="author-container">
        <div class="author-left">
          <img
            :src="author.author_image"
            :alt="author.name"
            class="author-photo"
          />
        </div>

        <div class="author-info">
          <h2>{{ author.name }}</h2>
          <p style="white-space: pre-line">{{ author.bio }}</p>
        </div>
      </section>

      <div class="main-divider"></div>

      <div class="article-list-section">
        <ul class="article-list" v-if="authorArticles.length > 0">
          <li v-for="(article, index) in authorArticles" :key="article.id">
            <div class="article-meta">
              <span class="issue">
                Vol. {{ article.issues?.id }} {{ article.issues?.title }}
              </span>
              <span class="separator">｜</span>
              <span class="date">{{ article.issues?.date }}</span>
            </div>

            <h4 class="article-title-wrapper">
              <NuxtLink
                :to="`/articles/${article.id}`"
                class="title-link"
                title="點擊看全文"
              >
                <span class="main-title">{{ article.title }}</span>
                <span v-if="article.subtitle" class="sub-title">
                  ──{{ article.subtitle }}
                </span>

                <span class="click-hint">（點擊看全文）</span>
              </NuxtLink>
            </h4>

            <p class="article-summary">
              {{ article.summary }}
            </p>

            <hr class="divider" v-if="index < authorArticles.length - 1" />
          </li>
        </ul>

        <div v-else class="no-articles">
          <p>這位作者目前還沒有發布文章。</p>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
/* 樣式保持原樣 */
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
  text-indent: 0;
}
.title-link {
  text-decoration: none;
  transition: color 0.2s ease;
  color: #1e90ff;
  display: inline-block;
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
  transition: opacity 0.3s ease;
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
