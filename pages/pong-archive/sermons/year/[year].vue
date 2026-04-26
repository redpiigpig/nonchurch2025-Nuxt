<template>
  <div class="sy-page">
    <div class="sy-topbar">
      <NuxtLink to="/pong-archive/sermons" class="sy-back">← 講道集</NuxtLink>
    </div>

    <header class="sy-header">
      <p class="sy-eyebrow">Church Year</p>
      <h1 class="sy-title">{{ year }}–{{ year + 1 }} 教會年</h1>
      <p class="sy-range">{{ churchYearRange }}</p>
    </header>

    <div v-if="!isValidYear" class="sy-error">
      年份超出典藏範圍（2000–2001 至 2025–2026）
    </div>

    <section v-else class="sy-body">
      <div
        v-for="group in groupedWeeks"
        :key="group.seasonKey + group.index"
        class="sy-season-group"
      >
        <div class="sy-season-header" :style="{ backgroundColor: group.color }">
          <div class="sy-season-name-wrap">
            <span class="sy-season-name">{{ group.seasonName }}</span>
            <span class="sy-season-en">{{ group.seasonEn }}</span>
          </div>
          <span class="sy-season-count">{{ group.sundayCount }} 主日</span>
        </div>

        <div class="sy-weeks">
          <template v-for="entry in group.entries" :key="entry.dateStr + entry.specialName">

            <!-- 特殊日期行 -->
            <div
              v-if="entry.isSpecial"
              class="sy-week-row sy-week-row--special"
              :class="{ 'sy-week-row--funeral': entry.isFuneral }"
            >
              <span class="sy-bar" :style="{ backgroundColor: entry.specialColor }"></span>
              <span class="sy-week-label">{{ entry.specialName }}<span class="sy-week-en">{{ entry.specialEn }}</span></span>
              <span class="sy-week-date">{{ entry.dateStr }}</span>
              <span class="sy-week-empty">{{ entry.statusLabel }}</span>
            </div>

            <!-- 主日行 -->
            <div v-else class="sy-week-row">
              <span class="sy-bar" :style="{ backgroundColor: entry.barColor || group.color }"></span>
              <span class="sy-week-label">{{ entry.weekLabel }}<span v-if="entry.weekEn" class="sy-week-en">{{ entry.weekEn }}</span></span>
              <span class="sy-week-date">{{ entry.dateStr }}</span>
              <span class="sy-week-empty">尚無記錄</span>
            </div>

          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({ layout: 'pong-archive' })

const route = useRoute()
const year = parseInt(route.params.year)
const isValidYear = year >= 2000 && year <= 2025

// 典藏截止：告別式當日 2026年1月31日（六）
// 主日迴圈在 1月25日（日）終止，告別式特殊列顯示在 1月31日
const ARCHIVE_CUTOFF = new Date(2026, 0, 31)

// ── 曆算工具函式 ──────────────────────────────────────────

function getAdvent1(y) {
  const nov30 = new Date(y, 10, 30)
  const dow = nov30.getDay()
  const offset = dow === 0 ? 0 : dow <= 3 ? -dow : 7 - dow
  const d = new Date(nov30)
  d.setDate(nov30.getDate() + offset)
  return d
}

