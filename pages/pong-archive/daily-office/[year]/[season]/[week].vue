<template>
  <div class="wk-page">

    <!-- Topbar -->
    <div class="wk-topbar">
      <NuxtLink to="/pong-archive/daily-office" class="wk-back">← 三讀三禱</NuxtLink>
    </div>

    <!-- Header -->
    <header class="wk-header" :style="{ backgroundColor: seasonColor.bg }">
      <div class="wk-header-inner">
        <p class="wk-eyebrow">{{ yearLabel }}　·　{{ seasonColor.name }}</p>
        <h1 class="wk-title">{{ weekData?.title || slotInfo?.label || '—' }}</h1>
        <p class="wk-date" v-if="weekData?.date_range || slotInfo?.sunday">
          {{ weekData?.date_range || formatDate(slotInfo?.sunday) }}
        </p>
      </div>
    </header>

    <!-- Loading state -->
    <div v-if="pending" class="wk-loading">載入中…</div>

    <!-- No content yet -->
    <div v-else-if="!weekData" class="wk-empty">
      <p>經課資料尚未上傳</p>
      <p class="wk-empty-sub">{{ yearLabel }}　{{ seasonColor.name }}　第 {{ route.params.week }} 週</p>
    </div>

    <!-- Week content -->
    <template v-else>

      <!-- Intro letter -->
      <section v-if="weekData.intro_letter" class="wk-intro">
        <div class="wk-intro-inner">
          <p class="wk-section-label">本週靈修引言</p>
          <div class="wk-intro-body" v-html="weekData.intro_letter"></div>
        </div>
      </section>

      <!-- Theme essay -->
      <section v-if="weekData.theme_essay" class="wk-essay">
        <div class="wk-essay-inner">
          <p class="wk-section-label">主題默想</p>
          <h2 v-if="weekData.theme_essay_title" class="wk-essay-title">{{ weekData.theme_essay_title }}</h2>
          <div class="wk-essay-body" v-html="weekData.theme_essay"></div>
        </div>
      </section>

      <!-- Day navigation -->
      <section class="wk-days-section">
        <div class="wk-days-inner">
          <div class="wk-day-tabs">
            <button
              v-for="d in days"
              :key="d.day_of_week"
              class="wk-day-tab"
              :class="{ 'wk-day-tab--active': activeDay === d.day_of_week }"
              @click="activeDay = d.day_of_week"
            >
              {{ d.day_label || DAY_LABELS[d.day_of_week] }}
            </button>
          </div>

          <!-- Active day readings -->
          <div v-if="currentDay" class="wk-day-content">
            <div
              v-for="(reading, ri) in currentDay.readings"
              :key="ri"
              class="wk-reading"
            >
              <button
                class="wk-reading-head"
                :class="{ 'wk-reading-head--open': openReadings[ri] }"
                @click="toggleReading(ri)"
              >
                <span class="wk-reading-num">{{ ri + 1 }}</span>
                <span class="wk-reading-ref">
                  <span class="wk-reading-book">{{ reading.book }}</span>
                  <span v-if="reading.passage" class="wk-reading-passage">{{ reading.passage }}</span>
                </span>
                <span v-if="reading.title" class="wk-reading-title">{{ reading.title }}</span>
                <span class="wk-reading-chevron" :class="{ open: openReadings[ri] }">›</span>
              </button>

              <div v-if="openReadings[ri]" class="wk-reading-body">
                <div v-if="reading.key_verse" class="wk-key-verse">
                  <span class="wk-key-verse-label">金句</span>
                  <blockquote class="wk-key-verse-text">{{ reading.key_verse }}</blockquote>
                </div>
                <div v-if="reading.text" class="wk-scripture" v-html="reading.text"></div>
                <div v-if="reading.meditation" class="wk-meditation">
                  <p class="wk-meditation-label">默想</p>
                  <div v-html="reading.meditation"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Appendices -->
      <section v-if="weekData.appendices?.length" class="wk-appendices">
        <div class="wk-appendices-inner">
          <p class="wk-section-label">附錄</p>
          <div v-for="(app, i) in weekData.appendices" :key="i" class="wk-appendix">
            <h3 v-if="app.title" class="wk-appendix-title">{{ app.title }}</h3>
            <div v-if="app.body" v-html="app.body"></div>
          </div>
        </div>
      </section>

    </template>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'
import {
  getChurchYearSundays,
  getCurrentChurchYear,
  SEASON_COLORS,
} from '~/composables/useChurchCalendar.js'

