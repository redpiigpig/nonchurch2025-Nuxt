<template>
  <div class="si-page">
    <div class="si-topbar">
      <NuxtLink to="/pong-archive" class="si-back">← 返回典藏首頁</NuxtLink>
    </div>

    <header class="si-header">
      <p class="si-eyebrow">Sermons</p>
      <h1 class="si-title">講道集</h1>
      <p class="si-subtitle">龐君華會督 2000–2001 至 2025–2026 教會年歷年講道</p>
    </header>

    <section class="si-section">
      <div class="si-grid">
        <NuxtLink
          v-for="y in years"
          :key="y.year"
          :to="`/pong-archive/sermons/${y.year}`"
          class="si-card"
        >
          <span class="si-year-label">{{ y.year }}–{{ y.year + 1 }}</span>
          <span class="si-count">{{ y.count > 0 ? `${y.count} 篇` : '—' }}</span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'pong-archive' })

// TODO: 從 Supabase 查詢各教會年講道篇數
// URL param = Advent start year (2000 → church year 2000-2001)
const years = Array.from({ length: 26 }, (_, i) => ({
  year: 2000 + i,
  count: 0,
}))
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500&family=Noto+Serif+TC:wght@400;500;600&display=swap');

.si-page {
  background-color: #F9F8F6;
  min-height: 100vh;
  font-family: 'Noto Sans TC', sans-serif;
  color: #2C2C2C;
}

.si-topbar {
  padding: 20px 48px;
  border-bottom: 1px solid #DDD8CF;
}

.si-back {
  font-size: 0.8rem;
  color: #8A8278;
  text-decoration: none;
  letter-spacing: 0.06em;
  transition: color 0.2s;
}
.si-back:hover { color: #3A3025; }

.si-header {
  text-align: center;
  padding: 56px 40px 40px;
  border-bottom: 1px solid #E8E4DC;
}

.si-eyebrow {
  font-size: 0.72rem;
  font-weight: 300;
  color: #A09280;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin: 0 0 10px;
}

.si-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 2rem;
  font-weight: 500;
  color: #2C2C2C;
  letter-spacing: 0.12em;
  margin: 0 0 10px;
}

.si-subtitle {
  font-size: 0.85rem;
  font-weight: 300;
  color: #7A7268;
  letter-spacing: 0.06em;
  margin: 0;
}

.si-section {
  padding: 48px;
  max-width: 900px;
  margin: 0 auto;
}

.si-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.si-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 20px 8px;
  background-color: #F2EFE9;
  border: 1px solid #DDD8CF;
  border-radius: 3px;
  text-decoration: none;
  color: inherit;
  transition: background-color 0.2s, border-color 0.2s, transform 0.18s;
}
.si-card:hover {
  background-color: #EAE4D8;
  border-color: #C4B89A;
  transform: translateY(-2px);
}

.si-year-label {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.05rem;
  font-weight: 500;
  color: #3A3025;
  letter-spacing: 0.04em;
}

.si-count {
  font-size: 0.7rem;
  color: #9A9080;
  letter-spacing: 0.04em;
}

@media (max-width: 600px) {
  .si-topbar, .si-section { padding: 16px 20px; }
  .si-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
