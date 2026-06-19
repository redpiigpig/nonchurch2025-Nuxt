<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";

const props = defineProps({
  slideshow: { type: Object, required: true },
});

const items = computed(() => props.slideshow?.items || []);
const audioUrl = computed(() => props.slideshow?.audio || "");
// 每張照片的停留毫秒數（可逐張覆寫，fallback 7 秒）
const curMs = () => (cur.value?.dur || props.slideshow?.photoDuration || 7) * 1000;

// 每一格對應的配樂時間點（只有照片會推進配樂，影片時配樂暫停）
const musicStart = computed(() => {
  const arr = [];
  let acc = 0;
  for (const it of items.value) {
    arr.push(acc);
    if (it.type === "photo")
      acc += it.dur || props.slideshow?.photoDuration || 7;
  }
  return arr;
});

const audioEl = ref(null);
const videoEl = ref(null);
const rootEl = ref(null);
const isFs = ref(false);

const started = ref(false);
const ended = ref(false);
const playing = ref(false);
const muted = ref(false);
const index = ref(0);
const videoNeedsTap = ref(false);

const cur = computed(() => items.value[index.value] || null);
const progressPct = computed(() =>
  items.value.length ? ((index.value + 1) / items.value.length) * 100 : 0,
);

let slideTimer = null;
const clearSlideTimer = () => {
  if (slideTimer) {
    clearTimeout(slideTimer);
    slideTimer = null;
  }
};

// 進入某張：照片→依該張秒數計時 + 配樂續播；影片→暫停配樂（實際播放等過場結束）
// seek=true 時把配樂跳到該格對應時間（手動快進/倒退用，讓歌曲跟著照片走）
const enter = (seek = false) => {
  clearSlideTimer();
  videoNeedsTap.value = false;
  const it = cur.value;
  if (!it) return;

  if (seek && audioEl.value) {
    audioEl.value.currentTime = musicStart.value[index.value] || 0;
  }

  if (it.type === "video") {
    // 暫停配樂；影片要等過場 transition 結束、<video> 真正掛載後才 play（見 onAfterEnter）
    if (audioEl.value) audioEl.value.pause();
  } else {
    if (playing.value && audioEl.value && audioUrl.value) {
      audioEl.value.play().catch(() => {});
    }
    if (playing.value) {
      slideTimer = setTimeout(() => advance(), curMs());
    }
  }
};

// 過場結束、<video> 已在 DOM 後才播放影片（修正中段影片不自動播放）
const onAfterEnter = () => {
  const it = cur.value;
  if (it && it.type === "video" && videoEl.value) {
    videoEl.value.currentTime = 0;
    videoEl.value.muted = muted.value;
    if (playing.value) {
      videoEl.value.play().catch(() => {
        videoNeedsTap.value = true;
      });
    }
  }
};

const goTo = (i, seek = false) => {
  if (i < 0 || i >= items.value.length) return;
  index.value = i;
  enter(seek);
};

const advance = () => {
  if (index.value < items.value.length - 1) {
    goTo(index.value + 1); // 自然推進：配樂連續播放、不跳針
  } else {
    finish();
  }
};

const start = () => {
  started.value = true;
  ended.value = false;
  playing.value = true;
  index.value = 0;
  if (audioEl.value) {
    audioEl.value.currentTime = 0;
    audioEl.value.muted = muted.value;
  }
  enter();
};

const finish = () => {
  clearSlideTimer();
  playing.value = false;
  ended.value = true;
  if (audioEl.value) audioEl.value.pause();
  if (videoEl.value) videoEl.value.pause();
};

const togglePlay = () => {
  if (ended.value) {
    start();
    return;
  }
  playing.value = !playing.value;
  if (playing.value) {
    if (cur.value?.type === "video") {
      videoEl.value?.play().catch(() => (videoNeedsTap.value = true));
    } else {
      if (audioEl.value && audioUrl.value) audioEl.value.play().catch(() => {});
      slideTimer = setTimeout(() => advance(), curMs());
    }
  } else {
    clearSlideTimer();
    audioEl.value?.pause();
    videoEl.value?.pause();
  }
};

// 手動快進/倒退：配樂同步跳到對應位置
const next = () => {
  if (index.value < items.value.length - 1) goTo(index.value + 1, true);
};
const prev = () => goTo(Math.max(0, index.value - 1), true);

