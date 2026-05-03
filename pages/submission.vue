<script setup>
import { ref, onMounted } from "vue";
import SubmissionForm from "~/components/SubmissionForm.vue";

const supabase = useSupabaseClient();

useHead({ title: "投稿表單 - 無境界者雜誌" });

const currentIssueNumber = ref(null);

onMounted(async () => {
  const { data } = await supabase
    .from("issues")
    .select("id")
    .eq("is_published", false)
    .order("id", { ascending: false })
    .limit(1);

  // 若沒有草稿期，抓最新已發布的
  if (data && data.length > 0) {
    currentIssueNumber.value = data[0].id;
  } else {
    const { data: published } = await supabase
      .from("issues")
      .select("id")
      .eq("is_published", true)
      .order("id", { ascending: false })
      .limit(1);
    if (published && published.length > 0) currentIssueNumber.value = published[0].id;
  }
});
</script>

<template>
  <div class="submission-page">
    <div class="page-title-row">
      <NuxtLink to="/submit" class="back-link">← 返回投稿資訊</NuxtLink>
      <h1 class="page-main-title">
        <span class="emoji">📬</span>投稿表單<span class="emoji">📬</span>
      </h1>
    </div>
    <div class="main-divider"></div>
    <SubmissionForm :issue-number="currentIssueNumber" />
  </div>
</template>

<style scoped>
.submission-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px 60px;
}
.page-title-row {
  text-align: center;
  position: relative;
  padding-top: 10px;
}
.back-link {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  color: #666;
  text-decoration: none;
}
.back-link:hover { color: #333; }
.page-main-title {
  font-size: 2.5rem;
  margin: 0.5rem 0;
}

@media (max-width: 600px) {
  .page-title-row {
    padding-top: 0;
  }
  .back-link {
    position: static;
    display: block;
    transform: none;
    margin-bottom: 10px;
    text-align: left;
  }
  .page-main-title {
    font-size: 1.8rem;
  }
}
.emoji { margin: 0 6px; }
.main-divider {
  width: 100%;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  margin: 16px auto 28px;
}
</style>
