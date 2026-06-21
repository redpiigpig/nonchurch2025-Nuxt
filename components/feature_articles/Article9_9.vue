<script setup>
import { computed, reactive, ref, nextTick, onMounted, onUnmounted } from "vue";
import Article9_9Slideshow from "./Article9_9Slideshow.vue";

const props = defineProps({
  article: {
    type: Object,
    required: true,
  },
});

const rootEl = ref(null);

// ─── 資料 ─────────────────────────────────────────────────────────
const mediaData = computed(() => props.article.media_data || {});
const sectionTitle = computed(
  () => mediaData.value.section_title || "龐牧師喜愛的音樂與詩歌",
);
const songs = computed(() => mediaData.value.songs || []);
const slideshow = computed(() => mediaData.value.slideshow || null);
const mediaAssets = computed(() => props.article.media_assets || []);

// ─── HTML 內圖片佔位符解析（與 articles/[id].vue 邏輯一致）─────────
const resolveHtml = (html) => {
  if (!html) return "";
  let h = String(html);
  // [[圖片N]] → media_assets
  h = h.replace(/src="\[\[圖片(\d+)\]\]"/g, (m, o) => {
    const found = mediaAssets.value.find((a) => a.sort_order === parseInt(o));
    return found ? `src="${found.image_url}"` : m;
  });
  // 純檔名 → Cloudinary
  h = h.replace(/src="([^"]+)"/g, (m, s) => {
    if (/^(https?:|data:|\/\/|\[\[)/.test(s)) return m;
    return `src="https://res.cloudinary.com/nonchurch2025/image/upload/${s}"`;
  });
  return h;
};

// ─── YouTube 影片 ────────────────────────────────────────────────
const ytId = (url) => {
  const m = String(url || "").match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? m[1] : "";
};
const ytThumb = (url) => {
  const id = ytId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
};

// 點擊縮圖才載入 iframe（避免一次嵌入 10+ 支影片拖慢頁面）
const loaded = reactive({});
const loadVideo = (key) => {
  loaded[key] = true;
  nextTick(() => observeSongMedia());
};

// ─── 切掉螢幕 / 滑離畫面時自動暫停各歌曲的音檔與影片 ───────────────
const ytPause = (iframe) => {
  try {
    iframe.contentWindow?.postMessage(
      '{"event":"command","func":"pauseVideo","args":""}',
      "*",
    );
  } catch (_) {}
};
const pauseEl = (el) => {
  if (!el) return;
  if (el.tagName === "IFRAME") ytPause(el);
  else if (typeof el.pause === "function") el.pause();
};
const songMedia = () =>
  rootEl.value
    ? rootEl.value.querySelectorAll(".song-card audio, .song-card iframe")
    : [];
const pauseAllSongMedia = () => songMedia().forEach(pauseEl);
const onVisibility = () => {
  if (document.hidden) pauseAllSongMedia();
};

let songObserver = null;
const observeSongMedia = () => {
  if (songObserver) songMedia().forEach((el) => songObserver.observe(el));
};

onMounted(() => {
  document.addEventListener("visibilitychange", onVisibility);
  songObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) pauseEl(e.target);
      });
    },
    { threshold: 0.01 },
  );
  observeSongMedia();
});
onUnmounted(() => {
  document.removeEventListener("visibilitychange", onVisibility);
  songObserver?.disconnect();
});
</script>

