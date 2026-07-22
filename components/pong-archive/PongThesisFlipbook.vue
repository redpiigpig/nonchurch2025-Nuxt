<template>
  <section class="tfb-shell" :class="{ 'tfb-shell--fullscreen': isFullscreen }">
    <div class="tfb-toolbar">
      <button
        class="tfb-tool-btn"
        type="button"
        :aria-expanded="tocOpen"
        aria-controls="thesis-toc"
        @click="tocOpen = !tocOpen"
      >
        <span aria-hidden="true">☰</span>
        章節目錄
      </button>

      <div class="tfb-progress" aria-live="polite">
        <strong>{{ pageRange }}</strong>
        <span>{{ title }}</span>
      </div>

      <button class="tfb-tool-btn" type="button" @click="toggleFullscreen">
        <span aria-hidden="true">{{ isFullscreen ? '↙' : '↗' }}</span>
        {{ isFullscreen ? '退出全螢幕' : '全螢幕閱讀' }}
      </button>
    </div>

    <div class="tfb-reader">
      <Transition name="tfb-drawer">
        <aside v-if="tocOpen" id="thesis-toc" class="tfb-toc" aria-label="論文章節目錄">
          <div class="tfb-toc__head">
            <div>
              <span>Contents</span>
              <h2>章節目錄</h2>
            </div>
            <button type="button" aria-label="關閉章節目錄" @click="tocOpen = false">×</button>
          </div>

          <ol v-if="outline.length" class="tfb-toc__list">
            <li v-for="(entry, index) in outline" :key="`${entry.page}-${index}`">
              <button
                type="button"
                :class="[`tfb-toc__level-${clampLevel(entry.level)}`, { 'is-current': isCurrentOutline(entry) }]"
                @click="jumpTo(entry.page)"
              >
                <span>{{ entry.text }}</span>
                <small>{{ entry.page }}</small>
              </button>
            </li>
          </ol>
          <p v-else class="tfb-toc__empty">此論文尚未建立章節目錄。</p>
        </aside>
      </Transition>

      <button
        v-if="tocOpen"
        class="tfb-toc-backdrop"
        type="button"
        aria-label="關閉章節目錄"
        @click="tocOpen = false"
      />

      <div v-if="loading" class="tfb-state">
        <span class="tfb-spinner" aria-hidden="true" />
        正在整理論文頁面…
      </div>

      <div v-else-if="loadError" class="tfb-state tfb-state--error">
        <strong>目前無法載入論文頁面</strong>
        <p>{{ loadError }}</p>
        <button type="button" @click="loadPages">重新載入</button>
      </div>

      <template v-else>
        <div class="tfb-stage">
          <div class="tfb-spread" :class="{ 'tfb-spread--single': isSinglePage }">
            <article
              v-for="page in visiblePages"
              :key="page.page"
              class="tfb-page"
              :aria-label="`第 ${page.page} 頁`"
            >
              <div class="tfb-page__running-head">{{ shortTitle }}</div>

              <div class="tfb-page__body">
                <div
                  v-if="!contentBlocks(page).length && !footnoteBlocks(page).length"
                  class="tfb-page__missing"
                >
                  <strong>本頁文字尚待補錄</strong>
                  <p>可由頁面上方的「查看原版 PDF」閱讀原始掃描頁。</p>
                </div>

                <template v-for="(block, index) in contentBlocks(page)" :key="`${page.page}-${index}`">
                  <h1 v-if="block.type === 'chapter_title'" class="tfb-blk tfb-blk--chapter">
                    {{ block.text }}
                  </h1>
                  <h2 v-else-if="block.type === 'section_title'" class="tfb-blk tfb-blk--section">
                    {{ block.text }}
                  </h2>
                  <h3
                    v-else-if="block.type === 'subsection_title' && Number(block.level) < 4"
                    class="tfb-blk tfb-blk--subsection"
                  >
                    {{ block.text }}
                  </h3>
                  <h4 v-else-if="block.type === 'subsection_title'" class="tfb-blk tfb-blk--minor">
                    {{ block.text }}
                  </h4>
                  <blockquote v-else-if="block.type === 'quote'" class="tfb-blk tfb-blk--quote">
                    {{ block.text }}
                  </blockquote>
                  <p v-else-if="block.type === 'list_item'" class="tfb-blk tfb-blk--list">
                    {{ block.text }}
                  </p>
                  <p v-else class="tfb-blk tfb-blk--paragraph">
                    {{ block.text }}
                  </p>
                </template>

                <div v-if="footnoteBlocks(page).length" class="tfb-footnotes">
                  <p v-for="(note, index) in footnoteBlocks(page)" :key="`${page.page}-fn-${index}`">
                    <sup>{{ note.marker || index + 1 }}</sup>
                    {{ note.text }}
                  </p>
                </div>
              </div>

              <footer class="tfb-page__number">— {{ page.page }} —</footer>
            </article>
          </div>
        </div>

        <nav class="tfb-navigation" aria-label="論文翻頁">
          <button type="button" :disabled="!canGoPrevious" @click="previousPage">
            <span aria-hidden="true">←</span>
            上一頁
          </button>

          <div class="tfb-page-jump">
            <label for="thesis-page-input">跳至</label>
            <input
              id="thesis-page-input"
              v-model.number="pageInput"
              type="number"
              min="1"
              :max="effectiveTotalPages"
              inputmode="numeric"
              @keyup.enter="jumpTo(pageInput)"
            >
            <span>/ {{ effectiveTotalPages }} 頁</span>
            <button type="button" @click="jumpTo(pageInput)">前往</button>
          </div>

          <button type="button" :disabled="!canGoNext" @click="nextPage">
            下一頁
            <span aria-hidden="true">→</span>
          </button>
        </nav>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
