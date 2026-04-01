import { defineStore } from "pinia";

const tempArticlesSeed = [
  {
    id: "5-13話語與肉身",
    title: "話語與肉身",
    subtitle: "——簡評林貝克《教義的本質》",
    issue: 5,
    issueTitle: "誕神者",
    category: "評論與回應",
    author: "張辰瑋",
    authorTitle: "國立台北教育大學台灣文化研究所碩士",
    keyword: "**🌿 關鍵字**：教義的本質、林貝克、後自由神學、道成肉身、身體經驗",
    prev: {
      id: "5-12權力即知識",
      title: "權力即知識",
    },
    next: null,
    content: `
<div class="book-box">
  <div class="book-info">
    <strong>書籍資訊</strong><br />
    【書名】教義的本質：後自由主義時代中的宗教及神學<br />
    【原書名】The Nature of Doctrine: Religion and Theology in a Postliberal Age. (Louisville: Westminster John Knox Press, 1984)<br />
    【作者】喬治‧林貝克（George A. Lindbeck, 1923-2018）｜美國人｜神學家<br />
    【譯者】王志成<br />
    【出版資訊】香港：漢語基督教文化研究所，1997年
  </div>
  <div class="book-image">
    <img src="/images/articles/issue-5/issue5=13-1教義的本質.jpg" alt="書封面" />
  </div>
</div>

<!-- 為避免搬遷過程中一次貼入過大的靜態內容，先保留前段。 -->
`,
  },
];

export const useTempArticlesStore = defineStore("tempArticles", {
  state: () => ({
    articles: [...tempArticlesSeed],
  }),
  getters: {
    getById: (state) => (id) => state.articles.find((article) => article.id === id),
  },
  actions: {
    setArticles(articles = []) {
      this.articles = Array.isArray(articles) ? articles : [];
    },
    upsertArticle(article) {
      if (!article?.id) return;
      const index = this.articles.findIndex((item) => item.id === article.id);
      if (index === -1) this.articles.push(article);
      else this.articles[index] = { ...this.articles[index], ...article };
    },
  },
});