<template>
  <section class="songlist" ref="rootEl">
    <h2 class="songlist-title">
      <span class="kaiti">{{ sectionTitle }}</span>
    </h2>

    <article
      v-for="(song, i) in songs"
      :key="i"
      class="song-card"
    >
      <!-- 曲名 + icon -->
      <header class="song-head">
        <div class="song-head-main">
          <span class="song-no">{{ String(i + 1).padStart(2, "0") }}</span>
          <h3 class="song-title" v-html="resolveHtml(song.title)"></h3>
        </div>
        <div class="song-icons">
          <a
            v-if="song.links && song.links.length"
            :href="song.links[0].url"
            target="_blank"
            rel="noopener noreferrer"
            class="icon-link yt"
            title="在 YouTube 開啟"
            aria-label="YouTube 連結"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                fill="currentColor"
                d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"
              />
            </svg>
          </a>
          <a
            v-if="song.score"
            :href="song.score"
            target="_blank"
            rel="noopener noreferrer"
            class="icon-link score"
            title="查看歌譜"
            aria-label="歌譜連結"
          >🎼</a>
          <span
            v-else-if="song.hasScore"
            class="icon-link score disabled"
            title="歌譜整理中，敬請期待"
            aria-label="歌譜整理中"
          >🎼</span>
          <span
            v-if="song.narration && song.narration.length"
            class="icon-link narr"
            :title="`旁白朗讀：${song.narration.map((n) => n.narrator).join('、')}`"
            aria-label="有旁白朗讀"
          >🎙️</span>
        </div>
      </header>

      <!-- 作者 -->
      <p v-if="song.composer" class="song-composer">{{ song.composer }}</p>

      <!-- 介紹（含可能插入的圖片）-->
      <div
        v-if="song.intro"
        class="song-intro markdown-body"
        v-html="resolveHtml(song.intro)"
      ></div>

      <!-- 旁白朗讀 -->
      <div v-if="song.narration && song.narration.length" class="narration">
        <div
          v-for="(nar, ni) in song.narration"
          :key="ni"
          class="narration-row"
        >
          <span class="narration-icon" aria-hidden="true">🎙️</span>
          <span class="narration-name">旁白朗讀：{{ nar.narrator }}</span>
          <audio class="narration-audio" controls preload="none" :src="nar.url"></audio>
        </div>
      </div>

      <!-- 歌詞（預設收合）-->
      <details v-if="song.lyrics" class="song-lyrics">
        <summary>
          <span class="lyrics-open">▸ 展開歌詞</span>
          <span class="lyrics-close">▾ 收合歌詞</span>
        </summary>
        <div class="lyrics-body markdown-body" v-html="resolveHtml(song.lyrics)"></div>
      </details>

      <!-- 影片小螢幕 -->
      <div v-if="song.links && song.links.length" class="video-grid">
        <div
          v-for="(lnk, li) in song.links"
          :key="li"
          class="video-item"
        >
          <div class="video-screen">
            <iframe
              v-if="loaded[i + '-' + li]"
              :src="`https://www.youtube-nocookie.com/embed/${ytId(lnk.url)}?autoplay=1&rel=0&enablejsapi=1`"
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
            <button
              v-else
              type="button"
              class="video-thumb"
              :style="{ backgroundImage: `url(${ytThumb(lnk.url)})` }"
              @click="loadVideo(i + '-' + li)"
              :aria-label="`播放 ${lnk.label}`"
            >
              <span class="play-btn" aria-hidden="true">▶</span>
            </button>
          </div>
          <div class="video-label">{{ lnk.label }}</div>
        </div>
      </div>
    </article>

    <!-- 影像記念幻燈片（含影片）-->
    <Article9_9Slideshow v-if="slideshow" :slideshow="slideshow" />
  </section>
</template>

<style scoped>
.songlist {
  max-width: 820px;
  margin: 0 auto;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
}
.songlist-title {
  text-align: center;
  font-size: 2rem;
  color: #27408b;
  margin: 0.5rem 0 2.2rem;
  letter-spacing: 2px;
}
.kaiti {
  font-family: "DFKai-SB", "標楷體", "BiauKai", "Kaiti TC", serif;
  font-style: normal;
}

/* ── 單首卡片 ── */
.song-card {
  border: 1px solid #e2e2e2;
  border-left: 5px solid #27408b;
  border-radius: 8px;
  background: #fcfcfd;
  padding: 1.4rem 1.6rem 1.6rem;
  margin-bottom: 1.8rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* ── 標題列 ── */
.song-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.song-head-main {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex: 1;
  min-width: 0;
}
.song-no {
  font-family: monospace;
  font-size: 1.05rem;
  font-weight: bold;
  color: #27408b;
  flex-shrink: 0;
}
.song-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: bold;
  color: #2b2b2b;
  line-height: 1.4;
}
.song-icons {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-shrink: 0;
  padding-top: 2px;
}
.icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  text-decoration: none;
  font-size: 1.15rem;
  transition: transform 0.15s, background 0.15s;
}
.icon-link.yt {
  color: #ff0000;
}
.icon-link.yt:hover {
  background: #ffeaea;
  transform: scale(1.1);
}
.icon-link.score {
  color: #27408b;
  background: #eef1fb;
}
.icon-link.score:hover {
  background: #dde3f7;
  transform: scale(1.1);
}
.icon-link.score.disabled {
  color: #b9b9b9;
  background: #f1f1f1;
  cursor: not-allowed;
  filter: grayscale(1);
}