type OutlineEntry = {
  level?: number
  text?: string
  page?: number
}

type ThesisBlock = {
  type?: string
  text?: string
  level?: number
  marker?: string
}

type ThesisPage = {
  page: number
  blocks: ThesisBlock[]
}

const props = defineProps<{
  writingId: number | string
  title: string
  outline: OutlineEntry[]
  totalPages: number
}>()

const pages = ref<ThesisPage[]>([])
const loading = ref(true)
const loadError = ref('')
const currentPage = ref(1)
const pageInput = ref(1)
const tocOpen = ref(false)
const isFullscreen = ref(false)
const isSinglePage = ref(false)

const validOutline = computed(() => (
  (props.outline || []).filter((entry) => entry.text && Number(entry.page) > 0)
))

const outline = computed(() => validOutline.value)
const pageMap = computed(() => new Map(pages.value.map((page) => [page.page, page])))
const effectiveTotalPages = computed(() => (
  props.totalPages || pages.value.at(-1)?.page || pages.value.length || 1
))

const spreadStart = computed(() => (
  currentPage.value % 2 === 0 ? currentPage.value - 1 : currentPage.value
))

const visiblePages = computed(() => {
  const numbers = isSinglePage.value
    ? [currentPage.value]
    : [spreadStart.value, spreadStart.value + 1]
  return numbers
    .filter((page) => page <= effectiveTotalPages.value)
    .map((page) => pageMap.value.get(page) || { page, blocks: [] })
})

const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => (
  isSinglePage.value
    ? currentPage.value < effectiveTotalPages.value
    : spreadStart.value + 1 < effectiveTotalPages.value
))

const pageRange = computed(() => {
  if (loading.value) return '載入中'
  const shown = visiblePages.value.map((page) => page.page)
  if (!shown.length) return `第 1 / ${effectiveTotalPages.value} 頁`
  const range = shown.length > 1 ? `${shown[0]}–${shown.at(-1)}` : `${shown[0]}`
  return `第 ${range} / ${effectiveTotalPages.value} 頁`
})

const shortTitle = computed(() => (
  props.title.length > 24 ? `${props.title.slice(0, 24)}…` : props.title
))

function clampLevel(level?: number) {
  return Math.min(4, Math.max(1, Number(level) || 1))
}

function contentBlocks(page: ThesisPage) {
  return (page.blocks || []).filter((block) => (
    block.text?.trim() && block.type !== 'footnote' && block.type !== 'page_number'
  ))
}

function footnoteBlocks(page: ThesisPage) {
  return (page.blocks || []).filter((block) => block.type === 'footnote' && block.text?.trim())
}

function clampPage(page: number) {
  const parsed = Number(page)
  if (!Number.isFinite(parsed)) return currentPage.value
  return Math.min(effectiveTotalPages.value, Math.max(1, Math.round(parsed)))
}

