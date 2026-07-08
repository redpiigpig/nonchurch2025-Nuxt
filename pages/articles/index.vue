<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEditorMode } from "~/composables/useEditorMode";
import { useLanguage } from "~/composables/useLanguage";

const supabase = useSupabaseClient();
const { isEditor } = useEditorMode();
const { currentLang } = useLanguage();
const route = useRoute();
const router = useRouter();

// ─── 多語字典 ─────────────────────────────────────────────────────
const listTranslations = {
  "zh-TW": {
    title: "文章列表",
    selectYear: "選擇年份：",
    opt2026: "2026 年 (第 7-12 期)",
    opt2025: "2025 年 (第 1-6 期)",
    loading: "正在載入文章列表 🕊️",
    noData: (y) => `尚無 ${y} 年的雜誌資料，敬請期待。🥺`,
    issueTitle: (id, t) => `第 ${id} 期《${t}》`,
    draft: "(期數草稿)",
    download: "點擊封面下載PDF檔",
    artDraft: "(草稿)",
    footer1: "投稿資訊／下期主題",
    footer2: "編輯資訊／線上資訊",
  },
  "zh-HK": {
    title: "文章列表",
    selectYear: "揀選年份：",
    opt2026: "2026 年 (第 7-12 期)",
    opt2025: "2025 年 (第 1-6 期)",
    loading: "載入緊文章列表 🕊️",
    noData: (y) => `仲未有 ${y} 年嘅雜誌資料，敬請期待。🥺`,
    issueTitle: (id, t) => `第 ${id} 期《${t}》`,
    draft: "(期數草稿)",
    download: "撳封面下載PDF檔",
    artDraft: "(草稿)",
    footer1: "投稿資訊／下期主題",
    footer2: "編輯資訊／網上資訊",
  },
  "zh-CN": {
    title: "文章列表",
    selectYear: "选择年份：",
    opt2026: "2026 年 (第 7-12 期)",
    opt2025: "2025 年 (第 1-6 期)",
    loading: "正在载入文章列表 🕊️",
    noData: (y) => `尚无 ${y} 年的杂志数据，敬请期待。🥺`,
    issueTitle: (id, t) => `第 ${id} 期《${t}》`,
    draft: "(期数草稿)",
    download: "点击封面下载PDF档",
    artDraft: "(草稿)",
    footer1: "投稿资讯／下期主题",
    footer2: "编辑资讯／在线资讯",
  },
  en: {
    title: "Articles",
    selectYear: "Select Year:",
    opt2026: "2026 (Vol. 7–12)",
    opt2025: "2025 (Vol. 1–6)",
    loading: "Loading Articles 🕊️",
    noData: (y) => `No issues for ${y} yet. Stay tuned. 🥺`,
    issueTitle: (id, t) => `Vol.${id} 《${t}》`,
    draft: "(Draft)",
    download: "Click cover to download PDF",
    artDraft: "(Draft)",
    footer1: "Submission / Next Issue",
    footer2: "Editorial / Online Info",
  },
  ja: {
    title: "記事一覧",
    selectYear: "年を選択：",
    opt2026: "2026年 (第7-12号)",
    opt2025: "2025年 (第1-6号)",
    loading: "読み込み中 🕊️",
    noData: (y) => `${y}年のデータはまだありません。🥺`,
    issueTitle: (id, t) => `第 ${id} 号《${t}》`,
    draft: "(下書き)",
    download: "表紙クリックでPDFダウンロード",
    artDraft: "(下書き)",
    footer1: "投稿案内／次号テーマ",
    footer2: "編集情報／オンライン情報",
  },
  ko: {
    title: "기사 목록",
    selectYear: "연도 선택:",
    opt2026: "2026년 (제7-12호)",
    opt2025: "2025년 (제1-6호)",
    loading: "불러오는 중 🕊️",
    noData: (y) => `${y}년 데이터가 아직 없습니다. 🥺`,
    issueTitle: (id, t) => `제 ${id} 호《${t}》`,
    draft: "(초안)",
    download: "표지 클릭 시 PDF 다운로드",
    artDraft: "(초안)",
    footer1: "투고 안내 / 다음 호 주제",
    footer2: "편집 정보 / 온라인 정보",
  },
};
const t = computed(
  () => listTranslations[currentLang.value] || listTranslations["zh-TW"],
);

const yearOptions = computed(() => [
  { value: 2026, label: t.value.opt2026 },
  { value: 2025, label: t.value.opt2025 },
]);

