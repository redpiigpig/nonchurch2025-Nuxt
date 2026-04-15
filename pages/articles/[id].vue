<script setup>
import { computed, defineAsyncComponent } from "vue";
import { useRoute } from "vue-router";
import { marked } from "marked";
import markedFootnote from "marked-footnote";
import { supabase } from "~/supabase";
import { useTempArticlesStore } from "~/stores/tempArticles";
import { useLanguage } from "~/composables/useLanguage";
import { useEditorMode } from "~/composables/useEditorMode";

marked.use(markedFootnote({ prefixId: "footnote-" }));

const route = useRoute();
const { currentLang } = useLanguage();
const { isEditor } = useEditorMode();
const tempArticlesStore = useTempArticlesStore();

// ─── 資料抓取 (使用 useAsyncData 支援 SSR SEO) ────────────────────────
const getArticleOrder = (idStr) => {
  if (!idStr) return 0;
  const match = idStr.match(/-(\d+)/);
  return match ? parseInt(match[1]) : parseInt(idStr) || 0;
};

const { data: asyncData, pending: loading } = await useAsyncData(
  `article-${route.params.id}`,
  async () => {
    const articleId = route.params.id;
    try {
      // 1. 抓取當前文章
      const { data: currentArt, error } = await supabase
        .from("articles")
        .select(
          "*, issues(id, title, translations), media_assets(image_url, sort_order)",
        )
        .eq("id", articleId)
        .single();
      if (error) throw error;

      // 2. 抓取同期文章以計算 上一篇 / 下一篇
      const { data: issueArticles } = await supabase
        .from("articles")
        .select("id, title, translations")
        .eq("issue", currentArt.issue);

      let prev = null,
        next = null;
      if (issueArticles) {
        issueArticles.sort(
          (a, b) => getArticleOrder(a.id) - getArticleOrder(b.id),
        );
        const idx = issueArticles.findIndex((a) => a.id === articleId);
        if (idx > 0) prev = issueArticles[idx - 1];
        if (idx !== -1 && idx < issueArticles.length - 1)
          next = issueArticles[idx + 1];
      }

      // 🚨 已經徹底移除 Supabase Storage 抓圖片的程式碼 🚨

      return {
        article: {
          ...currentArt,
          authorTitle: currentArt.author_title,
          issueTitle: currentArt.issue_title,
          dynamicPrev: prev,
          dynamicNext: next,
          footnotes: currentArt.footnotes || [],
          media_data: currentArt.media_data || {},
          media_assets: currentArt.media_assets || [],
        },
      };
    } catch (err) {
      console.error(`載入文章 ${articleId} 失敗:`, err.message);
      return null;
    }
  },
  { watch: [() => route.params.id] }, // 當路由改變時重新觸發
);

// 提取資料並設置預覽模式 fallback
const article = computed(() => {
  if (asyncData.value?.article) return asyncData.value.article;
  if (import.meta.client) {
    const fallback = tempArticlesStore.getById(route.params.id);
    return fallback
      ? { ...fallback, footnotes: fallback.footnotes || [] }
      : null;
  }
  return null;
});