.icon-link.narr {
  color: #b8860b;
  background: #fbf4e2;
  cursor: default;
}

/* ── 旁白朗讀 ── */
.narration {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.narration-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.8rem;
  padding: 0.7rem 0.9rem;
  background: #fbf7ec;
  border: 1px solid #f0e6cd;
  border-radius: 8px;
}
.narration-icon {
  font-size: 1.15rem;
}
.narration-name {
  font-weight: bold;
  color: #8a6d1b;
  font-size: 1rem;
  white-space: nowrap;
}
.narration-audio {
  flex: 1;
  min-width: 200px;
  height: 36px;
}

/* ── 作者 ── */
.song-composer {
  margin: 0.5rem 0 0;
  color: #777;
  font-size: 1.02rem;
  font-style: italic;
}

/* ── 介紹 ── */
.song-intro {
  margin-top: 0.9rem;
  font-size: 1.08rem;
  line-height: 1.85;
  color: #333;
  text-align: justify;
}
.song-intro :deep(p) {
  margin: 0 0 0.8rem;
}
.song-intro :deep(figure) {
  margin: 1rem 0;
  text-align: center;
}
.song-intro :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}
.song-intro :deep(figcaption) {
  font-size: 0.92rem;
  color: #888;
  margin-top: 0.4rem;
  line-height: 1.5;
}

/* ── 歌詞（收合）── */
.song-lyrics {
  margin-top: 1rem;
  border-top: 1px dashed #d8d8d8;
}
.song-lyrics summary {
  list-style: none;
  cursor: pointer;
  padding: 0.6rem 0 0.2rem;
  color: #27408b;
  font-size: 1.02rem;
  font-weight: bold;
  user-select: none;
}
.song-lyrics summary::-webkit-details-marker {
  display: none;
}
.song-lyrics .lyrics-close {
  display: none;
}
.song-lyrics[open] .lyrics-open {
  display: none;
}
.song-lyrics[open] .lyrics-close {
  display: inline;
}
.lyrics-body {
  font-size: 1.06rem;
  line-height: 1.9;
  color: #3a3a3a;
}
.lyrics-body :deep(blockquote) {
  margin: 0.4rem 0 0.6rem;
  padding: 0.8rem 1.2rem;
  background: #f6f7fb;
  border-left: 3px solid #c3cbe6;
  border-radius: 4px;
}
.lyrics-body :deep(blockquote p) {
  margin: 0 0 0.7rem;
  /* 凸排：節數（一、）與（副歌）標示凸出左側，歌詞本身對齊 */
  padding-left: 2em;
  text-indent: -2em;
}
.lyrics-body :deep(blockquote p:last-child) {
  margin-bottom: 0;
}

/* ── 影片小螢幕 ── */
.video-grid {
  margin-top: 1.2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}
.video-item {
  display: flex;
  flex-direction: column;
}
.video-screen {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.18);
}
.video-screen iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.video-thumb {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  padding: 0;
  cursor: pointer;
  background-size: cover;
  background-position: center;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.video-thumb::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  transition: background 0.2s;
}
.video-thumb:hover::after {
  background: rgba(0, 0, 0, 0.05);
}
.play-btn {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 0, 0, 0.85);
  color: #fff;
  font-size: 1.4rem;
  padding-left: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s;
}
.video-thumb:hover .play-btn {
  transform: scale(1.12);
  background: #ff0000;
}
.video-label {
  margin-top: 0.45rem;
  font-size: 0.95rem;
  color: #555;
  text-align: center;
  line-height: 1.4;
}

/* ── 手機 ── */
@media (max-width: 600px) {
  .song-card {
    padding: 1.1rem 1rem 1.3rem;
  }
  .song-title {
    font-size: 1.2rem;
  }
  .songlist-title {
    font-size: 1.6rem;
  }
  .video-grid {
    grid-template-columns: 1fr;
  }
  /* 手機版：節內不硬斷句（讓它自然換行），一節結束才多空一行 */
  .lyrics-body :deep(blockquote br) {
    display: none;
  }
  .lyrics-body :deep(blockquote p) {
    margin-bottom: 1.4rem;
  }
}
</style>
