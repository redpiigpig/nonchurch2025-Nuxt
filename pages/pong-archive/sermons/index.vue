<template>
  <div class="sl-page">
    <div class="sl-topbar">
      <NuxtLink to="/pong-archive" class="sl-back">← 返回典藏首頁</NuxtLink>
    </div>

    <header class="sl-header">
      <p class="sl-eyebrow">Sermons</p>
      <h1 class="sl-title">講道集</h1>
      <p class="sl-subtitle">龐君華會督歷年主日講道及特別信息</p>
    </header>

    <!-- ── Sermon flat list ──────────────────────────────── -->
    <section class="sl-list-section">
      <div v-if="loading" class="sl-loading">載入中…</div>
      <div v-else-if="sermons.length === 0" class="sl-empty">尚無講道記錄</div>
      <ul v-else class="sl-list">
        <li v-for="s in sermons" :key="s.id" class="sl-item">
          <div class="sl-entry">
            <div class="sl-meta-row">
              <span class="sl-date">{{ fmtDate(s.sermon_date) }}</span>
              <span v-if="s.liturgical_season" class="sl-sep">·</span>
              <span v-if="s.liturgical_season" class="sl-season">{{ s.liturgical_season }}</span>
            </div>
            <h2 class="sl-sermon-title">{{ s.title }}</h2>
            <p v-if="s.location" class="sl-location">
              <svg class="sl-loc-icon" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 0C3.24 0 1 2.24 1 5c0 3.5 5 11 5 11s5-7.5 5-11c0-2.76-2.24-5-5-5zm0 7.5C4.62 7.5 3.5 6.38 3.5 5s1.12-2.5 2.5-2.5S8.5 3.62 8.5 5 7.38 7.5 6 7.5z" fill="currentColor"/>
              </svg>
              {{ s.location }}
            </p>
          </div>
        </li>
      </ul>
    </section>

    <!-- ── Church year calendar nav ─────────────────────── -->
    <section class="sl-years-section">
      <h2 class="sl-years-heading">依教會年瀏覽</h2>
      <div class="sl-years-grid">
        <NuxtLink
          v-for="y in years"
          :key="y.year"
          :to="`/pong-archive/sermons/year/${y.year}`"
          class="sl-year-card"
        >
          <span class="sl-year-label">{{ y.year }}–{{ y.year + 1 }}</span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'

definePageMeta({ layout: 'pong-archive' })

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
)

const sermons = ref([])
const loading = ref(true)

async function fetchSermons() {
  try {
    const { data, error } = await supabase
      .from('pong_sermons')
      .select('id, title, sermon_date, liturgical_season, location')
      .eq('is_published', true)
      .order('sermon_date', { ascending: false })
    if (error) throw error
    sermons.value = data || []
  } catch (e) {
    console.error('[sermons]', e)
  } finally {
    loading.value = false
  }
}

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`
}

const years = Array.from({ length: 26 }, (_, i) => ({ year: 2000 + i }))

onMounted(fetchSermons)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500&family=Noto+Serif+TC:wght@400;500;600&display=swap');

.sl-page {
  background-color: #F9F8F6;
  min-height: 100vh;
  font-family: 'Noto Sans TC', sans-serif;
  color: #2C2C2C;
}

/* ── Topbar ─────────────────────────────────────────────── */
.sl-topbar {
  padding: 20px 48px;
  border-bottom: 1px solid #DDD8CF;
}

.sl-back {
  font-size: 0.8rem;
  color: #8A8278;
  text-decoration: none;
  letter-spacing: 0.06em;
  transition: color 0.2s;
}
.sl-back:hover { color: #3A3025; }

/* ── Header ─────────────────────────────────────────────── */
.sl-header {
  text-align: center;
  padding: 56px 40px 40px;
  border-bottom: 1px solid #E8E4DC;
}

.sl-eyebrow {
  font-size: 0.72rem;
  font-weight: 300;
  color: #A09280;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin: 0 0 10px;
}

.sl-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 2rem;
  font-weight: 500;
  color: #2C2C2C;
  letter-spacing: 0.12em;
  margin: 0 0 10px;
}

.sl-subtitle {
  font-size: 0.85rem;
  font-weight: 300;
  color: #7A7268;
  letter-spacing: 0.06em;
  margin: 0;
}

/* ── Sermon list ────────────────────────────────────────── */
.sl-list-section {
  max-width: 680px;
  margin: 0 auto;
  padding: 48px 24px;
}

.sl-loading, .sl-empty {
  text-align: center;
  font-size: 0.85rem;
  font-weight: 300;
  color: #A09280;
  letter-spacing: 0.06em;
  padding: 40px 0;
}

.sl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.sl-item {
  border-bottom: 1px solid #E8E4DC;
}
.sl-item:first-child {
  border-top: 1px solid #E8E4DC;
}

.sl-entry {
  display: block;
  text-align: center;
  padding: 28px 16px;
}

.sl-meta-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
}

.sl-date {
  font-size: 0.72rem;
  font-weight: 300;
  color: #A09280;
  letter-spacing: 0.1em;
  font-variant-numeric: tabular-nums;
}

.sl-sep {
  font-size: 0.65rem;
  color: #C0B8AE;
}

.sl-season {
  font-size: 0.72rem;
  font-weight: 300;
  color: #8A7E6E;
  letter-spacing: 0.08em;
}

.sl-sermon-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.3rem;
  font-weight: 500;
  color: #2C2C2C;
  letter-spacing: 0.1em;
  margin: 0 0 8px;
  line-height: 1.5;
}

.sl-location {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 300;
  color: #A09280;
  letter-spacing: 0.06em;
  margin: 0;
}

.sl-loc-icon {
  width: 8px;
  height: 11px;
  flex-shrink: 0;
  color: #C0B8AE;
}

/* ── Year nav ───────────────────────────────────────────── */
.sl-years-section {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 24px 64px;
  border-top: 1px solid #DDD8CF;
}

.sl-years-heading {
  font-family: 'Noto Serif TC', serif;
  font-size: 0.95rem;
  font-weight: 500;
  color: #7A7268;
  letter-spacing: 0.12em;
  text-align: center;
  margin: 0 0 24px;
}

.sl-years-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.sl-year-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 6px;
  background-color: #F2EFE9;
  border: 1px solid #DDD8CF;
  border-radius: 3px;
  text-decoration: none;
  color: inherit;
  transition: background-color 0.2s, border-color 0.2s;
}
.sl-year-card:hover {
  background-color: #EAE4D8;
  border-color: #C4B89A;
}

.sl-year-label {
  font-family: 'Noto Serif TC', serif;
  font-size: 0.78rem;
  font-weight: 500;
  color: #5A5048;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 640px) {
  .sl-topbar { padding: 16px 20px; }
  .sl-list-section, .sl-years-section { padding-left: 16px; padding-right: 16px; }
  .sl-years-grid { grid-template-columns: repeat(3, 1fr); }
  .sl-year-label { font-size: 0.7rem; }
}
</style>
