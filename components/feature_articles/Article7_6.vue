<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { PageFlip } from "page-flip";

const props = defineProps({
  article: {
    type: Object,
    required: true,
  },
});

// ==========================================
// 1. 資料解析與模式控制
// ==========================================
const mediaData = computed(() => props.article.media_data || {});
const bookData = computed(() => mediaData.value.book || { pages: [], audio: "" });
const slideshowData = computed(() => mediaData.value.slideshow || { slides: [], audio: "" });
const allPages = computed(() => bookData.value.pages || []);

const currentMode = ref("book");
const currentSlideIndex = ref(0);

const toggleMode = () => {
  audioRef.value?.pause();
  isPlaying.value = false;

  if (currentMode.value === "book") {
    currentMode.value = "slideshow";
    currentSlideIndex.value = 0;

    if (audioRef.value && slideshowData.value.audio) {
      audioRef.value.src = slideshowData.value.audio;
      audioRef.value.currentTime = 0;
      audioRef.value
        .play()
        .then(() => {
          isPlaying.value = true;
        })
        .catch((e) => {
          console.warn("自動播放受限制，請手動點擊播放:", e);
          isPlaying.value = false;
        });
    }
  } else {
    currentMode.value = "book";
    nextTick(() => initPageFlip());
  }
};

// ==========================================
// 2. 音訊核心邏輯與絕對同步
// ==========================================
const audioRef = ref(null);
const isPlaying = ref(false);
const isMuted = ref(false);
const volume = ref(0.8);

const onAudioTimeUpdate = () => {
  if (!audioRef.value || currentMode.value !== "slideshow") return;

  const currentTime = audioRef.value.currentTime;
  const expectedIndex = Math.floor(currentTime / 10);
  const totalSlides = slideshowData.value.slides.length;

  if (totalSlides === 0) return;

  if (expectedIndex < totalSlides - 1) {
    currentSlideIndex.value = expectedIndex;
  } else {
    currentSlideIndex.value = totalSlides - 1;
  }
};

const onSlideSeek = (e) => {
  const targetIndex = parseInt(e.target.value, 10);
  currentSlideIndex.value = targetIndex;
  if (audioRef.value) {
    audioRef.value.currentTime = targetIndex * 10;
  }
};

const togglePlay = () => {
  if (!audioRef.value) return;

  if (isPlaying.value) {
    audioRef.value.pause();
    isPlaying.value = false;
  } else {
    if (audioRef.value.ended) {
      audioRef.value.currentTime = 0;
      if (currentMode.value === "slideshow") currentSlideIndex.value = 0;
    }

    audioRef.value.play().then(() => {
      isPlaying.value = true;
    });
  }
};

const playPageAudio = (audioUrl) => {
  if (!audioRef.value || currentMode.value !== "book") return;
  if (audioUrl) {
    audioRef.value.src = audioUrl;
    audioRef.value.load();
    audioRef.value
      .play()
      .then(() => {
        isPlaying.value = true;
      })
      .catch(() => {
        isPlaying.value = false;
      });
  } else {
    audioRef.value.pause();
    isPlaying.value = false;
  }
};

const toggleMute = () => {
  if (!audioRef.value) return;
  isMuted.value = !isMuted.value;
  audioRef.value.volume = isMuted.value ? 0 : volume.value;
};

const onVolumeChange = () => {
  if (audioRef.value) audioRef.value.volume = volume.value;
};

// ==========================================
// 3. PageFlip (電腦版繪本模式)
// ==========================================
let pageFlip = null;
const bookContainer = ref(null);

const interiorPages = computed(() =>
  allPages.value.length < 2 ? [] : allPages.value.slice(1, -1),
);
const backCoverPage = computed(() =>
  allPages.value.length === 0 ? null : allPages.value[allPages.value.length - 1],
);

const initPageFlip = () => {
  if (!bookContainer.value || isMobile.value || currentMode.value !== "book") return;
  if (pageFlip) pageFlip.destroy();

  pageFlip = new PageFlip(bookContainer.value, {
    width: 473,
    height: 675,
    size: "stretch",
    minWidth: 300,
    maxWidth: 800,
    minHeight: 400,
    maxHeight: 1100,
    maxShadowOpacity: 0.5,
    showCover: true,
    mobileScrollSupport: false,
  });

  pageFlip.loadFromHTML(bookContainer.value.querySelectorAll(".page"));

  pageFlip.on("flip", (e) => {
    const audioUrl = allPages.value[e.data]?.audio || allPages.value[e.data + 1]?.audio;
    playPageAudio(audioUrl);
  });
};

