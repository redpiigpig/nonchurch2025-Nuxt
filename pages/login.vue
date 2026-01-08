<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
// ❌ 移除這行： import { supabase } from "~/supabase";

// 設定頁面標題
useHead({
  title: "編輯者登入 - 無境界者雜誌",
});

const email = ref("");
const password = ref("");
const loading = ref(false);
const router = useRouter();
const route = useRoute();

// ✅ 改用這個：Nuxt 會自動處理 Cookie 同步
const supabase = useSupabaseClient();

const handleLogin = async () => {
  loading.value = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) throw error;

    // 登入成功
    // 這裡不需要 alert，直接跳轉體驗較好
    const redirectPath = route.query.redirect || "/admin";
    router.push(redirectPath);
  } catch (error) {
    alert("登入失敗：" + error.message);
  } finally {
    loading.value = false;
  }
};
</script>