definePageMeta({ layout: 'pong-archive' })

const route = useRoute()
const yearParam = route.params.year   // 'A', 'B', or 'C'
const season = route.params.season
const week = parseInt(route.params.week)

const YEAR_LABELS = { A: '甲年（Year A）', B: '乙年（Year B）', C: '丙年（Year C）' }
const DAY_LABELS = ['主日', '週一', '週二', '週三', '週四', '週五', '週六']

const yearLabel = YEAR_LABELS[yearParam] || yearParam
const seasonColor = SEASON_COLORS[season] || SEASON_COLORS.pentecost

// Church calendar slot info (for fallback date display)
const churchYear = getCurrentChurchYear()
const slots = getChurchYearSundays(churchYear)
const slotInfo = slots.find(s => s.season === season && s.week === week) || null

function formatDate(d) {
  if (!d) return ''
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

// Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

const { data: weekData, pending } = await useAsyncData(
  `pong-lec-week-${yearParam}-${season}-${week}`,
  async () => {
    const { data, error } = await supabase
      .from('pong_lectionary_weeks')
      .select('*, pong_lectionary_days(*)')
      .eq('lectionary_year', yearParam)
      .eq('season', season)
      .eq('week_num', week)
      .eq('is_published', true)
      .single()
    if (error) return null
    return data
  }
)

const days = computed(() =>
  (weekData.value?.pong_lectionary_days || [])
    .slice()
    .sort((a, b) => a.day_of_week - b.day_of_week)
)

const activeDay = ref(0)
const currentDay = computed(() =>
  days.value.find(d => d.day_of_week === activeDay.value) || days.value[0] || null
)

const openReadings = ref({})
function toggleReading(i) {
  openReadings.value[i] = !openReadings.value[i]
}

// Open first reading of each day automatically
watch(activeDay, () => { openReadings.value = { 0: true } }, { immediate: true })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500&family=Noto+Serif+TC:wght@400;500;600&display=swap');

/* ── Base ────────────────────────────────────────────────── */
.wk-page {
  background-color: #F9F8F6;
  min-height: 100vh;
  font-family: 'Noto Sans TC', sans-serif;
  color: #2C2C2C;
}

/* ── Topbar ──────────────────────────────────────────────── */
.wk-topbar { padding: 20px 48px; border-bottom: 1px solid #DDD8CF; }
.wk-back { font-size: 0.8rem; color: #8A8278; text-decoration: none; letter-spacing: 0.06em; transition: color 0.2s; }
.wk-back:hover { color: #3A3025; }

/* ── Header ──────────────────────────────────────────────── */
.wk-header { padding: 56px 40px 48px; text-align: center; }
.wk-header-inner { max-width: 720px; margin: 0 auto; }
.wk-eyebrow {
  font-size: 0.72rem;
  font-weight: 300;
  color: rgba(255,255,255,0.7);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin: 0 0 12px;
}
.wk-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.8rem;
  font-weight: 500;
  color: #fff;
  letter-spacing: 0.12em;
  margin: 0 0 10px;
}
.wk-date {
  font-size: 0.82rem;
  font-weight: 300;
  color: rgba(255,255,255,0.75);
  letter-spacing: 0.08em;
  margin: 0;
}

/* ── Loading / Empty ─────────────────────────────────────── */
.wk-loading, .wk-empty {
  max-width: 720px;
  margin: 80px auto;
  text-align: center;
  font-size: 0.9rem;
  color: #A09280;
  letter-spacing: 0.06em;
  line-height: 2;
}
.wk-empty-sub { font-size: 0.75rem; color: #C0B8A8; }

/* ── Section label ───────────────────────────────────────── */
.wk-section-label {
  font-size: 0.68rem;
  font-weight: 300;
  color: #A09280;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin: 0 0 20px;
}

/* ── Intro letter ────────────────────────────────────────── */
.wk-intro { border-bottom: 1px solid #E8E4DC; }
.wk-intro-inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 40px;
}
.wk-intro-body {
  font-family: 'Noto Serif TC', serif;
  font-size: 1rem;
  line-height: 2;
  color: #3A3025;
}

/* ── Theme essay ─────────────────────────────────────────── */
.wk-essay { background-color: #F2EFE9; border-bottom: 1px solid #E8E4DC; }
.wk-essay-inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 40px;
}
.wk-essay-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.25rem;
  font-weight: 500;
  color: #2C2C2C;
  letter-spacing: 0.06em;
  margin: 0 0 24px;
}
.wk-essay-body {
  font-size: 0.95rem;
  line-height: 2;
  color: #3A3025;
}

/* ── Day section ─────────────────────────────────────────── */
.wk-days-section { padding: 40px 0 64px; }
.wk-days-inner { max-width: 760px; margin: 0 auto; padding: 0 24px; }

.wk-day-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 32px;
  border-bottom: 1px solid #E8E4DC;
  padding-bottom: 0;
}
.wk-day-tab {
  padding: 10px 16px;
  font-size: 0.78rem;
  font-weight: 300;
  color: #A09280;
  letter-spacing: 0.06em;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
  font-family: 'Noto Sans TC', sans-serif;
}
.wk-day-tab:hover { color: #3A3025; }
.wk-day-tab--active {
  color: #3A3025;
  font-weight: 500;
  border-bottom-color: #3A3025;
}

/* ── Reading accordion ───────────────────────────────────── */
.wk-reading {
  border: 1px solid #E8E4DC;
  border-radius: 4px;
  margin-bottom: 8px;
  overflow: hidden;
}
.wk-reading-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: 'Noto Sans TC', sans-serif;
  transition: background-color 0.15s;
}
.wk-reading-head:hover { background-color: #FAF8F4; }
.wk-reading-head--open { background-color: #F5F2EC; }

.wk-reading-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #E8E4DC;
  color: #7A7268;
  font-size: 0.65rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wk-reading-head--open .wk-reading-num { background: #3A3025; color: #fff; }

.wk-reading-ref { display: flex; align-items: baseline; gap: 6px; flex: 1; min-width: 0; }
.wk-reading-book {
  font-family: 'Noto Serif TC', serif;
  font-size: 0.9rem;
  font-weight: 500;
  color: #3A3025;
  letter-spacing: 0.04em;
}
.wk-reading-passage {
  font-size: 0.75rem;
  font-weight: 300;
  color: #9A9080;
  letter-spacing: 0.04em;
}
.wk-reading-title {
  font-size: 0.75rem;
  font-weight: 300;
  color: #7A7268;
  letter-spacing: 0.04em;
  margin-right: auto;
}
.wk-reading-chevron {
  font-size: 1.2rem;
  color: #C0B8A8;
  transition: transform 0.2s;
  line-height: 1;
  flex-shrink: 0;
}
.wk-reading-chevron.open { transform: rotate(90deg); }

.wk-reading-body {
  border-top: 1px solid #E8E4DC;
  padding: 24px 24px 28px;
  background: #FDFCFA;
}

/* Key verse */
.wk-key-verse {
  margin-bottom: 20px;
  padding: 16px 20px;
  background: #F5F2EC;
  border-left: 3px solid #C4B89A;
  border-radius: 2px;
}
.wk-key-verse-label {
  font-size: 0.65rem;
  font-weight: 500;
  color: #9A9080;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 8px;
}
.wk-key-verse-text {
  font-family: 'Noto Serif TC', serif;
  font-size: 0.95rem;
  font-weight: 400;
  color: #3A3025;
  line-height: 1.9;
  margin: 0;
  font-style: italic;
}

/* Scripture text */
.wk-scripture {
  font-size: 0.9rem;
  line-height: 2;
  color: #3A3025;
  margin-bottom: 20px;
  border-bottom: 1px solid #E8E4DC;
  padding-bottom: 20px;
}

/* Meditation */
.wk-meditation { }
.wk-meditation-label {
  font-size: 0.65rem;
  font-weight: 500;
  color: #9A9080;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin: 0 0 12px;
}
.wk-meditation {
  font-size: 0.88rem;
  line-height: 2;
  color: #4A4030;
}

/* ── Appendices ──────────────────────────────────────────── */
.wk-appendices {
  background: #F2EFE9;
  border-top: 1px solid #E8E4DC;
}
.wk-appendices-inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 40px;
}
.wk-appendix { margin-bottom: 32px; }
.wk-appendix:last-child { margin-bottom: 0; }
.wk-appendix-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 1rem;
  font-weight: 500;
  color: #3A3025;
  letter-spacing: 0.06em;
  margin: 0 0 16px;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 640px) {
  .wk-topbar { padding: 16px 20px; }
  .wk-header { padding: 40px 20px 36px; }
  .wk-title { font-size: 1.4rem; }
  .wk-intro-inner,
  .wk-essay-inner,
  .wk-appendices-inner { padding: 36px 20px; }
  .wk-days-inner { padding: 0 16px; }
  .wk-day-tab { padding: 10px 10px; font-size: 0.72rem; }
}
</style>
