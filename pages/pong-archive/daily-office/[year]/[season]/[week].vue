<template>
  <div class="wk-page">

    <div class="wk-topbar">
      <NuxtLink to="/pong-archive/daily-office" class="wk-back">← 三讀三禱</NuxtLink>
    </div>

    <header class="wk-header" :style="{ backgroundColor: seasonColor.bg }">
      <div class="wk-header-inner">
        <p class="wk-eyebrow">{{ yearLabel }}　·　{{ seasonColor.name }}</p>
        <h1 class="wk-title-main">{{ titleMain }}</h1>
        <p v-if="titleTheme" class="wk-title-theme">{{ titleTheme }}</p>
        <div class="wk-year-picker">
          <button
            v-for="y in nearbyYears"
            :key="y"
            class="wk-year-btn"
            :class="{ 'wk-year-btn--active': selectedChurchYear === y }"
            @click="selectedChurchYear = y"
          >{{ y }}</button>
        </div>
        <p v-if="dateRangeLabel" class="wk-date-range">{{ dateRangeLabel }}</p>
      </div>
    </header>

    <div v-if="pending" class="wk-loading">載入中…</div>

    <div v-else-if="!weekData" class="wk-empty">
      <p>經課資料尚未上傳</p>
      <p class="wk-empty-sub">{{ yearLabel }}　{{ seasonColor.name }}　第 {{ week }} 週</p>
    </div>

    <template v-else>

      <!-- Intro letter -->
      <section v-if="weekData.intro_letter" class="wk-intro">
        <div class="wk-intro-inner">
          <p class="wk-section-label">本週靈修引言</p>
          <div class="wk-intro-body" v-html="renderBody(weekData.intro_letter)"></div>
        </div>
      </section>

      <!-- Theme essay -->
      <section v-if="weekData.theme_essay" class="wk-essay">
        <div class="wk-essay-inner">
          <p class="wk-section-label">主題默想</p>
          <h2 v-if="weekData.theme_essay_title" class="wk-essay-title" v-html="essayTitleHtml"></h2>
          <div class="wk-essay-body" v-html="renderBody(weekData.theme_essay)"></div>
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
                <!-- 1. 經文 -->
                <div v-if="reading.text" class="wk-scripture" v-html="renderScripture(reading.text)"></div>
                <!-- 2. 默想 -->
                <div v-if="reading.meditation" class="wk-meditation">
                  <p class="wk-meditation-label">默想</p>
                  <div v-html="renderPara(reading.meditation)"></div>
                </div>
                <!-- 3. 金句（默想之後） -->
                <div v-if="reading.key_verse" class="wk-key-verse">
                  <span class="wk-key-verse-label">金句</span>
                  <blockquote class="wk-key-verse-text" v-html="renderKeyVerse(reading.key_verse)"></blockquote>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Appendices -->
      <section v-if="weekData.appendices?.length" class="wk-appendices">
        <div class="wk-appendices-inner">
          <div v-for="(app, i) in weekData.appendices" :key="i" class="wk-appendix">
            <h3 v-if="app.title" class="wk-appendix-title">{{ app.title }}</h3>
            <div v-if="app.body" class="wk-appendix-body" v-html="isHtml(app.body) ? app.body : renderPara(app.body)"></div>
          </div>
        </div>
      </section>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'
import {
  getChurchYearSundays,
  getCurrentChurchYear,
  SEASON_COLORS,
} from '~/composables/useChurchCalendar.js'

definePageMeta({ layout: 'pong-archive' })

const route = useRoute()
const yearParam = route.params.year
const season = route.params.season
const week = parseInt(route.params.week)

const YEAR_LABELS = { A: '甲年（Year A）', B: '乙年（Year B）', C: '丙年（Year C）' }
const DAY_LABELS = ['主日', '週一', '週二', '週三', '週四', '週五', '週六']
const CYCLE_OFFSET = { A: 0, B: 1, C: 2 }

const yearLabel = YEAR_LABELS[yearParam] || yearParam
const seasonColor = SEASON_COLORS[season] || SEASON_COLORS.pentecost

// ── Year selector ─────────────────────────────────────────────
const cycleTarget = (CYCLE_OFFSET[yearParam] ?? 0)
const allMatchingYears = Array.from({ length: 22 }, (_, i) => 2019 + i)
  .filter(y => ((y - 2022) % 3 + 3) % 3 === cycleTarget)

