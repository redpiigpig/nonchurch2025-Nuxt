<script setup>
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import MainLayout from "~/components/MainLayout.vue";
import { supabase } from "~/supabase";
import { useEditorMode } from "~/composables/useEditorMode";

const route = useRoute();
const { isEditor } = useEditorMode();
const adminSelectedIssue = ref("");

// 1. SSR 資料獲取
const { data: pageData, pending: loading } = await useAsyncData(
  `submit-theme-${isEditor.value}`,
  async () => {
    // 抓取最新的徵稿主題
    let query = supabase
      .from("issues")
      .select("id, title, date, cfp_title, cfp_theme, cfp_deadline, cfp_image")
      .not("cfp_title", "is", null)
      .order("id", { ascending: false })
      .limit(1);

    if (!isEditor.value) {
      query = query.eq("is_published", true);
    }

    const { data: themeData, error: themeError } = await query;
    if (themeError) throw themeError;

    // 抓取所有期數 (供管理員切換用)
    let allIssues = [];
    if (isEditor.value) {
      const { data: issuesData } = await supabase
        .from("issues")
        .select("id, title, is_published")
        .order("id", { ascending: false });
      allIssues = issuesData || [];
    }

    return {
      theme: themeData && themeData.length > 0 ? themeData[0] : null,
      allIssues: allIssues,
    };
  },
  {
    watch: [isEditor],
  }
);

const currentTheme = computed(() => pageData.value?.theme);
const allIssues = computed(() => pageData.value?.allIssues || []);

// ----------------------------------------------------------------
// 2. SEO 設定 (修正：標題固定，不再隨主題變動)
// ----------------------------------------------------------------
useSeoMeta({
  // ⭐ 這裡改回固定標題
  title: "投稿資訊 - 無境界者雜誌",
  ogTitle: "投稿資訊 - 無境界者雜誌",

  // 描述與圖片保持動態 (分享時比較漂亮)，若您希望這也固定請告訴我
  description: () =>
    currentTheme.value?.cfp_theme ||
    "歡迎投稿至無境界者雜誌，本刊物是一個不以教會為本位的自由信仰論述平台。",
  ogDescription: () =>
    currentTheme.value?.cfp_theme || "歡迎投稿至無境界者雜誌...",
  ogImage: () =>
    currentTheme.value?.cfp_image ||
    "https://pottupypvdzamztdhsah.supabase.co/storage/v1/object/public/images/system/default_cover.jpg",
  twitterCard: "summary_large_image",
});

// ----------------------------------------------------------------
// 3. 頁面邏輯
// ----------------------------------------------------------------
const themeParagraphs = computed(() => {
  if (!currentTheme.value || !currentTheme.value.cfp_theme) return [];
  return currentTheme.value.cfp_theme
    .split("\n")
    .filter((p) => p.trim() !== "");
});

watch(
  currentTheme,
  (newVal) => {
    if (newVal) adminSelectedIssue.value = newVal.id;
  },
  { immediate: true }
);

const handleAdminIssueChange = () => {
  alert("目前靜態頁面暫時鎖定顯示最新一期徵稿資訊");
};
</script>

