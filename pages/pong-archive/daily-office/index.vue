<template>
  <div class="do-page">

    <div class="do-topbar">
      <NuxtLink to="/pong-archive" class="do-back">← 返回典藏首頁</NuxtLink>
    </div>

    <header class="do-header">
      <p class="do-eyebrow">Daily Office</p>
      <h1 class="do-title">三讀三禱</h1>
      <p class="do-subtitle">每日經課與祈禱文</p>
    </header>

    <!-- ── 今日經課 banner ────────────────────────────────── -->
    <section class="do-today" :style="{ backgroundColor: todayColor.bg }">
      <div class="do-today-inner">
        <div class="do-today-meta">
          <span class="do-today-cycle">{{ todayCycleLabel }}</span>
          <span class="do-today-sep">·</span>
          <span class="do-today-season">{{ todaySlot?.seasonZh || '—' }}</span>
        </div>
        <div class="do-today-date">{{ todayDateLabel }}</div>
        <div class="do-today-label">{{ todaySlot?.label || '計算中…' }}</div>
        <NuxtLink
          v-if="todaySlot"
          :to="`/pong-archive/daily-office/${todaySlot.season}/${todaySlot.week}`"
          class="do-today-btn"
        >
          今日經課 →
        </NuxtLink>
      </div>
    </section>

    <!-- ── 三個圓餅圖 ──────────────────────────────────────── -->
    <section class="do-wheels-section">
      <div class="do-wheels-grid">
        <div v-for="cy in chartYears" :key="cy.churchYear" class="do-wheel-wrap">
          <div class="do-wheel-label">
            <span class="do-wheel-cycle">{{ cy.cycle }}年</span>
            <span class="do-wheel-en">Year {{ cy.cycleEn }}</span>
            <span class="do-wheel-gospel">{{ cy.gospel }}</span>
          </div>

          <div class="do-wheel-container">
            <svg
              viewBox="-1 -1 2 2"
              class="do-wheel-svg"
              @mouseleave="tooltip = null"
            >
              <g v-for="(slot, i) in cy.slots" :key="i">
                <path
                  :d="slot.path"
                  :fill="slot.color"
                  :opacity="slot.optional ? 0.22 : 1"
                  :stroke="slot.optional ? '#ccc' : '#F9F8F6'"
                  stroke-width="0.006"
                  class="do-slice"
                  :class="{ 'do-slice--active': !slot.optional }"
                  @mouseenter="onSliceHover($event, slot, cy)"
                  @click="onSliceClick(slot)"
                  :style="slot.optional ? {} : { cursor: 'pointer' }"
                />
              </g>
              <!-- 中心圓 -->
              <circle cx="0" cy="0" r="0.38" fill="#F9F8F6" />
              <text x="0" y="-0.04" text-anchor="middle" class="do-center-text-main">{{ cy.cycle }}年</text>
              <text x="0" y="0.1" text-anchor="middle" class="do-center-text-sub">{{ cy.gospel }}</text>
            </svg>

            <!-- Tooltip -->
            <div
              v-if="tooltip && tooltip.churchYear === cy.churchYear"
              class="do-tooltip"
              :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
            >
              <span class="do-tooltip-label">{{ tooltip.label }}</span>
              <span v-if="tooltip.dateRange" class="do-tooltip-date">{{ tooltip.dateRange }}</span>
              <span v-if="tooltip.optional" class="do-tooltip-na">本年不適用</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 色票說明 -->
    <section class="do-legend">
      <div class="do-legend-inner">
        <div v-for="(v, k) in SEASON_COLORS" :key="k" class="do-legend-item">
          <span class="do-legend-dot" :style="{ backgroundColor: v.bg }"></span>
          <span class="do-legend-name">{{ v.name }}</span>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  getChurchYearSundays,
  getLectionaryYear,
  getLectionaryYearEn,
  getCurrentChurchYear,
  findTodaySlot,
  SEASON_COLORS,
  fmt,
} from '~/composables/useChurchCalendar.js'

definePageMeta({ layout: 'pong-archive' })