// ==========================================
// 4. 手機版邏輯
// ==========================================
const isMobile = ref(false);
const mobileCurrentPage = ref(0);
const showMobileModal = ref(false);

const processedMobilePages = computed(() => {
  const pages = allPages.value;
  const result = [];
  for (let i = 0; i < pages.length; i++) {
    const current = pages[i];
    const next = pages[i + 1];
    if (
      i > 0 &&
      i < pages.length - 2 &&
      current.image &&
      !current.text &&
      next &&
      next.text &&
      !next.image
    ) {
      result.push({ ...current, text: next.text, audio: current.audio || next.audio });
      i++;
    } else {
      result.push(current);
    }
  }
  return result;
});

// 手機版滑動偵測
const touchStartX = ref(0);
const touchEndX = ref(0);
const minSwipeDistance = 50;

const onTouchStart = (e) => {
  touchStartX.value = e.changedTouches[0].screenX;
};
const onTouchEnd = (e) => {
  touchEndX.value = e.changedTouches[0].screenX;
  const distance = touchEndX.value - touchStartX.value;
  if (Math.abs(distance) < minSwipeDistance) return;
  distance > 0 ? prevMobilePage() : nextMobilePage();
};

const nextMobilePage = () => {
  if (mobileCurrentPage.value < processedMobilePages.value.length - 1) {
    mobileCurrentPage.value++;
    const modalContent = document.querySelector(".mobile-modal-scroll-area");
    if (modalContent) modalContent.scrollTo({ top: 0, behavior: "smooth" });
  }
};

const prevMobilePage = () => {
  if (mobileCurrentPage.value > 0) {
    mobileCurrentPage.value--;
    const modalContent = document.querySelector(".mobile-modal-scroll-area");
    if (modalContent) modalContent.scrollTo({ top: 0, behavior: "smooth" });
  }
};

// 監聽手機版翻頁播放音效
watch(mobileCurrentPage, (newIdx) => {
  if (isMobile.value && showMobileModal.value && currentMode.value === "book") {
    playPageAudio(processedMobilePages.value[newIdx]?.audio);
  }
});

const openMobileReader = () => {
  showMobileModal.value = true;
  document.body.style.overflow = "hidden";
  if (currentMode.value === "book") {
    playPageAudio(processedMobilePages.value[0]?.audio);
  } else {
    if (audioRef.value)
      audioRef.value.play().then(() => {
        isPlaying.value = true;
      });
  }
};

const closeMobileReader = () => {
  showMobileModal.value = false;
  document.body.style.overflow = "";
  mobileCurrentPage.value = 0;
  audioRef.value?.pause();
  isPlaying.value = false;
};