const todayChurchYear = getCurrentChurchYear()
const defaultYear = allMatchingYears.reduce((best, y) =>
  Math.abs(y - todayChurchYear) <= Math.abs(best - todayChurchYear) ? y : best
, allMatchingYears[0])

const nearbyYears = (() => {
  const idx = allMatchingYears.indexOf(defaultYear)
  const start = Math.max(0, idx - 1)
  return allMatchingYears.slice(start, Math.min(allMatchingYears.length, start + 4))
})()

const selectedChurchYear = ref(defaultYear)

const dateRangeLabel = computed(() => {
  const slots = getChurchYearSundays(selectedChurchYear.value)
  const idx = slots.findIndex(s => s.season === season && s.week === week)
  if (idx < 0) return ''
  const slot = slots[idx]
  if (!slot.sunday) return ''
  const start = slot.sunday
  const nextSun = slots[idx + 1]?.sunday
  const end = nextSun
    ? new Date(nextSun.getTime() - 86400000)
    : new Date(start.getTime() + 6 * 86400000)
  const sy = start.getFullYear(), sm = start.getMonth() + 1, sd = start.getDate()
  const em = end.getMonth() + 1, ed = end.getDate()
  return `${sy}年${sm}月${sd}日 – ${em}月${ed}日`
})

// ── Supabase ──────────────────────────────────────────────────
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
  (weekData.value?.pong_lectionary_days || []).slice().sort((a, b) => a.day_of_week - b.day_of_week)
)
const activeDay = ref(0)
const currentDay = computed(() =>
  days.value.find(d => d.day_of_week === activeDay.value) || days.value[0] || null
)
const openReadings = ref({})
function toggleReading(i) { openReadings.value[i] = !openReadings.value[i] }
watch(activeDay, () => { openReadings.value = { 0: true } }, { immediate: true })

// ── Title ─────────────────────────────────────────────────────
const titleMain = computed(() => {
  const t = weekData.value?.title || ''
  const idx = t.indexOf('（')
  return idx > 0 ? t.substring(0, idx) : (t || `${seasonColor.name}第${week}週`)
})
const titleTheme = computed(() => {
  const t = weekData.value?.title || ''
  const idx = t.indexOf('（')
  return idx >= 0 ? t.substring(idx) : ''
})
const essayTitleHtml = computed(() =>
  (weekData.value?.theme_essay_title || '').replace(/\n/g, '<br>')
)

// ── Rendering helpers ─────────────────────────────────────────
function isHtml(str) {
  return str && str.trimStart().startsWith('<')
}

// Scripture: each line becomes a verse paragraph
function renderScripture(text) {
  if (!text) return ''
  if (isHtml(text)) return text
  return text.split('\n').filter(l => l.trim()).map(line =>
    `<p class="wk-verse">${line}</p>`
  ).join('')
}

// Single-block text: wrap in <p> with no special indent
function renderPara(text) {
  if (!text) return ''
  if (isHtml(text)) return text
  return text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
}

// Intro letter / body with auto-detected signature
function renderBody(text) {
  if (!text) return ''
  if (isHtml(text)) return text
  const parts = text.split('\n\n')
  return parts.map((p, i) => {
    const content = p.replace(/\n/g, '<br>')
    const isSig = i === parts.length - 1 && (p.includes('主內') || p.includes('敬上') || p.includes('主恩'))
    return isSig ? `<p class="wk-signature">${content}</p>` : `<p>${content}</p>`
  }).join('')
}