// 全螢幕
const toggleFullscreen = () => {
  const el = rootEl.value;
  if (!el) return;
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
  }
};
const onFsChange = () => {
  isFs.value = !!document.fullscreenElement;
};

const onVideoEnded = () => {
  if (playing.value) advance();
};
const playTappedVideo = () => {
  videoNeedsTap.value = false;
  videoEl.value?.play().catch(() => {});
};

const toggleMute = () => {
  muted.value = !muted.value;
  if (audioEl.value) audioEl.value.muted = muted.value;
  if (videoEl.value) videoEl.value.muted = muted.value;
};

onMounted(() => document.addEventListener("fullscreenchange", onFsChange));
onUnmounted(() => {
  clearSlideTimer();
  audioEl.value?.pause();
  document.removeEventListener("fullscreenchange", onFsChange);
});
</script>

<template>
  <section class="slideshow-block" ref="rootEl" :class="{ 'is-fs': isFs }">
    <div class="ss-head">
      <h2 class="ss-title"><span class="kaiti">影像記念</span></h2>
      <p class="ss-sub">與龐牧師同行的時光 · 願以影像與詩歌彼此擁抱思念</p>
    </div>

    <div class="ss-stage">
      <!-- 起始海報 -->
      <button
        v-if="!started"
        type="button"
        class="ss-poster"
        :style="{ backgroundImage: `url(${items[0]?.url})` }"
        @click="start"
        aria-label="播放影像幻燈片"
      >
        <span class="ss-poster-mask"></span>
        <span class="ss-poster-cta">
          <span class="ss-poster-play">▶</span>
          <span class="ss-poster-text">播放影像幻燈片</span>
          <span class="ss-poster-hint">含配樂與影片，約 4 分鐘</span>
        </span>
      </button>

      <template v-else>
        <transition name="ss-fade" mode="out-in" @after-enter="onAfterEnter">
          <div :key="index" class="ss-slide">
            <div v-if="cur && cur.type === 'video'" class="ss-media ss-video-box">
              <video
                ref="videoEl"
                :src="cur.url"
                class="ss-video"
                playsinline
                preload="auto"
                @ended="onVideoEnded"
              ></video>
              <button
                v-if="videoNeedsTap"
                type="button"
                class="ss-tap-overlay"
                @click="playTappedVideo"
              >
                <span class="ss-tap-play">▶</span>
              </button>
            </div>
            <div v-else class="ss-media ss-photo-box">
              <img :src="cur?.url" class="ss-photo" :alt="cur?.caption" />
            </div>
          </div>
        </transition>

        <div v-if="ended" class="ss-ended" @click="start">
          <span class="ss-replay">↺ 重新播放</span>
        </div>
      </template>
    </div>

    <!-- 圖說 -->
    <p v-if="started && cur" class="ss-caption">
      <span v-if="cur.type === 'video'" class="ss-badge">影片</span>
      {{ cur.caption }}
    </p>

    <!-- 控制列 -->
    <div v-if="started" class="ss-controls">
      <button class="ss-btn" @click="prev" :disabled="index === 0" title="上一張">⏮</button>
      <button class="ss-btn ss-btn-main" @click="togglePlay" :title="playing ? '暫停' : '播放'">
        {{ ended ? "↺" : playing ? "⏸" : "▶" }}
      </button>
      <button
        class="ss-btn"
        @click="next"
        :disabled="index === items.length - 1"
        title="下一張"
      >⏭</button>
      <div class="ss-progress"><div class="ss-progress-fill" :style="{ width: progressPct + '%' }"></div></div>
      <span class="ss-count">{{ index + 1 }} / {{ items.length }}</span>
      <button class="ss-btn" @click="toggleMute" :title="muted ? '取消靜音' : '靜音'">
        {{ muted ? "🔇" : "🔊" }}
      </button>
      <button class="ss-btn" @click="toggleFullscreen" :title="isFs ? '退出全螢幕' : '全螢幕'">
        {{ isFs ? "🡼" : "⛶" }}
      </button>
    </div>

    <audio ref="audioEl" :src="audioUrl" preload="auto" @ended="() => {}"></audio>
  </section>
</template>

