<template>
  <div class="admin-wrapper">
    <AppHeader />

    <div class="admin-layout">
      <aside class="sidebar">
        <div class="logo">無境界者 後台</div>
        <nav>
          <NuxtLink
            to="/admin"
            :class="['', isIssuesPage ? 'active-link' : '']"
            exact-active-class="active-link"
          >
            📅 期刊管理
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
          <NuxtLink to="/admin/submissions_manager" active-class="active-link">
            📥 投稿管理
          </NuxtLink>
          <NuxtLink to="/admin/finance" active-class="active-link">
            💰 財務管理
          </NuxtLink>
          <NuxtLink to="/admin/editor" active-class="active-link">
            📝 新增文章
          </NuxtLink>
        </nav>

        <div class="bottom-actions">
          <button @click="handleLogout" class="btn-logout">登出</button>
        </div>
      </aside>

      <main class="content">
        <slot />
      </main>
    </div>

    <AppFooter />

    <ReloginModal />
  </div>
</template>

<script setup>
import { useRouter, useRoute } from "vue-router";
import { computed } from "vue";
import AppHeader from "~/components/AppHeader.vue";
import AppFooter from "~/components/AppFooter.vue";
import ReloginModal from "~/components/ReloginModal.vue";

const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();
const isIssuesPage = computed(() =>
  route.path === "/admin" || route.path === "/admin/issues_manager"
);

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/login");
};
</script>

<style scoped>
.admin-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.admin-layout {
  display: flex;
  flex: 1;
  position: relative;
}

.sidebar {
  width: 250px;
  background: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0; /* 恢復：置頂 */
  height: 100vh; /* 恢復：滿版高度 */
  /* 恢復：原本的 padding 140px，這樣內容才不會被 Header 擋住 */
  padding: 140px 20px 20px 20px;
  z-index: 900; /* 比 Header (1000) 小，所以會被 Header 蓋過去，符合您說的「被覆蓋」 */
  overflow-y: auto;

  /* 新增：隱藏捲軸 */
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

/* 新增：隱藏捲軸 (Chrome, Safari, Opera) */
.sidebar::-webkit-scrollbar {
  display: none;
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