const categoryTranslations = {
  "zh-TW": {
    專題文章: "專題文章",
    評論與回應: "評論與回應",
    人物專訪: "人物專訪",
    生命故事: "生命故事",
    時事評論: "時事評論",
    文藝創作: "文藝創作",
    公告與剪影: "公告與剪影",
    封面故事: "封面故事",
    光影時刻: "光影時刻",
    實驗園地: "實驗園地",
    文獻與翻譯: "文獻與翻譯",
  },
  "zh-HK": {
    專題文章: "專題文章",
    評論與回應: "評論與回應",
    人物專訪: "人物專訪",
    生命故事: "生命故事",
    時事評論: "時事評論",
    文藝創作: "文藝創作",
    公告與剪影: "公告與剪影",
    封面故事: "封面故事",
    光影時刻: "光影時刻",
    實驗園地: "實驗園地",
    文獻與翻譯: "文獻與翻譯",
  },
  "zh-CN": {
    專題文章: "专题文章",
    評論與回應: "评论与回应",
    人物專訪: "人物专访",
    生命故事: "生命故事",
    時事評論: "时事评论",
    文藝創作: "文艺创作",
    公告與剪影: "公告与剪影",
    封面故事: "封面故事",
    光影時刻: "光影时刻",
    實驗園地: "实验园地",
    文獻與翻譯: "文献与翻译",
  },
  en: {
    專題文章: "Feature",
    評論與回應: "Review",
    人物專訪: "Interview",
    生命故事: "Life Story",
    時事評論: "Current Affairs",
    文藝創作: "Literature",
    公告與剪影: "Notice",
    封面故事: "Cover Story",
    光影時刻: "Moments",
    實驗園地: "Experimental",
    文獻與翻譯: "Documents & Translation",
  },
  ja: {
    專題文章: "特集記事",
    評論與回應: "評論と応答",
    人物專訪: "インタビュー",
    生命故事: "ライフストーリー",
    時事評論: "時事コラム",
    文藝創作: "文芸創作",
    公告與剪影: "お知らせ",
    封面故事: "カバーストーリー",
    光影時刻: "光影の時",
    實驗園地: "実験的創作",
    文獻與翻譯: "文献と翻訳",
  },
  ko: {
    專題文章: "특집 기사",
    評論與回應: "평론 및 응답",
    人物專訪: "인터뷰",
    生命故事: "삶의 이야기",
    時事評論: "시사 칼럼",
    文藝創作: "문예 창작",
    公告與剪影: "공지사항",
    封面故事: "커버 스토리",
    光影時刻: "포토 스토리",
    實驗園地: "실험적 창작",
    文獻與翻譯: "문헌 및 번역",
  },
};
const translateCategory = (cat) =>
  categoryTranslations[currentLang.value]?.[cat] ||
  categoryTranslations["zh-TW"]?.[cat] ||
  cat;

// ─── SEO（在 page 層設定）────────────────────────────────────────
useSeoMeta({
  title: () => t.value.title + " - 無境界者雜誌",
  ogTitle: () => t.value.title + " - 無境界者雜誌",
  description: () =>
    ({
      "zh-TW": "瀏覽無境界者雜誌歷年期刊與文章列表。",
      "zh-HK": "瀏覽無境界者雜誌歷年期刊與文章列表。",
      "zh-CN": "浏览无境界者杂志历年期刊与文章列表。",
      en: "Browse issues and article archives from Faith Without Boundary.",
      ja: "無境界者雑誌の号数と記事一覧を閲覧できます。",
      ko: "무경계자 매거진의 호별 기사 목록을 살펴보세요.",
    })[currentLang.value] || "瀏覽無境界者雜誌歷年期刊與文章列表。",
  robots: "index, follow",
});

// ─── 資料 ────────────────────────────────────────────────────────
const groupedIssues = ref([]);
const loading = ref(true);
const selectedYear = ref(
  parseInt(route.query.year) || new Date().getFullYear(),
);

const extractOrderFromId = (idStr) => {
  if (!idStr) return 0;
  const match = idStr.match(/-(\d+)/);
  return match ? parseInt(match[1]) : parseInt(idStr) || 0;
};
const formatDisplayId = (num) => (num != null ? num.toString().padStart(2, "0") : "");
const getCategoryColor = (cat) =>
  ({
    專題文章: "#8b0000",
    評論與回應: "#ff8000",
    人物專訪: "#f0e137",
    生命故事: "#46b175",
    時事評論: "#4682b4",
    文藝創作: "#27408b",
    公告與剪影: "#6a5acd",
    封面故事: "#7d6c29",
    文獻與翻譯: "#008080",
  })[cat] || "#999";