<style scoped>
.slideshow-block {
  max-width: 820px;
  margin: 3rem auto 1rem;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
}
.ss-head {
  text-align: center;
  margin-bottom: 1.2rem;
}
.ss-title {
  font-size: 2rem;
  color: #27408b;
  letter-spacing: 3px;
  margin: 0;
}
.kaiti {
  font-family: "DFKai-SB", "標楷體", "BiauKai", "Kaiti TC", serif;
}
.ss-sub {
  color: #888;
  font-size: 1rem;
  margin: 0.4rem 0 0;
}

/* 舞台 */
.ss-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #111;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3);
}
.ss-slide,
.ss-media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.ss-photo,
.ss-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #111;
}

/* 海報 */
.ss-poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  padding: 0;
  cursor: pointer;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ss-poster-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}
.ss-poster-cta {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;
  gap: 0.5rem;
}
.ss-poster-play {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: #27408b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  padding-left: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s;
}
.ss-poster:hover .ss-poster-play {
  transform: scale(1.1);
}
.ss-poster-text {
  font-size: 1.35rem;
  font-weight: bold;
  letter-spacing: 2px;
}
.ss-poster-hint {
  font-size: 0.9rem;
  opacity: 0.85;
}

/* 影片需手動點擊（行動裝置 fallback） */
.ss-tap-overlay {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.ss-tap-play {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #27408b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  padding-left: 5px;
}

/* 結束重播 */
.ss-ended {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
}
.ss-replay {
  color: #fff;
  font-size: 1.4rem;
  font-weight: bold;
  border: 2px solid #fff;
  border-radius: 30px;
  padding: 0.6rem 1.6rem;
}

/* 圖說 */
.ss-caption {
  text-align: center;
  font-size: 1.2rem;
  color: #333;
  margin: 1rem 0 0;
  line-height: 1.6;
  min-height: 1.6em;
}
.ss-badge {
  display: inline-block;
  background: #27408b;
  color: #fff;
  font-size: 0.78rem;
  padding: 1px 8px;
  border-radius: 10px;
  margin-right: 0.5rem;
  vertical-align: middle;
}

/* 控制列 */
.ss-controls {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-top: 1rem;
  padding: 0.6rem 1rem;
  background: #f4f4f6;
  border-radius: 30px;
}
.ss-btn {
  background: none;
  border: 0;
  cursor: pointer;
  font-size: 1.2rem;
  color: #333;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  transition: background 0.15s;
}
.ss-btn:hover:not(:disabled) {
  background: #e2e2e6;
}
.ss-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
.ss-btn-main {
  background: #27408b;
  color: #fff;
  font-size: 1.3rem;
}
.ss-btn-main:hover {
  background: #1d3170;
}
.ss-progress {
  flex: 1;
  height: 6px;
  background: #dcdce2;
  border-radius: 3px;
  overflow: hidden;
}
.ss-progress-fill {
  height: 100%;
  background: #27408b;
  border-radius: 3px;
  transition: width 0.4s ease;
}
.ss-count {
  font-size: 0.95rem;
  color: #666;
  font-family: monospace;
  white-space: nowrap;
}

/* 全螢幕 */
.slideshow-block:fullscreen {
  background: #000;
  max-width: none;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 2vh 3vw;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.slideshow-block:fullscreen .ss-head {
  display: none;
}
.slideshow-block:fullscreen .ss-stage {
  height: 78vh;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
}
.slideshow-block:fullscreen .ss-caption {
  color: #eee;
}
.slideshow-block:fullscreen .ss-controls {
  background: rgba(255, 255, 255, 0.12);
  max-width: 900px;
  margin: 1rem auto 0;
  width: 100%;
}
.slideshow-block:fullscreen .ss-btn {
  color: #fff;
}
.slideshow-block:fullscreen .ss-count {
  color: #ddd;
}

.ss-fade-enter-active,
.ss-fade-leave-active {
  transition: opacity 0.5s ease;
}
.ss-fade-enter-from,
.ss-fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .ss-title {
    font-size: 1.6rem;
  }
  .ss-caption {
    font-size: 1.05rem;
  }
  .ss-poster-text {
    font-size: 1.1rem;
  }
  .ss-count {
    font-size: 0.8rem;
  }
}
</style>
