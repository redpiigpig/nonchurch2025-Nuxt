<script setup>
import { computed } from "vue";
import { useEditorMode } from "~/composables/useEditorMode";
import { useLanguage } from "~/composables/useLanguage";
import { stripFootnoteReferences } from "~/utils/displayText";

const supabase = useSupabaseClient();
const { isEditor } = useEditorMode();
const { currentLang } = useLanguage();

const DEFAULT_IMAGE =
  "https://res.cloudinary.com/nonchurch2025/image/upload/default-seo.jpg";

const translations = {
  "zh-TW": {
    eyebrow: "《無境界者》年度活動",
    title: "活動公告",
    intro: "瀏覽《無境界者》歷年年度演講會公告，認識每一場相遇、交流與跨界對話。",
    year: "年度演講會",
    readMore: "查看完整公告",
    draft: "草稿",
    loading: "正在載入活動公告……",
    empty: "目前尚無年度演講會公告。",
    error: "活動公告暫時無法載入，請稍後再試。",
    retry: "重新載入",
    noSummary: "點入公告查看活動主題、流程與參加資訊。",
  },
  "zh-HK": {
    eyebrow: "《無境界者》年度活動",
    title: "活動公告",
    intro: "瀏覽《無境界者》歷年年度演講會公告，認識每一場相遇、交流同跨界對話。",
    year: "年度演講會",
    readMore: "查看完整公告",
    draft: "草稿",
    loading: "正在載入活動公告……",
    empty: "目前尚未有年度演講會公告。",
    error: "活動公告暫時未能載入，請稍後再試。",
    retry: "重新載入",
    noSummary: "進入公告查看活動主題、流程同參加資訊。",
  },
  "zh-CN": {
    eyebrow: "《无境界者》年度活动",
    title: "活动公告",
    intro: "浏览《无境界者》历年年度演讲会公告，认识每一场相遇、交流与跨界对话。",
    year: "年度演讲会",
    readMore: "查看完整公告",
    draft: "草稿",
    loading: "正在载入活动公告……",
    empty: "目前尚无年度演讲会公告。",
    error: "活动公告暂时无法载入，请稍后再试。",
    retry: "重新载入",
    noSummary: "进入公告查看活动主题、流程与参加信息。",
  },
  en: {
    eyebrow: "Faith Without Boundary Annual Events",
    title: "Event Announcements",
    intro: "Explore announcements from our annual lecture series and revisit each gathering for exchange and dialogue across boundaries.",
    year: "Annual Lecture",
    readMore: "Read the full announcement",
    draft: "Draft",
    loading: "Loading event announcements…",
    empty: "There are no annual lecture announcements yet.",
    error: "Event announcements could not be loaded. Please try again later.",
    retry: "Try again",
    noSummary: "Open the announcement for the theme, programme, and attendance details.",
  },
  ja: {
    eyebrow: "《無境界者》年間イベント",
    title: "イベントのお知らせ",
    intro: "《無境界者》の歴代年次講演会のお知らせから、出会いと交流、境界を越える対話をたどります。",
    year: "年次講演会",
    readMore: "お知らせを読む",
    draft: "下書き",
    loading: "イベント情報を読み込んでいます…",
    empty: "年次講演会のお知らせはまだありません。",
    error: "イベント情報を読み込めませんでした。しばらくしてから再度お試しください。",
    retry: "再読み込み",
    noSummary: "講演会のテーマ、プログラム、参加方法をご覧ください。",
  },
  ko: {
    eyebrow: "《무경계자》 연례 행사",
    title: "행사 안내",
    intro: "《무경계자》 역대 연례 강연회 안내를 통해 만남과 교류, 경계를 넘는 대화를 살펴보세요.",
    year: "연례 강연회",
    readMore: "전체 안내 보기",
    draft: "초안",
    loading: "행사 안내를 불러오는 중입니다…",
    empty: "아직 연례 강연회 안내가 없습니다.",
    error: "행사 안내를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    retry: "다시 불러오기",
    noSummary: "행사 주제, 프로그램 및 참가 정보를 확인하세요.",
  },
};

