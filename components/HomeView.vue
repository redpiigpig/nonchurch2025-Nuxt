<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "~/supabase";
import { useEditorMode } from "~/composables/useEditorMode";
import { useLanguage } from "~/composables/useLanguage";

const route = useRoute();
const router = useRouter();
const { isEditor } = useEditorMode();
const { currentLang } = useLanguage();

const issuesList = ref([]);
const currentIssueData = ref(null);
const rawArticles = ref([]);
const hotKeywords = ref([]);
const loading = ref(true);
const adminSelectedIssue = ref("");
const searchQuery = ref("");
const searchType = ref("title");
const isEmailCopied = ref(false);
const dbAuthors = ref([]);

// ─── 多語字典 ─────────────────────────────────────────────────────
const homeTranslations = {
  "zh-TW": {
    siteTitle: "無境界者雜誌",
    mainTitle: "當期雜誌",
    reviewTitle: (n) => `第${n}期回顧`,
    issueFormat: (n, title) => `第${n}期《${title}》`,
    downloadPdf: "點擊封面下載 PDF",
    coverStory: "封面故事：",
    special: "特稿專區",
    theme: "主題廣場",
    diverse: "多元講堂",
    authors: "本期作者",
    cfp: "徵稿公告",
    subscribe: "線上訂閱",
    subscribeDesc:
      "《無境界者》雜誌是一個不以教會為本位的自由信仰論述平台，亦是一個實驗性質的線上雜誌，會定期在雙數月月底發刊。歡迎讀者留下您的電子信箱訂閱本雜誌，每期發刊時，編輯室就會將當月的連結與PDF檔發送給您！",
    search: "搜尋",
    contact: "聯繫我們",
    loading: "正在載入首頁 🕊️",
    notFound: "找不到該期雜誌資料 😖",
    notFoundDesc: "可能尚未發布，敬請期待。",
    backToLatest: "回最新一期",
    optTitle: "搜尋文章標題",
    optAuthor: "搜尋作者",
    optContent: "搜尋文章全文",
    optKeyword: "搜尋關鍵字",
    searchPlaceholder: "請輸入搜尋內容...",
    readArticle: "閱讀本文",
    emailHint: "點擊複製 Email",
    emailCopied: "已複製！",
    viewAuthor: "查看作者頁面",
  },
  "zh-HK": {
    siteTitle: "無境界者雜誌",
    mainTitle: "今期雜誌",
    reviewTitle: (n) => `第${n}期回顧`,
    issueFormat: (n, title) => `第${n}期《${title}》`,
    downloadPdf: "撳封面下載 PDF",
    coverStory: "封面故事：",
    special: "特稿專區",
    theme: "主題廣場",
    diverse: "多元講堂",
    authors: "今期作者",
    cfp: "徵稿公告",
    subscribe: "網上訂閱",
    subscribeDesc:
      "《無境界者》雜誌係一個唔以教會為本位嘅自由信仰論述平台，亦係一個實驗性質嘅網上雜誌，會定期喺雙數月月底發刊。歡迎讀者留低你嘅電郵地址訂閱本雜誌，每期發刊時，編輯室就會將當月嘅連結同 PDF 檔 send 俾你！",
    search: "搜尋",
    contact: "聯絡我哋",
    loading: "載入緊首頁 🕊️",
    notFound: "搵唔到呢期雜誌資料 😖",
    notFoundDesc: "可能仲未發布，敬請期待。",
    backToLatest: "返去最新一期",
    optTitle: "搜尋文章標題",
    optAuthor: "搜尋作者",
    optContent: "搜尋文章全文",
    optKeyword: "搜尋關鍵字",
    searchPlaceholder: "請輸入搜尋內容...",
    readArticle: "閱讀本文",
    emailHint: "撳掣複製 Email",
    emailCopied: "已經複製咗！",
    viewAuthor: "睇作者頁面",
  },
  "zh-CN": {
    siteTitle: "无境界者杂志",
    mainTitle: "当期杂志",
    reviewTitle: (n) => `第${n}期回顾`,
    issueFormat: (n, title) => `第${n}期《${title}》`,
    downloadPdf: "点击封面下载 PDF",
    coverStory: "封面故事：",
    special: "特稿专区",
    theme: "主题广场",
    diverse: "多元讲堂",
    authors: "本期作者",
    cfp: "征稿公告",
    subscribe: "在线订阅",
    subscribeDesc:
      "《无境界者》杂志是一个不以教会为本位的自由信仰论述平台，亦是一个实验性质的在线杂志，会定期在双数月月底发刊。欢迎读者留下您的电子邮箱订阅本杂志，每期发刊时，编辑室就会将当月的链接与PDF档发送给您！",
    search: "搜索",
    contact: "联系我们",
    loading: "正在载入首页 🕊️",
    notFound: "找不到该期杂志数据 😖",
    notFoundDesc: "可能尚未发布，敬请期待。",
    backToLatest: "回最新一期",
    optTitle: "搜索文章标题",
    optAuthor: "搜索作者",
    optContent: "搜索文章全文",
    optKeyword: "搜索关键字",
    searchPlaceholder: "请输入搜索内容...",
    readArticle: "阅读本文",
    emailHint: "点击复制 Email",
    emailCopied: "已复制！",
    viewAuthor: "查看作者页面",
  },
  en: {
    siteTitle: "Faith Without Boundary",
    mainTitle: "Current Issue",
    reviewTitle: (n) => `Issue ${n} Review`,
    issueFormat: (n, title) => `Vol.${n} 《${title}》`,
    downloadPdf: "Click cover to download PDF",
    coverStory: "Cover Story: ",
    special: "Special Features",
    theme: "Theme Plaza",
    diverse: "Diverse Lectures",
    authors: "Contributors",
    cfp: "Call for Papers",
    subscribe: "Subscribe",
    subscribeDesc:
      "'Faith Without Boundary' is a free faith discourse platform independent of church institutions, and an experimental online magazine published bi-monthly. We welcome readers to subscribe with your email. Upon publication of each issue, the editorial office will send the link and PDF file directly to you!",
    search: "Search",
    contact: "Contact Us",
    loading: "Loading... 🕊️",
    notFound: "Issue not found 😖",
    notFoundDesc: "It may not be published yet. Stay tuned.",
    backToLatest: "Back to Latest Issue",
    optTitle: "Search by Title",
    optAuthor: "Search by Author",
    optContent: "Search Full Text",
    optKeyword: "Search by Keyword",
    searchPlaceholder: "Enter search term...",
    readArticle: "Read Article",
    emailHint: "Click to copy Email",
    emailCopied: "Copied!",
    viewAuthor: "View Author Page",
  },
  ja: {
    siteTitle: "無境界者",
    mainTitle: "最新号",
    reviewTitle: (n) => `第${n}号アーカイブ`,
    issueFormat: (n, title) => `第${n}号《${title}》`,
    downloadPdf: "表紙をクリックしてPDFをダウンロード",
    coverStory: "カバーストーリー：",
    special: "特別寄稿",
    theme: "テーマ広場",
    diverse: "多元講堂",
    authors: "今号の執筆者",
    cfp: "投稿案内",
    subscribe: "購読する",
    subscribeDesc:
      "『無境界者』雑誌は、教会に依存しない自由な信仰論壇であり、偶数月の月末に定期発行される実験的なオンライン雑誌です。メールアドレスを登録してご購読ください。毎号発行時に、編集部から最新号のリンクとPDFファイルをお送りします！",
    search: "検索",
    contact: "お問い合わせ",
    loading: "読み込み中 🕊️",
    notFound: "データが見つかりません 😖",
    notFoundDesc: "まだ公開されていない可能性があります。",
    backToLatest: "最新号に戻る",
    optTitle: "タイトルで検索",
    optAuthor: "執筆者で検索",
    optContent: "全文検索",
    optKeyword: "キーワード検索",
    searchPlaceholder: "検索キーワードを入力...",
    readArticle: "記事を読む",
    emailHint: "クリックしてEmailをコピー",
    emailCopied: "コピーしました！",
    viewAuthor: "執筆者ページを見る",
  },
  ko: {
    siteTitle: "무경계자 매거진",
    mainTitle: "최신호",
    reviewTitle: (n) => `제${n}호 리뷰`,
    issueFormat: (n, title) => `제${n}호 《${title}》`,
    downloadPdf: "표지를 클릭하여 PDF 다운로드",
    coverStory: "커버 스토리: ",
    special: "특별 기고",
    theme: "테마 광장",
    diverse: "다원 강당",
    authors: "이번 호 집필자",
    cfp: "투고 안내",
    subscribe: "구독하기",
    subscribeDesc:
      "『무경계자』 매거진은 교회 중심주의를 벗어난 자유 신앙 담론 플랫폼이자, 짝수 달 말에 정기적으로 발행되는 실험적 온라인 잡지입니다. 이메일을 남겨 구독해 주시면, 매호 발행 시 편집실에서 해당 월의 링크와 PDF 파일을 보내드립니다！",
    search: "검색",
    contact: "문의하기",
    loading: "불러오는 중 🕊️",
    notFound: "해당 호를 찾을 수 없습니다 😖",
    notFoundDesc: "아직 발행되지 않았을 수 있습니다.",
    backToLatest: "최신호로 돌아가기",
    optTitle: "제목으로 검색",
    optAuthor: "작성자로 검색",
    optContent: "본문 검색",
    optKeyword: "키워드로 검색",
    searchPlaceholder: "검색어 입력...",
    readArticle: "기사 읽기",
    emailHint: "클릭하여 이메일 복사",
    emailCopied: "복사되었습니다!",
    viewAuthor: "작성자 페이지 보기",
  },
};
const t = computed(
  () => homeTranslations[currentLang.value] || homeTranslations["zh-TW"],
);

