<script setup>
import { ref, computed, onUnmounted } from "vue";

const props = defineProps({
  slideshow: { type: Object, required: true },
});

const items = computed(() => props.slideshow?.items || []);
const audioUrl = computed(() => props.slideshow?.audio || "");
const photoDur = computed(() => (props.slideshow?.photoDuration || 5) * 1000);

const audioEl = ref(null);
const videoEl = ref(null);

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

// 進入第 i 張：照片→排 5 秒計時 + 配樂續播；影片→暫停配樂、播影片原聲
const enter = async () => {
  clearSlideTimer();
  videoNeedsTap.value = false;
  const it = cur.value;
  if (!it) return;

  if (it.type === "video") {
    if (audioEl.value) audioEl.value.pause();
    await nextFrameVideo();
    if (videoEl.value) {
      videoEl.value.currentTime = 0;
      videoEl.value.muted = muted.value;
      videoEl.value.play().catch(() => {
        videoNeedsTap.value = true;
      });
    }
  } else {
    // 照片
    if (playing.value && audioEl.value && audioUrl.value) {
      audioEl.value.play().catch(() => {});
    }
    if (playing.value) {
      slideTimer = setTimeout(() => advance(), photoDur.value);
    }
  }
};

// 等 v-if 切到 <video> 後再抓 ref
const nextFrameVideo = () =>
  new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));

const goTo = (i) => {
  if (i < 0 || i >= items.value.length) return;
  index.value = i;
  enter();
};

const advance = () => {
  if (index.value < items.value.length - 1) {
    goTo(index.value + 1);
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
      slideTimer = setTimeout(() => advance(), photoDur.value);
    }
  } else {
    clearSlideTimer();
    audioEl.value?.pause();
    videoEl.value?.pause();
  }
};

const next = () => advance();
const prev = () => goTo(Math.max(0, index.value - 1));

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

onUnmounted(() => {
  clearSlideTimer();
  audioEl.value?.pause();
});
</script>

<template>
  <section class="slideshow-block">
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
        <transition name="ss-fade" mode="out-in">
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
