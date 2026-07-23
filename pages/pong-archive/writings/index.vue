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

        <template v-else-if="displayGroups.length">
          <div
            v-for="group in displayGroups"
            :key="group.label || '_'"
            class="wr-group"
          >
            <div v-if="group.label" class="wr-group-head">
              <span class="wr-group-label">{{ group.label }}</span>
              <span class="wr-group-line" />
              <span class="wr-group-count">{{ group.items.length }} 篇</span>
            </div>

            <div class="wr-grid">
              <NuxtLink
                v-for="item in group.items"
                :key="item.id"
                :to="`/pong-archive/writings/${item.id}`"
                class="wr-card"
                :class="{ 'wr-card--pdf': item.is_flipbook }"
              >
                <!-- 刊物 + 年份 -->
                <div class="wr-card-meta">
                  <span v-if="item.publication && !group.label" class="wr-card-pub">{{ item.publication }}</span>
                  <span v-if="item.published_date" class="wr-card-year">
                    {{ formatDate(item.published_date, item.date_approximate) }}
                  </span>
                </div>

                <!-- 標題 -->
                <h2 class="wr-card-title">{{ item.title }}</h2>

                <!-- 英文標題 -->
                <p v-if="item.title_en" class="wr-card-en">{{ item.title_en }}</p>

                <!-- 內文摘要預覽 -->
                <p v-if="item.excerpt" class="wr-card-excerpt">{{ item.excerpt }}…</p>

                <!-- 標籤 -->
                <div v-if="item.tags && item.tags.length" class="wr-card-tags">
                  <span v-for="tag in item.tags" :key="tag" class="wr-tag">{{ tag }}</span>
                </div>

                <!-- 底部：閱讀方式 -->
                <div class="wr-card-foot">
                  <span v-if="item.is_flipbook" class="wr-card-cta wr-card-cta--pdf">
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="2.5" y="1.5" width="11" height="13" rx="1.4" stroke="currentColor" stroke-width="1.2"/>
                      <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="currentColor" stroke-width="1.1"/>
                    </svg>
                    翻閱掃描本<span v-if="item.total_pages" class="wr-card-pages">· {{ item.total_pages }} 頁</span>
                  </span>
                  <span v-else class="wr-card-cta">
                    線上閱讀
                  </span>
                  <span class="wr-card-arrow">→</span>
                </div>
              </NuxtLink>
            </div>
          </div>
        </template>

        <div v-else class="wr-status">此分類尚無收錄文章。</div>

      </div>
    </section>

  </div>
</template>

<script setup>
definePageMeta({ layout: 'pong-archive' })

// 排序原則：先呈現「可線上直接閱讀」的分類，PDF 掃描本的學位論文放最後，
// 避免使用者一進頁面就落在只能翻閱掃描檔、無法直接閱讀的論文分頁。
const CATEGORIES = [
  { key: 'periodical',   label: '刊物專欄' },
  { key: 'web',          label: '網站文章' },
  { key: 'journal',      label: '期刊文章' },
  { key: 'book_chapter', label: '專書文章' },
  { key: 'conference',   label: '會議文章' },
  { key: 'thesis',       label: '學位論文' },
]

const writings = ref([])
const pending  = ref(true)
const activeTab = ref('periodical')

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

// 一般分類 → 單一群組（無標題）；刊物專欄 → 依 publication 再細分成多個群組。
const displayGroups = computed(() => {
  const items = writings.value.filter(w => w.category === activeTab.value)
  if (!items.length) return []
  if (activeTab.value !== 'periodical') return [{ label: '', items }]

  const groups = new Map()
  for (const it of items) {
    const key = it.publication || '其他'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(it)
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }))
})

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
  justify-content: center;
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

/* ── Publication Group (刊物專欄 依刊物細分) ───────────────── */
.wr-group + .wr-group { margin-top: 46px; }

.wr-group-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}
.wr-group-label {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: #6A5C48;
  letter-spacing: 0.1em;
  white-space: nowrap;
}
.wr-group-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, #D8D0C2, transparent);
}
.wr-group-count {
  font-size: 0.7rem;
  font-weight: 300;
  color: #A79A85;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

/* ── Card Grid ───────────────────────────────────────────── */
.wr-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22px;
}

/* ── Card ────────────────────────────────────────────────── */
.wr-card {
  position: relative;
  background-color: #FDFCFA;
  border: 1px solid #DDD8CF;
  border-radius: 5px;
  padding: 26px 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
/* 左緣細金線，翻閱掃描本用較深的暖褐以資區別 */
.wr-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 3px;
  background-color: #E4D9C4;
  transition: background-color 0.2s;
}
.wr-card--pdf::before { background-color: #B79A72; }
.wr-card:hover {
  border-color: #C4B89A;
  box-shadow: 0 6px 20px rgba(60, 50, 35, 0.09);
  transform: translateY(-2px);
}
.wr-card:hover::before { background-color: #9A8060; }

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
  font-family: 'Noto Serif TC', serif;
  font-size: 0.74rem;
  font-weight: 400;
  color: #A79A85;
  letter-spacing: 0.06em;
}

.wr-card-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.1rem;
  font-weight: 500;
  color: #2C2C2C;
  letter-spacing: 0.05em;
  line-height: 1.65;
  margin: 0;
}

.wr-card-en {
  font-size: 0.78rem;
  font-weight: 300;
  color: #8A8278;
  font-style: italic;
  letter-spacing: 0.03em;
  line-height: 1.55;
  margin: 0;
}

.wr-card-excerpt {
  font-size: 0.82rem;
  font-weight: 300;
  color: #857B6E;
  line-height: 1.85;
  letter-spacing: 0.02em;
  margin: 2px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wr-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
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

/* ── Card Footer (閱讀方式) ──────────────────────────────── */
.wr-card-foot {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #EFEBE3;
}
.wr-card-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  font-weight: 500;
  color: #8A7E6A;
  letter-spacing: 0.08em;
}
.wr-card-cta svg { width: 13px; height: 13px; flex-shrink: 0; }
.wr-card-cta--pdf { color: #A0855F; }
.wr-card-pages {
  margin-left: 4px;
  font-weight: 300;
  color: #B0A48E;
  letter-spacing: 0.04em;
}

.wr-card-arrow {
  font-size: 1rem;
  color: #C4B89A;
  transition: color 0.18s, transform 0.18s;
}
.wr-card:hover .wr-card-arrow {
  color: #9A8060;
  transform: translateX(4px);
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 760px) {
  .wr-topbar { padding: 16px 20px; }
  .wr-header { padding: 40px 20px 32px; }
  .wr-tabs   { padding: 0 20px; justify-content: flex-start; }
  .wr-tab    { padding: 12px 14px; font-size: 0.82rem; }
  .wr-section { padding: 32px 20px 60px; }
  .wr-grid   { grid-template-columns: 1fr; gap: 16px; }
  .wr-card   { padding: 22px 20px 18px; }
  .wr-group + .wr-group { margin-top: 34px; }
}
</style>