const categoryTranslations = {
  "zh-TW": {
    專題文章: "專題文章",
    評論與回應: "評論與回應",
    人物專訪: "人物專訪",
    生命故事: "生命故事",
    時事感想: "時事感想",
    文藝創作: "文藝創作",
    公告與剪影: "公告與剪影",
    封面故事: "封面故事",
  },
  "zh-HK": {
    專題文章: "專題文章",
    評論與回應: "評論與回應",
    人物專訪: "人物專訪",
    生命故事: "生命故事",
    時事感想: "時事感想",
    文藝創作: "文藝創作",
    公告與剪影: "公告與剪影",
    封面故事: "封面故事",
  },
  "zh-CN": {
    專題文章: "专题文章",
    評論與回應: "评论与回应",
    人物專訪: "人物专访",
    生命故事: "生命故事",
    時事感想: "时事感想",
    文藝創作: "文艺创作",
    公告與剪影: "公告与剪影",
    封面故事: "封面故事",
  },
  en: {
    專題文章: "Feature",
    評論與回應: "Review",
    人物專訪: "Interview",
    生命故事: "Life Story",
    時事感想: "Current Affairs",
    文藝創作: "Literature",
    公告與剪影: "Notice",
    封面故事: "Cover Story",
  },
  ja: {
    專題文章: "特集記事",
    評論與回應: "評論と応答",
    人物專訪: "インタビュー",
    生命故事: "ライフストーリー",
    時事感想: "時事コラム",
    文藝創作: "文芸創作",
    公告與剪影: "お知らせ",
    封面故事: "カバーストーリー",
  },
  ko: {
    專題文章: "특집 기사",
    評論與回應: "평론 및 응답",
    人物專訪: "인터뷰",
    生命故事: "삶의 이야기",
    時事感想: "시사 칼럼",
    文藝創作: "문예 창작",
    公告與剪影: "공지사항",
    封面故事: "커버 스토리",
  },
};
const translateCategory = (cat) => {
  const lang = currentLang.value === "default" ? "zh-TW" : currentLang.value;
  return categoryTranslations[lang]?.[cat] || cat;
};

