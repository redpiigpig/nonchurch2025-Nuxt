<template>
  <div class="wr-page">

    <div class="wr-topbar">
      <NuxtLink to="/pong-archive" class="wr-back">← 返回典藏首頁</NuxtLink>
    </div>

    <header class="wr-header">
      <p class="wr-eyebrow">Writings</p>
      <h1 class="wr-title">著作與專文</h1>
      <p class="wr-subtitle">龐君華會督歷年神學著述、期刊論文及專欄文章</p>
    </header>

    <!-- ── Category Tabs ─────────────────────────────────── -->
    <nav class="wr-tabs">
      <button
        v-for="cat in CATEGORIES"
        :key="cat.key"
        class="wr-tab"
        :class="{ 'wr-tab--active': activeTab === cat.key }"
        @click="activeTab = cat.key"
      >
        {{ cat.label }}
        <span v-if="countByCategory[cat.key]" class="wr-tab-badge">
          {{ countByCategory[cat.key] }}
        </span>
      </button>
    </nav>

    <!-- ── Card Grid ─────────────────────────────────────── -->
    <section class="wr-section">
      <div class="wr-section-inner">

        <div v-if="pending" class="wr-status">載入中…</div>

        <template v-else-if="filteredWritings.length">
          <div class="wr-grid">
            <article
              v-for="item in filteredWritings"
              :key="item.id"
              class="wr-card"
            >
              <!-- 刊物 + 年份 -->
              <div class="wr-card-meta">
                <span v-if="item.publication" class="wr-card-pub">{{ item.publication }}</span>
                <span v-if="item.published_date" class="wr-card-year">
                  {{ formatDate(item.published_date, item.date_approximate) }}
                </span>
              </div>

              <!-- 標題 -->
              <h2 class="wr-card-title">{{ item.title }}</h2>

              <!-- 英文標題 -->
              <p v-if="item.title_en" class="wr-card-en">{{ item.title_en }}</p>

              <!-- 標籤 -->
              <div v-if="item.tags && item.tags.length" class="wr-card-tags">
                <span v-for="tag in item.tags" :key="tag" class="wr-tag">{{ tag }}</span>
              </div>

              <!-- 下載 / 連結 -->
              <div class="wr-card-footer">
                <a
                  v-if="item.cloudinary_urls && item.cloudinary_urls.length"
                  :href="item.cloudinary_urls[0]"
                  target="_blank"
                  rel="noopener"
                  class="wr-card-btn wr-card-btn--pdf"
                >
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
                    <line x1="4.5" y1="5.5" x2="11.5" y2="5.5" stroke="currentColor" stroke-width="1"/>
                    <line x1="4.5" y1="8"   x2="11.5" y2="8"   stroke="currentColor" stroke-width="1"/>
                    <line x1="4.5" y1="10.5" x2="9"   y2="10.5" stroke="currentColor" stroke-width="1"/>
                  </svg>
                  下載 PDF
                </a>
                <a
                  v-else-if="item.source_url"
                  :href="item.source_url"
                  target="_blank"
                  rel="noopener"
                  class="wr-card-btn wr-card-btn--link"
                >
                  前往原文 ↗
                </a>
              </div>
            </article>
          </div>
        </template>

        <div v-else class="wr-status">此分類尚無收錄文章。</div>

      </div>
    </section>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'pong-archive' })

const CATEGORIES = [
  { key: 'thesis',       label: '學位論文' },
  { key: 'book_chapter', label: '專書文章' },
  { key: 'journal',      label: '期刊文章' },
  { key: 'conference',   label: '會議文章' },
  { key: 'web',          label: '網站文章' },
]

const writings = ref([])
const pending  = ref(true)
const activeTab = ref('thesis')

onMounted(async () => {
  try {
    const data = await $fetch('/api/pong-writings')
    writings.value = data
  } catch (e) {
    console.error('[writings]', e)
  } finally {
    pending.value = false
  }
})

const countByCategory = computed(() => {
  const map = {}
  for (const w of writings.value) {
    map[w.category] = (map[w.category] || 0) + 1
  }
  return map
})

const filteredWritings = computed(() =>
  writings.value.filter(w => w.category === activeTab.value)
)

function formatDate(dateStr, approximate) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return approximate ? `${y} 年` : `${y} 年 ${m} 月`
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500&family=Noto+Serif+TC:wght@400;500;600&display=swap');

/* ── Base ─────────────────────────────────────────────────── */
.wr-page {
  background-color: #F9F8F6;
  min-height: 100vh;
  font-family: 'Noto Sans TC', sans-serif;
  color: #2C2C2C;
}