const scrollToAnchor = async () => {
  if (!route.hash) return;
  await nextTick();
  const el = document.getElementById(route.hash.substring(1));
  if (el) el.scrollIntoView({ behavior: "auto", block: "center" });
};

const saveScrollPosition = (selector) => {
  if (import.meta.client) {
    const state = window.history.state || {};
    window.history.replaceState({ ...state, scrollTo: selector }, "");
  }
};

const buildGroupedIssues = async () => {
  let query = supabase
    .from("issues")
    .select(
      `*, content:articles (id, category, title, subtitle, author, author_display, section, is_published, article_type, translations)`,
    )
    .order("id", { ascending: false });
  if (!isEditor.value) query = query.eq("is_published", true);

  const { data: issuesData, error } = await query;
  if (error) return [];

  return issuesData.map((issue) => {
    const CDN = "https://res.cloudinary.com/nonchurch2025/image/upload";
    issue.hasCoverImg = !!issue.cover_img?.startsWith("http");
    issue.cover_img = issue.hasCoverImg
      ? issue.cover_img
      : `${CDN}/cover-${issue.id}.png`;
    issue.pdf_link = issue.pdf_link?.startsWith("http")
      ? issue.pdf_link
      : `https://res.cloudinary.com/nonchurch2025/image/upload/Vol.${issue.id}.pdf`;
    issue.isDraft = !issue.is_published;

    if (issue.content?.length > 0) {
      if (!isEditor.value)
        issue.content = issue.content.filter((a) => a.is_published);

      // 先提取特殊文章 IDs（投稿資訊、編輯資訊），供 footer 連結用
      const submissionInfo = issue.content.find((a) => a.article_type === "submission_info");
      const editorialInfo = issue.content.find((a) => a.article_type === "editorial_info");
      issue.submissionInfoId = submissionInfo?.id || null;
      issue.editorialInfoId = editorialInfo?.id || null;

      // 過濾掉「編輯資訊」section 及「目錄」文章（目次在「主題介紹」section，不受影響）
      // 註：category=編輯資訊 的文章「仍要顯示」，只是不渲染 category badge（見 template）
      issue.content = issue.content.filter(
        (a) => a.section?.trim() !== "編輯資訊" && a.title?.trim() !== "目錄",
      );
      issue.content.forEach((art) => {
        art.routeId = art.id;
        art._sortOrder = extractOrderFromId(art.id);
        art.display_id = formatDisplayId(art._sortOrder);
        art.color = getCategoryColor(art.category);
        art.type = "article";
        if (art.author_display) art.author = art.author_display;
      });
      issue.content.sort((a, b) => a._sortOrder - b._sortOrder);
      // 「主題介紹」不顯示 section header（文章仍保留在最前方）
      const HIDDEN_HEADERS = new Set(["主題介紹", "編輯資訊"]);
      let lastSection = null;
      issue.content.forEach((art) => {
        const s = art.section?.trim();
        art.showSectionHeader =
          s && !HIDDEN_HEADERS.has(s) ? s !== lastSection : false;
        if (s) lastSection = s;
      });
      const maxId = issue.content.at(-1)?._sortOrder || 0;
      issue.content.push(
        {
          display_id: formatDisplayId(maxId + 1),
          type: "text-only",
          is_footer_start: true,
          routeId: issue.submissionInfoId || null,
        },
        {
          display_id: formatDisplayId(maxId + 2),
          type: "text-only",
          routeId: issue.editorialInfoId || null,
        },
      );
    } else {
      issue.content = [];
    }
    return issue;
  });
};

// ✅ SSR：資料由 useAsyncData 回傳（refs 的副作用寫法在 hydration 後會是空的），
// 編輯模式切換時自動重抓，統一用單一 loading 狀態
const { data: groupedData } = await useAsyncData(
  "articles-list",
  buildGroupedIssues,
  { watch: [isEditor] },
);

watch(
  groupedData,
  (data) => {
    groupedIssues.value = data || [];

    // 設定初始年份
    const queryYear = parseInt(route.query.year);
    if (yearOptions.value.some((o) => o.value === queryYear))
      selectedYear.value = queryYear;
    else {
      const latestYear =
        groupedIssues.value.length > 0
          ? 2025 + Math.floor((groupedIssues.value[0].id - 1) / 6)
          : new Date().getFullYear();
      if (yearOptions.value.some((o) => o.value === latestYear))
        selectedYear.value = latestYear;
    }

    loading.value = false;
    if (import.meta.client) scrollToAnchor();
  },
  { immediate: true },
);