function getEaster(y) {
  const a = y % 19
  const b = Math.floor(y / 100)
  const c = y % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(y, month - 1, day)
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function dateEqual(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function fmtDate(d) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

const DOW_ZH = ['（日）', '（一）', '（二）', '（三）', '（四）', '（五）', '（六）']

const CH = ['○','一','二','三','四','五','六','七','八','九','十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
  '二十一','二十二','二十三','二十四','二十五','二十六','二十七','二十八']
function cn(n) { return CH[n] ?? String(n) }

// ── 節期設定 ──────────────────────────────────────────────

const SEASONS = {
  advent:    { name: '將臨期',   en: 'Advent',         color: '#5B3F8A' },
  christmas: { name: '聖誕期',   en: 'Christmastide',  color: '#A07828' },
  epiphany:  { name: '顯現期',   en: 'Epiphanytide',   color: '#2A6E3A' },
  lent:      { name: '大齋期',   en: 'Lent',           color: '#7B2D6E' },
  easter:    { name: '復活期',   en: 'Eastertide',     color: '#A07828' },
  pentecost: { name: '聖靈降臨期', en: 'Ordinary Time', color: '#2A6E3A' },
}

function sundayEn(sk, n, isDec25, isPentecost, isChristKing) {
  if (sk === 'christmas' && isDec25)   return 'Christmas Day'
  if (sk === 'epiphany'  && n === 1)   return 'Baptism of the Lord'
  if (sk === 'lent'      && n === 6)   return 'Palm Sunday'
  if (sk === 'easter'    && n === 1)   return 'Easter Sunday'
  if (sk === 'easter'    && isPentecost) return 'Pentecost Sunday'
  if (sk === 'pentecost' && n === 1)   return 'Trinity Sunday'
  if (isChristKing)                    return 'Christ the King'
  return ''
}

function sundayLabel(sk, n, isDec25, isPentecost, isChristKing) {
  switch (sk) {
    case 'advent':    return `將臨期第${cn(n)}主日`
    case 'christmas': return isDec25 ? '聖誕節主日' : `聖誕期第${cn(n)}主日`
    case 'epiphany':  return n === 1 ? '耶穌受洗主日' : `顯現期第${cn(n)}主日`
    case 'lent':      return n === 6 ? '棕枝主日' : `大齋期第${cn(n)}主日`
    case 'easter':
      if (n === 1) return '復活節主日'
      if (isPentecost) return '聖靈降臨節'
      return `復活期第${cn(n)}主日`
    case 'pentecost':
      if (n === 1) return '三一主日'
      if (isChristKing) return '基督普世君王日'
      return `聖靈降臨後第${cn(n - 1)}主日`
    default: return ''
  }
}

// ── 建立教會年完整列表（主日 + 特殊日）──────────────────────

function buildChurchYear(y) {
  const ny          = y + 1
  const christmas   = new Date(y,  11, 25)
  const epiphanyDay = new Date(ny,  0,  6)
  const easter      = getEaster(ny)
  const ashWed      = addDays(easter, -46)   // 聖灰星期三（always 星期三）
  const lent1       = addDays(ashWed,  4)    // 大齋期第一主日
  const pentecost   = addDays(easter, 49)    // 聖靈降臨節
  const goodFriday  = addDays(easter, -2)    // 受難日（always 星期五）

  const advent1Next = getAdvent1(y + 1)
  const naturalEnd  = addDays(advent1Next, -1)
  const end         = naturalEnd < ARCHIVE_CUTOFF ? naturalEnd : ARCHIVE_CUTOFF

  // ── 主日條目 ──────────────────────────────────────────
  const entries = []
  const skCounts = {}
  let cur = new Date(getAdvent1(y))

  while (cur <= end) {
    const t = cur.getTime()
    let sk
    if      (t < christmas.getTime())   sk = 'advent'
    else if (t < epiphanyDay.getTime()) sk = 'christmas'
    else if (t < lent1.getTime())       sk = 'epiphany'
    else if (t < easter.getTime())      sk = 'lent'
    else if (t <= pentecost.getTime())  sk = 'easter'
    else                                 sk = 'pentecost'

    skCounts[sk] = (skCounts[sk] ?? 0) + 1
    const n = skCounts[sk]

    const isDec25      = cur.getMonth() === 11 && cur.getDate() === 25
    const isPent       = dateEqual(cur, pentecost)
    const isChristKing = sk === 'pentecost' && dateEqual(addDays(cur, 7), advent1Next)

    // 特殊主日禮儀顏色覆蓋
    let barColor = null
    if (sk === 'epiphany'  && n === 1)  barColor = '#A07828'  // 主受洗主日：金
    if (sk === 'lent'      && n === 6)  barColor = '#B22020'  // 棕枝主日：紅
    if (sk === 'pentecost' && n === 1)  barColor = '#A07828'  // 三一主日：金
    if (isChristKing)                   barColor = '#A07828'  // 基督普世君王日：金

    entries.push({
      date:        new Date(cur),
      dateStr:     fmtDate(cur),
      isSpecial:   false,
      seasonKey:   sk,
      weekLabel:   sundayLabel(sk, n, isDec25, isPent, isChristKing),
      weekEn:      sundayEn(sk, n, isDec25, isPent, isChristKing),
      barColor,
      statusLabel: '尚無記錄',
    })
    cur = addDays(cur, 7)
  }

  // ── 特殊日條目 ─────────────────────────────────────────
  const specials = []

  // 平安夜（12月24日，只在非主日時加入）
  const christmasEve = new Date(y, 11, 24)
  if (christmasEve.getDay() !== 0 && christmasEve <= end) {
    specials.push({
      date:        christmasEve,
      dateStr:     fmtDate(christmasEve) + DOW_ZH[christmasEve.getDay()],
      isSpecial:   true,
      seasonKey:   'christmas',
      specialName: '平安夜禮拜',
      specialEn:   'Christmas Eve',
      specialColor:'#A07828',
      statusLabel: '尚無記錄',
    })
  }

  // 聖灰星期三（大齋期首日）
  if (ashWed <= end) {
    specials.push({
      date:        ashWed,
      dateStr:     fmtDate(ashWed) + DOW_ZH[ashWed.getDay()],
      isSpecial:   true,
      seasonKey:   'lent',
      specialName: '聖灰日',
      specialEn:   'Ash Wednesday',
      specialColor:'#6B4A90',
      statusLabel: '尚無記錄',
    })
  }

  // 受難日
  if (goodFriday <= end) {
    specials.push({
      date:        goodFriday,
      dateStr:     fmtDate(goodFriday) + DOW_ZH[goodFriday.getDay()],
      isSpecial:   true,
      seasonKey:   'lent',
      specialName: '受難日禮拜',
      specialEn:   'Good Friday',
      specialColor:'#8B1818',
      statusLabel: '尚無記錄',
    })
  }

  // 龐君華會督就任禮拜（2019年5月25日，六，中華基督教衛理公會會督）
  // 教會年 2018-2019，節期：復活期
  if (y === 2018) {
    const installation = new Date(2019, 4, 25) // May 25, 2019
    if (installation <= end) {
      specials.push({
        date:        installation,
        dateStr:     fmtDate(installation) + DOW_ZH[installation.getDay()],
        isSpecial:   true,
        seasonKey:   'easter',
        specialName: '龐君華會督就任禮拜',
        specialEn:   'Installation Service',
        specialColor:'#B22020',
        statusLabel: '尚無記錄',
      })
    }
  }

  // 告別式（僅 2025–2026 教會年）
  if (y === 2025) {
    const funeral = new Date(2026, 0, 31)
    specials.push({
      date:        funeral,
      dateStr:     fmtDate(funeral) + DOW_ZH[funeral.getDay()],
      isSpecial:   true,
      isFuneral:   true,
      seasonKey:   'epiphany',
      specialName: '龐君華會督告別式',
      specialEn:   'Funeral Service',
      specialColor:'#3A3530',
      statusLabel: '',
    })
  }

  // 合併排序
  const all = [...entries, ...specials].sort((a, b) => a.date - b.date)
  return all
}

// ── Computed ──────────────────────────────────────────────

const allEntries = computed(() => isValidYear ? buildChurchYear(year) : [])

const groupedWeeks = computed(() => {
  const groups = []
  let curKey = null
  let curGroup = null
  let groupIndex = 0

  for (const entry of allEntries.value) {
    if (entry.seasonKey !== curKey) {
      curKey = entry.seasonKey
      const s = SEASONS[curKey]
      curGroup = {
        index:       groupIndex++,
        seasonKey:   curKey,
        seasonName:  s.name,
        seasonEn:    s.en,
        color:       s.color,
        sundayCount: 0,
        entries:     [],
      }
      groups.push(curGroup)
    }
    curGroup.entries.push(entry)
    if (!entry.isSpecial) curGroup.sundayCount++
  }
  return groups
})

const churchYearRange = computed(() => {
  if (!isValidYear) return ''
  const start      = getAdvent1(year)
  const naturalEnd = addDays(getAdvent1(year + 1), -1)
  const end        = naturalEnd < ARCHIVE_CUTOFF ? naturalEnd : ARCHIVE_CUTOFF
  return `${fmtDate(start)} — ${fmtDate(end)}`
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500&family=Noto+Serif+TC:wght@400;500;600&display=swap');

.sy-page {
  background-color: #F9F8F6;
  min-height: 100vh;
  font-family: 'Noto Sans TC', sans-serif;
  color: #2C2C2C;
}

/* ── Top bar ───────────────────────────────────────────── */
.sy-topbar {
  padding: 20px 48px;
  border-bottom: 1px solid #DDD8CF;
}
.sy-back {
  font-size: 0.8rem;
  color: #8A8278;
  text-decoration: none;
  letter-spacing: 0.06em;
  transition: color 0.2s;
}
.sy-back:hover { color: #3A3025; }

/* ── Header ────────────────────────────────────────────── */
.sy-header {
  text-align: center;
  padding: 56px 40px 40px;
  border-bottom: 1px solid #E8E4DC;
}
.sy-eyebrow {
  font-size: 0.72rem;
  font-weight: 300;
  color: #A09280;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin: 0 0 10px;
}
.sy-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 2rem;
  font-weight: 500;
  color: #2C2C2C;
  letter-spacing: 0.12em;
  margin: 0 0 10px;
}
.sy-range {
  font-size: 0.82rem;
  font-weight: 300;
  color: #8A8278;
  letter-spacing: 0.06em;
  margin: 0;
}

/* ── Error ─────────────────────────────────────────────── */
.sy-error {
  text-align: center;
  padding: 80px 40px;
  color: #8A8278;
  font-size: 0.9rem;
}

/* ── Body ──────────────────────────────────────────────── */
.sy-body {
  max-width: 860px;
  margin: 0 auto;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  gap: 36px;
}

/* ── Season group ──────────────────────────────────────── */
.sy-season-group {
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #DDD8CF;
}
.sy-season-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  color: #fff;
}
.sy-season-name-wrap {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.sy-season-name {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.1em;
}
.sy-season-en {
  font-size: 0.7rem;
  font-weight: 300;
  letter-spacing: 0.14em;
  opacity: 0.85;
  text-transform: uppercase;
}
.sy-season-count {
  font-size: 0.72rem;
  font-weight: 300;
  opacity: 0.85;
  letter-spacing: 0.08em;
}

/* ── Weeks wrapper ─────────────────────────────────────── */
.sy-weeks {
  background-color: #FAFAF8;
}

/* ── 共用列格線（主日 + 特殊日統一 4 欄）──────────────── */
/* bar(4px) | 中文+英文(1fr) | 日期(auto) | 記錄(auto) */
.sy-week-row,
.sy-week-row--special {
  display: grid;
  grid-template-columns: 4px 1fr auto auto;
  align-items: center;
  gap: 0 16px;
  padding: 0 20px 0 0;
  border-bottom: 1px solid #EDEAE4;
  min-height: 48px;
  transition: background-color 0.15s;
}
.sy-week-row:last-child,
.sy-week-row--special:last-child { border-bottom: none; }
.sy-week-row:hover        { background-color: #F2EFE9; }
.sy-week-row--special:hover { background-color: #EDE8E0; }

.sy-week-row--special {
  min-height: 40px;
  background-color: #F4F1EC;
}

.sy-bar {
  align-self: stretch;
  width: 4px;
  flex-shrink: 0;
}

/* 中文名稱（主日週標 + 特殊日中文名共用） */
.sy-week-label {
  font-family: 'Noto Serif TC', serif;
  font-size: 0.9rem;
  color: #2C2C2C;
  letter-spacing: 0.06em;
  padding: 13px 0 13px 14px;
}

/* 英文標籤：接在中文後，2rem 間距 */
.sy-week-en {
  margin-left: 2rem;
  font-size: 0.68rem;
  color: #9A9080;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}

.sy-week-date {
  font-size: 0.78rem;
  color: #7A7268;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.sy-week-empty {
  font-size: 0.7rem;
  color: #C0B8B0;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-align: right;
}

/* ── 告別式行 ──────────────────────────────────────────── */
.sy-week-row--funeral {
  background-color: #EFEBE4;
  border-top: 2px solid #8A8278;
}
.sy-week-row--funeral .sy-special-name {
  color: #2C2824;
  font-weight: 500;
}
.sy-week-row--funeral .sy-week-date {
  color: #5A5450;
}
.sy-week-row--funeral .sy-special-en {
  color: #7A7268;
}

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 640px) {
  .sy-topbar { padding: 16px 20px; }
  .sy-body { padding: 24px 16px; }

  .sy-week-row,
  .sy-week-row--special {
    grid-template-columns: 4px 1fr auto;
  }
  .sy-week-en   { display: none; }
  .sy-week-empty { display: none; }
}
</style>