/* ── Topbar ──────────────────────────────────────────────── */
.wr-topbar {
  padding: 20px 48px;
  border-bottom: 1px solid #DDD8CF;
}
.wr-back {
  font-size: 0.8rem;
  color: #8A8278;
  text-decoration: none;
  letter-spacing: 0.06em;
  transition: color 0.2s;
}
.wr-back:hover { color: #3A3025; }

/* ── Header ──────────────────────────────────────────────── */
.wr-header {
  text-align: center;
  padding: 56px 40px 40px;
  border-bottom: 1px solid #E8E4DC;
}
.wr-eyebrow {
  font-size: 0.72rem;
  font-weight: 300;
  color: #A09280;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin: 0 0 10px;
}
.wr-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 2rem;
  font-weight: 500;
  color: #2C2C2C;
  letter-spacing: 0.12em;
  margin: 0 0 10px;
}
.wr-subtitle {
  font-size: 0.85rem;
  font-weight: 300;
  color: #7A7268;
  letter-spacing: 0.06em;
  margin: 0;
}

/* ── Tabs ────────────────────────────────────────────────── */
.wr-tabs {
  display: flex;
  padding: 0 48px;
  background-color: #F4F1EC;
  border-bottom: 2px solid #E8E4DC;
  overflow-x: auto;
  scrollbar-width: none;
  gap: 0;
}
.wr-tabs::-webkit-scrollbar { display: none; }

.wr-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 15px 22px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 0.88rem;
  font-weight: 300;
  color: #7A7268;
  letter-spacing: 0.06em;
  white-space: nowrap;
  transition: color 0.18s, border-color 0.18s;
}
.wr-tab:hover { color: #3A3025; }
.wr-tab--active {
  color: #3A3025;
  font-weight: 500;
  border-bottom-color: #9A8060;
}

.wr-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background-color: #9A8060;
  color: #FFF;
  border-radius: 9px;
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0;
}

/* ── Section ─────────────────────────────────────────────── */
.wr-section {
  padding: 48px 40px 80px;
}
.wr-section-inner {
  max-width: 1080px;
  margin: 0 auto;
}

.wr-status {
  text-align: center;
  color: #A09280;
  font-size: 0.9rem;
  font-weight: 300;
  letter-spacing: 0.06em;
  padding: 80px 0;
}

/* ── Card Grid ───────────────────────────────────────────── */
.wr-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

/* ── Card ────────────────────────────────────────────────── */
.wr-card {
  background-color: #FDFCFA;
  border: 1px solid #DDD8CF;
  border-radius: 4px;
  padding: 28px 28px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.wr-card:hover {
  border-color: #C4B89A;
  box-shadow: 0 4px 16px rgba(60, 50, 35, 0.07);
}

.wr-card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.wr-card-pub {
  font-size: 0.68rem;
  font-weight: 500;
  color: #9A8E7E;
  background-color: #EEE8DC;
  padding: 3px 9px;
  border-radius: 2px;
  letter-spacing: 0.1em;
}
.wr-card-year {
  font-size: 0.72rem;
  font-weight: 300;
  color: #A09280;
  letter-spacing: 0.06em;
}

.wr-card-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.1rem;
  font-weight: 500;
  color: #2C2C2C;
  letter-spacing: 0.05em;
  line-height: 1.7;
  margin: 0;
}

.wr-card-en {
  font-size: 0.8rem;
  font-weight: 300;
  color: #8A8278;
  font-style: italic;
  letter-spacing: 0.03em;
  line-height: 1.6;
  margin: 0;
}

.wr-card-desc {
  font-size: 0.85rem;
  font-weight: 300;
  color: #5A5550;
  line-height: 1.85;
  letter-spacing: 0.04em;
  margin: 0;
  flex: 1;
}

.wr-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.wr-tag {
  font-size: 0.62rem;
  font-weight: 300;
  color: #9A9080;
  background-color: #F0EDE8;
  border: 1px solid #E0DBD4;
  border-radius: 2px;
  padding: 2px 7px;
  letter-spacing: 0.05em;
}

/* ── Card Footer ─────────────────────────────────────────── */
.wr-card-footer {
  margin-top: 6px;
  padding-top: 14px;
  border-top: 1px solid #EDE8DF;
}
.wr-card-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-decoration: none;
  transition: background-color 0.18s, color 0.18s;
}
.wr-card-btn--pdf {
  background-color: #F2EFE9;
  border: 1px solid #DDD8CF;
  color: #6A6050;
}
.wr-card-btn--pdf:hover {
  background-color: #EAE4D8;
  border-color: #C4B89A;
  color: #3A3025;
}
.wr-card-btn--pdf svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  color: #9A8060;
}
.wr-card-btn--link {
  background: none;
  border: none;
  color: #8A7A60;
  padding-left: 0;
  padding-right: 0;
}
.wr-card-btn--link:hover { color: #3A3025; }

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 760px) {
  .wr-topbar { padding: 16px 20px; }
  .wr-header { padding: 40px 20px 32px; }
  .wr-tabs   { padding: 0 20px; }
  .wr-tab    { padding: 12px 14px; font-size: 0.82rem; }
  .wr-section { padding: 32px 20px 60px; }
  .wr-grid   { grid-template-columns: 1fr; gap: 16px; }
  .wr-card   { padding: 22px 20px 18px; }
}
</style>