// ─── UI 多語字典 ──────────────────────────────────────────────────
const contentTrans = {
  "zh-TW": {
    prev: "閱讀上一篇文章",
    next: "閱讀下一篇文章",
    backToToc: "回到本期雜誌目錄",
    issuePrefix: "第",
    issueSuffix: "期：",
    browserTrans: "",
  },
  "zh-HK": {
    prev: "閱讀上一篇文章",
    next: "閱讀下一篇文章",
    backToToc: "返去今期雜誌目錄",
    issuePrefix: "第",
    issueSuffix: "期：",
    browserTrans:
      "本文內容係用台灣繁體寫嘅，如果你偏好用粵語閱讀，可以使用瀏覽器翻譯功能。",
  },
  "zh-CN": {
    prev: "阅读上一篇文章",
    next: "阅读下一篇文章",
    backToToc: "回到本期杂志目录",
    issuePrefix: "第",
    issueSuffix: "期：",
    browserTrans:
      "原文为繁体中文，建议使用浏览器的翻译功能以获得最佳阅读体验。",
  },
  en: {
    prev: "Previous Article",
    next: "Next Article",
    backToToc: "Back to Table of Contents",
    issuePrefix: "Vol.",
    issueSuffix: ": ",
    browserTrans:
      "The original text is in Traditional Chinese. Please use your browser's translation feature to read.",
  },
  ja: {
    prev: "前の記事を読む",
    next: "次の記事を読む",
    backToToc: "目次に戻る",
    issuePrefix: "第",
    issueSuffix: "号：",
    browserTrans:
      "原文は繁体字中国語です。ブラウザの翻訳機能を利用してご覧ください。",
  },
  ko: {
    prev: "이전 기사 읽기",
    next: "다음 기사 읽기",
    backToToc: "목차로 돌아가기",
    issuePrefix: "제",
    issueSuffix: "호: ",
    browserTrans:
      "원문은 번체 중국어입니다. 브라우저의 번역 기능을 사용하여 읽어주시기 바랍니다.",
  },
};
const t = computed(
  () => contentTrans[currentLang.value] || contentTrans["zh-TW"],
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
    光影時刻: "光影時刻",
    實驗園地: "實驗園地",
    文獻與翻譯: "文獻與翻譯",
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
    光影時刻: "光影時刻",
    實驗園地: "實驗園地",
    文獻與翻譯: "文獻與翻譯",
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
    光影時刻: "光影时刻",
    實驗園地: "实验园地",
    文獻與翻譯: "文献与翻译",
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
    光影時刻: "Moments",
    實驗園地: "Experimental",
    文獻與翻譯: "Documents & Translation",
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
    光影時刻: "光影の時",
    實驗園地: "実験的創作",
    文獻與翻譯: "文献と翻訳",
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
    光影時刻: "포토 스토리",
    實驗園地: "실험적 창작",
    文獻與翻譯: "문헌 및 번역",
  },
};

// ─── displayArticle：套用 Supabase translations 翻譯 ───────────────
const displayArticle = computed(() => {
  if (!article.value) return null;
  const langKey =
    currentLang.value === "default"
      ? "zh_TW"
      : currentLang.value.replace("-", "_");
  const tArt = article.value.translations?.[langKey] || {};
  const tIss = article.value.issues?.translations?.[langKey] || {};

  let displayPrev = null;
  if (article.value.dynamicPrev) {
    const pTrans = article.value.dynamicPrev.translations?.[langKey] || {};
    displayPrev = {
      id: article.value.dynamicPrev.id,
      title: pTrans.title || article.value.dynamicPrev.title,
    };
  }
  let displayNext = null;
  if (article.value.dynamicNext) {
    const nTrans = article.value.dynamicNext.translations?.[langKey] || {};
    displayNext = {
      id: article.value.dynamicNext.id,
      title: nTrans.title || article.value.dynamicNext.title,
    };
  }

  return {
    ...article.value,
    title: tArt.title || article.value.title,
    subtitle: tArt.subtitle || article.value.subtitle,
    author: tArt.author_display || tArt.author || article.value.author,
    authorTitle: tArt.author_title || article.value.authorTitle,
    keyword: tArt.keyword || article.value.keyword,
    remark: tArt.remark || article.value.remark,
    issueTitle: tIss.title || article.value.issueTitle,
    displayPrev,
    displayNext,
  };
});

const specialComponentsMap = {
  "7-6 In 是 Siáng？（他們是誰？）": defineAsyncComponent(
    () => import("~/components/feature_articles/Article7_6.vue"),
  ),
};

const currentSpecialComponent = computed(() => {
  if (!article.value || article.value.type !== "special") return null;
  const matchKey = Object.keys(specialComponentsMap).find((key) =>
    article.value.id.includes(key),
  );
  return matchKey ? specialComponentsMap[matchKey] : null;
});

