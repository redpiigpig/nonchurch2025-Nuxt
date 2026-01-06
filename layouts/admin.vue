<script setup>
import { useRouter } from "vue-router";
import { supabase } from "~/supabase";

const router = useRouter();

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/login");
};
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="logo">無境界者 後台</div>
      <nav>
        <NuxtLink to="/admin" exact-active-class="active-link">
          🚀 期刊發布中心
        </NuxtLink>
        <NuxtLink to="/admin/issues_manager" active-class="active-link">
          📅 期刊主題管理
        </NuxtLink>
        <NuxtLink to="/admin/authors_manager" active-class="active-link">
          🧑‍🏫 作者管理
        </NuxtLink>
        <NuxtLink to="/admin/articles_manager" active-class="active-link">
          📚 文章管理
        </NuxtLink>
        <NuxtLink to="/admin/media_manager" active-class="active-link">
          🖼️ 媒體庫管理
        </NuxtLink>
        <NuxtLink to="/admin/editor" active-class="active-link">
          📝 新增文章
        </NuxtLink>
      </nav>

      <div class="bottom-actions">
        <NuxtLink to="/admin/home" class="btn-home">🏠 回前台預覽</NuxtLink>
        <button @click="handleLogout" class="btn-logout">登出</button>
      </div>
    </aside>

    <main class="content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
/* 樣式直接沿用 AdminLayout.vue */
.admin-layout {
  display: flex;
  min-height: 100vh;
  font-family: sans-serif;
}
.sidebar {
  width: 250px;
  background: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  padding: 140px 20px 20px 20px;
  z-index: 900;
  overflow-y: auto;
}
.logo {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 30px;
  text-align: center;
  border-bottom: 1px solid #34495e;
  padding-bottom: 20px;
}
nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}
nav a {
  color: #b8c7ce;
  text-decoration: none;
  padding: 12px 15px;
  border-radius: 5px;
  transition: 0.3s;
}
nav a:hover,
.active-link {
  background: #1a252f !important;
  color: white !important;
}
.bottom-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.btn-home {
  text-align: center;
  background: #34495e;
  color: white;
  text-decoration: none;
  padding: 10px;
  border-radius: 5px;
}
.btn-logout {
  padding: 10px;
  background: #c0392b;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}
.btn-logout:hover {
  background: #e74c3c;
}
.content {
  flex: 1;
  padding: 40px;
  background: #f4f6f9;
  margin-left: 250px;
  min-height: 100vh;
}
@media (max-width: 768px) {
  .admin-layout {
    flex-direction: column;
  }
  .sidebar {
    position: static;
    width: 100%;
    height: auto;
    top: auto;
    padding: 20px;
    flex-direction: column;
  }
  .logo {
    display: none;
  }
  .content {
    margin-left: 0;
    padding: 20px;
  }
}
</style>
