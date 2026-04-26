<template>
  <div class="dw-page">
    <div class="dw-topbar">
      <NuxtLink to="/pong-archive/daily-office" class="dw-back">← 三讀三禱</NuxtLink>
    </div>

    <header class="dw-header" :style="{ backgroundColor: seasonColor.bg }">
      <div class="dw-header-inner">
        <p class="dw-eyebrow">{{ seasonColor.name }}</p>
        <h1 class="dw-title">{{ slotInfo?.label || '—' }}</h1>
        <p class="dw-date" v-if="slotInfo?.sunday">{{ formatDate(slotInfo.sunday) }}</p>
      </div>
    </header>

    <div class="dw-coming-soon">
      <p>經課資料尚未上傳</p>
      <p class="dw-coming-soon-sub">節期：{{ route.params.season }}　週次：{{ route.params.week }}</p>
    </div>
  </div>
</template>

<script setup>
import {
  getChurchYearSundays,
  getCurrentChurchYear,
  getLectionaryYear,
  SEASON_COLORS,
  fmt,
} from '~/composables/useChurchCalendar.js'

definePageMeta({ layout: 'pong-archive' })

const route = useRoute()
const season = route.params.season
const week = parseInt(route.params.week)

const churchYear = getCurrentChurchYear()
const slots = getChurchYearSundays(churchYear)
const slotInfo = slots.find(s => s.season === season && s.week === week) || null
const seasonColor = SEASON_COLORS[season] || SEASON_COLORS.pentecost

function formatDate(d) {
  if (!d) return ''
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500&family=Noto+Serif+TC:wght@400;500;600&display=swap');

.dw-page { background-color: #F9F8F6; min-height: 100vh; font-family: 'Noto Sans TC', sans-serif; }
.dw-topbar { padding: 20px 48px; border-bottom: 1px solid #DDD8CF; }
.dw-back { font-size: 0.8rem; color: #8A8278; text-decoration: none; letter-spacing: 0.06em; transition: color 0.2s; }
.dw-back:hover { color: #3A3025; }

.dw-header { padding: 56px 40px 48px; text-align: center; }
.dw-header-inner { max-width: 720px; margin: 0 auto; }
.dw-eyebrow { font-size: 0.72rem; font-weight: 300; color: rgba(255,255,255,0.7); letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 12px; }
.dw-title { font-family: 'Noto Serif TC', serif; font-size: 1.8rem; font-weight: 500; color: #fff; letter-spacing: 0.12em; margin: 0 0 10px; }
.dw-date { font-size: 0.82rem; font-weight: 300; color: rgba(255,255,255,0.75); letter-spacing: 0.08em; margin: 0; }

.dw-coming-soon {
  max-width: 720px;
  margin: 80px auto;
  text-align: center;
  font-size: 0.9rem;
  color: #A09280;
  letter-spacing: 0.06em;
  line-height: 2;
}
.dw-coming-soon-sub { font-size: 0.75rem; color: #C0B8A8; }
</style>