// ─── 共享 SEO 給 pages/index.vue（避免在 component 呼叫 useSeoMeta 造成 dispose 錯誤）
const homePageSeo = useState("home-page-seo", () => ({
  title: "",
  description: "一個不以教會為本位的自由信仰論述平台",
  ogImage: "https://res.cloudinary.com/nonchurch2025/image/upload/topic.jpg",
}));

// ✅ 監聽語言變化，動態更新 ogTitle（但 title 保持空字串，讓 app.vue 處理）
watch(
  currentLang,
  () => {
    homePageSeo.value.title = "";
  },
  { immediate: true },
);

// ─── 輔助函式 ─────────────────────────────────────────────────────
const getCategoryColor = (cat) =>
  ({
    專題文章: "#8b0000",
    評論與回應: "#ff8000",
    人物專訪: "#f0e137",
    生命故事: "#46b175",
    時事感想: "#4682b4",
    文藝創作: "#27408b",
    公告與剪影: "#6a5acd",
    封面故事: "#7d6c29",
  })[cat] || "#999";
const getColorClass = (code) =>
  ({
    "#8b0000": "red",
    "#ff8000": "orange",
    "#f0e137": "yellow",
    "#46b175": "green",
    "#4682b4": "blue",
    "#6a5acd": "purple",
  })[code] || "red";