// ─── SEO ────────────────────────────────────────────────
useSeoMeta({
  title: () =>
    displayArticle.value
      ? `${displayArticle.value.title} - 無境界者雜誌`
      : "無境界者雜誌",
  ogTitle: () => displayArticle.value?.title || "無境界者雜誌",
  description: () =>
    displayArticle.value?.summary ||
    "無境界者雜誌 - 一個不以教會為本位的自由信仰論述平台。",
  ogDescription: () =>
    displayArticle.value?.summary ||
    "無境界者雜誌 - 一個不以教會為本位的自由信仰論述平台。",
  ogImage: () =>
    article.value?.seo?.image ||
    "https://res.cloudinary.com/nonchurch2025/image/upload/default-seo.jpg",
  keywords: () =>
    (displayArticle.value?.keyword || "")
      .replace(/🌿/g, "")
      .replace(/(關鍵字|关键字|Keywords|キーワード|키워드)\s*[:：]/gi, "")
      .trim(),
  author: () => displayArticle.value?.author,
  twitterCard: "summary_large_image",
  twitterTitle: () => displayArticle.value?.title,
  twitterDescription: () => displayArticle.value?.summary,
  twitterImage: () =>
    article.value?.seo?.image ||
    "https://res.cloudinary.com/nonchurch2025/image/upload/default-seo.jpg",
});

const translatedCategory = computed(() => {
  if (!displayArticle.value?.category) return "";
  const lang = currentLang.value === "default" ? "zh-TW" : currentLang.value;
  return (
    categoryTranslations[lang]?.[displayArticle.value.category] ||
    displayArticle.value.category
  );
});

const showTranslationHint = computed(
  () => currentLang.value !== "zh-TW" && currentLang.value !== "default",
);

const categoryColor = computed(() => {
  const map = {
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
  return map[displayArticle.value?.category] || "#ff8000";
});

const issueLinkParams = computed(() => {
  if (!displayArticle.value?.issue) return {};
  const year = 2025 + Math.floor((displayArticle.value.issue - 1) / 6);
  return {
    path: "/articles",
    query: { year },
    hash: `#issue-${displayArticle.value.issue}`,
  };
});

const handleNavClick = () => {
  if (import.meta.client) {
    const state = window.history.state || {};
    window.history.replaceState({ ...state, forceTop: true }, "");
  }
};

const formatTextWithFootnote = (text) => {
  if (!text) return "";
  return text.replace(
    /\[\^(\d+)\]/g,
    (_, id) =>
      `<sup class="footnote-ref"><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`,
  );
};

/**
 * 🌟 核心渲染邏輯：完全改為 Cloudinary (移除所有 Supabase Storage 依賴)
 */
const htmlContent = computed(() => {
  if (!article.value?.content) return "";
  let fullText = article.value.content.replace(
    /\[\^(\d+)\]/g,
    (_, id) =>
      `<sup class="footnote-ref"><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`,
  );
  let parsedHtml = marked.parse(fullText, { gfm: true, breaks: true });

  // 1. 處理新版：替換 [[圖片N]] 佔位符
  const mediaAssets = article.value?.media_assets || [];
  parsedHtml = parsedHtml.replace(
    /src="\[\[圖片(\d+)\]\]"/g,
    (match, orderStr) => {
      const order = parseInt(orderStr);
      const found = mediaAssets.find((m) => m.sort_order === order);
      return found ? `src="${found.image_url}"` : match;
    },
  );

  // 2. 處理舊版：相容舊文章中未帶 http 的純檔名路徑 (直接導向 Cloudinary)
  parsedHtml = parsedHtml.replace(/src="([^"]+)"/g, (match, srcValue) => {
    if (
      srcValue.startsWith("http") ||
      srcValue.startsWith("data:") ||
      srcValue.startsWith("//") ||
      srcValue.startsWith("[[圖片")
    ) {
      return match;
    }
    // 徹底棄用 Supabase Storage，直接使用 Cloudinary URL (假設你舊圖也上傳到 Cloudinary 根目錄或相對應目錄了)
    return `src="https://res.cloudinary.com/nonchurch2025/image/upload/${srcValue}"`;
  });

  return parsedHtml;
});

const footnotesHtml = computed(() => {
  if (!article.value?.footnotes?.length) return "";
  const listItems = article.value.footnotes
    .map(
      (note) =>
        `<li id="footnote-${note.id}"><p>${note.text}<a href="#footnote-ref-${note.id}" class="footnote-backref">↩</a></p></li>`,
    )
    .join("");
  return `<div class="footnotes"><hr /><ol>${listItems}</ol></div>`;
});

const keywordContent = computed(() => {
  if (!displayArticle.value?.keyword) return "";
  const kw = displayArticle.value.keyword;
  // 若 keyword 欄位已含前綴（舊文章）則直接解析；否則補上前綴
  const hasPrefix = /🌿|關鍵字/.test(kw);
  return marked.parse(hasPrefix ? kw : `🌿 **關鍵字：** ${kw}`);
});
</script>

