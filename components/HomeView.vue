<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEditorMode } from "../composables/useEditorMode";
import { useLanguage } from "../composables/useLanguage";
import { cloudinaryUrl, CLD } from "../utils/cloudinary";

const supabase = useSupabaseClient();
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

// ⭐ 網站名稱多國語言字典 (用於 document.title)
const siteNames = {
  "zh-TW": "無境界者雜誌",
  "zh-HK": "無境界者雜誌",
  "zh-CN": "无境界者杂志",
  en: "Faith Without Boundary",
  ja: "無境界者雑誌",
  ko: "무경계자 매거진",
};

// ⭐ 首頁區塊標題多國語言字典
const homeTranslations = {
  "zh-TW": {
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
    searchHint: "💡 提示：支援模糊搜尋，請選擇欄位並輸入關鍵字。",
    searchPlaceholder: "請輸入搜尋內容...",
    readArticle: "閱讀本文",
    emailHint: "點擊複製 Email",
    emailCopied: "已複製！",
    viewAuthor: "查看作者頁面", // ⭐ 新增：Hover 提示
  },
  "zh-HK": {
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
    searchHint: "💡 提示：支援模糊搜尋，請揀選欄位並輸入關鍵字。",
    searchPlaceholder: "請輸入搜尋內容...",
    readArticle: "閱讀本文",
    emailHint: "撳掣複製 Email",
    emailCopied: "已經複製咗！",
    viewAuthor: "睇作者頁面", // ⭐ 新增：Hover 提示
  },
  "zh-CN": {
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
    searchHint: "💡 提示：支持模糊搜索，请选择字段并输入关键字。",
    searchPlaceholder: "请输入搜索内容...",
    readArticle: "阅读本文",
    emailHint: "点击复制 Email",
    emailCopied: "已复制！",
    viewAuthor: "查看作者页面", // ⭐ 新增：Hover 提示
  },
  en: {
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
    searchHint:
      "💡 Hint: Fuzzy search is supported. Select a field and enter a keyword.",
    searchPlaceholder: "Enter search term...",
    readArticle: "Read Article",
    emailHint: "Click to copy Email",
    emailCopied: "Copied!",
    viewAuthor: "View Author Page", // ⭐ 新增：Hover 提示
  },
  ja: {
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
    searchHint:
      "💡 ヒント：あいまい検索対応。検索対象を選択してキーワードを入力してください。",
    searchPlaceholder: "検索キーワードを入力...",
    readArticle: "記事を読む",
    emailHint: "クリックしてEmailをコピー",
    emailCopied: "コピーしました！",
    viewAuthor: "執筆者ページを見る", // ⭐ 新增：Hover 提示
  },
  ko: {
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
      "『무경계자』 매거진은 교회 중심주의를 벗어난 자유 신앙 담론 플랫폼이자, 짝수 달 말에 정기적으로 발행되는 실험적 온라인 잡지입니다. 이메일을 남겨 구독해 주시면, 매호 발행 시 편집실에서 해당 월의 링크와 PDF 파일을 보내드립니다!",
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
    searchHint: "💡 힌트: 퍼지 검색 지원. 필드를 선택하고 키워드를 입력하세요.",
    searchPlaceholder: "검색어 입력...",
    readArticle: "기사 읽기",
    emailHint: "클릭하여 이메일 복사",
    emailCopied: "복사되었습니다!",
    viewAuthor: "작성자 페이지 보기", // ⭐ 新增：Hover 提示
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
    時事評論: "時事評論",
    文藝創作: "文藝創作",
    公告與剪影: "公告與剪影",
    封面故事: "封面故事",
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
  },
  "zh-CN": {
    專題文章: "专题文章",
    評論與回應: "评论与回应",
    人物專訪: "人物专访",
    生命故事: "生命故事",
    時事評論: "时事评论",
    文藝創作: "文艺创作",
    公告与剪影: "公告与剪影",
    封面故事: "封面故事",
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
  },
};

const translateCategory = (cat) => {
  const lang = currentLang.value === "default" ? "zh-TW" : currentLang.value;
  return categoryTranslations[lang]?.[cat] || cat;
};

const fetchAuthors = async () => {
  // 不過濾 is_published：本期作者區只看「有文章歸屬到」即顯示，
  // is_published 旗標只用於 /authors 列表頁的展示控制。
  const { data, error } = await supabase.from("authors").select("*");
  if (!error && data) {
    dbAuthors.value = data;
  }
};