const checkMobile = () => {
  const wasMobile = isMobile.value;
  isMobile.value = window.innerWidth <= 1100;
  if (wasMobile !== isMobile.value) {
    if (!isMobile.value) {
      showMobileModal.value = false;
      nextTick(() => initPageFlip());
    } else if (pageFlip) {
      pageFlip.destroy();
      pageFlip = null;
    }
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
  if (audioRef.value) audioRef.value.volume = volume.value;
  nextTick(() => {
    if (!isMobile.value) initPageFlip();
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
  pageFlip?.destroy();
});
</script>

<template>
  <div class="media-experience-container">
    <div v-if="!isMobile" class="desktop-wrapper">
      <div class="control-bar">
        <button class="icon-btn" @click="togglePlay" :title="isPlaying ? '暫停' : '朗讀'">
          {{ isPlaying ? "⏸" : "▶" }}
        </button>
        <div class="volume-control-group">
          <button class="icon-btn" @click="toggleMute">
            {{ isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊" }}
          </button>
          <div class="volume-slider-wrapper">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              v-model.number="volume"
              @input="onVolumeChange"
              class="volume-range"
            />
          </div>
        </div>
        <div class="mode-switch-group">
          <span class="mode-label" @click="toggleMode" style="cursor: pointer; background: #555">
            {{ currentMode === "book" ? "📸 照片回顧" : "📖 有聲繪本" }}
          </span>
        </div>
      </div>

      <div class="book-scene-container">
        <template v-if="currentMode === 'book'">
          <div class="flip-book" ref="bookContainer">
            <div class="page page-cover" data-density="hard">
              <div class="page-content cover-layout">
                <img v-if="allPages.length > 0" :src="allPages[0].image" class="cover-img-full" />
              </div>
            </div>
            <div v-for="(page, index) in interiorPages" :key="index" class="page">
              <div class="page-content interior-page">
                <div
                  class="page-image-area"
                  v-if="page.image"
                  :class="{ 'has-role-img': page.imageClass === 'role-image' }"
                >
                  <img
                    :src="page.image"
                    :class="page.imageClass ? page.imageClass : 'page-img'"
                    loading="lazy"
                  />
                </div>
                <div
                  class="page-text-area"
                  v-if="page.text"
                  :class="[
                    { 'text-only': !page.image },
                    page.imageClass === 'role-image' ? 'role-text' : '',
                  ]"
                >
                  <div v-html="page.text" class="text-content"></div>
                </div>
              </div>
            </div>
            <div class="page page-cover" data-density="hard">
              <div class="page-content cover-layout end-page-box" @click="toggleMode">
                <img
                  v-if="backCoverPage && backCoverPage.image"
                  :src="backCoverPage.image"
                  class="cover-img-full"
                />
                <div v-else class="back-cover-placeholder"><h3>THE END</h3></div>
                <div class="slideshow-jump-hint">照片回顧 ❯</div>
              </div>
            </div>
          </div>
          <div class="nav-arrow left" @click="pageFlip?.flipPrev()">❮</div>
          <div class="nav-arrow right" @click="pageFlip?.flipNext()">❯</div>
        </template>

        <div v-else class="slideshow-stage">
          <transition name="fade" mode="out-in">
            <div :key="currentSlideIndex" class="slide-card">
              <div class="slide-img-box">
                <img :src="slideshowData.slides[currentSlideIndex]?.image" class="slide-main-img" />
              </div>
              <div class="slide-caption">
                <p v-html="slideshowData.slides[currentSlideIndex]?.text"></p>
              </div>
            </div>
          </transition>
          <div class="slideshow-progress-wrapper">
            <input
              type="range"
              class="slide-range"
              min="0"
              :max="slideshowData.slides.length > 0 ? slideshowData.slides.length - 1 : 0"
              v-model.number="currentSlideIndex"
              @input="onSlideSeek"
            />
          </div>
        </div>

        <p v-if="currentMode === 'book'" class="hint-text">💡 拖曳角落翻頁</p>
      </div>
    </div>

    <div v-else class="mobile-wrapper">
      <div class="mobile-preview-card" @click="openMobileReader">
        <div class="preview-cover-box">
          <img v-if="allPages.length > 0" :src="allPages[0].image" class="preview-cover-img" />
          <div class="play-overlay">
            <span class="play-icon">📖</span>
            <span class="play-text">點擊展開</span>
          </div>
        </div>
      </div>

      <transition name="fade-modal">
        <div v-if="showMobileModal" class="mobile-modal-overlay">
          <div class="mobile-header-bar">
            <div class="mobile-audio-controls">
              <button class="icon-btn" @click="togglePlay">{{ isPlaying ? "⏸" : "▶" }}</button>

              <div class="volume-control-group">
                <button class="icon-btn" @click="toggleMute">
                  {{ isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊" }}
                </button>
                <div class="volume-slider-wrapper">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    v-model.number="volume"
                    @input="onVolumeChange"
                    class="volume-range"
                  />
                </div>
              </div>

              <span class="mode-label small-mode-btn" @click="toggleMode">
                {{ currentMode === "book" ? "📸 照片回顧" : "📖 有聲繪本" }}
              </span>
            </div>

            <button class="close-btn" @click="closeMobileReader">✕</button>
          </div>

          <div class="mobile-modal-scroll-area">
            <transition name="slide-fade" mode="out-in">
              <div
                v-if="currentMode === 'book'"
                :key="'book-' + mobileCurrentPage"
                class="mobile-page-content"
                @touchstart="onTouchStart"
                @touchend="onTouchEnd"
              >
                <div
                  v-if="processedMobilePages[mobileCurrentPage].image"
                  class="mobile-img-box"
                  :class="{
                    'has-role-img':
                      processedMobilePages[mobileCurrentPage].imageClass === 'role-image',
                  }"
                >
                  <img
                    :src="processedMobilePages[mobileCurrentPage].image"
                    :class="
                      processedMobilePages[mobileCurrentPage].imageClass === 'role-image'
                        ? 'mobile-role-img'
                        : 'mobile-std-img'
                    "
                  />
                </div>
                <div
                  class="mobile-text-box"
                  :class="{
                    'role-text':
                      processedMobilePages[mobileCurrentPage].imageClass === 'role-image',
                  }"
                  v-html="processedMobilePages[mobileCurrentPage].text"
                ></div>
              </div>
            </transition>

            <transition name="fade" mode="out-in">
              <div
                v-if="currentMode === 'slideshow'"
                :key="'slide-' + currentSlideIndex"
                class="mobile-slideshow-box"
              >
                <img
                  :src="slideshowData.slides[currentSlideIndex]?.image"
                  class="mobile-slide-img"
                />
                <p
                  class="mobile-slide-text"
                  v-html="slideshowData.slides[currentSlideIndex]?.text"
                ></p>
                <input
                  type="range"
                  class="slide-range"
                  min="0"
                  :max="slideshowData.slides.length > 0 ? slideshowData.slides.length - 1 : 0"
                  v-model.number="currentSlideIndex"
                  @input="onSlideSeek"
                  style="width: 100%; margin-top: 30px"
                />
              </div>
            </transition>
          </div>

          <div class="mobile-nav-bar" v-if="currentMode === 'book'">
            <button
              class="nav-btn prev"
              @click.stop="prevMobilePage"
              :disabled="mobileCurrentPage === 0"
            >
              ❮ 上一頁
            </button>
            <span class="nav-info">
              {{
                mobileCurrentPage === 0
                  ? "封面"
                  : mobileCurrentPage === processedMobilePages.length - 1
                    ? "封底"
                    : `${mobileCurrentPage} / ${processedMobilePages.length - 2}`
              }}
            </span>
            <button
              class="nav-btn next"
              @click.stop="nextMobilePage"
              :disabled="mobileCurrentPage === processedMobilePages.length - 1"
            >
              下一頁 ❯
            </button>
          </div>
        </div>
      </transition>
    </div>

    <audio ref="audioRef" @ended="isPlaying = false" @timeupdate="onAudioTimeUpdate"></audio>
  </div>
</template>

<style scoped>
/* =========================================
   照片回顧幻燈片樣式
   ========================================= */
.slideshow-stage {
  width: 946px;
  min-height: 675px;
  height: auto;
  background: #1a1a1a;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  position: relative;
}
.slide-card {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 30px 15px 30px;
}
.slide-img-box {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
}
.slide-main-img {
  max-width: 100%;
  max-height: 480px;
  object-fit: contain;
  border: 4px solid #fff;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
}
.slide-caption {
  color: white;
  text-align: center;
  padding: 10px 20px;
  font-size: 1.35rem;
  line-height: 1.6;
}
.slideshow-progress-wrapper {
  width: 100%;
  background: #333;
  padding: 8px 10px;
  display: flex;
  align-items: center;
}

.slide-range {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  background: #555;
  outline: none;
  cursor: pointer;
  margin: 0;
  border-radius: 3px;
}
.slide-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ff8000;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  transition: transform 0.1s;
}
.slide-range::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}
.slide-range::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ff8000;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.end-page-box {
  position: relative;
  cursor: pointer;
}
.slideshow-jump-hint {
  position: absolute;
  bottom: 30px;
  right: 30px;
  background: #ff8000;
  color: white;
  padding: 8px 15px;
  border-radius: 20px;
  font-weight: bold;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
}
.end-page-box:hover .slideshow-jump-hint {
  transform: scale(1.05);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.6s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* =========================================
   繪本樣式與全局佈局 (電腦版)
   ========================================= */
.media-experience-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  position: relative;
  background: #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  font-family: "Times New Roman", "DFKai-SB", serif;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
.desktop-wrapper .control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #333;
  color: white;
  z-index: 100;
  position: relative;
}
.icon-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  width: 40px;
}
.volume-control-group {
  display: flex;
  align-items: center;
  position: relative;
}
.volume-slider-wrapper {
  width: 0;
  overflow: hidden;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
}
.volume-control-group:hover .volume-slider-wrapper,
.volume-slider-wrapper:hover {
  width: 100px;
  margin-left: 10px;
}
.volume-range {
  width: 100%;
  cursor: pointer;
  height: 4px;
}
.mode-label {
  color: #ccc;
  font-size: 0.9rem;
  font-weight: bold;
  border: 1px solid #666;
  padding: 5px 12px;
  border-radius: 20px;
  transition: all 0.2s;
}
.mode-label:hover {
  color: white;
  border-color: white;
}
.book-scene-container {
  min-height: 750px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0;
  position: relative;
}
.flip-book {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}
.page {
  background-color: #fdfdfd;
  border: 1px solid #c2c2c2;
  overflow: hidden;
}
.page-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 25px;
}
.cover-layout {
  padding: 0;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
}
.cover-img-full {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.page-image-area {
  flex: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 20px;
}
.page-image-area.has-role-img {
  margin-bottom: 0px;
}
.page-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.role-image {
  max-width: 80%;
  max-height: 80%;
  object-fit: contain;
  border: 10px solid white;
  box-shadow: 4px 6px 15px rgba(0, 0, 0, 0.25);
  transform: rotate(-3deg);
  display: block;
  margin: 0 auto;
}

.page-text-area {
  flex: 2;
  font-size: 1.15rem;
  line-height: 1.6;
  color: #222;
  position: relative;
  padding: 0 5px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.page-text-area.role-text {
  justify-content: flex-start;
}
.text-content {
  text-align: justify;
}

:deep(h2),
:deep(h3) {
  text-align: center;
  font-size: 1.5rem;
  margin-top: 0.2rem;
  margin-bottom: 0.3rem;
  color: #444;
  font-weight: bold;
  font-family: "DFKai-SB", serif;
  line-height: 1.2;
  width: 100%;
  display: block;
}
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 4rem;
  color: rgba(0, 0, 0, 0.15);
  cursor: pointer;
  padding: 20px;
  transition: all 0.3s;
  z-index: 50;
}
.nav-arrow:hover {
  color: rgba(0, 0, 0, 0.5);
}
.nav-arrow.left {
  left: 20px;
}
.nav-arrow.right {
  right: 20px;
}
.hint-text {
  margin-top: 15px;
  color: #777;
  font-size: 1rem;
}

/* =========================================
   手機版專屬樣式
   ========================================= */
.mobile-wrapper {
  width: 100%;
}

/* 手機版一開始的預覽卡片 (僅顯示封面) */
.mobile-preview-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  margin: 20px auto;
  max-width: 320px;
  cursor: pointer;
  border: 1px solid #ddd;
}
.preview-cover-box {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #f0f0f0;
}
.preview-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0.9;
  transition: opacity 0.3s;
}
.play-icon {
  font-size: 3rem;
  margin-bottom: 10px;
}
.play-text {
  font-size: 1.2rem;
  font-weight: bold;
  letter-spacing: 1px;
}

