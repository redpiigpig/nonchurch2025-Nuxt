<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useEditorMode } from "~/composables/useEditorMode";
import { useLanguage } from "~/composables/useLanguage";
import { cloudinaryUrl, CLD } from "~/utils/cloudinary";

const route = useRoute();
const { isEditor } = useEditorMode();
const { currentLang } = useLanguage();
const isEditMode = computed(() => isEditor.value);

const navTranslations = {
  "zh-TW": {
    home: "首頁",
    magazine: "雜誌資訊",
    magazineAbout: "認識無境界者",
    magazineMission: "使命宣言",
    magazinePublication: "刊物資訊",
    magazineFinance: "財務資訊",
    articles: "文章列表",
    authors: "專欄作者",
    subscribe: "雜誌訂閱",
    subscribeOnline: "線上訂閱",
    subscribePrint: "紙本訂閱",
    submit: "投稿資訊",
  },
  "zh-HK": {
    home: "首頁",
    magazine: "雜誌資訊",
    magazineAbout: "認識無境界者",
    magazineMission: "使命宣言",
    magazinePublication: "刊物資訊",
    magazineFinance: "財務資訊",
    articles: "文章列表",
    authors: "專欄作者",
    subscribe: "雜誌訂閱",
    subscribeOnline: "網上訂閱",
    subscribePrint: "紙本訂閱",
    submit: "投稿資訊",
  },
  "zh-CN": {
    home: "首页",
    magazine: "杂志资讯",
    magazineAbout: "认识无境界者",
    magazineMission: "使命宣言",
    magazinePublication: "刊物资讯",
    magazineFinance: "财务资讯",
    articles: "文章列表",
    authors: "专栏作者",
    subscribe: "杂志订阅",
    subscribeOnline: "在线订阅",
    subscribePrint: "纸本订阅",
    submit: "投稿资讯",
  },
  en: {
    home: "Home",
    magazine: "About",
    magazineAbout: "About Us",
    magazineMission: "Mission",
    magazinePublication: "Publication",
    magazineFinance: "Finance",
    articles: "Articles",
    authors: "Authors",
    subscribe: "Subscribe",
    subscribeOnline: "Online",
    subscribePrint: "Print",
    submit: "Submission",
  },
  ja: {
    home: "ホーム",
    magazine: "雑誌情報",
    magazineAbout: "無境界者について",
    magazineMission: "ミッション",
    magazinePublication: "刊行情報",
    magazineFinance: "財務情報",
    articles: "記事一覧",
    authors: "執筆者",
    subscribe: "購読",
    subscribeOnline: "オンライン購読",
    subscribePrint: "紙面購読",
    submit: "投稿情報",
  },
  ko: {
    home: "홈",
    magazine: "잡지 정보",
    magazineAbout: "무경계자 소개",
    magazineMission: "미션",
    magazinePublication: "간행물 정보",
    magazineFinance: "재무 정보",
    articles: "기사 목록",
    authors: "필진",
    subscribe: "구독",
    subscribeOnline: "온라인 구독",
    subscribePrint: "인쇄본 구독",
    submit: "투고 안내",
  },
};

const t = computed(
  () => navTranslations[currentLang.value] || navTranslations["zh-TW"],
);

// 導覽列連結生成器：前台維持原樣，後台加 /admin
// 前台路徑 → 後台對應路徑（非直接加 /admin 的特殊情況）
const adminPathMap = {
  "/subscribe": "/admin/subscribers_manager",
  "/subscribe-print": "/admin/subscribers_manager",
};

const getLink = (path) => {
  // 如果是首頁且在編輯模式，導向 /admin/home
  if (path === "/home" || path === "/") {
    return isEditMode.value ? "/admin/home" : "/";
  }
  if (isEditMode.value) {
    return adminPathMap[path] ?? `/admin${path}`;
  }
  return path;
};

// ⭐ 鏡像切換按鈕邏輯
const editLink = computed(() => {
  const currentPath = route.path;

  // A. 文章詳情 -> 編輯器
  if (!isEditMode.value && route.name === "articles-id" && route.params.id) {
    return `/admin/editor/${route.params.id}`;
  }
  // B. 編輯器 -> 文章詳情
  if (isEditMode.value && route.path.includes("admin/editor")) {
    return route.params.id ? `/articles/${route.params.id}` : "/articles";
  }
  // B2. 校對頁 -> 文章詳情
  if (isEditMode.value && route.path.includes("admin/proofread")) {
    return route.params.id ? `/articles/${route.params.id}` : "/articles";
  }

  // C. 一般頁面切換
  if (isEditMode.value) {
    // 後台 -> 前台 (移除 /admin)
    return (
      currentPath.replace(/^\/admin\/home/, "/").replace(/^\/admin/, "") || "/"
    );
  } else {
    // 前台 -> 後台 (首頁去 /admin/home，其他加 /admin)
    if (currentPath === "/") return "/admin/home";
    // 沒有對應後台頁面的前台路徑 → 導向後台首頁
    // 前台路徑 → 對應後台路徑（不是直接加 /admin 的特殊情況）
    const specialMap = {
      "/subscribe": "/admin/subscribers_manager",
    };
    if (specialMap[currentPath]) return specialMap[currentPath];

    const noAdminCounterpart = ["/submission", "/login", "/preview"];
    if (noAdminCounterpart.some((p) => currentPath.startsWith(p))) return "/admin";
    return `/admin${currentPath}`;
  }
});
</script>