// displayIssues：套用 Supabase translations 翻譯
const filteredIssues = computed(() =>
  groupedIssues.value.filter(
    (i) => 2025 + Math.floor((i.id - 1) / 6) === selectedYear.value,
  ),
);

const displayIssues = computed(() => {
  const langKey =
    currentLang.value === "default"
      ? "zh_TW"
      : currentLang.value.replace("-", "_");
  return filteredIssues.value.map((issue) => {
    const tIss = issue.translations?.[langKey] || {};
    const mappedContent = issue.content.map((art) => {
      if (art.type === "text-only") {
        return {
          ...art,
          title: art.is_footer_start ? t.value.footer1 : t.value.footer2,
        };
      }
      const tArt = art.translations?.[langKey] || {};
      return {
        ...art,
        title: tArt.title || art.title,
        subtitle: tArt.subtitle || art.subtitle,
        author: tArt.author_display || tArt.author || art.author,
      };
    });
    return {
      ...issue,
      title: tIss.title || issue.title,
      date: tIss.date || issue.date,
      content: mappedContent,
    };
  });
});

watch(selectedYear, (v) =>
  router.replace({ query: { ...route.query, year: v } }),
);
</script>

<template>
  <div class="article-list-page">
    <h1 class="page-main-title">
      <span class="emoji">📚</span>{{ t.title }}<span class="emoji">📚</span>
    </h1>
    <div class="main-divider"></div>

    <div class="year-selector-wrapper">
      <label for="year-select">{{ t.selectYear }}</label>
      <div class="custom-select">
        <select id="year-select" v-model="selectedYear">
          <option
            v-for="item in yearOptions"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </option>
        </select>
        <span class="arrow">▼</span>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      {{ t.loading }}<span class="loading-dots"></span>
    </div>

    <div v-else-if="displayIssues.length === 0" class="no-data">
      <p>{{ t.noData(selectedYear) }}</p>
    </div>

    <div
      v-else
      v-for="(issue, index) in displayIssues"
      :key="issue.id"
      class="magazine-item"
    >
      <br />
      <h2 :id="`issue-${issue.id}`">
        <span>　　</span>{{ t.issueTitle(issue.id, issue.title) }}
        <span class="issue-date">／{{ issue.date }}</span>
        <span v-if="issue.isDraft" class="draft-badge"> {{ t.draft }} </span>
      </h2>

      <div class="content-wrapper">
        <div class="left-section">
          <ul>
            <li v-for="(item, itemIndex) in issue.content" :key="itemIndex">
              <div v-if="item.section && item.showSectionHeader">
                <br />
                <div class="title-box">
                  <h3 class="theme-title">
                    {{ translateCategory(item.section) }}
                  </h3>
                </div>
              </div>
              <div v-if="item.is_footer_start">
                <br />
                <div class="title-box"></div>
              </div>
              <p>
                <span
                  v-if="item.display_id"
                  style="font-weight: bold; margin-right: 0.5em"
                  >{{ item.display_id }}</span
                >
                <span
                  v-if="item.category && item.category !== '編輯資訊'"
                  class="article-type"
                  :style="{
                    color: item.color,
                    marginRight: '0.5em',
                    fontSize: '0.8em',
                  }"
                >
                  {{ translateCategory(item.category) }}
                </span>
                <NuxtLink
                  v-if="item.type !== 'text-only' || item.routeId"
                  :to="`/articles/${item.routeId}`"
                  @click="saveScrollPosition(`#issue-${issue.id}`)"
                >
                  {{ item.title
                  }}<span v-if="item.subtitle">──{{ item.subtitle }}</span>
                  <span
                    v-if="isEditor && item.type !== 'text-only' && !item.is_published"
                    style="
                      color: red;
                      font-size: 0.8em;
                      font-weight: bold;
                      margin-left: 5px;
                    "
                  >
                    {{ t.artDraft }}
                  </span>
                </NuxtLink>
                <span v-else>{{ item.title }}</span>
                <span v-if="item.author" class="author"
                  >｜{{ item.author }}</span
                >
              </p>
            </li>
          </ul>
        </div>

        <div class="right-section">
          <template v-if="isEditor && issue.isDraft && !issue.hasCoverImg">
            <div class="cover-unreleased">
              <span class="cover-unreleased-label">待出版</span>
            </div>
            <p class="cover-description">{{ t.download }}</p>
          </template>
          <template v-else>
            <a :href="issue.pdf_link" target="_blank" :title="t.download">
              <img
                :src="cloudinaryUrl(issue.cover_img, CLD.cover)"
                :alt="`Vol.${issue.id} Cover`"
                class="magazine-cover"
                loading="lazy"
                decoding="async"
              />
            </a>
            <p class="cover-description">{{ t.download }}</p>
          </template>
        </div>
      </div>

      <br /><br />
      <div
        v-if="index !== displayIssues.length - 1"
        class="issue-divider"
      ></div>
    </div>
  </div>
