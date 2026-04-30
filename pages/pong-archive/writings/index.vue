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
    <nav class="wr-tabs" aria-label="文章分類">
      <button
        v-for="cat in CATEGORIES"
        :key="cat.key"
        class="wr-tab"
        :class="{ 'wr-tab--active': activeTab === cat.key }"
        @click="activeTab = cat.key"
      >
        <span class="wr-tab-zh">{{ cat.label }}</span>
        <span v-if="countByCategory[cat.key]" class="wr-tab-count">{{ countByCategory[cat.key] }}</span>
      </button>
    </nav>

    <!-- ── Article List ──────────────────────────────────── -->
    <section class="wr-list">
      <div class="wr-list-inner">

        <div v-if="pending" class="wr-loading">載入中…</div>

        <template v-else-if="filteredWritings.length">
          <article
            v-for="item in filteredWritings"
            :key="item.id"
            class="wr-item"
          >
            <div class="wr-item-meta">
              <span v-if="item.publication" class="wr-item-pub">{{ item.publication }}</span>
              <span v-if="item.published_date" class="wr-item-date">{{ formatDate(item.published_date, item.date_approximate) }}</span>
            </div>

            <h2 class="wr-item-title">
              <a
                v-if="item.source_url"
                :href="item.source_url"
                target="_blank"
                rel="noopener"
                class="wr-item-link"
              >
                {{ item.title }}
                <span class="wr-ext-icon">↗</span>
              </a>
              <span v-else class="wr-item-link wr-item-link--plain">{{ item.title }}</span>
            </h2>

            <p v-if="item.title_en" class="wr-item-en">{{ item.title_en }}</p>

            <p v-if="item.description" class="wr-item-desc">{{ item.description }}</p>

            <div v-if="item.cloudinary_urls && item.cloudinary_urls.length" class="wr-item-files">
              <a
                v-for="(url, i) in item.cloudinary_urls"
                :key="i"
                :href="url"
                target="_blank"
                rel="noopener"
                class="wr-item-pdf"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="3" y="1" width="14" height="18" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
                  <line x1="6" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1"/>
                  <line x1="6" y1="10" x2="14" y2="10" stroke="currentColor" stroke-width="1"/>
                  <line x1="6" y1="13" x2="11" y2="13" stroke="currentColor" stroke-width="1"/>
                </svg>
                下載 PDF{{ item.cloudinary_urls.length > 1 ? ` (${i + 1})` : '' }}
              </a>
            </div>

            <div v-if="item.tags && item.tags.length" class="wr-item-tags">
              <span v-for="tag in item.tags" :key="tag" class="wr-tag">{{ tag }}</span>
            </div>
          </article>
        </template>

        <div v-else class="wr-empty">
          <p>此分類尚無收錄文章。</p>
        </div>

      </div>
    </section>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'pong-archive' })

const CATEGORIES = [
  { key: 'thesis',       label: '學位論文', en: 'Thesis' },
  { key: 'book_chapter', label: '專書文章', en: 'Book Chapters' },
  { key: 'journal',      label: '期刊文章', en: 'Journal Articles' },
  { key: 'conference',   label: '會議文章', en: 'Conference Papers' },
  { key: 'web',          label: '網站文章', en: 'Web Articles' },
]

const writings = ref([])
const pending  = ref(true)

onMounted(async () => {
  const supabase = useSupabaseClient()
  const { data, error } = await supabase
    .from('pong_writings')
    .select('id, title, title_en, category, publication, published_date, date_approximate, source_url, cloudinary_urls, tags, description')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
  if (!error && data) writings.value = data
  pending.value = false
})

const countByCategory = computed(() => {
  const map = {}
  for (const w of writings.value) {
    map[w.category] = (map[w.category] || 0) + 1
  }
  return map
})

const activeTab = ref(CATEGORIES[0].key)

const filteredWritings = computed(() =>
  writings.value.filter(w => w.category === activeTab.value)
)

function formatDate(dateStr, approximate) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  if (approximate) return `${y} 年`
  return `${y} 年 ${m} 月`
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
  gap: 0;
  border-bottom: 2px solid #E8E4DC;
  background-color: #F4F1EC;
  padding: 0 48px;
  overflow-x: auto;
  scrollbar-width: none;
}
.wr-tabs::-webkit-scrollbar { display: none; }

