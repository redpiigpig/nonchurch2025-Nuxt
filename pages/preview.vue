<script setup>
import { ref, computed, onMounted } from "vue";
import { marked } from "marked";
import markedFootnote from "marked-footnote";
import { supabase } from "~/supabase";

marked.use(markedFootnote({ prefixId: "footnote-" }));

const article = ref(null);
const loading = ref(true);
const issueImages = ref([]);

const fetchIssueImages = async (issueNumber) => {
  if (!issueNumber) return;
  const path = `articles/issue-${issueNumber}`;
  const { data, error } = await supabase.storage.from("images").list(path, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });

  if (!error && data) issueImages.value = data;
};

useSeoMeta({
  title: () =>
    article.value ? `[預覽] ${article.value.title} - 無境界者雜誌` : "預覽中 - 無境界者雜誌",
  ogTitle: () => (article.value ? `[預覽] ${article.value.title}` : "文章預覽"),
  description: () =>
    article.value?.summary || "無境界者雜誌文章預覽頁。",
  ogDescription: () =>
    article.value?.summary || "無境界者雜誌文章預覽頁。",
  ogImage: () =>
    article.value?.seo_image ||
    article.value?.cover_image ||
    "https://pottupypvdzamztdhsah.supabase.co/storage/v1/object/public/images/system/default-seo.jpg",
  twitterCard: "summary_large_image",
});

onMounted(async () => {
  loading.value = true;
  try {
    const localData = localStorage.getItem("preview_article");
    if (!localData) {
      article.value = null;
      return;
    }

    article.value = JSON.parse(localData);
    if (article.value?.issue) await fetchIssueImages(article.value.issue);
  } catch {
    article.value = null;
  } finally {
    loading.value = false;
  }
});

const formatTextWithFootnote = (text) => {
  if (!text) return "";
  return text.replace(/\[\^(\d+)\]/g, (match, id) => {
    return `<sup class="footnote-ref"><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`;
  });
};

const htmlContent = computed(() => {
  if (!article.value?.content) return "";
  let fullText = article.value.content;

  fullText = fullText.replace(/\[\^(\d+)\]/g, (match, id) => {
    return `<sup class="footnote-ref"><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`;
  });

  let parsedHtml = marked.parse(fullText, { gfm: true, breaks: true });

  parsedHtml = parsedHtml.replace(/src="([^"]+)"/g, (match, srcValue) => {
    if (
      srcValue.startsWith("http") ||
      srcValue.startsWith("data:") ||
      srcValue.startsWith("//")
    ) {
      return match;
    }

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

  if (article.value.footnotes?.length > 0) {
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
  if (!article.value?.keyword) return "";
  return marked.parse(article.value.keyword);
});

const categoryColor = computed(() => {
  if (!article.value?.category) return "#ff8000";
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
</script>

<template>
  <div v-if="loading" class="loading-state">
    正在載入預覽內容 🕊️<span class="loading-dots"></span>
  </div>

  <div v-else-if="!article" class="not-found">
    <h2>找不到預覽內容😖</h2>
    <p>請先回到後台編輯器，按一次「預覽頁面」。</p>
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
  </article>
</template>

<style scoped>
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
}
.author-name,
.author-title,
.author-remark {
  font-size: 1.2rem;
  color: #444;
}
.author-title,
.author-remark {
  display: block;
  margin-top: 4px;
}
.not-found {
  text-align: center;
  padding: 60px;
  color: #666;
}
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  font-size: 2.2rem;
  color: #888;
  font-family: "Times New Roman", serif;
  font-weight: bold;
}
.loading-dots::after {
  content: "";
  animation: dots-cycle 2s infinite steps(1);
}
@keyframes dots-cycle {
  0% { content: ""; }
  15% { content: "."; }
  30% { content: ".."; }
  45% { content: "..."; }
  60% { content: "...."; }
  75% { content: "....."; }
  90% { content: "......"; }
}
</style>