</template>

<style scoped>
h2 {
  text-align: left;
  color: #444;
  margin-top: 1rem;
  margin-bottom: 1rem;
  font-size: 2rem;
  font-weight: bold;
}
.issue-date {
  color: #ff8000;
  font-size: 20px;
  font-weight: bold;
}
.draft-badge {
  font-size: 0.9rem;
  color: #999;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 10px;
  vertical-align: middle;
  font-weight: normal;
}
.content-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}
.left-section {
  flex: 1;
  margin-left: 1.5rem;
}
.right-section {
  text-align: center;
  margin-top: 2rem;
  flex-shrink: 0;
}
ul {
  padding: 0;
  margin: 0;
  list-style: none;
}
li {
  list-style: none;
  position: relative;
  margin-left: 2rem;
  padding-left: 0.5em;
  margin-bottom: 0.5rem;
  line-height: 1.8;
  font-size: 1.2rem;
  font-family: serif;
}
.article-type {
  font-weight: bold;
  padding-right: 0.5rem;
}
.left-section a {
  color: #007bff;
  text-decoration: none;
  transition: color 0.3s ease;
}
.left-section li p {
  margin: 0;
  padding-left: 2rem;
  text-indent: -2rem;
}
.left-section a:hover {
  color: #0056b3;
  text-decoration: underline;
}
.author {
  color: #333;
  font-size: 1.2rem;
}
.magazine-cover {
  width: 350px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  margin-top: -2em;
}
.cover-unreleased {
  width: 350px;
  aspect-ratio: 176 / 250;
  border-radius: 10px;
  background: #d8d8c8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -2em;
}
.cover-unreleased-label {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.1rem;
  color: #666;
  letter-spacing: 0.1em;
}
.magazine-cover:hover {
  transform: scale(1.05);
}
.cover-description {
  font-size: 1rem;
  margin-top: 0.5rem;
  color: #666;
  font-family: serif;
}
.issue-divider {
  width: 100%;
  height: 2px;
  background-color: rgba(0, 0, 0, 0.75);
  border-radius: 2px;
  margin: 20px auto;
}
.title-box {
  text-align: center;
  margin: 1rem 0;
  position: relative;
  min-height: 1px;
}
.title-box::before {
  content: "";
  position: absolute;
  top: -10px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: rgba(0, 0, 0, 0.2);
}
.title-box h3 {
  text-align: center !important;
  display: inline-block;
  padding: 0 1rem;
  margin-top: 0.2em;
  font-weight: bold;
  position: relative;
  color: #444;
}
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  font-size: 2rem;
  color: #888;
  font-family: serif;
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
    content: "...";
  }
  75% {
    content: ".....";
  }
  90% {
    content: "......";
  }
}
@media (max-width: 1024px) {
  .content-wrapper {
    gap: 1.5rem;
  }
  .left-section {
    margin-left: 0;
  }
  .magazine-cover {
    width: 220px;
    margin-top: 0;
  }
  .cover-unreleased {
    width: 220px;
    margin-top: 0;
    border-radius: 6px;
  }
  li {
    font-size: 1.1rem;
  }
}
@media (max-width: 768px) {
  .content-wrapper {
    flex-direction: column;
  }
  .right-section {
    order: 1;
    margin: 0 auto 2rem auto;
    width: 100%;
  }
  .magazine-cover {
    width: 80%;
    max-width: 300px;
    margin-top: 0;
  }
  .cover-unreleased {
    width: 80%;
    max-width: 300px;
    margin-top: 0;
    border-radius: 6px;
  }
  .left-section {
    order: 2;
    width: 100%;
    margin-left: 0;
  }
  li {
    margin-left: 0.5rem;
    font-size: 1rem;
  }
  h2 {
    font-size: 1.5rem;
    text-align: center;
  }
  h2 span:first-child {
    display: none;
  }
  .issue-date {
    display: block;
    font-size: 1rem;
    margin-top: 5px;
  }
  .title-box h3 {
    font-size: 1.3rem;
  }
  .author {
    font-size: 1rem;
  }
}
</style>
