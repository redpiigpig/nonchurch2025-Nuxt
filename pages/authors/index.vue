<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEditorMode } from "~/composables/useEditorMode";
import { useLanguage } from "~/composables/useLanguage";

const supabase = useSupabaseClient();
const { isEditor } = useEditorMode();
const { currentLang } = useLanguage();
const route = useRoute();
const router = useRouter();

// ─── 多語字典 ─────────────────────────────────────────────────────
const authorTranslations = {
  "zh-TW": {
    title: "專欄作者",
    selectYear: "選擇年份：",
    opt2026: "2026 年專欄作者",
    opt2025: "2025 年專欄作者",
    loading: "正在載入作者資料...",
    noData: (y) => `尚無 ${y} 年的專欄作者資料，敬請期待。🥺`,
    hidden: "隱藏中",
    readMore: "閱讀此作者文章",
  },
  "zh-HK": {
    title: "專欄作者",
    selectYear: "揀選年份：",
    opt2026: "2026 年專欄作者",
    opt2025: "2025 年專欄作者",
    loading: "載入緊作者資料...",
    noData: (y) => `仲未有 ${y} 年嘅專欄作者資料，敬請期待。🥺`,
    hidden: "隱藏緊",
    readMore: "閱讀呢位作者嘅文章",
  },
  "zh-CN": {
    title: "专栏作者",
    selectYear: "选择年份：",
    opt2026: "2026 年专栏作者",
    opt2025: "2025 年专栏作者",
    loading: "正在载入作者数据...",
    noData: (y) => `尚无 ${y} 年的专栏作者数据，敬请期待。🥺`,
    hidden: "隐藏中",
    readMore: "阅读此作者文章",
  },
  en: {
    title: "Authors",
    selectYear: "Select Year:",
    opt2026: "2026 Authors",
    opt2025: "2025 Authors",
    loading: "Loading authors...",
    noData: (y) => `No authors for ${y} yet. 🥺`,
    hidden: "Hidden",
    readMore: "Read Articles",
  },
  ja: {
    title: "執筆者",
    selectYear: "年を選択：",
    opt2026: "2026年 執筆者",
    opt2025: "2025年 執筆者",
    loading: "読み込み中...",
    noData: (y) => `${y}年の執筆者はまだいません。🥺`,
    hidden: "非表示",
    readMore: "記事を読む",
  },
  ko: {
    title: "칼럼니스트",
    selectYear: "연도 선택:",
    opt2026: "2026년 칼럼니스트",
    opt2025: "2025년 칼럼니스트",
    loading: "불러오는 중...",
    noData: (y) => `${y}년 작성자가 아직 없습니다. 🥺`,
    hidden: "숨김",
    readMore: "기사 읽기",
  },
};
const t = computed(
  () => authorTranslations[currentLang.value] || authorTranslations["zh-TW"],
);

const yearOptions = computed(() => [
  { value: 2026, label: t.value.opt2026 },
  { value: 2025, label: t.value.opt2025 },
]);

// ─── SEO ─────────────────────────────────────────────────────────
useSeoMeta({
  title: () => t.value.title + " - 無境界者雜誌",
  ogTitle: () => t.value.title + " - 無境界者雜誌",
  description: () =>
    ({
      "zh-TW": "無境界者雜誌專欄作者列表，匯集多元觀點的信仰論述。",
      "zh-HK": "無境界者雜誌專欄作者列表，匯集多元觀點嘅信仰論述。",
      "zh-CN": "无境界者杂志专栏作者列表，汇集多元观点的信仰论述。",
      en: "Authors of Faith Without Boundary.",
      ja: "無境界者雑誌の執筆者一覧。",
      ko: "무경계자 매거진 칼럼니스트 목록.",
    })[currentLang.value] || "無境界者雜誌專欄作者列表",
});

// ─── 資料 ─────────────────────────────────────────────────────────
const selectedYear = ref(2026);
const allAuthors = ref([]);
const randomizedAuthors = ref([]);
const isLoading = ref(true);

const initYear = () => {
  const queryYear = parseInt(route.query.year);
  if (yearOptions.value.some((o) => o.value === queryYear))
    selectedYear.value = queryYear;
};

const fetchAuthors = async () => {
  try {
    isLoading.value = true;
    let query = supabase
      .from("authors")
      .select("*")
      .order("id", { ascending: true });
    if (!isEditor.value) query = query.eq("is_published", true);
    const { data, error } = await query;
    if (error) throw error;
    if (data) {
      allAuthors.value = data;
      updateAuthors();
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    isLoading.value = false;
  }
};

const updateAuthors = () => {
  const filtered = allAuthors.value.filter((a) =>
    a.years?.includes(selectedYear.value),
  );
  const arr = [...filtered];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  randomizedAuthors.value = arr;
};

// displayAuthors：套用 Supabase translations 翻譯
const displayAuthors = computed(() => {
  const langKey =
    currentLang.value === "default"
      ? "zh_TW"
      : currentLang.value.replace("-", "_");
  return randomizedAuthors.value.map((a) => {
    const trans = a.translations?.[langKey] || {};
    return {
      ...a,
      displayName: trans.name || a.name,
      displayBio: trans.bio || a.bio,
    };
  });
});

watch(selectedYear, (v) => {
  router.replace({ query: { ...route.query, year: v } });
  updateAuthors();
});
watch(isEditor, fetchAuthors);

onMounted(() => {
  initYear();
  fetchAuthors();
});
</script>

<template>
  <div class="authors-page">
    <h1 class="page-main-title">
      <span class="emoji">✍️</span>{{ t.title }}<span class="emoji">✍️</span>
    </h1>
    <div class="main-divider"></div>

    <div class="year-selector-wrapper">
      <label for="year-select">{{ t.selectYear }}</label>
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
      <p>{{ t.loading }}</p>
    </div>
    <div v-else-if="displayAuthors.length === 0" class="no-data">
      <p>{{ t.noData(selectedYear) }}</p>
    </div>

    <div v-else class="authors-list">
      <div v-for="author in displayAuthors" :key="author.id" class="author-box">
        <div v-if="isEditor && !author.is_published" class="draft-badge">
          {{ t.hidden }}
        </div>
        <div class="author-info">
          <img
            :src="author.author_image"
            :alt="author.displayName"
            class="author-image"
          />
          <h2>{{ author.displayName }}</h2>
        </div>
        <div class="author-bio">
          <p>{{ author.displayBio }}</p>
          <NuxtLink :to="`/authors/${author.name}`" class="read-more-btn">{{
            t.readMore
          }}</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
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
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.author-info h2 {
  font-size: 1.5rem;
  margin: 0;
  color: #333;
  padding-right: 40px;
  font-weight: bold;
  font-family: "Times New Roman", serif;
  word-break: break-word;
  max-width: 250px;
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
  transition: color 0.3s;
}
.read-more-btn:hover {
  color: #2e7d32;
  text-decoration: underline;
}
@media (max-width: 1024px) {
  .author-box {
    align-items: flex-start;
  }
  .author-info {
    flex-direction: column;
    align-items: center;
    width: 180px;
    margin-right: 30px;
  }
  .author-image {
    margin-right: 0;
    margin-bottom: 15px;
  }
  .author-info h2 {
    padding-right: 0;
    text-align: center;
    width: 100%;
  }
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