function jumpTo(page: number) {
  currentPage.value = clampPage(page)
  pageInput.value = currentPage.value
  tocOpen.value = false
  if (isFullscreen.value) {
    document.querySelector('.tfb-shell--fullscreen')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function previousPage() {
  jumpTo(currentPage.value - (isSinglePage.value ? 1 : 2))
}

function nextPage() {
  jumpTo(currentPage.value + (isSinglePage.value ? 1 : 2))
}

function isCurrentOutline(entry: OutlineEntry) {
  const start = Number(entry.page) || 1
  const end = isSinglePage.value ? currentPage.value : spreadStart.value + 1
  return start >= (isSinglePage.value ? currentPage.value : spreadStart.value) && start <= end
}

function syncViewport() {
  isSinglePage.value = window.innerWidth <= 820
}

function handleKeyboard(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.matches('input, textarea, select, [contenteditable="true"]')) return

  if (event.key === 'ArrowLeft' || event.key === 'PageUp') previousPage()
  if (event.key === 'ArrowRight' || event.key === 'PageDown') nextPage()
  if (event.key === 'Home') jumpTo(1)
  if (event.key === 'End') jumpTo(effectiveTotalPages.value)
  if (event.key === 'Escape' && isFullscreen.value) toggleFullscreen()
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  document.body.style.overflow = isFullscreen.value ? 'hidden' : ''
}

async function loadPages() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await $fetch<{ pages: ThesisPage[], totalPages: number }>(
      `/api/pong-writing/${props.writingId}/pages`,
    )
    pages.value = response.pages
    currentPage.value = clampPage(currentPage.value)
    pageInput.value = currentPage.value
  } catch (error: any) {
    loadError.value = error?.data?.message || error?.message || '請稍後再試。'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport, { passive: true })
  window.addEventListener('keydown', handleKeyboard)
  loadPages()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
  window.removeEventListener('keydown', handleKeyboard)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.tfb-shell {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 96px;
  color: #302c27;
}

.tfb-shell--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  width: 100%;
  max-width: none;
  height: 100dvh;
  overflow: auto;
  padding: 0 24px 40px;
  background: #e9e4dc;
}

.tfb-toolbar {
  position: sticky;
  top: 0;
  z-index: 12;
  display: grid;
  grid-template-columns: 1fr minmax(220px, 2fr) 1fr;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border: 1px solid #d4ccbf;
  border-radius: 8px 8px 0 0;
  background: rgb(249 248 246 / 96%);
  box-shadow: 0 8px 24px rgb(62 51 37 / 8%);
  backdrop-filter: blur(12px);
}

.tfb-tool-btn,
.tfb-navigation button,
.tfb-page-jump button {
  border: 1px solid #cfc4b4;
  border-radius: 5px;
  background: #fffdfa;
  color: #625746;
  cursor: pointer;
  font: inherit;
  transition: 160ms ease;
}

.tfb-tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 7px 12px;
  font-size: 0.78rem;
  letter-spacing: 0.05em;
}