// ── 今日資訊 ──────────────────────────────────────────────
const today = new Date()
const { churchYear: todayChurchYear, slot: todaySlot } = findTodaySlot(today)
const todayCycle = getLectionaryYear(todayChurchYear)
const todayCycleEn = getLectionaryYearEn(todayChurchYear)
const todayCycleLabel = `${todayCycle}年（Year ${todayCycleEn}）`
const todayColor = computed(() =>
  todaySlot ? (SEASON_COLORS[todaySlot.season] || SEASON_COLORS.pentecost) : SEASON_COLORS.advent
)
const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
const todayDateLabel = `${today.getFullYear()} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日　${weekdays[today.getDay()]}`

// ── 圓餅圖資料 ────────────────────────────────────────────
// 顯示目前所在教會年的甲乙丙（當前、前一、後一）
const gospels = { 甲: '馬太年', 乙: '馬可年', 丙: '路加年' }

function buildChartYear(churchYear) {
  const cycle = getLectionaryYear(churchYear)
  const cycleEn = getLectionaryYearEn(churchYear)
  const rawSlots = getChurchYearSundays(churchYear)
  const total = rawSlots.length
  const anglePerSlice = (2 * Math.PI) / total
  const startAngle = -Math.PI / 2 // 從頂部開始

  const slots = rawSlots.map((slot, i) => {
    const a1 = startAngle + i * anglePerSlice
    const a2 = a1 + anglePerSlice
    const r = 0.95
    const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r
    const x2 = Math.cos(a2) * r, y2 = Math.sin(a2) * r
    const path = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`
    const color = slot.optional
      ? '#D8D3C8'
      : (SEASON_COLORS[slot.season]?.bg || '#888')

    // 日期範圍文字
    let dateRange = null
    if (slot.sunday) {
      dateRange = fmt(slot.sunday)
    }

    return { ...slot, path, color, dateRange, churchYear }
  })

  return { churchYear, cycle, cycleEn, gospel: gospels[cycle], slots }
}

// 找出甲乙丙三年（以目前教會年為中心，找 -2 到 +2 範圍內的甲乙丙各一）
function findThreeCycleYears(baseChurchYear) {
  const result = {}
  for (let offset = -3; offset <= 3; offset++) {
    const cy = baseChurchYear + offset
    const c = getLectionaryYear(cy)
    if (!result[c]) result[c] = cy
  }
  return ['甲', '乙', '丙'].map(c => buildChartYear(result[c]))
}

const chartYears = findThreeCycleYears(todayChurchYear)

// ── Tooltip ───────────────────────────────────────────────
const tooltip = ref(null)

function onSliceHover(event, slot, cy) {
  const rect = event.currentTarget.closest('.do-wheel-container').getBoundingClientRect()
  const svgRect = event.currentTarget.closest('svg').getBoundingClientRect()
  tooltip.value = {
    churchYear: cy.churchYear,
    label: slot.label,
    dateRange: slot.dateRange,
    optional: slot.optional,
    x: event.clientX - svgRect.left + 12,
    y: event.clientY - svgRect.top - 8,
  }
}

function onSliceClick(slot) {
  if (slot.optional) return
  navigateTo(`/pong-archive/daily-office/${slot.season}/${slot.week}`)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500&family=Noto+Serif+TC:wght@400;500;600&display=swap');

.do-page {
  background-color: #F9F8F6;
  min-height: 100vh;
  font-family: 'Noto Sans TC', sans-serif;
  color: #2C2C2C;
}

/* ── Topbar ─────────────────────────────────────────────── */
.do-topbar { padding: 20px 48px; border-bottom: 1px solid #DDD8CF; }
.do-back { font-size: 0.8rem; color: #8A8278; text-decoration: none; letter-spacing: 0.06em; transition: color 0.2s; }
.do-back:hover { color: #3A3025; }

/* ── Header ─────────────────────────────────────────────── */
.do-header { text-align: center; padding: 56px 40px 40px; border-bottom: 1px solid #E8E4DC; }
.do-eyebrow { font-size: 0.72rem; font-weight: 300; color: #A09280; letter-spacing: 0.22em; text-transform: uppercase; margin: 0 0 10px; }
.do-title { font-family: 'Noto Serif TC', serif; font-size: 2rem; font-weight: 500; color: #2C2C2C; letter-spacing: 0.12em; margin: 0 0 10px; }
.do-subtitle { font-size: 0.85rem; font-weight: 300; color: #7A7268; letter-spacing: 0.06em; margin: 0; }

/* ── Today Banner ───────────────────────────────────────── */
.do-today {
  transition: background-color 0.4s;
}
.do-today-inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.do-today-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.72rem;
  font-weight: 300;
  color: rgba(255,255,255,0.75);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.do-today-sep { opacity: 0.5; }
.do-today-date {
  font-size: 0.82rem;
  font-weight: 300;
  color: rgba(255,255,255,0.85);
  letter-spacing: 0.1em;
}
.do-today-label {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.5rem;
  font-weight: 500;
  color: #fff;
  letter-spacing: 0.12em;
  margin: 4px 0 8px;
}
.do-today-btn {
  display: inline-block;
  padding: 8px 24px;
  border: 1.5px solid rgba(255,255,255,0.6);
  color: #fff;
  text-decoration: none;
  font-size: 0.78rem;
  font-weight: 300;
  letter-spacing: 0.12em;
  border-radius: 2px;
  transition: background-color 0.2s, border-color 0.2s;
}
.do-today-btn:hover { background-color: rgba(255,255,255,0.15); border-color: #fff; }

/* ── Wheels ─────────────────────────────────────────────── */
.do-wheels-section {
  padding: 56px 24px 40px;
  max-width: 1100px;
  margin: 0 auto;
}
.do-wheels-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  align-items: start;
}
.do-wheel-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.do-wheel-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.do-wheel-cycle {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.1rem;
  font-weight: 500;
  color: #3A3025;
  letter-spacing: 0.1em;
}
.do-wheel-en { font-size: 0.68rem; font-weight: 300; color: #A09280; letter-spacing: 0.16em; text-transform: uppercase; }
.do-wheel-gospel { font-size: 0.75rem; font-weight: 300; color: #7A7268; letter-spacing: 0.06em; margin-top: 2px; }

.do-wheel-container {
  position: relative;
  width: 100%;
  max-width: 300px;
}
.do-wheel-svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.do-slice { transition: opacity 0.15s; }
.do-slice--active:hover { opacity: 0.82 !important; }

.do-center-text-main {
  font-family: 'Noto Serif TC', serif;
  font-size: 0.14px;
  font-weight: 500;
  fill: #3A3025;
  letter-spacing: 0.01em;
}
.do-center-text-sub {
  font-size: 0.1px;
  font-weight: 300;
  fill: #7A7268;
}

/* ── Tooltip ─────────────────────────────────────────────── */
.do-tooltip {
  position: absolute;
  pointer-events: none;
  background: rgba(40, 30, 20, 0.92);
  color: #fff;
  padding: 8px 12px;
  border-radius: 3px;
  font-size: 0.75rem;
  line-height: 1.6;
  white-space: nowrap;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 2px;
  backdrop-filter: blur(4px);
}
.do-tooltip-label { font-weight: 500; letter-spacing: 0.06em; }
.do-tooltip-date { font-weight: 300; color: rgba(255,255,255,0.65); font-size: 0.68rem; }
.do-tooltip-na { font-weight: 300; color: rgba(255,200,150,0.85); font-size: 0.68rem; }

/* ── Legend ─────────────────────────────────────────────── */
.do-legend {
  padding: 24px 40px 48px;
  border-top: 1px solid #E8E4DC;
}
.do-legend-inner {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 16px 28px;
  justify-content: center;
}
.do-legend-item { display: flex; align-items: center; gap: 8px; }
.do-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.do-legend-name { font-size: 0.75rem; font-weight: 300; color: #7A7268; letter-spacing: 0.06em; }

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 768px) {
  .do-wheels-grid { grid-template-columns: 1fr; gap: 40px; }
  .do-wheel-container { max-width: 280px; }
  .do-topbar { padding: 16px 20px; }
  .do-today-inner { padding: 32px 20px; }
}
</style>