<template>
  <header :class="['header', { 'editor-header': isEditMode }]">
    <nav class="nav">
      <div class="logo">
        <NuxtLink :to="isEditMode ? '/admin/home' : '/'">
          <img
            :src="cloudinaryUrl('https://res.cloudinary.com/nonchurch2025/image/upload/Header_Logo.png', CLD.logoIcon)"
            alt="無境界者雜誌 Logo"
            width="60"
            height="65"
            class="logo-icon"
            fetchpriority="high"
          />
          <img
            :src="cloudinaryUrl('https://res.cloudinary.com/nonchurch2025/image/upload/Header_text.png', CLD.logoText)"
            alt="無境界者"
            width="180"
            height="65"
            class="logo-text"
            fetchpriority="high"
          />
        </NuxtLink>
      </div>

      <!-- 後台管理獨立於 menu 之外，緊貼 logo 右側，不壓縮導覽列空間 -->
      <NuxtLink v-if="isEditMode" to="/admin" class="admin-link"
        >⚙️ 後台管理</NuxtLink
      >

      <div class="menu">
        <NuxtLink :to="getLink('/home')">{{ t.home }}</NuxtLink>
        <div class="nav-dropdown">
          <span class="nav-dropdown-label">{{ t.magazine }}</span>
          <div class="nav-dropdown-menu">
            <NuxtLink :to="getLink('/about')">{{ t.magazineAbout }}</NuxtLink>
            <NuxtLink :to="getLink('/mission')">{{ t.magazineMission }}</NuxtLink>
            <NuxtLink :to="getLink('/publication')">{{ t.magazinePublication }}</NuxtLink>
            <NuxtLink :to="getLink('/finance')">{{ t.magazineFinance }}</NuxtLink>
          </div>
        </div>
        <NuxtLink :to="getLink('/articles')">{{ t.articles }}</NuxtLink>
        <NuxtLink :to="getLink('/authors')">{{ t.authors }}</NuxtLink>
        <div class="nav-dropdown">
          <span class="nav-dropdown-label">{{ t.subscribe }}</span>
          <div class="nav-dropdown-menu">
            <NuxtLink :to="getLink('/subscribe')">{{ t.subscribeOnline }}</NuxtLink>
            <NuxtLink :to="getLink('/subscribe-print')">{{ t.subscribePrint }}</NuxtLink>
          </div>
        </div>
        <NuxtLink :to="getLink('/submit')">{{ t.submit }}</NuxtLink>

        <div class="lang-switcher">
          <select v-model="currentLang" class="lang-select" aria-label="選擇語言">
            <option value="default">🌐 繁體中文</option>
            <option value="zh-HK">🌐 港澳粵語</option>
            <option value="zh-CN">🌐 中国简体</option>
            <option value="en">🌐 English</option>
            <option value="ja">🌐 日本語</option>
            <option value="ko">🌐 한국어</option>
          </select>
        </div>

        <NuxtLink :to="getLink('/search')" class="search-icon-btn" title="搜尋">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </NuxtLink>
      </div>
    </nav>

    <NuxtLink
      :to="editLink"
      class="header-edit-btn"
      :title="isEditMode ? '返回前台' : '進入編輯模式'"
    >
      {{ isEditMode ? "🌏" : "✎" }}
    </NuxtLink>
  </header>
</template>

<style scoped>
/* 完全沿用您上傳的 AppHeader.vue CSS */
*,
*::before,
*::after {
  box-sizing: border-box;
}
.header {
  background: linear-gradient(
    135deg,
    rgba(76, 175, 80, 0.95),
    rgba(129, 199, 132, 0.95)
  );
  height: 120px;
  width: 100%;
  padding: 0 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: all 0.3s ease;
  font-size: 20px;
  display: flex;
  align-items: center;
}