// Key verse: lines joined with line break
function renderKeyVerse(text) {
  if (!text) return ''
  if (isHtml(text)) return text
  return text.split('\n').filter(Boolean).join('<br>')
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500&family=Noto+Serif+TC:wght@400;500;600&display=swap');

/* ── Base ─────────────────────────────────────────────────── */
.wk-page { background-color: #F9F8F6; min-height: 100vh; font-family: 'Noto Sans TC', sans-serif; color: #2C2C2C; }

/* ── Topbar ───────────────────────────────────────────────── */
.wk-topbar { padding: 20px 48px; border-bottom: 1px solid #DDD8CF; }
.wk-back { font-size: 0.8rem; color: #8A8278; text-decoration: none; letter-spacing: 0.06em; transition: color 0.2s; }
.wk-back:hover { color: #3A3025; }

/* ── Header ───────────────────────────────────────────────── */
.wk-header { padding: 48px 40px 40px; text-align: center; }
.wk-header-inner { max-width: 720px; margin: 0 auto; }
.wk-eyebrow { font-size: 0.72rem; font-weight: 300; color: rgba(255,255,255,0.7); letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 12px; }
.wk-title-main { font-family: 'Noto Serif TC', serif; font-size: 1.8rem; font-weight: 500; color: #fff; letter-spacing: 0.12em; margin: 0 0 6px; }
.wk-title-theme { font-family: 'Noto Serif TC', serif; font-size: 1.05rem; font-weight: 400; color: rgba(255,255,255,0.88); letter-spacing: 0.1em; margin: 0 0 22px; }

/* ── Year picker ──────────────────────────────────────────── */
.wk-year-picker { display: flex; gap: 6px; justify-content: center; margin-bottom: 8px; }
.wk-year-btn {
  padding: 4px 14px;
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 20px;
  background: transparent;
  color: rgba(255,255,255,0.65);
  font-size: 0.75rem;
  font-family: 'Noto Sans TC', sans-serif;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.15s;
}
.wk-year-btn:hover { border-color: rgba(255,255,255,0.7); color: #fff; }
.wk-year-btn--active { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.8); color: #fff; font-weight: 500; }
.wk-date-range { font-size: 0.78rem; font-weight: 300; color: rgba(255,255,255,0.7); letter-spacing: 0.08em; margin: 0; }

/* ── Loading / Empty ──────────────────────────────────────── */
.wk-loading, .wk-empty { max-width: 720px; margin: 80px auto; text-align: center; font-size: 0.9rem; color: #A09280; letter-spacing: 0.06em; line-height: 2; }
.wk-empty-sub { font-size: 0.75rem; color: #C0B8A8; }

/* ── Section label ────────────────────────────────────────── */
.wk-section-label { font-size: 0.68rem; font-weight: 300; color: #A09280; letter-spacing: 0.22em; text-transform: uppercase; margin: 0 0 20px; }

/* ── Intro letter ─────────────────────────────────────────── */
.wk-intro { border-bottom: 1px solid #E8E4DC; }
.wk-intro-inner { max-width: 720px; margin: 0 auto; padding: 48px 40px; }
.wk-intro-body { font-family: 'Noto Serif TC', serif; font-size: 1rem; line-height: 2.1; color: #3A3025; }
.wk-intro-body :deep(p) { text-indent: 2em; margin-bottom: 0.9em; }
.wk-intro-body :deep(.wk-signature) { text-indent: 0; text-align: right; margin-top: 2em; margin-bottom: 0; color: #5A5040; line-height: 1.9; }

/* ── Theme essay ──────────────────────────────────────────── */
.wk-essay { background-color: #F2EFE9; border-bottom: 1px solid #E8E4DC; }
.wk-essay-inner { max-width: 720px; margin: 0 auto; padding: 48px 40px; }
.wk-essay-title { font-family: 'Noto Serif TC', serif; font-size: 1.15rem; font-weight: 500; color: #2C2C2C; letter-spacing: 0.06em; line-height: 1.8; margin: 0 0 24px; }
.wk-essay-body { font-size: 0.95rem; line-height: 2.1; color: #3A3025; }
.wk-essay-body :deep(p) { text-indent: 2em; margin-bottom: 1em; }

/* ── Day section ──────────────────────────────────────────── */
.wk-days-section { padding: 40px 0 64px; }
.wk-days-inner { max-width: 760px; margin: 0 auto; padding: 0 24px; }
.wk-day-tabs { display: flex; gap: 4px; margin-bottom: 32px; border-bottom: 1px solid #E8E4DC; flex-wrap: wrap; }
.wk-day-tab {
  padding: 10px 14px;
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
  white-space: nowrap;
}
.wk-day-tab:hover { color: #3A3025; }
.wk-day-tab--active { color: #3A3025; font-weight: 500; border-bottom-color: #3A3025; }

/* ── Reading accordion ────────────────────────────────────── */
.wk-reading { border: 1px solid #E8E4DC; border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
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
.wk-reading-num { width: 22px; height: 22px; border-radius: 50%; background: #E8E4DC; color: #7A7268; font-size: 0.65rem; font-weight: 500; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wk-reading-head--open .wk-reading-num { background: #3A3025; color: #fff; }
.wk-reading-ref { display: flex; align-items: baseline; gap: 6px; flex: 1; min-width: 0; }
.wk-reading-book { font-family: 'Noto Serif TC', serif; font-size: 0.9rem; font-weight: 500; color: #3A3025; letter-spacing: 0.04em; }
.wk-reading-passage { font-size: 0.75rem; font-weight: 300; color: #9A9080; }
.wk-reading-title { font-size: 0.75rem; font-weight: 300; color: #7A7268; margin-right: auto; }
.wk-reading-chevron { font-size: 1.2rem; color: #C0B8A8; transition: transform 0.2s; line-height: 1; flex-shrink: 0; }
.wk-reading-chevron.open { transform: rotate(90deg); }
.wk-reading-body { border-top: 1px solid #E8E4DC; padding: 24px 24px 28px; background: #FDFCFA; }

/* Scripture */
.wk-scripture { margin-bottom: 24px; border-bottom: 1px solid #EDEAD5; padding-bottom: 20px; }
.wk-scripture :deep(.wk-verse) { font-family: 'Noto Serif TC', serif; font-size: 0.9rem; line-height: 1.95; color: #3A3025; margin: 0 0 0.35em; }

/* Meditation */
.wk-meditation { margin-bottom: 20px; }
.wk-meditation-label { font-size: 0.65rem; font-weight: 500; color: #9A9080; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 10px; }
.wk-meditation :deep(p) { font-size: 0.88rem; line-height: 2; color: #4A4030; margin-bottom: 0.6em; }

/* Key verse */
.wk-key-verse { padding: 16px 20px; background: #F5F2EC; border-left: 3px solid #C4B89A; border-radius: 2px; }
.wk-key-verse-label { font-size: 0.65rem; font-weight: 500; color: #9A9080; letter-spacing: 0.18em; text-transform: uppercase; display: block; margin-bottom: 8px; }
.wk-key-verse-text { font-family: 'Noto Serif TC', serif; font-size: 0.95rem; color: #3A3025; line-height: 2; margin: 0; }

/* ── Appendices ───────────────────────────────────────────── */
.wk-appendices { background: #F2EFE9; border-top: 1px solid #E8E4DC; }
.wk-appendices-inner { max-width: 720px; margin: 0 auto; padding: 48px 40px; }
.wk-appendix { margin-bottom: 48px; }
.wk-appendix:last-child { margin-bottom: 0; }
.wk-appendix-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 1rem;
  font-weight: 500;
  color: #3A3025;
  letter-spacing: 0.1em;
  margin: 0 0 16px;
  text-align: center;
}
.wk-appendix-body { font-size: 0.9rem; line-height: 1.95; color: #3A3025; }
.wk-appendix-body :deep(p) { margin-bottom: 0.8em; }
.wk-appendix-body :deep(table) { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 0.85rem; }
.wk-appendix-body :deep(th) { background: #EAE5DC; padding: 8px 12px; font-weight: 500; border: 1px solid #DDD8CF; text-align: left; font-family: 'Noto Sans TC', sans-serif; }
.wk-appendix-body :deep(td) { padding: 8px 12px; border: 1px solid #DDD8CF; vertical-align: top; line-height: 1.7; }
.wk-appendix-body :deep(tr:nth-child(even) td) { background: #F8F5F0; }
.wk-appendix-body :deep(.wk-lit-week) { font-family: 'Noto Serif TC', serif; font-size: 0.95rem; font-weight: 600; color: #4A3580; margin: 1.6em 0 0.5em; }
.wk-appendix-body :deep(.wk-lit-action) { font-style: italic; color: #7A7268; margin: 0.3em 0; }
.wk-appendix-body :deep(.wk-lit-note) { font-size: 0.82rem; color: #8A8278; margin-top: 1.2em; border-top: 1px solid #DDD8CF; padding-top: 0.8em; }
.wk-appendix-body :deep(.wk-disc-author) { color: #8A8278; font-size: 0.82rem; margin-bottom: 1.2em; text-align: right; }
.wk-appendix-body :deep(.wk-disc-subtitle) { font-family: 'Noto Serif TC', serif; font-size: 0.95rem; font-weight: 600; color: #3A3025; margin: 1.8em 0 0.6em; }

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 640px) {
  .wk-topbar { padding: 16px 20px; }
  .wk-header { padding: 36px 20px 32px; }
  .wk-title-main { font-size: 1.4rem; }
  .wk-intro-inner, .wk-essay-inner, .wk-appendices-inner { padding: 36px 20px; }
  .wk-days-inner { padding: 0 16px; }
  .wk-day-tab { padding: 8px 10px; font-size: 0.72rem; }
}
</style>
