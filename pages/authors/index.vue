<script setup>
import { ref, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import MainLayout from "~/components/MainLayout.vue";
import { supabase } from "~/supabase";
import { useEditorMode } from "~/composables/useEditorMode";

// 設定頁面 Meta (SEO)
useHead({
  title: "專欄作者 - 無境界者雜誌",
  meta: [
    {
      name: "description",
      content: "無境界者雜誌專欄作者列表，匯集多元觀點的信仰論述。",
    },
    { property: "og:title", content: "專欄作者 - 無境界者雜誌" },
    {
      property: "og:description",
      content: "無境界者雜誌專欄作者列表，匯集多元觀點的信仰論述。",
    },
  ],
});

const { isEditor } = useEditorMode();
const route = useRoute();
const router = useRouter();

const yearOptions = [
  { value: 2026, label: "2026 年專欄作者" },
  { value: 2025, label: "2025 年專欄作者" },
];

// 1. 初始化年份：優先讀取網址參數，否則預設 2025
const initialYear = parseInt(route.query.year);
const isValidYear = yearOptions.some((opt) => opt.value === initialYear);
const selectedYear = ref(isValidYear ? initialYear : 2025);

// ----------------------------------------------------------------
// 2. SSR 資料獲取 + 隨機排序 (核心改動)
// ----------------------------------------------------------------
const {
  data: randomizedAuthors,
  pending: isLoading,
  refresh,
} = await useAsyncData(
  `authors-list-${selectedYear.value}-${isEditor.value}`, // Cache Key 包含年份和編輯狀態
  async () => {
    // A. 查詢資料
    let query = supabase
      .from("authors")
      .select("*")
      .order("id", { ascending: true });

    // 如果不是編輯模式，只抓已發布的
    if (!isEditor.value) {
      query = query.eq("is_published", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    // B. 過濾年份
    const filtered = data.filter(
      (a) => a.years && a.years.includes(selectedYear.value)
    );

    // C. 隨機排序 (在伺服器端就排好，傳給瀏覽器直接用，避免不一致)
    const newArr = [...filtered];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }

    return newArr;
  },
  {
    watch: [selectedYear, isEditor], // 當年份或編輯模式改變時，自動重新抓取
  }
);

// ----------------------------------------------------------------
// 3. 監聽與互動
// ----------------------------------------------------------------
watch(selectedYear, (newVal) => {
  // 更新網址，但不需手動呼叫 refresh，因為 useAsyncData 已經 watch 了 selectedYear
  router.replace({ query: { ...route.query, year: newVal } });
});
</script>

<template>
  <MainLayout>
    <div class="authors-page">
      <h1 class="page-main-title">
        <span class="emoji">✍️</span>專欄作者<span class="emoji">✍️</span>
      </h1>

      <div class="main-divider"></div>

      <div class="year-selector-wrapper">
        <label for="year-select">選擇年份：</label>
        <div class="custom-select">
          <select id="year-select" v-model="selectedYear">
            <option
              v-for="item in yearOptions"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
          <span class="arrow">▼</span>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <p>正在載入作者資料...</p>
      </div>

      <div
        v-else-if="!randomizedAuthors || randomizedAuthors.length === 0"
        class="no-data"
      >
        <p>尚無 {{ selectedYear }} 年的專欄作者資料，敬請期待。🥺</p>
      </div>

      <div v-else class="authors-list">
        <div
          v-for="author in randomizedAuthors"
          :key="author.id"
          class="author-box"
        >
          <div v-if="isEditor && !author.is_published" class="draft-badge">
            隱藏中
          </div>

          <div class="author-info">
            <div
              class="author-image"
              :style="{ backgroundImage: `url(${author.author_image})` }"
              role="img"
              :aria-label="author.name"
            ></div>
            <h2>{{ author.name }}</h2>
          </div>

          <div class="author-bio">
            <p>{{ author.bio }}</p>
            <NuxtLink :to="`/authors/${author.name}`" class="read-more-btn">
              閱讀此作者文章
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
/* 這裡請直接貼上你原本檔案中的 CSS，完全不需要改動 */
.loading-state {
  text-align: center;
  font-size: 1.2rem;
  color: #666;
  margin: 40px 0;
}
.authors-list {
  max-width: 1100px;
  margin: 0 auto;
}
.author-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px auto;
  padding: 30px;
  background-color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  max-width: 900px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
}
.author-box:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  background-color: rgba(255, 255, 255, 0.9);
}
.draft-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #999;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  z-index: 10;
}
.author-info {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.author-image {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  margin-right: 20px;
  background-color: #e0e0e0;
  background-size: cover;
  background-position: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.author-info h2 {
  font-size: 1.5rem;
  margin: 0;
  color: #333;
  padding-right: 40px;
  font-weight: bold;
  font-family: "Times New Roman", serif;
  white-space: nowrap;
}
.author-bio {
  flex: 1;
  text-align: left;
  position: relative;
  padding-bottom: 25px;
  min-height: 80px;
}
.author-bio p {
  margin: 0 0 10px;
  color: #555;
  line-height: 1.6;
  font-family: serif;
  font-size: 1.15rem;
  text-align: justify;
  white-space: pre-line;
}
.read-more-btn {
  position: absolute;
  bottom: -5px;
  right: 0;
  color: #4caf50;
  text-decoration: none;
  font-weight: bold;
  font-family: "Times New Roman", serif;
  transition: color 0.3s;
}
.read-more-btn:hover {
  color: #2e7d32;
  text-decoration: underline;
}
@media (max-width: 768px) {
  .author-box {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px;
  }
  .author-info {
    flex-direction: column;
    align-items: center;
    margin-bottom: 1rem;
    width: 100%;
    border-bottom: 1px dashed #ccc;
    padding-bottom: 1rem;
  }
  .author-image {
    width: 160px;
    height: 160px;
    margin-right: 0;
    margin-bottom: 10px;
  }
  .author-info h2 {
    padding-right: 0;
    font-size: 1.6rem;
    white-space: normal;
  }
  .author-bio {
    width: 100%;
    text-align: left;
    padding-bottom: 0;
    min-height: auto;
  }
  .read-more-btn {
    position: static;
    display: block;
    margin-top: 1rem;
    text-align: right;
    font-size: 1.1rem;
  }
}
</style>