.wr-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  color: #7A7268;
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 0.88rem;
  font-weight: 300;
  letter-spacing: 0.06em;
  white-space: nowrap;
  transition: color 0.2s, border-color 0.2s;
}
.wr-tab:hover { color: #3A3025; }
.wr-tab--active {
  color: #3A3025;
  font-weight: 500;
  border-bottom-color: #9A8060;
}

.wr-tab-zh { }
.wr-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  background-color: #E8E4DC;
  border-radius: 9px;
  font-size: 0.65rem;
  font-weight: 400;
  color: #9A8E7E;
  letter-spacing: 0;
}
.wr-tab--active .wr-tab-count {
  background-color: #9A8060;
  color: #FFF;
}

/* ── List ─────────────────────────────────────────────────── */
.wr-list {
  padding: 48px 40px 80px;
}
.wr-list-inner {
  max-width: 800px;
  margin: 0 auto;
}
.wr-loading,
.wr-empty {
  text-align: center;
  color: #A09280;
  font-size: 0.9rem;
  padding: 80px 0;
  letter-spacing: 0.06em;
}
.wr-empty p { margin: 0; }

/* ── Article item ─────────────────────────────────────────── */
.wr-item {
  padding: 36px 0;
  border-bottom: 1px solid #E8E4DC;
}
.wr-item:first-child { border-top: 1px solid #E8E4DC; }

.wr-item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.wr-item-pub {
  font-size: 0.68rem;
  font-weight: 500;
  color: #9A8E7E;
  letter-spacing: 0.12em;
  background: #EEE8DC;
  padding: 3px 10px;
  border-radius: 2px;
}
.wr-item-date {
  font-size: 0.72rem;
  font-weight: 300;
  color: #A09280;
  letter-spacing: 0.06em;
}

.wr-item-title {
  margin: 0 0 8px;
  line-height: 1.6;
}
.wr-item-link {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.15rem;
  font-weight: 500;
  color: #2C2C2C;
  text-decoration: none;
  letter-spacing: 0.04em;
  transition: color 0.2s;
}
.wr-item-link:hover { color: #7A6E5A; }
.wr-item-link--plain { cursor: default; }
.wr-item-link--plain:hover { color: #2C2C2C; }
.wr-ext-icon { font-size: 0.8em; margin-left: 4px; opacity: 0.55; }

.wr-item-en {
  font-size: 0.82rem;
  font-weight: 300;
  color: #8A8278;
  letter-spacing: 0.04em;
  font-style: italic;
  margin: 0 0 14px;
  line-height: 1.6;
}

.wr-item-desc {
  font-size: 0.88rem;
  font-weight: 300;
  color: #5A5550;
  line-height: 1.9;
  letter-spacing: 0.04em;
  margin: 0 0 20px;
}

/* ── PDF button ───────────────────────────────────────────── */
.wr-item-files {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 0;
}
.wr-item-pdf {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background-color: #F2EFE9;
  border: 1px solid #DDD8CF;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6A6050;
  text-decoration: none;
  letter-spacing: 0.06em;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}
.wr-item-pdf:hover {
  background-color: #EAE4D8;
  border-color: #C4B89A;
  color: #3A3025;
}
.wr-item-pdf svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: #9A8060;
}

/* ── Tags ─────────────────────────────────────────────────── */
.wr-item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 16px;
}
.wr-tag {
  font-size: 0.65rem;
  font-weight: 300;
  color: #9A9080;
  background-color: #F0EDE8;
  border: 1px solid #DDD8CF;
  border-radius: 2px;
  padding: 2px 8px;
  letter-spacing: 0.06em;
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 640px) {
  .wr-topbar  { padding: 16px 20px; }
  .wr-header  { padding: 40px 20px 32px; }
  .wr-tabs    { padding: 0 20px; }
  .wr-tab     { padding: 14px 16px; font-size: 0.82rem; }
  .wr-list    { padding: 32px 20px 60px; }
  .wr-item-link { font-size: 1.05rem; }
}
</style>
