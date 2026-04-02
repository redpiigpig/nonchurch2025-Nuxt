<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";

useHead({
  title: "編輯者登入 - 無境界者雜誌",
});

const email = ref("");
const password = ref("");
const loading = ref(false);
const router = useRouter();
const route = useRoute();

// ✅ 使用 Nuxt Supabase composable，確保 Cookie session 同步
const supabase = useSupabaseClient();

const handleLogin = async () => {
  loading.value = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) throw error;

    const redirectPath = route.query.redirect || "/admin";
    router.push(redirectPath);
  } catch (error) {
    alert("登入失敗：" + error.message);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h2>編輯者登入</h2>
      <input v-model="email" type="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />
      <button @click="handleLogin" :disabled="loading">
        {{ loading ? "登入中..." : "登入" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
}
.login-box {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 40px;
  background: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  width: 300px;
}
input {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}
button {
  padding: 10px;
  background: #333;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
button:disabled {
  background: #999;
}
</style>