const activeLocale = computed(() =>
  currentLang.value === "default" ? "zh-TW" : currentLang.value,
);
const t = computed(
  () => translations[activeLocale.value] || translations["zh-TW"],
);

const fetchEvents = async () => {
  let query = supabase
    .from("articles")
    .select(
      "id, title, subtitle, summary, issue, seo, translations, is_published, created_at",
    )
    .eq("category", "公告與剪影")
    .ilike("title", "%年度演講會%")
    .order("issue", { ascending: false })
    .order("created_at", { ascending: false });

  if (!isEditor.value) query = query.eq("is_published", true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const asyncDataKey = `annual-lecture-events-${
  isEditor.value ? "admin" : "public"
}`;
const {
  data: events,
  pending,
  error,
  refresh,
} = await useAsyncData(asyncDataKey, fetchEvents);

const getYear = (article) => {
  const titleYear = String(article.title || "").match(/(?:19|20)\d{2}/)?.[0];
  if (titleYear) return titleYear;

  const issue = Number(article.issue);
  if (Number.isFinite(issue) && issue > 0) {
    return String(2025 + Math.floor((issue - 1) / 6));
  }

  const createdYear = new Date(article.created_at).getFullYear();
  return Number.isFinite(createdYear) ? String(createdYear) : "";
};

const displayEvents = computed(() => {
  const langKey =
    currentLang.value === "default"
      ? "zh_TW"
      : currentLang.value.replace("-", "_");

  return (events.value || []).map((article) => {
    const translated = article.translations?.[langKey] || {};
    return {
      ...article,
      title: stripFootnoteReferences(translated.title || article.title),
      subtitle: stripFootnoteReferences(
        translated.subtitle || article.subtitle || "",
      ),
      summary: stripFootnoteReferences(
        translated.summary || article.summary || t.value.noSummary,
      ),
      year: getYear(article),
      image: article.seo?.image || DEFAULT_IMAGE,
    };
  });
});

const seoTitle = computed(() => t.value.title);
const shareTitle = computed(() => `${t.value.title} - 無境界者雜誌`);
useSeoMeta({
  title: () => seoTitle.value,
  ogTitle: () => shareTitle.value,
  description: () => t.value.intro,
  ogDescription: () => t.value.intro,
  ogImage: () => displayEvents.value[0]?.image || DEFAULT_IMAGE,
  twitterCard: "summary_large_image",
  twitterTitle: () => shareTitle.value,
  twitterDescription: () => t.value.intro,
  twitterImage: () => displayEvents.value[0]?.image || DEFAULT_IMAGE,
  robots: () => (isEditor.value ? "noindex, nofollow" : "index, follow"),
});
</script>

<template>
  <main class="events-page">
    <header class="events-hero">
      <p class="events-eyebrow">{{ t.eyebrow }}</p>
      <h1 class="page-main-title">{{ t.title }}</h1>
      <div class="main-divider"></div>
      <p class="events-intro">{{ t.intro }}</p>
    </header>

    <div v-if="pending" class="state-panel" aria-live="polite">
      <span class="state-icon" aria-hidden="true">🕊️</span>
      <p>{{ t.loading }}</p>
    </div>

    <div v-else-if="error" class="state-panel state-error" role="alert">
      <span class="state-icon" aria-hidden="true">!</span>
      <p>{{ t.error }}</p>
      <button type="button" class="retry-button" @click="refresh">
        {{ t.retry }}
      </button>
    </div>

    <div v-else-if="displayEvents.length === 0" class="state-panel">
      <span class="state-icon" aria-hidden="true">📅</span>
      <p>{{ t.empty }}</p>
    </div>

    <section v-else class="events-grid" :aria-label="t.title">
      <article
        v-for="event in displayEvents"
        :key="event.id"
        class="event-card"
      >
        <NuxtLink :to="`/articles/${event.id}`" class="event-image-link">
          <img
            :src="cloudinaryUrl(event.image, 'f_auto,q_auto,w_900,h_540,c_fill')"
            :alt="event.title"
            class="event-image"
            loading="lazy"
            decoding="async"
          />
        </NuxtLink>

        <div class="event-body">
          <div class="event-meta">
            <span class="event-year">{{ event.year }} {{ t.year }}</span>
            <span v-if="isEditor && !event.is_published" class="draft-badge">
              {{ t.draft }}
            </span>
          </div>

          <h2>
            <NuxtLink :to="`/articles/${event.id}`">
              {{ event.title }}
            </NuxtLink>
          </h2>
          <p v-if="event.subtitle" class="event-subtitle">
            {{ event.subtitle }}
          </p>
          <p class="event-summary">{{ event.summary }}</p>

          <NuxtLink :to="`/articles/${event.id}`" class="read-more">
            {{ t.readMore }} <span aria-hidden="true">→</span>
          </NuxtLink>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.events-page {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 1rem 1.25rem 4rem;
}

.events-hero {
  max-width: 780px;
  margin: 0 auto 2.5rem;
  text-align: center;
}

.events-eyebrow {
  margin: 0 0 0.55rem;
  color: #8b5b3d;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.events-hero .page-main-title {
  margin-bottom: 0.7rem;
}

.events-intro {
  margin: 1.2rem auto 0;
  color: #666;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.08rem;
  line-height: 1.8;
}

.events-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2rem;
}

.event-card {
  overflow: hidden;
  border: 1px solid rgba(96, 65, 44, 0.14);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 28px rgba(65, 42, 27, 0.08);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.event-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 34px rgba(65, 42, 27, 0.13);
}

.event-image-link {
  display: block;
  overflow: hidden;
  aspect-ratio: 5 / 3;
  background: #ece7e2;
}

.event-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.event-card:hover .event-image {
  transform: scale(1.025);
}

.event-body {
  padding: 1.45rem 1.5rem 1.55rem;
}

.event-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}