<template>
  <div>
    <h1 class="page-main-title">
      <span class="emoji">📬</span>投稿資訊<span class="emoji">📬</span>
    </h1>
    <div class="main-divider"></div>

    <div v-if="isEditor" class="admin-toolbar">
      <span class="toolbar-label">🔧 管理員導航：</span>
      <select
        v-model="adminSelectedIssue"
        @change="handleAdminIssueChange"
        class="admin-select"
      >
        <option v-for="issue in allIssues" :key="issue.id" :value="issue.id">
          Vol.{{ issue.id }} - {{ issue.title }}
          {{ !issue.is_published ? "(草稿)" : "" }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="loading-state">
      正在載入投稿資訊 🕊️<span class="loading-dots"></span>
    </div>

    <div v-else-if="!currentTheme" class="status-msg">目前尚無徵稿資訊。</div>

    <section id="theme" v-else>
      <section class="section-text">
        <p>
          《無境界者》雜誌是一個不以教會為本位的自由信仰論述平台，亦是一個實驗性質的線上雜誌，會定期在雙數月月底發刊。每一期皆會有一個當期主題，投稿者可以按照當期主題投稿，也可以自由發揮。
        </p>
      </section>
      <h3>
        ☆下期徵稿主題
        <span v-if="isEditor" style="font-size: 0.6em; color: #999"
          >(預覽模式)</span
        >
      </h3>
      <div class="theme-block">
        <h2 class="theme-title">徵稿主題：《{{ currentTheme.cfp_title }}》</h2>

        <div class="theme-image" v-if="currentTheme.cfp_image">
          <img :src="currentTheme.cfp_image" :alt="currentTheme.cfp_title" />
        </div>
        <br />
        <div class="theme-description">
          <p v-for="(para, index) in themeParagraphs" :key="index">
            {{ para }}
          </p>
        </div>

        <p class="deadline">📌 截稿期限：{{ currentTheme.cfp_deadline }}</p>
      </div>
    </section>

    <section id="types">
      <h3>☆投稿類型</h3>
      <div class="theme-block">
        <div class="type-item">
          <div class="type-block red">專題文章</div>
          <p class="type-description">
            探討當期主題或其他議題的學術性或半學術性文章，約1,000-6,000字。
          </p>
        </div>
        <div class="type-item">
          <div class="type-block orange">評論與回應</div>
          <p class="type-description">
            針對具有信仰啟發性的書籍、文章進行評論，或回應本刊及其他信仰刊物的文章。約500-6,000字。
          </p>
        </div>
        <div class="type-item">
          <div class="type-block yellow">人物專訪</div>
          <p class="type-description">
            訪談對台灣教會史具獨特意義的人物，或針對特殊議題採訪重要人物並記錄其見解。約2,000-12,000字。
          </p>
        </div>
        <div class="type-item">
          <div class="type-block green">生命故事</div>
          <p class="type-description">
            個人生命經歷、日常信仰體悟，或參與活動的心得分享。約500-6,000字。
          </p>
        </div>
        <div class="type-item">
          <div class="type-block blue">時事感想</div>
          <p class="type-description">
            對政治、社會、文化、教界時事的感想，或書寫時事對信仰的啟發。約500-6,000字。
          </p>
        </div>
        <div class="type-item">
          <div class="type-block indigo">文藝創作</div>
          <p class="type-description">
            與信仰相關的詩詞、散文、短篇小說、歌詞、樂譜、圖畫等創作。格式、篇幅不限，但篇幅過長者建議以連載形式投稿。字數不限。
          </p>
        </div>
        <div class="type-item">
          <div class="type-block purple">公告與剪影</div>
          <p class="type-description">
            友好團體活動公告或活動紀錄，可附海報、照片或相關連結。約500-2,000字。
          </p>
        </div>
        <div class="type-item">
          <div class="type-block soil">光影時刻</div>
          <p class="type-description">
            以照片講述信仰故事，最多5張照片。若符合當期主題，投稿作品亦可能被選為封面故事。文字500字以下。
          </p>
        </div>
        <div class="type-item">
          <div class="type-block pink">實驗園地</div>
          <p class="type-description">
            各類實驗性創作，格式不拘，投稿前請先與編輯聯絡討論。字數不限。
          </p>
        </div>
      </div>
    </section>

    <section id="guidelines">
      <h3>☆投稿方式</h3>
      <p>
        欲投稿之作者，請按網頁下方的「我要投稿」，或者逕行投稿至
        <a href="mailto:nonchurch2025@gmail.com">nonchurch2025@gmail.com</a
        >，作品可匿名刊登，但投稿時仍須在電子郵件中附上真實姓名。初次投稿本刊物的作者請附上100-150字的信仰經歷簡介。
      </p>
      <p>
        《無境界者》雜誌是一個在網路上公開的非營利平台，故在此發表之作品皆視為公開發表，且恕無法提供稿酬。
      </p>
      <p>
        投稿至《無境界者》雜誌之作品，可以是原創作品或已公開發表過的作品（已在網路或其他紙本上發表過之文章、過期演講稿），但若對其他書籍、刊物有侵權之嫌，作者需自負全責，本刊物亦不為任何作者之信仰論述背書。
      </p>
      <p>
        若是學術性文章，文史類文章註腳格式採用
        <a href="#">《國史館館刊》寫作格式</a>；社會科學類文章註腳格式採用
        <a href="#">《臺灣宗教研究》撰稿體例</a>。
      </p>
      <p>
        每一期的截稿期限為單數月月底（刊登的一個月前），投稿時請標明投稿的期數，但如果非與當期主題相關之文章，本刊編輯可視文章數量進行調動。
      </p>
      <p>
        本刊編輯原則上會盡可能維持作品原貌，僅就錯別字、語詞誤用、格式調整等方面進行校對，也會在校對過程中與原作者協議，但本刊物具有最終編輯權。
      </p>
      <p>
        若投稿作品不符合本刊物目前的需求，或者須大幅調整者，編輯會在退稿時附上說明，但本刊物對於作品的刊登與否具有最終裁量權。
      </p>
      <p>
        若對於本刊物的信仰特色、投稿規範有任何疑問者，也歡迎先寄信至
        <a href="mailto:nonchurch2025@gmail.com">nonchurch2025@gmail.com</a
        >詢問。
      </p>
    </section>

    <div class="main-divider"></div>

    <section id="submit">
      <h2>投稿專區</h2>
      <p class="no-indent">有精彩內容想分享嗎？點擊下方按鈕立即投稿！</p>
      <a
        href="https://forms.gle/wDxBRbGAorTTJqeJ9"
        class="submit-button"
        target="_blank"
        >我要投稿</a
      >
    </section>
  </div>
</template>

<style scoped>
/* CSS 保持原本的內容 */
.admin-toolbar {
  background-color: #fff3cd;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  border: 1px solid #ffeeba;
  justify-content: center;
}
.toolbar-label {
  font-weight: bold;
  color: #856404;
  margin-right: 10px;
}
.admin-select {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  font-size: 1rem;
}
p {
  text-indent: 2rem;
  line-height: 1.8;
  color: #444;
  margin-bottom: 1rem;
  text-align: justify;
}
.no-indent,
.deadline {
  text-indent: 0 !important;
}
.main-divider {
  width: 100%;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  margin: 20px auto;
}
h2 {
  text-align: center;
  color: #444;
  margin: 1rem 0;
}
h3 {
  text-align: left;
  text-indent: 0;
  font-weight: bold;
  color: #333;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}
.theme-block {
  background-color: rgba(255, 255, 255, 0.6);
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 30px 60px;
  margin-bottom: 2rem;
}
.theme-title {
  text-align: center;
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
  color: #333;
  font-family: "KaiTi", "BiauKai", "DFKai-SB", "TW-Kai", serif;
}
.theme-image {
  text-align: center;
  margin-bottom: 1.5rem;
}
.theme-image img {
  max-width: 100%;
  height: auto;
  max-height: 600px;
  border-radius: 5px;
  display: block;
  margin: 0 auto;
}
.deadline {
  text-align: right;
  font-weight: bold;
  margin-top: 2rem;
  margin-right: 10px;
  color: #e91e63;
}
.type-item {
  display: flex;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px dashed #eee;
}
.type-item:last-child {
  border-bottom: none;
}
.type-block {
  width: 120px;
  height: 40px;
  color: white;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 20px;
  flex-shrink: 0;
  margin-right: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 0.95rem;
}
.type-description {
  margin: 0;
  color: #555;
  line-height: 1.6;
  text-align: justify;
  text-indent: 0 !important;
}
.type-block.red {
  background-color: #8b0000;
}
.type-block.orange {
  background-color: #ff8000;
}
.type-block.yellow {
  background-color: #f0e137;
}
.type-block.green {
  background-color: #46b175;
}
.type-block.blue {
  background-color: #4682b4;
}
.type-block.indigo {
  background-color: #27408b;
}
.type-block.purple {
  background-color: #6a5acd;
}
.type-block.soil {
  background-color: #7d6c29;
}
.type-block.pink {
  background-color: #db7093;
}
a {
  color: #0275d8;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
#submit {
  text-align: center;
  padding: 20px 0;
  margin-top: -1rem;
}
#submit h2 {
  text-align: center;
}
#submit p {
  text-align: center !important;
  text-indent: 0 !important;
}
.submit-button {
  display: inline-block;
  padding: 15px 60px;
  background-color: #5cb85c;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  text-decoration: none;
  border-radius: 50px;
  transition: transform 0.2s, background-color 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-top: 1rem;
}
.submit-button:hover {
  background-color: #4cae4c;
  transform: translateY(-3px);
  text-decoration: none;
}
.status-msg {
  text-align: center;
  padding: 20px;
  font-size: 1.2rem;
  color: #666;
  text-indent: 0 !important;
}
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  font-size: 2rem;
  color: #888;
  font-family: serif;
  font-weight: bold;
}
.loading-dots::after {
  content: "";
  animation: dots-cycle 2s infinite steps(1);
}
@keyframes dots-cycle {
  0% {
    content: "";
  }
  15% {
    content: ".";
  }
  30% {
    content: "..";
  }
  45% {
    content: "...";
  }
  60% {
    content: "....";
  }
  75% {
    content: ".....";
  }
  90% {
    content: "......";
  }
}
@media (max-width: 768px) {
  .theme-block {
    padding: 20px 20px;
  }
  .theme-description {
    margin: 0;
  }
  .type-item {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px 0;
  }
  .type-block {
    margin-bottom: 10px;
  }
}
</style>
