<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useEditorMode } from "../composables/useEditorMode";

const route = useRoute();
const { isEditor } = useEditorMode();
const isEditMode = computed(() => isEditor.value);

const getLink = (path) => {
  if (isEditMode.value) {
    return `/admin${path}`;
  }
  return path;
};

const editLink = computed(() => {
  const currentPath = route.path;
  if (!isEditMode.value && route.name === "article-detail" && route.params.id) {
    return `/admin/editor/${route.params.id}`;
  }
  if (
    isEditMode.value &&
    (route.name === "admin-editor-edit" || route.name === "admin-editor-new")
  ) {
    return route.params.id ? `/articles/${route.params.id}` : "/articles";
  }
  if (isEditMode.value) {
    return currentPath.replace(/^\/admin/, "") || "/";
  } else {
    return currentPath === "/" ? "/admin/home" : `/admin${currentPath}`;
  }
});
</script>

<template>
  <header :class="['header', { 'editor-header': isEditMode }]">
    <nav class="nav">
      <div class="logo">
        <NuxtLink :to="isEditMode ? '/admin/home' : '/'">
          <img
            src="https://pottupypvdzamztdhsah.supabase.co/storage/v1/object/public/images/system/Header_Logo.png"
            alt="Logo"
            class="logo-icon"
          />
          <img
            src="https://pottupypvdzamztdhsah.supabase.co/storage/v1/object/public/images/system/Header_text.png"
            alt="無境界者"
            class="logo-text"
          />
          <span v-if="isEditMode" class="editor-badge">編輯模式</span>
        </NuxtLink>
      </div>

      <div class="menu">
        <NuxtLink v-if="isEditMode" to="/admin" class="admin-link"
          >⚙️ 後台管理</NuxtLink
        >

        <NuxtLink :to="getLink('/')">首頁</NuxtLink>
        <NuxtLink :to="getLink('/mission')">使命宣言</NuxtLink>
        <NuxtLink :to="getLink('/articles')">文章列表</NuxtLink>
        <NuxtLink :to="getLink('/authors')">專欄作者</NuxtLink>
        <a href="https://forms.gle/aWSBFRfQ74QY13nw8" target="_blank"
          >線上訂閱</a
        >
        <NuxtLink :to="getLink('/submit')">投稿資訊</NuxtLink>

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
/* 樣式保持原樣，直接貼上 */
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
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.logo a {
  display: flex;
  align-items: center;
  text-decoration: none;
}
.logo-icon {
  width: 70px;
  height: 70px;
  object-fit: contain;
  margin-right: -20px;
}
.logo-text {
  width: 200px;
  height: 60px;
  object-fit: contain;
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
  margin-top: 10px;
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
}
.menu a:hover {
  color: #1b5e20;
}
.menu a.router-link-active {
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: bold;
}
.admin-link {
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: bold;
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