.event-year {
  color: #985b35;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.draft-badge {
  border-radius: 999px;
  background: #fff0ed;
  color: #b13c2e;
  padding: 0.18rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.event-card h2 {
  margin: 0;
  color: #3e342e;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.45rem;
  line-height: 1.45;
}

.event-card h2 a {
  color: inherit;
  text-decoration: none;
}

.event-card h2 a:hover {
  color: #9b5b35;
}

.event-subtitle {
  margin: 0.45rem 0 0;
  color: #795c4d;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.05rem;
  line-height: 1.6;
}

.event-summary {
  display: -webkit-box;
  overflow: hidden;
  margin: 1rem 0 1.2rem;
  color: #666;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1rem;
  line-height: 1.75;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.read-more {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #8b4f2d;
  font-size: 0.92rem;
  font-weight: 700;
  text-decoration: none;
}

.read-more:hover {
  text-decoration: underline;
}

.state-panel {
  display: flex;
  min-height: 280px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  border: 1px dashed rgba(96, 65, 44, 0.24);
  border-radius: 14px;
  background: rgba(250, 247, 244, 0.78);
  color: #71665f;
  text-align: center;
}

.state-panel p {
  margin: 0;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.08rem;
}

.state-icon {
  font-size: 1.75rem;
  font-weight: 700;
}

.state-error .state-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 2px solid #ae4035;
  border-radius: 50%;
  color: #ae4035;
  font-size: 1rem;
}

.retry-button {
  border: 0;
  border-radius: 999px;
  background: #8b4f2d;
  color: #fff;
  padding: 0.58rem 1.1rem;
  font: inherit;
  cursor: pointer;
}

.retry-button:hover {
  background: #6f3f24;
}

@media (max-width: 760px) {
  .events-page {
    padding: 0.5rem 0.85rem 3rem;
  }

  .events-hero {
    margin-bottom: 2rem;
  }

  .events-intro {
    font-size: 1rem;
  }

  .events-grid {
    grid-template-columns: 1fr;
    gap: 1.35rem;
  }

  .event-body {
    padding: 1.2rem 1.15rem 1.3rem;
  }

  .event-card h2 {
    font-size: 1.28rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .event-card,
  .event-image {
    transition: none;
  }
}
</style>