<template>
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
        v-if="displayArticle.category"
        class="featured-box"
        :style="{ backgroundColor: categoryColor }"
      >
        {{ translatedCategory }}
      </div>
      <h1
        class="main-title"
        v-html="formatTextWithFootnote(displayArticle.title)"
      ></h1>
      <h1
        v-if="displayArticle.subtitle"
        class="sub-title"
        v-html="'──' + formatTextWithFootnote(displayArticle.subtitle)"
      ></h1>
    </div>

    <div v-if="showTranslationHint && t.browserTrans" class="translation-hint">
      🌐 {{ t.browserTrans }}
    </div>

    <div class="divider-thick"></div>
    <div class="divider-gap"></div>
    <div class="divider-thin"></div>

    <div class="author-info">
      <p class="author-name">
        <span v-html="formatTextWithFootnote(displayArticle.author)"></span>
        <span
          class="author-title"
          v-html="formatTextWithFootnote(displayArticle.authorTitle)"
        ></span>
        <span
          v-if="displayArticle.remark"
          class="author-remark"
          v-html="formatTextWithFootnote(displayArticle.remark)"
        ></span>
      </p>
    </div>

    <div
      v-if="displayArticle.keyword"
      class="keyword-section"
      v-html="keywordContent"
    ></div>

    <div v-if="displayArticle.type === 'special' && currentSpecialComponent">
      <br />
      <div v-if="htmlContent" class="audiobook-intro">
        <div class="markdown-body" v-html="htmlContent"></div>
      </div>
      <ClientOnly>
        <component :is="currentSpecialComponent" :article="displayArticle" />
      </ClientOnly>
      <div
        v-if="footnotesHtml"
        class="markdown-body"
        v-html="footnotesHtml"
      ></div>
    </div>

    <div v-else>
      <br />
      <div class="markdown-body" v-html="htmlContent"></div>
      <div
        v-if="footnotesHtml"
        class="markdown-body"
        v-html="footnotesHtml"
      ></div>
    </div>

    <div class="article-navigation">
      <div class="nav-item">
        <template v-if="displayArticle.displayPrev">
          <strong>{{ t.prev }}</strong>
          <NuxtLink
            :to="`/articles/${displayArticle.displayPrev.id}`"
            @click="handleNavClick"
          >
            {{ displayArticle.displayPrev.title }}
          </NuxtLink>
        </template>
      </div>
      <div class="nav-item">
        <strong>{{ t.backToToc }}</strong>
        <NuxtLink :to="issueLinkParams" @click="handleNavClick">
          {{ t.issuePrefix }}{{ displayArticle.issue }}{{ t.issueSuffix
          }}{{ displayArticle.issueTitle }}
        </NuxtLink>
      </div>
      <div class="nav-item">
        <template v-if="displayArticle.displayNext">
          <strong>{{ t.next }}</strong>
          <NuxtLink
            :to="`/articles/${displayArticle.displayNext.id}`"
            @click="handleNavClick"
          >
            {{ displayArticle.displayNext.title }}
          </NuxtLink>
        </template>
      </div>
    </div>
  </article>
</template>

<style scoped>
.audiobook-intro {
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px dashed #ccc;
}
.translation-hint {
  background: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 1rem;
}
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
  line-height: 1.5;
}
.author-name {
  font-size: 1.2rem;
  color: #444;
}
/* 讓作者名稱的 span 也以 block 呈現，與下方欄位行距一致 */
.author-name > span:first-child {
  display: block;
}
.author-title {
  display: block;
  font-size: 1.2rem;
  color: #444;
  margin-top: 0.6rem;
}
.author-remark {
  display: block;
  font-size: 1.2rem;
  color: #444;
  margin-top: 0.6rem;
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
    content: "...";
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
}
:deep(.footnotes li p) {
  margin: 0;
  text-indent: 0 !important;
  flex-grow: 1;
  padding-left: 10px;
  color: #444;
  text-align: justify;
  word-break: break-word;
}
:deep(.footnotes .footnote-backref) {
  text-decoration: none;
  color: #007bff;
  margin-left: 5px;
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
    font-size: 2rem;
    clear: both;
    padding-left: 0;
  }
  .sub-title {
    font-size: 1.5rem;
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
}
</style>