.tfb-tool-btn:last-child { justify-self: end; }
.tfb-tool-btn:hover,
.tfb-navigation button:hover:not(:disabled),
.tfb-page-jump button:hover { background: #f0e9de; border-color: #ad9b82; }

.tfb-progress {
  min-width: 0;
  text-align: center;
}

.tfb-progress strong,
.tfb-progress span { display: block; }
.tfb-progress strong { font: 600 0.82rem/1.4 'Noto Serif TC', serif; letter-spacing: 0.08em; }
.tfb-progress span { overflow: hidden; color: #918676; font-size: 0.65rem; text-overflow: ellipsis; white-space: nowrap; }

.tfb-reader { position: relative; }

.tfb-stage {
  overflow: hidden;
  padding: 26px;
  border: 1px solid #cfc7ba;
  border-top: 0;
  background:
    radial-gradient(circle at 50% 4%, rgb(255 255 255 / 42%), transparent 42%),
    #ddd6cb;
}

.tfb-spread {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  max-width: 1060px;
  margin: 0 auto;
  filter: drop-shadow(0 16px 24px rgb(54 45 35 / 18%));
}

.tfb-spread--single {
  grid-template-columns: minmax(0, 720px);
  justify-content: center;
}

.tfb-page {
  display: flex;
  min-width: 0;
  min-height: 690px;
  flex-direction: column;
  padding: clamp(30px, 4vw, 54px) clamp(28px, 4vw, 52px) 24px;
  border: 1px solid #d7d0c5;
  background:
    linear-gradient(90deg, rgb(119 102 78 / 4%), transparent 8%, transparent 92%, rgb(119 102 78 / 3%)),
    #fffefb;
}

.tfb-page:first-child { border-radius: 7px 0 0 7px; box-shadow: inset -14px 0 22px -22px #5d5143; }
.tfb-page:last-child { border-radius: 0 7px 7px 0; box-shadow: inset 14px 0 22px -22px #5d5143; }
.tfb-spread--single .tfb-page { border-radius: 7px; box-shadow: none; }

.tfb-page__running-head {
  overflow: hidden;
  margin-bottom: 28px;
  padding-bottom: 9px;
  border-bottom: 1px solid #e6e0d7;
  color: #aaa092;
  font: 400 0.64rem/1.4 'Noto Serif TC', serif;
  letter-spacing: 0.12em;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tfb-page__body { flex: 1; min-width: 0; font-family: 'Noto Serif TC', 'PMingLiU', serif; }
.tfb-blk { overflow-wrap: anywhere; }

.tfb-page__missing {
  display: flex;
  min-height: 420px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8f8373;
  text-align: center;
}
.tfb-page__missing strong { color: #675c4e; font-size: 1rem; letter-spacing: 0.08em; }
.tfb-page__missing p { max-width: 18em; margin: 0; font-size: 0.78rem; line-height: 1.8; }

.tfb-blk--chapter {
  margin: 0.5em 0 1.8em;
  padding-bottom: 0.8em;
  border-bottom: 1px solid #a99a84;
  font-size: clamp(1.35rem, 2.2vw, 1.7rem);
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: 1.7;
  text-align: center;
}

.tfb-blk--section {
  margin: 1.8em 0 0.8em;
  font-size: 1.22rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1.65;
}

.tfb-blk--subsection,
.tfb-blk--minor {
  margin: 1.45em 0 0.55em;
  font-weight: 600;
  line-height: 1.65;
}

.tfb-blk--subsection { font-size: 1.08rem; letter-spacing: 0.07em; }
.tfb-blk--minor { font-size: 1rem; letter-spacing: 0.05em; }

.tfb-blk--paragraph,
.tfb-blk--list,
.tfb-blk--quote {
  margin: 0 0 0.72em;
  font-size: clamp(0.9rem, 1.25vw, 1rem);
  letter-spacing: 0.035em;
  line-height: 1.95;
  text-align: justify;
}

.tfb-blk--paragraph { text-indent: 2em; }
.tfb-blk--list { padding-left: 2em; text-indent: -1.4em; }
.tfb-blk--quote {
  margin: 1.1em 0 1.1em 1em;
  padding: 0.15em 0 0.15em 1.2em;
  border-left: 3px solid #b8a58b;
  color: #5c5246;
  font-family: 'DFKai-SB', 'BiauKai', 'Noto Serif TC', serif;
  text-indent: 0;
}

.tfb-footnotes {
  margin-top: 2.2em;
  padding-top: 0.9em;
  border-top: 1px solid #9e9487;
  color: #625b52;
  font-family: 'Noto Serif TC', serif;
  font-size: 0.72rem;
  line-height: 1.65;
}

.tfb-footnotes p { margin: 0 0 0.45em; overflow-wrap: anywhere; }
.tfb-footnotes sup { margin-right: 0.35em; font-weight: 600; }

.tfb-page__number {
  margin-top: 28px;
  color: #9e9486;
  font: 400 0.68rem/1 'Noto Serif TC', serif;
  letter-spacing: 0.12em;
  text-align: center;
}

.tfb-navigation {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
  padding: 18px 20px;
  border: 1px solid #d4ccbf;
  border-top: 0;
  border-radius: 0 0 8px 8px;
  background: #f7f4ef;
}

.tfb-navigation > button {
  width: fit-content;
  min-width: 112px;
  padding: 9px 15px;
  font-size: 0.78rem;
}

.tfb-navigation > button:last-child { justify-self: end; }
.tfb-navigation button:disabled { cursor: not-allowed; opacity: 0.38; }

.tfb-page-jump { display: flex; align-items: center; justify-content: center; gap: 7px; color: #85796a; font-size: 0.72rem; }
.tfb-page-jump input {
  width: 58px;
  padding: 7px 5px;
  border: 1px solid #cfc4b4;
  border-radius: 4px;
  background: #fff;
  color: #403a32;
  text-align: center;
}
.tfb-page-jump button { padding: 7px 10px; }

.tfb-state {
  display: flex;
  min-height: 420px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid #d5ccbf;
  border-top: 0;
  background: #f3f0eb;
  color: #817667;
  font-size: 0.84rem;
  letter-spacing: 0.05em;
  text-align: center;
}

.tfb-spinner { width: 28px; height: 28px; border: 2px solid #d3c9ba; border-top-color: #88745c; border-radius: 50%; animation: tfb-spin 0.9s linear infinite; }
.tfb-state--error strong { color: #604d3e; font: 600 1.05rem/1.5 'Noto Serif TC', serif; }
.tfb-state--error p { margin: 0; }
.tfb-state--error button { padding: 8px 15px; border: 1px solid #bfae96; border-radius: 4px; background: #fffdfa; color: #665744; cursor: pointer; }

.tfb-toc {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 22;
  width: min(350px, calc(100vw - 56px));
  max-height: 100%;
  overflow: auto;
  border: 1px solid #cfc4b4;
  background: #fbfaf7;
  box-shadow: 18px 0 42px rgb(51 43 34 / 22%);
}

.tfb-toc__head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 22px 22px 16px;
  border-bottom: 1px solid #ded6ca;
  background: rgb(251 250 247 / 97%);
}
.tfb-toc__head span { color: #a0917c; font-size: 0.58rem; letter-spacing: 0.18em; text-transform: uppercase; }
.tfb-toc__head h2 { margin: 4px 0 0; font: 600 1.18rem/1.4 'Noto Serif TC', serif; letter-spacing: 0.1em; }
.tfb-toc__head button { border: 0; background: transparent; color: #756858; cursor: pointer; font-size: 1.7rem; line-height: 1; }

.tfb-toc__list { margin: 0; padding: 12px 10px 24px; list-style: none; }
.tfb-toc__list li { margin: 0; }
.tfb-toc__list button {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 9px 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #554c41;
  cursor: pointer;
  font: 400 0.82rem/1.55 'Noto Serif TC', serif;
  text-align: left;
}
.tfb-toc__list button:hover,
.tfb-toc__list button.is-current { background: #ede6db; color: #342c23; }
.tfb-toc__list small { color: #a29482; font: 400 0.68rem/1.7 'Noto Sans TC', sans-serif; }
.tfb-toc__level-1 { font-weight: 600 !important; }
.tfb-toc__level-2 { padding-left: 22px !important; }
.tfb-toc__level-3 { padding-left: 36px !important; font-size: 0.76rem !important; }
.tfb-toc__level-4 { padding-left: 50px !important; font-size: 0.72rem !important; }
.tfb-toc__empty { padding: 24px; color: #918678; font-size: 0.8rem; }

.tfb-toc-backdrop { position: absolute; inset: 0; z-index: 21; border: 0; background: rgb(48 41 33 / 30%); cursor: default; }
.tfb-drawer-enter-active, .tfb-drawer-leave-active { transition: transform 180ms ease, opacity 180ms ease; }
.tfb-drawer-enter-from, .tfb-drawer-leave-to { transform: translateX(-24px); opacity: 0; }

@keyframes tfb-spin { to { transform: rotate(360deg); } }

@media (max-width: 820px) {
  .tfb-shell { width: min(100% - 24px, 720px); padding-top: 18px; }
  .tfb-shell--fullscreen { width: 100%; padding: 0 10px 28px; }
  .tfb-toolbar { grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; padding: 9px; }
  .tfb-tool-btn { min-height: 36px; padding: 7px 9px; font-size: 0; }
  .tfb-tool-btn span { font-size: 1rem; }
  .tfb-stage { padding: 10px; }
  .tfb-spread { grid-template-columns: minmax(0, 1fr); filter: drop-shadow(0 10px 16px rgb(54 45 35 / 15%)); }
  .tfb-page,
  .tfb-page:first-child,
  .tfb-page:last-child { min-height: 72vh; padding: 30px 24px 20px; border-radius: 5px; box-shadow: none; }
  .tfb-page__running-head { margin-bottom: 22px; }
  .tfb-blk--paragraph,
  .tfb-blk--list,
  .tfb-blk--quote { font-size: 0.94rem; line-height: 1.9; }
  .tfb-navigation { grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; }
  .tfb-navigation > button { width: 100%; min-width: 0; }
  .tfb-page-jump { grid-column: 1 / -1; grid-row: 1; flex-wrap: wrap; order: -1; }
}

@media (max-width: 420px) {
  .tfb-shell { width: 100%; padding-bottom: 64px; }
  .tfb-toolbar { border-right: 0; border-left: 0; border-radius: 0; }
  .tfb-progress span { display: none; }
  .tfb-stage { border-right: 0; border-left: 0; }
  .tfb-navigation { border-right: 0; border-left: 0; border-radius: 0; }
  .tfb-page,
  .tfb-page:first-child,
  .tfb-page:last-child { padding-right: 20px; padding-left: 20px; }
}
</style>