// ─── 資料抓取 ────────────────────────────────────────────────────
const fetchAuthors = async () => {
  const { data, error } = await supabase
    .from("authors")
    .select("*")
    .eq("is_published", true);
  if (!error && data) dbAuthors.value = data;
};

const fetchIssues = async () => {
  loading.value = true;
  let query = supabase
    .from("issues")
    .select("*")
    .order("id", { ascending: false });
  if (!isEditor.value) query = query.eq("is_published", true);
  const { data, error } = await query;
  if (!error) {
    issuesList.value = data || [];
    await loadTargetIssue();
  }
  loading.value = false;
};

const loadTargetIssue = async () => {
  if (!issuesList.value.length) return;
  let target = route.params.issueNumber
    ? issuesList.value.find((i) => i.id == route.params.issueNumber)
    : null;
  if (!target) target = issuesList.value[0];
  currentIssueData.value = target;
  if (!target) return;

  adminSelectedIssue.value = target.id;
  let artQuery = supabase.from("articles").select("*").eq("issue", target.id);
  if (!isEditor.value) artQuery = artQuery.eq("is_published", true);
  const { data: articles, error } = await artQuery;
  if (!error && articles) {
    articles.sort((a, b) =>
      a.id.localeCompare(b.id, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
    rawArticles.value = articles;

    const kw = {};
    articles.forEach((art) => {
      if (art.keyword)
        art.keyword.split("、").forEach((k) => (kw[k] = (kw[k] || 0) + 1));
    });
    hotKeywords.value = Object.entries(kw)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => k);
  }
};

const filterArticlesByCategory = (cat) => {
  return rawArticles.value.filter((a) => a.category === cat);
};

const handleAdminIssueChange = async () => {
  await router.push({ path: "/" });
  await loadTargetIssue();
};

const handleSearch = () => {
  const q = searchQuery.value.trim();
  if (!q) return;
  router.push({
    path: "/search",
    query: { q, type: searchType.value },
  });
};

const copyEmailToClipboard = () => {
  navigator.clipboard.writeText("nonchurch2025@gmail.com");
  isEmailCopied.value = true;
  setTimeout(() => (isEmailCopied.value = false), 2000);
};

onMounted(() => {
  fetchAuthors();
  fetchIssues();
});
</script>

<template>
  <div v-if="loading" class="loading-state">
    <span class="loading-dots">{{ t.loading }}</span>
  </div>

  <div v-else class="home">
    <section v-if="isEditor" class="admin-controls">
      <label for="issue-select">選擇期數：</label>
      <select
        id="issue-select"
        v-model="adminSelectedIssue"
        @change="handleAdminIssueChange"
      >
        <option v-for="issue in issuesList" :key="issue.id" :value="issue.id">
          第{{ issue.id }}期 - {{ issue.theme }}
        </option>
      </select>
    </section>

    <div v-if="!currentIssueData" class="not-found">
      <h2>{{ t.notFound }}</h2>
      <p>{{ t.notFoundDesc }}</p>
      <button v-if="route.params.issueNumber" @click="router.push('/')">
        {{ t.backToLatest }}
      </button>
    </div>

    <template v-else>
      <section class="current-issue">
        <a :href="currentIssueData.pdf_url" target="_blank">
          <img :src="currentIssueData.cover_image" :alt="t.downloadPdf" />
        </a>
        <div class="issue-info">
          <h1>
            {{
              route.params.issueNumber
                ? t.reviewTitle(currentIssueData.id)
                : t.mainTitle
            }}
          </h1>
          <h2>
            {{ t.issueFormat(currentIssueData.id, currentIssueData.theme) }}
          </h2>
          <p style="margin-top: 1rem; color: #555">{{ t.downloadPdf }}</p>
          <p class="cover-story">
            {{ t.coverStory
            }}<NuxtLink
              :to="
                currentIssueData.cover_story_link || currentIssueData.pdf_url
              "
              target="_blank"
              style="text-decoration: underline; color: #1a73e8"
            >
              {{ currentIssueData.cover_story }}
            </NuxtLink>
          </p>
        </div>
      </section>

      <section
        v-if="filterArticlesByCategory('專題文章').length > 0"
        class="articles special-features"
      >
        <h2>{{ t.special }}</h2>
        <div class="two-cols">
          <div
            v-for="article in filterArticlesByCategory('專題文章')"
            :key="article.id"
            class="article-card"
          >
            <span
              class="article-type"
              :class="getColorClass(getCategoryColor(article.category))"
            >
              {{ translateCategory(article.category) }}
            </span>
            <h3>{{ article.title }}</h3>
            <p>{{ article.subtitle }}</p>
            <div class="article-meta">
              <span v-if="article.author">{{ article.author }}</span>
            </div>
            <NuxtLink :to="`/article/${article.id}`" class="read-more">
              {{ t.readArticle }}
            </NuxtLink>
          </div>
        </div>
      </section>

      <section
        v-if="filterArticlesByCategory('封面故事').length > 0"
        class="articles cover-story-section"
      >
        <h2>{{ t.coverStory.replace("：", "") }}</h2>
        <div class="two-cols">
          <div
            v-for="article in filterArticlesByCategory('封面故事')"
            :key="article.id"
            class="article-card"
          >
            <span
              class="article-type"
              :class="getColorClass(getCategoryColor(article.category))"
            >
              {{ translateCategory(article.category) }}
            </span>
            <h3>{{ article.title }}</h3>
            <p>{{ article.subtitle }}</p>
            <div class="article-meta">
              <span v-if="article.author">{{ article.author }}</span>
            </div>
            <NuxtLink :to="`/article/${article.id}`" class="read-more">
              {{ t.readArticle }}
            </NuxtLink>
          </div>
        </div>
      </section>

      <section
        v-if="
          filterArticlesByCategory('評論與回應').length > 0 ||
          filterArticlesByCategory('人物專訪').length > 0
        "
        class="articles theme-plaza"
      >
        <h2>{{ t.theme }}</h2>
        <div class="three-cols">
          <div
            v-for="article in [
              ...filterArticlesByCategory('評論與回應'),
              ...filterArticlesByCategory('人物專訪'),
            ]"
            :key="article.id"
            class="article-card"
          >
            <span
              class="article-type"
              :class="getColorClass(getCategoryColor(article.category))"
            >
              {{ translateCategory(article.category) }}
            </span>
            <h3>{{ article.title }}</h3>
            <p>{{ article.subtitle }}</p>
            <div class="article-meta">
              <span v-if="article.author">{{ article.author }}</span>
            </div>
            <NuxtLink :to="`/article/${article.id}`" class="read-more">
              {{ t.readArticle }}
            </NuxtLink>
          </div>
        </div>
      </section>

      <section
        v-if="
          filterArticlesByCategory('生命故事').length > 0 ||
          filterArticlesByCategory('時事感想').length > 0 ||
          filterArticlesByCategory('文藝創作').length > 0
        "
        class="articles diverse-lectures"
      >
        <h2>{{ t.diverse }}</h2>
        <div class="three-cols">
          <div
            v-for="article in [
              ...filterArticlesByCategory('生命故事'),
              ...filterArticlesByCategory('時事感想'),
              ...filterArticlesByCategory('文藝創作'),
            ]"
            :key="article.id"
            class="article-card"
          >
            <span
              class="article-type"
              :class="getColorClass(getCategoryColor(article.category))"
            >
              {{ translateCategory(article.category) }}
            </span>
            <h3>{{ article.title }}</h3>
            <p>{{ article.subtitle }}</p>
            <div class="article-meta">
              <span v-if="article.author">{{ article.author }}</span>
            </div>
            <NuxtLink :to="`/article/${article.id}`" class="read-more">
              {{ t.readArticle }}
            </NuxtLink>
          </div>
        </div>
      </section>

      <section
        v-if="currentIssueData.issue_authors?.length > 0"
        class="authors"
      >
        <h2>{{ t.authors }}</h2>
        <div class="author-container">
          <div
            v-for="authorName in currentIssueData.issue_authors"
            :key="authorName"
            class="author"
          >
            <NuxtLink
              :to="`/author/${
                dbAuthors.find((a) => a.name === authorName)?.slug || authorName
              }`"
              :data-tooltip="t.viewAuthor"
            >
              <img
                :src="
                  dbAuthors.find((a) => a.name === authorName)?.avatar ||
                  'https://via.placeholder.com/160'
                "
                :alt="authorName"
              />
              <h4>{{ authorName }}</h4>
            </NuxtLink>
          </div>
        </div>
      </section>

      <section
        v-if="
          currentIssueData.next_issue_preview ||
          currentIssueData.call_for_submission
        "
        class="next-preview-submission"
      >
        <div v-if="currentIssueData.next_issue_preview" class="card-content">
          <h3>下一期預告</h3>
          <p class="next-issue-text">
            {{ currentIssueData.next_issue_preview }}
          </p>
        </div>
        <div
          v-if="currentIssueData.call_for_submission"
          class="call-for-submission"
        >
          <h3>{{ t.cfp }}</h3>
          <p>{{ currentIssueData.call_for_submission }}</p>
        </div>
      </section>

      <section class="search">
        <h2>{{ t.search }}</h2>
        <div v-if="hotKeywords.length > 0" class="search-links">
          <a
            v-for="kw in hotKeywords"
            :key="kw"
            :href="`/search?q=${encodeURIComponent(kw)}&type=keyword`"
            class="keyword-link"
          >
            {{ kw }}
          </a>
        </div>
        <div class="search-box">
          <select v-model="searchType" class="search-select">
            <option value="title">{{ t.optTitle }}</option>
            <option value="author">{{ t.optAuthor }}</option>
            <option value="content">{{ t.optContent }}</option>
            <option value="keyword">{{ t.optKeyword }}</option>
          </select>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t.searchPlaceholder"
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="btn-search" @click="handleSearch">
            {{ t.search }}
          </button>
        </div>
      </section>

      <section class="subscribe">
        <h2>{{ t.subscribe }}</h2>
        <p>{{ t.subscribeDesc }}</p>
        <a href="https://forms.gle/fHSaBxCdFpBAamGc7" target="_blank">
          <button class="btn-subscribe">{{ t.subscribe }}</button>
        </a>
      </section>

      <section class="contact">
        <h2>{{ t.contact }}</h2>
        <div class="social-links">
          <a
            href="https://www.facebook.com/profile.php?id=61561013059331"
            target="_blank"
            class="social-btn facebook"
            data-tooltip="Facebook"
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
              />
            </svg>
          </a>
          <a
            href="https://www.instagram.com/nonchurch2025/"
            target="_blank"
            class="social-btn instagram"
            data-tooltip="Instagram"
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
              />
            </svg>
          </a>
          <a
            href="https://www.threads.net/@nonchurch2025"
            target="_blank"
            class="social-btn threads"
            data-tooltip="Threads"
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142l-.126.742a13.08 13.08 0 0 0-2.864-.136c-1.248.07-2.264.437-2.949 1.062-.66.602-.99 1.359-.928 2.134.046.564.354 1.111.869 1.542.517.433 1.287.67 2.17.67h.17c1.203-.065 2.068-.503 2.568-1.302.48-.766.74-1.936.68-3.977-.046-1.61-.553-2.904-1.504-3.847-1.011-.999-2.593-1.527-4.7-1.567-2.91.022-5.11.936-6.54 2.717-1.33 1.667-2.02 4.077-2.048 7.164.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.766-.02 4.679-.754 6.159-2.369 1.729-1.89 1.64-4.415.935-6.155-.428-1.056-1.145-1.94-2.132-2.634a7.604 7.604 0 0 0-1.224-.685 13.08 13.08 0 0 0-2.864-.136c-1.248.07-2.264.437-2.949 1.062-.66.602-.99 1.359-.928 2.134.046.564.354 1.111.869 1.542.517.433 1.287.67 2.17.67h.17c1.203-.065 2.068-.503 2.568-1.302.48-.766.74-1.936.68-3.977-.046-1.61-.553-2.904-1.504-3.847-1.011-.999-2.593-1.527-4.7-1.567-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717z"
              />
            </svg>
          </a>
          <button
            class="social-btn email"
            :data-tooltip="isEmailCopied ? t.emailCopied : t.emailHint"
            @click="copyEmailToClipboard"
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
              />
            </svg>
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* [保持原有的所有樣式不變] */
.home {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}
.admin-controls {
  background: #fff3cd;
  padding: 1rem 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  border-left: 4px solid #ffc107;
}
.admin-controls label {
  font-weight: bold;
  margin-right: 0.5rem;
}
.admin-controls select {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}
.not-found {
  text-align: center;
  padding: 4rem 2rem;
  background: #f8d7da;
  border-radius: 8px;
  margin: 2rem 0;
}
.not-found h2 {
  font-size: 2rem;
  color: #721c24;
  margin-bottom: 1rem;
}
.not-found p {
  font-size: 1.2rem;
  color: #721c24;
  margin-bottom: 1.5rem;
}
.not-found button {
  padding: 0.8rem 2rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}
.not-found button:hover {
  background-color: #0056b3;
}
h1 {
  font-size: 3rem;
  font-weight: bold;
  color: #222;
  margin-bottom: 1rem;
}
h2 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  color: #333;
  font-weight: 700;
  border-bottom: 3px solid #555;
  padding-bottom: 0.5rem;
}
.current-issue {
  display: flex;
  gap: 4rem;
  align-items: flex-start;
  margin: 3rem 0;
}
.current-issue a {
  flex-shrink: 0;
  display: block;
  transition: transform 0.3s ease;
}
.current-issue a:hover {
  transform: scale(1.05);
}
.current-issue img {
  width: 350px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.issue-info {
  flex: 1;
  padding-top: 1rem;
}
.issue-info h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}
.issue-info h2 {
  font-size: 2rem;
  color: #555;
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0.5rem;
}
.cover-story {
  margin-top: 1rem;
  font-size: 1.3rem;
  color: #333;
}
.articles {
  margin: 3rem 0;
  padding: 3rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.two-cols,
.three-cols {
  display: grid;
  gap: 2rem;
  margin-top: 2rem;
}
.two-cols {
  grid-template-columns: repeat(2, 1fr);
}
.three-cols {
  grid-template-columns: repeat(3, 1fr);
}
.article-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 2rem;
  position: relative;
  transition: transform 0.3s ease;
}
.article-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}
.article-card h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  margin-top: 0.5rem;
  color: #222;
}
.article-card p {
  font-size: 1rem;
  color: #666;
  margin-bottom: 1rem;
}
.article-meta {
  font-size: 0.95rem;
  color: #999;
  margin-bottom: 1rem;
}
.article-meta span {
  margin-right: 1rem;
}
.read-more {
  display: inline-block;
  padding: 0.5rem 1.5rem;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: background-color 0.3s ease;
}
.read-more:hover {
  background-color: #0056b3;
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
  white-space: nowrap;
  z-index: 10;
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
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
  pointer-events: none;
}
.author a:hover::after {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(-5px);
}
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
.search {
  text-align: center;
  border-radius: 8px;
  padding: 2rem;
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
}
.btn-search {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0 1.5rem;
  cursor: pointer;
}
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
  background-color: #000;
  color: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
}
.social-btn.email:hover {
  background-color: #db4437;
  color: white;
  box-shadow: 0 5px 15px rgba(219, 68, 55, 0.4);
}
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
  transition:
    opacity 0.3s,
    transform 0.3s;
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
.subscribe {
  text-align: center;
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin: 2rem 0;
}
.subscribe p {
  font-size: 1.1rem;
  color: #555;
  line-height: 1.8;
  margin: 1.5rem 0;
  text-align: justify;
  text-indent: 2rem;
}
.btn-subscribe {
  padding: 1rem 3rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.btn-subscribe:hover {
  background-color: #218838;
}
</style>