const fetchIssues = async () => {
  loading.value = true;
  let query = supabase
    .from("issues")
    .select("*")
    .order("id", { ascending: false });
  if (!isEditor.value) {
    query = query.eq("is_published", true);
  }
  const { data, error } = await query;
  if (!error) {
    issuesList.value = data || [];
    await loadTargetIssue();
  }
  loading.value = false;
};

const loadTargetIssue = async () => {
  if (issuesList.value.length === 0) return;
  let target = null;

  // 1) 明確指定期數（/home/issue/:issueNumber）時，優先使用路由目標
  if (route.params.issueNumber) {
    target = issuesList.value.find((i) => i.id == route.params.issueNumber);
  }

  // 2) 管理員首頁（未指定期數）：
  //    優先顯示「最早尚未出版」的一期。
  //    例如第 8、9 期都未出刊時，顯示第 8 期。
  if (!target && isEditor.value) {
    const drafts = [...issuesList.value]
      .filter((i) => !i.is_published)
      .sort((a, b) => Number(a.id) - Number(b.id));
    if (drafts.length > 0) {
      target = drafts[0];
    }
  }

  // 3) 其餘情況維持原本：顯示列表第一筆（已依 id desc 排序）
  if (!target) target = issuesList.value[0];
  currentIssueData.value = target;
  if (target) {
    adminSelectedIssue.value = target.id;
    let artQuery = supabase.from("articles").select("*").eq("issue", target.id);
    if (!isEditor.value) artQuery = artQuery.eq("is_published", true);
    const { data: articles, error } = await artQuery;
    if (!error && articles) {
      articles.sort((a, b) => {
        return a.id.localeCompare(b.id, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
      rawArticles.value = articles;
    }
  }
};

const currentIssueContent = computed(() => {
  const langKey =
    currentLang.value === "default"
      ? "zh-TW"
      : currentLang.value.replace("-", "_");
  return rawArticles.value.map((a) => {
    const trans = a.translations?.[langKey] || {};
    return {
      routeId: a.id,
      category: a.category,
      section: a.section,
      title: trans.title || a.title,
      subtitle: trans.subtitle || a.subtitle,
      originalAuthor: a.author,
      linkedAuthorIds: Array.isArray(a.linked_author_ids)
        ? a.linked_author_ids
        : [],
      authorDisplay:
        trans.author_display || trans.author || a.author_display || a.author,
      keyword: trans.keyword || a.keyword,
      summary: trans.summary || a.summary,
      color: getCategoryColor(a.category),
    };
  });
});

watch(
  [currentIssueContent, currentLang],
  () => {
    if (!currentIssueContent.value.length) {
      hotKeywords.value = [];
      return;
    }
    const allKeywords = currentIssueContent.value
      .map((a) => a.keyword)
      .filter((k) => k)
      .join(",")
      .split(/[、,，]/)
      .map((k) =>
        k
          .replace(/🌿/g, "")
          .replace(/(關鍵字|关键字|Keywords|キーワード|키워드)\s*[:：]/gi, "")
          .trim(),
      )
      .filter((k) => k && k.length > 0);
    const uniqueKeywords = [...new Set(allKeywords)];
    const shuffled = uniqueKeywords.sort(() => 0.5 - Math.random());
    hotKeywords.value = shuffled.slice(0, 5);
  },
  { immediate: true },
);

const currentIssue = computed(() => {
  if (!currentIssueData.value) return null;
  const lang = currentLang.value === "default" ? "zh-TW" : currentLang.value;
  const transKey = lang.replace("-", "_");
  const trans = currentIssueData.value.translations?.[transKey] || {};

  return {
    number: currentIssueData.value.id,
    title: trans.title || currentIssueData.value.title,
    date: trans.date || currentIssueData.value.date,
    coverImg: currentIssueData.value.cover_img,
    introHome: trans.intro_home || currentIssueData.value.intro_home,
    introCfp: trans.intro_cfp || currentIssueData.value.intro_cfp,
    pdfLink: currentIssueData.value.pdf_link,
    authorOrder: currentIssueData.value.author_order,
    content: currentIssueContent.value,
  };
});

const getCategoryColor = (category) => {
  const map = {
    專題文章: "#8b0000",
    評論與回應: "#ff8000",
    人物專訪: "#f0e137",
    生命故事: "#46b175",
    時事評論: "#4682b4",
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

const formattedIntroCfp = computed(() => {
  let text =
    currentIssue.value?.introCfp || "下一期將以精彩主題呈現，敬請期待。";
  text = text.replace(
    /（(.*?)）/g,
    '<span style="color: #ff8000; font-weight: bold;">$1</span>',
  );
  text = text.replace(
    /「(.*?)」/g,
    '<span style="color: #007bff; font-weight: bold;">$1</span>',
  );
  return text;
});

const coverStory = computed(() =>
  currentIssue.value?.content.find((item) => item.category === "封面故事"),
);

const groupArticles = (headerText) => {
  if (!currentIssue.value) return [];
  return currentIssue.value.content.filter(
    (i) => i.section && i.section.trim() === headerText,
  );
};

const specialFeatures = computed(() => groupArticles("特稿專區"));
const themePlaza = computed(() => groupArticles("主題廣場"));
const diverseLectures = computed(() => groupArticles("多元講堂"));

const currentIssueAuthors = computed(() => {
  if (!currentIssue.value || !dbAuthors.value.length) return [];
  const langKey =
    currentLang.value === "default"
      ? "zh-TW"
      : currentLang.value.replace("-", "_");

  // 比對規則：彙整本期所有文章的 linked_author_ids，過濾 dbAuthors
  const appearingIds = new Set();
  for (const art of currentIssue.value.content) {
    for (const id of art.linkedAuthorIds || []) appearingIds.add(id);
  }
  let filteredAuthors = dbAuthors.value.filter((a) => appearingIds.has(a.id));

  const orderList = currentIssue.value.authorOrder;
  if (orderList && Array.isArray(orderList)) {
    filteredAuthors.sort((a, b) => {
      const idxA = orderList.indexOf(a.name);
      const idxB = orderList.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return idxA !== -1 ? -1 : 1;
    });
  }

  return filteredAuthors.map((a) => {
    const trans = a.translations?.[langKey] || {};
    return { ...a, displayName: trans.name || a.name };
  });
});

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({
      name: "search",
      query: { q: searchQuery.value, type: searchType.value },
    });
  }
};

const copyEmail = () => {
  navigator.clipboard.writeText("nonchurch2025@gmail.com").then(() => {
    isEmailCopied.value = true;
    setTimeout(() => {
      isEmailCopied.value = false;
    }, 2000);
  });
};

// ⭐ 同時監聽語言與路由，動態更新標題
const pageTitle = computed(() => {
  const activeLang =
    currentLang.value === "default" ? "zh-TW" : currentLang.value;
  const siteName = siteNames[activeLang] || siteNames["zh-TW"];

  // ✅ 首頁只顯示雜誌名稱，期數回顧才加前綴
  if (route.params.issueNumber) {
    const pageTitlePrefix =
      t.value?.reviewTitle?.(route.params.issueNumber) ||
      `第${route.params.issueNumber}期回顧`;
    return `${pageTitlePrefix} - ${siteName}`;
  } else {
    return siteName;
  }
});

// ✅ 使用 Nuxt 的 useHead API（支援 SSR）
useHead({
  title: pageTitle,
});

watch(
  () => route.params.issueNumber,
  () => loadTargetIssue(),
);
watch(isEditor, () => fetchIssues());

onMounted(async () => {
  await fetchAuthors();
  fetchIssues();
});
</script>

<template>
  <h1 class="page-main-title">
    <span class="emoji">🎉</span>
    {{
      route.params.issueNumber
        ? t.reviewTitle(route.params.issueNumber)
        : t.mainTitle
    }}
    <span class="emoji">🎉</span>
  </h1>
  <div class="main-divider"></div>

  <div v-if="isEditor" class="admin-toolbar">
    <span class="toolbar-label">🔧 管理員導航：</span>
    <select
      v-model="adminSelectedIssue"
      @change="
        () =>
          router.push(
            `${route.path.startsWith('/admin') ? '/admin' : ''}/home/issue/${adminSelectedIssue}`,
          )
      "
      class="admin-select"
    >
      <option v-for="issue in issuesList" :key="issue.id" :value="issue.id">
        Vol.{{ issue.id }} - {{ issue.title }}
        {{ !issue.is_published ? "(草稿)" : "" }}
      </option>
    </select>
  </div>

  <div v-if="loading" class="loading-state">
    {{ t.loading }}<span class="loading-dots"></span>
  </div>

  <div v-else-if="!currentIssue" class="not-found-state">
    <h2>{{ t.notFound }}</h2>
    <router-link to="/home">{{ t.backToLatest }}</router-link>
  </div>

  <div v-else class="home-container">
    <section class="current-issue">
      <div class="left">
        <a :href="currentIssue.pdfLink || '#'" target="_blank" :aria-label="`下載第${currentIssue.number}期《${currentIssue.title}》PDF`">
          <img
            :src="cloudinaryUrl(currentIssue.coverImg, CLD.cover)"
            :alt="`第${currentIssue.number}期《${currentIssue.title}》封面`"
            width="400"
            height="566"
            class="magazine-cover"
            fetchpriority="high"
            loading="eager"
          />
        </a>
        <p class="cover-description">{{ t.downloadPdf }}</p>
      </div>
      <div class="right">
        <h2 class="issue-heading">
          <router-link
            :to="`/articles#issue-${currentIssue.number}`"
            class="title-link"
          >
            {{ t.issueFormat(currentIssue.number, currentIssue.title) }}
          </router-link>
          <span class="date">{{ currentIssue.date }}</span>
        </h2>
        <p
          v-for="(p, i) in (currentIssue.introHome || '').split('\n')"
          :key="i"
          class="issue-desc"
        >
          {{ p }}
        </p>
        <div class="cover-story" v-if="coverStory">
          <span class="icon">📰</span>
          <router-link :to="`/articles/${coverStory.routeId}`"
            >{{ t.coverStory }}{{ coverStory.title }}</router-link
          >
        </div>
      </div>
    </section>

    <section v-if="specialFeatures.length" class="diverse-lectures">
      <h2>🎙️ {{ t.special }}</h2>
      <div class="article-container two-cols">
        <router-link
          v-for="a in specialFeatures"
          :key="a.routeId"
          :to="`/articles/${a.routeId}`"
          class="article-link"
        >
          <div class="article" :data-tooltip="t.readArticle">
            <span class="article-type" :class="getColorClass(a.color)">{{
              translateCategory(a.category)
            }}</span>
            <h3>{{ a.title }}</h3>
            <h4 v-if="a.subtitle">──{{ a.subtitle }}</h4>
            <b class="author-name">{{ a.authorDisplay }}</b>
            <p class="article-summary">{{ a.summary }}</p>
          </div>
        </router-link>
      </div>
    </section>

    <section v-if="themePlaza.length" class="articles">
      <h2>🏛️ {{ t.theme }}</h2>
      <div class="article-container three-cols">
        <router-link
          v-for="a in themePlaza"
          :key="a.routeId"
          :to="`/articles/${a.routeId}`"
          class="article-link"
        >
          <div class="article" :data-tooltip="t.readArticle">
            <span class="article-type" :class="getColorClass(a.color)">{{
              translateCategory(a.category)
            }}</span>
            <h3>{{ a.title }}</h3>
            <h4 v-if="a.subtitle">──{{ a.subtitle }}</h4>
            <b class="author-name">{{ a.authorDisplay }}</b>
            <p class="article-summary">{{ a.summary }}</p>
          </div>
        </router-link>
      </div>
    </section>

    <section v-if="diverseLectures.length" class="diverse-lectures">
      <h2>🎓 {{ t.diverse }}</h2>
      <div class="article-container three-cols">
        <router-link
          v-for="a in diverseLectures"
          :key="a.routeId"
          :to="`/articles/${a.routeId}`"
          class="article-link"
        >
          <div class="article" :data-tooltip="t.readArticle">
            <span class="article-type" :class="getColorClass(a.color)">{{
              translateCategory(a.category)
            }}</span>
            <h3>{{ a.title }}</h3>
            <h4 v-if="a.subtitle">──{{ a.subtitle }}</h4>
            <b class="author-name">{{ a.authorDisplay }}</b>
            <p class="article-summary">{{ a.summary }}</p>
          </div>
        </router-link>
      </div>
    </section>

    <section v-if="currentIssueAuthors.length" class="authors">
      <h2>✍️ {{ t.authors }}</h2>
      <div class="author-container">
        <div v-for="a in currentIssueAuthors" :key="a.id" class="author">
          <router-link :to="'/authors/' + a.name" :data-tooltip="t.viewAuthor" :aria-label="a.displayName">
            <img
              :src="cloudinaryUrl(a.author_image, CLD.avatar)"
              :alt="a.displayName"
              width="120"
              height="120"
              loading="lazy"
            />
          </router-link>
          <h4>{{ a.displayName }}</h4>
        </div>
      </div>
    </section>

    <section class="next-preview-submission">
      <div class="card-content">
        <h2>{{ t.cfp }}</h2>
        <p class="next-issue-text" v-html="formattedIntroCfp"></p>
        <router-link to="/submit" class="btn">{{ t.cfp }}</router-link>
      </div>
      <div class="call-for-submission">
        <h2>{{ t.subscribe }}</h2>
        <p>{{ t.subscribeDesc }}</p>
        <a
          href="https://forms.gle/aWSBFRfQ74QY13nw8"
          target="_blank"
          class="btn"
          >{{ t.subscribe }}</a
        >
      </div>
    </section>

    <section class="search">
      <h2>🔍 {{ t.search }}</h2>
      <div class="search-links">
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
          >#{{ tag }}</a
        >
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
          @keyup.enter="handleSearch"
          class="search-input"
          :placeholder="t.searchPlaceholder"
        />
        <button @click="handleSearch" class="btn-search">{{ t.search }}</button>
      </div>
    </section>

    <section class="contact">
      <h2>📧 {{ t.contact }}</h2>
      <div class="social-links">
        <a
          href="https://www.facebook.com/profile.php?id=61573500811055"
          target="_blank"
          class="social-btn facebook"
          ><svg viewBox="0 0 24 24">
            <path
              d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"
            /></svg
        ></a>
        <a
          href="https://www.instagram.com/nonchurch2025/"
          target="_blank"
          class="social-btn instagram"
          ><svg viewBox="0 0 24 24">
            <path
              d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069-3.204 0-3.584-.012-4.849-.069-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
            /></svg
        ></a>
        <a
          href="https://www.threads.net/@nonchurch2025"
          target="_blank"
          class="social-btn threads"
          ><svg viewBox="0 0 24 24">
            <path
              d="M12.186 19.314c-4.664 0-7.797-3.083-7.797-7.399 0-4.475 3.327-7.863 8.356-7.863 5.487 0 8.01 3.585 8.01 7.294 0 3.235-1.688 6.151-4.802 6.151-1.799 0-2.716-1.077-2.716-2.316 0-.251.026-.503.064-.753.488-3.197.876-5.83.876-6.155 0-1.155-.729-1.696-1.571-1.696-1.447 0-2.583 1.76-2.583 4.498 0 2.336.809 3.567 1.996 3.567.893 0 1.748-.564 2.285-1.472l.965.626c-.845 1.464-2.189 2.378-3.791 2.378-2.188 0-3.528-1.799-3.528-4.708 0-2.073.681-4.819 3.961-4.819 3.903 0 5.672 2.763 5.672 6.273 0 2.503-1.477 4.708-3.419 4.708-1.571 0-2.288-.93-2.364-1.559h-.075c-.566 1.156-1.747 1.835-3.067 1.835-2.275 0-3.832-1.683-3.832-4.072 0-2.903 2.149-5.328 6.008-5.328 1.056 0 2.061.163 2.651.352.012.088-.476 3.003-1.054 6.756-.051.327-.089.666-.089.967 0 2.036 2.061 2.036 2.324 2.036 3.557 0 5.672-3.217 5.672-7.513 0-4.902-3.455-8.879-9.591-8.879C5.433 1.083 1.25 5.511 1.25 11.915c0 5.761 3.94 9.117 8.358 9.117 2.212 0 4.148-.704 5.379-1.42l-.564-1.545c-1.396.842-3.13 1.247-4.793 1.247z"
            /></svg
        ></a>
        <a
          href="#"
          @click.prevent="copyEmail"
          class="social-btn email"
          :data-tooltip="isEmailCopied ? t.emailCopied : t.emailHint"
          ><svg viewBox="0 0 24 24">
            <path
              d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
            /></svg
        ></a>
      </div>
    </section>
  </div>
</template>

<style scoped>
@import "@/assets/shared.css";
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
h1,
h2,
h3,
h4,
p,
span,
a,
div {
  font-family: "Times New Roman", serif;
}
section {
  padding: 2rem;
  margin: 0 0 2rem 0;
}
h2 {
  text-align: center;
  color: #444;
  margin-bottom: 1rem;
  font-size: 2rem;
  font-weight: bold;
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
/* h3→h2 heading level fix：保持原視覺大小 */
.current-issue .right h2.issue-heading {
  font-size: 1.17em;
  font-weight: bold;
  margin: 0 0 0.5rem;
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
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}
.article:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* ⭐ 將固定的閱讀本文移除，改為 attr(data-tooltip) 讀取多語變數 */
.article::after {
  content: attr(data-tooltip);
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
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
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
.card-content h2,
.call-for-submission h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.6rem;
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
  font-family: "Times New Roman", serif;
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
  .search-box option {
    font-size: 0.8rem;
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