/* 全螢幕彈窗 */
.mobile-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #fdfdfd;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}
.mobile-header-bar {
  height: 60px;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  flex-shrink: 0;
  color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}
.mobile-audio-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ⭐ 手機版切換按鈕的專屬 CSS */
.small-mode-btn {
  cursor: pointer;
  background: #555;
  border: 1px solid #777;
  font-size: 0.8rem;
  padding: 4px 8px;
  margin-left: 5px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px 10px;
}

/* 內容區 */
.mobile-modal-scroll-area {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  -webkit-overflow-scrolling: touch;
}
.mobile-page-content {
  min-height: 100%;
  padding: 30px 20px 40px 20px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* 手機版圖片 */
.mobile-img-box {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 25px;
}
.mobile-img-box.has-role-img {
  margin-bottom: 10px;
}
.mobile-std-img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.mobile-role-img {
  max-width: 85%;
  height: auto;
  border: 8px solid white;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transform: rotate(-2deg);
  display: block;
  margin: 0 auto;
}

/* 手機版文字 */
.mobile-text-box {
  font-size: 1.2rem;
  line-height: 1.8;
  color: #333;
  text-align: justify;
  flex-grow: 1;
}
.mobile-text-box.role-text {
  margin-top: 10px;
}

/* 手機版幻燈片 */
.mobile-slideshow-box {
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mobile-slide-img {
  max-width: 100%;
  border: 3px solid #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.mobile-slide-text {
  text-align: center;
  font-size: 1.2rem;
  margin-top: 20px;
  color: #333;
  line-height: 1.6;
}

/* 底部導覽列 (僅繪本模式) */
.mobile-nav-bar {
  height: 70px;
  background: #f9f9f9;
  border-top: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  flex-shrink: 0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}
.nav-btn {
  background: white;
  border: 1px solid #ddd;
  color: #333;
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
.nav-btn:disabled {
  color: #ccc;
  border-color: #eee;
  box-shadow: none;
}
.nav-info {
  color: #666;
  font-size: 0.9rem;
  font-weight: bold;
}

/* 翻頁動畫 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-modal-enter-active,
.fade-modal-leave-active {
  transition: opacity 0.3s;
}
.fade-modal-enter-from,
.fade-modal-leave-to {
  opacity: 0;
}
</style>