.header.editor-header {
  background: linear-gradient(135deg, #2c3e50, #4ca1af);
  padding-left: calc(20px);
}

.header:not(.editor-header) .nav {
  margin-left: 130px;
}


.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto 0 40px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-right: 40px;
}
.logo a {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo-icon {
  width: 60px;
  height: 65px;
  object-fit: contain;
  object-position: center;
  display: block;
  flex-shrink: 0;
}
.logo-text {
  width: 180px;
  height: 65px;
  object-fit: contain;
  object-position: center;
  display: block;
  flex-shrink: 0;
}
.editor-badge {
  color: #f1c40f;
  font-weight: bold;
  font-size: 0.9rem;
  border: 1px solid #f1c40f;
  padding: 2px 5px;
  border-radius: 4px;
  margin-left: 5px;
  align-self: start;
  margin-top: 4px;
  white-space: nowrap;
}

.menu {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-right: 2rem;
}

.editor-header .menu {
  margin-right: -2rem;
}
.menu a {
  text-decoration: none;
  color: white;
  padding: 5px 10px;
  transition: all 0.3s ease;
  border-radius: 5px;
  white-space: nowrap;
  letter-spacing: 0.08em;
}

.menu a:hover {
  color: #1b5e20;
}
.lang-switcher {
  margin-left: 0.5rem;
}
.lang-select {
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
}
.lang-select option {
  color: #111;
}
.admin-link {
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: bold;
  text-decoration: none;
  color: white;
  padding: 5px 12px;
  border-radius: 5px;
  transition: all 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.admin-link:hover {
  color: #1b5e20;
}

/* ── 雜誌訂閱下拉選單 ── */
.nav-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.nav-dropdown-label {
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  white-space: nowrap;
  letter-spacing: 0.08em;
  cursor: default;
  transition: color 0.3s ease;
  user-select: none;
}
.nav-dropdown:hover .nav-dropdown-label {
  color: #1b5e20;
}
.nav-dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  min-width: 120px;
  padding: 6px 0;
  z-index: 200;
  flex-direction: column;
}
.nav-dropdown:hover .nav-dropdown-menu {
  display: flex;
}
.nav-dropdown-menu a {
  color: #2c3e50 !important;
  padding: 9px 18px !important;
  border-radius: 0 !important;
  white-space: nowrap;
  font-size: 0.95rem;
  background: transparent !important;
  text-align: center;
}
.nav-dropdown-menu a:hover {
  color: #4caf50 !important;
  background: #f5faf5 !important;
}

@media (max-width: 768px) {
  .nav-dropdown {
    gap: 4px;
  }
  .nav-dropdown-label {
    display: none;
  }
  .nav-dropdown-menu {
    display: flex !important;
    position: static;
    transform: none;
    background: transparent;
    box-shadow: none;
    min-width: unset;
    padding: 0;
    flex-direction: row;
    gap: 6px;
  }
  .nav-dropdown-menu a {
    color: white !important;
    padding: 6px 10px !important;
    background: rgba(255,255,255,0.15) !important;
    border-radius: 15px !important;
    font-size: 0.95rem;
  }
  .nav-dropdown-menu a:hover {
    color: #1b5e20 !important;
    background: rgba(255,255,255,0.25) !important;
  }
}

.search-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px !important;
}
.search-icon-btn svg {
  width: 22px;
  height: 22px;
}

.header-edit-btn {
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  text-decoration: none;
  font-size: 1.2rem;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  transition: all 0.3s ease;
  z-index: 100;
}
.header-edit-btn:hover {
  background-color: #007bff;
  transform: translateY(-50%) scale(1.1);
}
@media (max-width: 1024px) {
  .menu {
    gap: 10px;
    margin-right: 3rem;
  }
}
@media (max-width: 768px) {
  .header {
    height: auto;
    padding: 10px 15px;
    font-size: 16px;
    display: block;
    position: sticky;
    top: 0;
  }
  .header.editor-header {
    padding-left: 15px;
  }
  .nav {
    flex-direction: column;
    align-items: flex-start;
    margin: 0;
  }
  .header:not(.editor-header) .nav {
    margin-left: 0;
  }
  .logo {
    margin-bottom: 5px;
  }
  .logo-icon {
    width: 50px;
    height: 50px;
    margin-right: -10px;
  }
  .logo-text {
    width: 140px;
    height: 45px;
  }
  .menu {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 10px;
    margin-top: 5px;
    padding-bottom: 5px;
    width: 100%;
    margin-right: 0;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .menu::-webkit-scrollbar {
    display: none;
  }
  .menu a {
    flex: 0 0 auto;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 15px;
    font-size: 0.95rem;
  }
  .header-edit-btn {
    top: 30%;
  }
}
</style>
