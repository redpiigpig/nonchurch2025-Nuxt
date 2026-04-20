<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "~/supabase";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const saving = ref(false);
const article = ref(null);

// ── 校對資料 ─────────────────────────────────────────────────────────
const annotations = ref([]);
// 每筆：{ id, paragraphIndex, startOffset, endOffset, selectedText, note, color }
const proofreadStatus = ref("pending");
const proofreadBy = ref("");
const proofreadDate = ref("");

// ── 選取文字彈窗 ─────────────────────────────────────────────────────
const showPopup = ref(false);
const selectionInfo = ref(null);
const popupNote = ref("");
const popupColor = ref("#ffeb3b");
const popupTop = ref(0);
const popupLeft = ref(0);
const editingAnnId = ref(null); // 非 null 時為編輯模式

// 暫存高亮（popup 開啟期間維持選取底色，打字不消失）
const tempHighlight = ref(null); // { paragraphIndex, startOffset, endOffset }

// ── 完成校對彈窗 ─────────────────────────────────────────────────────
const showCompleteModal = ref(false);
const completeConfirmed = ref(false);
const completeName = ref("");
const completeDate = ref(new Date().toISOString().split("T")[0]);

// ── 顏色選項 ─────────────────────────────────────────────────────────
const colorOptions = [
  { value: "#ffeb3b", label: "黃｜一般標記" },
  { value: "#ff9800", label: "橙｜需重寫" },
  { value: "#f44336", label: "紅｜有錯誤" },
  { value: "#4caf50", label: "綠｜待確認" },
  { value: "#2196f3", label: "藍｜補充說明" },
];

// ── 段落切割（content 已是 HTML，依區塊標籤切分）────────────────────
const paragraphs = computed(() => {
  if (!article.value?.content) return [];
  const matches = article.value.content.match(
    /<(?:p|blockquote|figure|div|h[1-6])\b[^>]*>[\s\S]*?<\/(?:p|blockquote|figure|div|h[1-6])>/gi,
  );
  return matches || [];
});

// ── 渲染單一段落（content 已是 HTML，直接回傳）───────────────────────
const renderPara = (para) => para;

// ── DOM 文字高亮注入（純函式，不依賴 Vue 響應式）────────────────────
const injectHighlight = (container, startOff, endOff, color, annId, note) => {
  let offset = 0;

  const walk = (node) => {
    if (offset >= endOff) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.length;
      const nodeStart = offset;
      const nodeEnd = offset + len;
      offset += len;

      if (nodeEnd <= startOff || nodeStart >= endOff) return;

      const localStart = Math.max(0, startOff - nodeStart);
      const localEnd = Math.min(len, endOff - nodeStart);

      const before = node.textContent.slice(0, localStart);
      const middle = node.textContent.slice(localStart, localEnd);
      const after = node.textContent.slice(localEnd);

      const mark = document.createElement("mark");
      mark.style.cssText = `background:${color}bb;cursor:pointer;border-radius:2px;padding:0 1px;`;
      mark.dataset.annId = String(annId);
      if (note) mark.title = note;

      const parent = node.parentNode;
      if (before) parent.insertBefore(document.createTextNode(before), node);
      parent.insertBefore(mark, node);
      mark.appendChild(document.createTextNode(middle));
      if (after) parent.insertBefore(document.createTextNode(after), node);
      parent.removeChild(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from(node.childNodes)) {
        if (offset >= endOff) break;
        walk(child);
      }
    }
  };

  walk(container);
};

// ── 每個段落含高亮的 HTML ──────────────────────────────────────────
const paraHtmlList = ref([]);

const rebuildParaHtml = () => {
  if (!import.meta.client) return;
  paraHtmlList.value = paragraphs.value.map((para, idx) => {
    const base = renderPara(para);
    const anns = annotations.value.filter((a) => a.paragraphIndex === idx);

    // 是否有暫存高亮（popup 開啟中）
    const tmp = tempHighlight.value?.paragraphIndex === idx ? tempHighlight.value : null;
    if (!anns.length && !tmp) return base;

    const div = document.createElement("div");
    div.innerHTML = base;

    // 暫存高亮放最後（offset 最小時最後插入，不影響其他 offset）
    const toApply = [
      ...anns,
      ...(tmp
        ? [{ id: "__temp__", startOffset: tmp.startOffset, endOffset: tmp.endOffset, color: "#90caf9", note: "" }]
        : []),
    ].sort((a, b) => b.startOffset - a.startOffset);

    for (const ann of toApply) {
      injectHighlight(div, ann.startOffset, ann.endOffset, ann.color, ann.id, ann.note || "");
    }
    return div.innerHTML;
  });
};

watch(paragraphs, () => nextTick(rebuildParaHtml));
watch(annotations, () => nextTick(rebuildParaHtml), { deep: true });
watch(tempHighlight, () => nextTick(rebuildParaHtml));

// ── 載入文章 ─────────────────────────────────────────────────────────
const loadArticle = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from("articles")
    .select("*, media_assets(image_url, sort_order)")
    .eq("id", route.params.id)
    .single();

  if (error) {
    alert("載入失敗：" + error.message);
    router.push(`/admin/editor/${route.params.id}`);
    return;
  }

  // 處理圖片佔位符，與 articles/[id].vue 的 htmlContent 邏輯一致
  const mediaAssets = data.media_assets || [];
  if (data.content) {
    let html = data.content;
    // 1. 替換 [[圖片N]] 佔位符
    html = html.replace(/src="\[\[圖片(\d+)\]\]"/g, (match, orderStr) => {
      const order = parseInt(orderStr);
      const found = mediaAssets.find((m) => m.sort_order === order);
      return found ? `src="${found.image_url}"` : match;
    });
    // 2. 相容舊版純檔名路徑
    html = html.replace(/src="([^"]+)"/g, (match, srcValue) => {
      if (srcValue.startsWith("http") || srcValue.startsWith("data:") || srcValue.startsWith("//") || srcValue.startsWith("[[圖片")) return match;
      return `src="https://res.cloudinary.com/nonchurch2025/image/upload/${srcValue}"`;
    });
    data.content = html;
  }

  article.value = data;
  annotations.value = data.proofread_annotations || [];
  proofreadStatus.value = data.proofread_status || "pending";
  proofreadBy.value = data.proofread_by || "";
  proofreadDate.value = data.proofread_date || "";
  loading.value = false;
  await nextTick();
  rebuildParaHtml();
};

// ── 儲存進度 ─────────────────────────────────────────────────────────
const saveProgress = async (quiet = false) => {
  saving.value = true;
  const newStatus =
    proofreadStatus.value === "completed"
      ? "completed"
      : annotations.value.length > 0
        ? "in_progress"
        : "pending";

  const { error } = await supabase
    .from("articles")
    .update({ proofread_annotations: annotations.value, proofread_status: newStatus })
    .eq("id", article.value.id);

  if (error) alert("儲存失敗：" + error.message);
  else {
    proofreadStatus.value = newStatus;
    if (!quiet) alert("✅ 校對進度已儲存！");
  }
  saving.value = false;
};

// ── 完成校對 ─────────────────────────────────────────────────────────
const submitComplete = async () => {
  if (!completeConfirmed.value) return alert("請先勾選確認");
  if (!completeName.value.trim()) return alert("請填寫校對者姓名");
  if (!completeDate.value) return alert("請填寫校對日期");

  saving.value = true;
  const { error } = await supabase
    .from("articles")
    .update({
      proofread_annotations: annotations.value,
      proofread_status: "completed",
      proofread_by: completeName.value.trim(),
      proofread_date: completeDate.value,
    })
    .eq("id", article.value.id);

  if (error) alert("送出失敗：" + error.message);
  else {
    proofreadStatus.value = "completed";
    proofreadBy.value = completeName.value.trim();
    proofreadDate.value = completeDate.value;
    showCompleteModal.value = false;
    completeConfirmed.value = false;
    alert("✅ 校對完成！");
  }
  saving.value = false;
};

// ── 滑鼠放開：偵測文字選取 ───────────────────────────────────────────
const onMouseUp = (e) => {
  if (proofreadStatus.value === "completed") return;

  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const selectedText = range.toString().trim();
    if (!selectedText) return;

    // 只允許在同一個段落內選取
    const getParaEl = (n) => {
      const el = n.nodeType === 1 ? n : n.parentElement;
      return el?.closest("[data-para-idx]");
    };
    const startPara = getParaEl(range.startContainer);
    const endPara = getParaEl(range.endContainer);
    if (!startPara || startPara !== endPara) return;

    const paraIdx = parseInt(startPara.dataset.paraIdx);
    const contentEl = startPara.querySelector(".para-content");
    if (!contentEl) return;

    // 計算段落文字內的 offset（Range.toString() 跨越 mark 元素也能正確計算）
    const preRange = document.createRange();
    preRange.selectNodeContents(contentEl);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = startOffset + selectedText.length;

    // 檢查是否與現有標記重疊
    const overlap = annotations.value.find(
      (a) =>
        a.paragraphIndex === paraIdx &&
        a.startOffset < endOffset &&
        a.endOffset > startOffset,
    );
    if (overlap) {
      // 改為編輯該標記
      openAnnotationEditor(overlap.id);
      return;
    }

    // 定位彈窗（fixed，基於 viewport）
    const rect = range.getBoundingClientRect();
    popupTop.value = rect.top;
    popupLeft.value = rect.left + rect.width / 2;

    selectionInfo.value = { paragraphIndex: paraIdx, startOffset, endOffset, selectedText };
    popupNote.value = "";
    popupColor.value = "#ffeb3b";
    editingAnnId.value = null;
    // 立刻顯示暫存高亮，這樣打字時選取底色不會消失
    tempHighlight.value = { paragraphIndex: paraIdx, startOffset, endOffset };
    showPopup.value = true;
  }, 10);
};

// ── 點擊 mark 標記：開啟編輯 ─────────────────────────────────────────
const onArticleClick = (e) => {
  if (proofreadStatus.value === "completed") return;
  const markEl = e.target.closest("mark[data-ann-id]");
  if (!markEl) return;
  e.stopPropagation();
  openAnnotationEditor(parseInt(markEl.dataset.annId));
};

const openAnnotationEditor = (annId) => {
  const ann = annotations.value.find((a) => a.id === annId);
  if (!ann) return;

  // 找到對應 mark 元素取得位置
  const markEl = document.querySelector(`mark[data-ann-id="${annId}"]`);
  if (markEl) {
    const rect = markEl.getBoundingClientRect();
    popupTop.value = rect.top;
    popupLeft.value = rect.left + rect.width / 2;
  }

  selectionInfo.value = {
    paragraphIndex: ann.paragraphIndex,
    startOffset: ann.startOffset,
    endOffset: ann.endOffset,
    selectedText: ann.selectedText,
  };
  popupNote.value = ann.note || "";
  popupColor.value = ann.color || "#ffeb3b";
  editingAnnId.value = annId;
  showPopup.value = true;
};

// ── 儲存 / 更新 / 移除標記 ───────────────────────────────────────────
const saveAnnotation = () => {
  if (!selectionInfo.value) return;

  if (editingAnnId.value) {
    const i = annotations.value.findIndex((a) => a.id === editingAnnId.value);
    if (i !== -1) {
      annotations.value[i].note = popupNote.value;
      annotations.value[i].color = popupColor.value;
    }
  } else {
    annotations.value.push({
      id: Date.now(),
      paragraphIndex: selectionInfo.value.paragraphIndex,
      startOffset: selectionInfo.value.startOffset,
      endOffset: selectionInfo.value.endOffset,
      selectedText: selectionInfo.value.selectedText,
      note: popupNote.value,
      color: popupColor.value,
    });
    annotations.value.sort((a, b) =>
      a.paragraphIndex !== b.paragraphIndex
        ? a.paragraphIndex - b.paragraphIndex
        : a.startOffset - b.startOffset,
    );
  }
  closePopup();
};

const removeAnnotation = () => {
  if (editingAnnId.value) {
    const i = annotations.value.findIndex((a) => a.id === editingAnnId.value);
    if (i !== -1) annotations.value.splice(i, 1);
  }
  closePopup();
};

const removeAnnotationById = (id) => {
  const i = annotations.value.findIndex((a) => a.id === id);
  if (i !== -1) annotations.value.splice(i, 1);
};

const closePopup = () => {
  showPopup.value = false;
  selectionInfo.value = null;
  editingAnnId.value = null;
  tempHighlight.value = null; // 清除暫存高亮
  window.getSelection()?.removeAllRanges();
};

// ── 點擊 popup 之外關閉 ──────────────────────────────────────────────
const onDocClick = (e) => {
  if (!showPopup.value) return;
  if (e.target.closest(".selection-popup")) return;
  if (e.target.closest("mark[data-ann-id]")) return; // mark 點擊由 onArticleClick 處理
  closePopup();
};

// ── 面板操作 ─────────────────────────────────────────────────────────
const jumpToAnnotation = (ann) => {
  const markEl = document.querySelector(`mark[data-ann-id="${ann.id}"]`);
  if (markEl) markEl.scrollIntoView({ behavior: "smooth", block: "center" });
};

// ── 輔助 ─────────────────────────────────────────────────────────────
const paraHasAnnotation = (idx) => annotations.value.some((a) => a.paragraphIndex === idx);

const statusInfo = computed(() => {
  const map = {
    pending:     { text: "待校對",    cls: "status-pending" },
    in_progress: { text: "校對中",    cls: "status-progress" },
    completed:   { text: "已校對完成", cls: "status-done" },
  };
  return map[proofreadStatus.value] || map.pending;
});

const footnotesHtml = computed(() => {
  if (!article.value?.footnotes?.length) return "";
  const items = article.value.footnotes.map((n) => `<li><p>${n.text}</p></li>`).join("");
  return `<div class="footnotes"><hr /><ol>${items}</ol></div>`;
});

onMounted(() => {
  loadArticle();
  document.addEventListener("click", onDocClick);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
});
</script>

<template>
  <div class="proofread-wrapper">

    <!-- ── Header ── -->
    <div class="proofread-header">
      <div class="header-left">
        <NuxtLink :to="`/admin/editor/${route.params.id}`" class="btn btn-back">← 返回編輯</NuxtLink>
        <h2>🔍 文章校對</h2>
        <span v-if="article" class="article-id-label">{{ article.id }}</span>
        <span class="status-badge" :class="statusInfo.cls">{{ statusInfo.text }}</span>
        <span v-if="proofreadStatus === 'completed' && proofreadBy" class="completed-info">
          由 {{ proofreadBy }} 於 {{ proofreadDate }} 完成
        </span>
      </div>
      <div class="header-right">
        <button
          class="btn btn-save-progress"
          @click="saveProgress(false)"
          :disabled="saving || proofreadStatus === 'completed'"
        >
          {{ saving ? "儲存中..." : "💾 儲存校對進度" }}
        </button>
        <button
          v-if="proofreadStatus !== 'completed'"
          class="btn btn-complete"
          @click="showCompleteModal = true"
          :disabled="saving"
        >
          ✓ 完成校對
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">載入中...</div>

    <div v-else-if="article" class="proofread-layout">

      <!-- ── 左側：文章 ── -->
      <div class="article-pane" @mouseup="onMouseUp" @click="onArticleClick">
        <div class="article-content">

          <div v-if="proofreadStatus !== 'completed'" class="proofread-tip">
            💡 用滑鼠選取任意文字即可標記，點擊已標記（高亮）的文字可編輯或移除。
          </div>
          <div v-else class="proofread-done-tip">
            ✅ 此文章已校對完成。如需重新校對請聯繫管理員。
          </div>

          <!-- 文章標頭 -->
          <div class="article-header-section">
            <h1 class="main-title">{{ article.title }}</h1>
            <h2 v-if="article.subtitle" class="sub-title">──{{ article.subtitle }}</h2>
          </div>
          <div class="divider-thick"></div>
          <div class="divider-gap"></div>
          <div class="divider-thin"></div>
          <div class="author-info">
            <p>
              <span>{{ article.author }}</span>
              <span v-if="article.author_title" class="author-title">{{ article.author_title }}</span>
              <span v-if="article.remark" class="author-remark">{{ article.remark }}</span>
            </p>
          </div>

          <!-- 段落 -->
          <div class="paragraphs-area">
            <div
              v-for="(para, idx) in paragraphs"
              :key="idx"
              :data-para-idx="idx"
              class="para-block"
              :class="{ 'has-annotation': paraHasAnnotation(idx) }"
            >
              <div
                class="para-content markdown-body"
                v-html="paraHtmlList[idx] ?? renderPara(para)"
              ></div>
            </div>
          </div>

          <!-- 註腳 -->
          <div v-if="footnotesHtml" class="markdown-body footnotes-area" v-html="footnotesHtml"></div>
        </div>
      </div>

      <!-- ── 右側：標記面板 ── -->
      <div class="annotation-panel">
        <div class="panel-header">
          <h3>校對標記</h3>
          <span class="annotation-count">{{ annotations.length }} 條</span>
        </div>

        <div v-if="!annotations.length" class="panel-empty">
          <p>尚無標記</p>
          <p class="panel-empty-hint">在左側文章中選取文字開始標記</p>
        </div>

        <div v-else class="annotation-list">
          <div
            v-for="ann in annotations"
            :key="ann.id"
            class="annotation-item"
            :class="{ 'ann-resolved': ann.resolved }"
            :style="{ borderLeftColor: ann.color }"
            @click="jumpToAnnotation(ann)"
          >
            <div class="ann-header">
              <span class="ann-color-dot" :style="{ background: ann.color }"></span>
              <span class="ann-text">「{{ ann.selectedText }}」</span>
              <span v-if="ann.resolved" class="ann-resolved-tag">✓ 已解決</span>
              <button
                v-if="proofreadStatus !== 'completed'"
                class="ann-remove-btn"
                @click.stop="removeAnnotationById(ann.id)"
                title="移除"
              >×</button>
            </div>
            <p v-if="ann.note" class="ann-note">💬 {{ ann.note }}</p>
            <!-- 編輯者回應 -->
            <div v-if="ann.editorNote" class="ann-editor-reply">
              <span class="ann-editor-reply-label">編輯：</span>{{ ann.editorNote }}
            </div>
            <div v-if="ann.editorAction === 'adopted'" class="ann-adopted-tag">✅ 已採用替換</div>
          </div>
        </div>

        <div class="panel-footer">
          <div class="color-legend">
            <div v-for="opt in colorOptions" :key="opt.value" class="legend-item">
              <span class="legend-dot" :style="{ background: opt.value }"></span>
              <span class="legend-label">{{ opt.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 選取文字彈窗（固定在選取範圍正上方）── -->
    <Teleport to="body">
      <div
        v-if="showPopup && selectionInfo"
        class="selection-popup"
        :style="{ top: popupTop + 'px', left: popupLeft + 'px' }"
      >
        <div class="popup-preview">
          「{{ selectionInfo.selectedText.length > 24
              ? selectionInfo.selectedText.substring(0, 24) + "…"
              : selectionInfo.selectedText }}」
        </div>

        <div class="popup-colors">
          <button
            v-for="opt in colorOptions"
            :key="opt.value"
            class="color-btn"
            :class="{ active: popupColor === opt.value }"
            :style="{ background: opt.value }"
            @click="popupColor = opt.value"
            :title="opt.label"
          ><span v-if="popupColor === opt.value">✓</span></button>
        </div>
        <div class="color-name">{{ colorOptions.find(o => o.value === popupColor)?.label }}</div>

        <textarea
          v-model="popupNote"
          class="popup-note"
          placeholder="備註說明（選填）"
          rows="2"
        ></textarea>

        <div class="popup-actions">
          <button v-if="editingAnnId" class="btn-popup-remove" @click="removeAnnotation">移除標記</button>
          <div class="popup-actions-right">
            <button class="btn-popup-cancel" @click="closePopup">取消</button>
            <button class="btn-popup-save" @click="saveAnnotation">
              {{ editingAnnId ? "更新" : "標記" }}
            </button>
          </div>
        </div>

        <!-- 下箭頭 -->
        <div class="popup-arrow"></div>
      </div>
    </Teleport>

    <!-- ── 完成校對彈窗 ── -->
    <Teleport to="body">
      <div v-if="showCompleteModal" class="modal-overlay" @click.self="showCompleteModal = false">
        <div class="complete-modal">
          <div class="modal-header">
            <h3>✓ 完成校對</h3>
            <button class="modal-close" @click="showCompleteModal = false">×</button>
          </div>
          <div class="modal-body">
            <p class="complete-desc">送出後狀態將標記為「已校對完成」，無法再新增標記。</p>
            <div class="complete-summary">共標記 <strong>{{ annotations.length }}</strong> 處需修改文字</div>
            <label class="confirm-check">
              <input type="checkbox" v-model="completeConfirmed" />
              <span>我確認已完整閱讀並校對本篇文章</span>
            </label>
            <div class="modal-field">
              <label>校對者姓名</label>
              <input v-model="completeName" type="text" class="modal-input" placeholder="請輸入姓名" />
            </div>
            <div class="modal-field">
              <label>校對日期</label>
              <input v-model="completeDate" type="date" class="modal-input" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel-modal" @click="showCompleteModal = false">取消</button>
            <button
              class="btn-submit-complete"
              @click="submitComplete"
              :disabled="saving || !completeConfirmed"
            >{{ saving ? "送出中..." : "✓ 確認完成校對" }}</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
/* ── 框架 ── */
.proofread-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  overflow: hidden;
}

/* ── Header ── */
.proofread-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 10px 20px;
  border-bottom: 2px solid #e0e0e0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.07);
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;
  z-index: 10;
}
.header-left, .header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.proofread-header h2 { margin: 0; font-size: 1.15rem; color: #2c3e50; }
.article-id-label {
  font-family: monospace;
  font-size: 0.8rem;
  color: #888;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
}
.completed-info { font-size: 0.82rem; color: #27ae60; }
.status-badge {
  font-size: 0.78rem;
  font-weight: bold;
  padding: 3px 10px;
  border-radius: 12px;
}
.status-pending  { background: #e9ecef; color: #666; }
.status-progress { background: #fff3cd; color: #856404; }
.status-done     { background: #d4edda; color: #155724; }

/* 按鈕 */
.btn {
  padding: 7px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.88rem;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}
.btn-back          { background: #ecf0f1; color: #2c3e50; }
.btn-back:hover    { background: #d5dbdb; }
.btn-save-progress { background: #3498db; color: white; }
.btn-save-progress:hover:not(:disabled) { background: #2980b9; }
.btn-save-progress:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-complete      { background: #27ae60; color: white; }
.btn-complete:hover:not(:disabled) { background: #219150; }
.btn-complete:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── 主體 ── */
.proofread-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── 文章窗格 ── */
.article-pane {
  flex: 1;
  overflow-y: auto;
  padding: 24px 48px;
  background: #fafafa;
  /* 讓文字可選取 */
  user-select: text;
  -webkit-user-select: text;
}
.article-content { max-width: 720px; margin: 0 auto; }

.proofread-tip {
  background: #e8f4fd;
  border: 1px solid #bee5f8;
  color: #1a6fa1;
  padding: 9px 14px;
  border-radius: 6px;
  font-size: 0.88rem;
  margin-bottom: 20px;
}
.proofread-done-tip {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
  padding: 9px 14px;
  border-radius: 6px;
  font-size: 0.88rem;
  margin-bottom: 20px;
}

/* 文章標頭 */
.article-header-section { margin-bottom: 10px; }
.main-title {
  font-family: "Times New Roman", serif;
  font-size: 2rem;
  color: #333;
  margin: 0 0 6px;
  line-height: 1.4;
}
.sub-title {
  font-family: "Times New Roman", serif;
  font-size: 1.5rem;
  color: #444;
  margin: 0;
  padding-left: 2rem;
}
.divider-thick { height: 3px; background: #444; }
.divider-gap   { height: 3px; }
.divider-thin  { height: 1px; background: #444; margin-bottom: 10px; }
.author-info {
  text-align: right;
  margin-bottom: 24px;
  font-family: "Times New Roman", serif;
  font-size: 1.1rem;
  color: #444;
}
.author-title  { display: block; margin-top: 2px; }
.author-remark { display: block; margin-top: 6px; font-size: 0.95rem; }

/* 段落 */
.paragraphs-area { margin-top: 12px; }
.para-block { position: relative; padding: 2px 0; }
.para-block.has-annotation { /* 無額外底色，高亮已在 mark 上 */ }

/* mark 高亮由 injectHighlight 動態生成，這裡確保 :deep 能套上 */
:deep(mark) {
  border-radius: 2px;
  padding: 0 1px;
  cursor: pointer;
}
:deep(mark:hover) { filter: brightness(0.88); }

.footnotes-area { margin-top: 40px; }

/* ── 右側面板 ── */
.annotation-panel {
  width: 290px;
  flex-shrink: 0;
  background: white;
  border-left: 2px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}
.panel-header h3 { margin: 0; font-size: 0.95rem; color: #2c3e50; }
.annotation-count {
  background: #2c3e50;
  color: white;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
}
.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #bbb;
  font-size: 0.9rem;
  gap: 4px;
}
.panel-empty-hint { font-size: 0.78rem; color: #ccc; text-align: center; padding: 0 16px; }

.annotation-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.annotation-item {
  border-left: 4px solid #ffeb3b;
  background: #fafafa;
  border-radius: 4px;
  padding: 8px 8px 8px 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.annotation-item:hover { background: #f0f0f0; }
.ann-header {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.ann-color-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 3px;
}
.ann-text {
  font-size: 0.82rem;
  color: #333;
  flex: 1;
  line-height: 1.4;
  word-break: break-all;
}
.ann-remove-btn {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}
.ann-remove-btn:hover { color: #e74c3c; }
.ann-note {
  font-size: 0.8rem;
  color: #666;
  margin: 4px 0 0;
  font-style: italic;
  line-height: 1.4;
}
.ann-resolved { opacity: 0.75; }
.ann-resolved-tag {
  font-size: 0.7rem;
  color: #16a34a;
  font-weight: 600;
  background: #dcfce7;
  padding: 1px 5px;
  border-radius: 4px;
  white-space: nowrap;
}
.ann-editor-reply {
  font-size: 0.78rem;
  color: #444;
  margin: 4px 0 0;
  background: #f0fdf4;
  border-left: 2px solid #4ade80;
  padding: 3px 6px;
  border-radius: 0 4px 4px 0;
}
.ann-editor-reply-label {
  font-weight: 600;
  color: #16a34a;
  margin-right: 4px;
}
.ann-adopted-tag {
  font-size: 0.72rem;
  color: #065f46;
  font-weight: 600;
  margin-top: 3px;
}

.panel-footer {
  border-top: 1px solid #eee;
  padding: 10px 12px;
  flex-shrink: 0;
}
.color-legend { display: flex; flex-direction: column; gap: 3px; }
.legend-item  { display: flex; align-items: center; gap: 6px; }
.legend-dot   { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.legend-label { font-size: 0.72rem; color: #777; }

/* ── 選取文字彈窗 ── */
.selection-popup {
  position: fixed;
  z-index: 500;
  transform: translate(-50%, calc(-100% - 10px));
  background: white;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.18);
  border: 1px solid #e0e0e0;
  width: 300px;
  padding: 12px 14px 10px;
}
/* 下方箭頭 */
.popup-arrow {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
  filter: drop-shadow(0 2px 1px rgba(0,0,0,0.08));
}
.popup-preview {
  font-size: 0.85rem;
  color: #333;
  background: #f8f8f8;
  border-radius: 5px;
  padding: 6px 9px;
  margin-bottom: 10px;
  line-height: 1.4;
  word-break: break-all;
}
.popup-colors {
  display: flex;
  gap: 7px;
  margin-bottom: 4px;
}
.color-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.82rem;
  transition: border 0.12s, transform 0.1s;
}
.color-btn.active { border-color: #333; transform: scale(1.15); }
.color-btn:hover  { transform: scale(1.1); }
.color-name {
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 8px;
  min-height: 1.2em;
}
.popup-note {
  width: 100%;
  padding: 7px 9px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.88rem;
  resize: none;
  box-sizing: border-box;
  margin-bottom: 8px;
}
.popup-note:focus { outline: none; border-color: #3498db; }
.popup-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.popup-actions-right { display: flex; gap: 6px; margin-left: auto; }
.btn-popup-remove {
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.82rem;
  background: #fde8e8;
  color: #c0392b;
  font-weight: 600;
}
.btn-popup-remove:hover { background: #fbc5c5; }
.btn-popup-cancel {
  padding: 5px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.82rem;
  background: white;
  color: #666;
}
.btn-popup-save {
  padding: 5px 14px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;
  background: #27ae60;
  color: white;
}
.btn-popup-save:hover { background: #219150; }

/* ── 完成校對彈窗 ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}
.complete-modal {
  background: white;
  border-radius: 10px;
  width: 420px;
  max-width: 95vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #eee;
}
.modal-header h3 { margin: 0; font-size: 1rem; color: #2c3e50; }
.modal-close {
  background: none;
  border: none;
  font-size: 1.4rem;
  color: #aaa;
  cursor: pointer;
  line-height: 1;
}
.modal-close:hover { color: #555; }
.modal-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }
.complete-desc { margin: 0; font-size: 0.88rem; color: #666; line-height: 1.5; }
.complete-summary {
  background: #f8f9fa;
  padding: 9px 13px;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #444;
}
.confirm-check {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
  font-weight: 600;
}
.confirm-check input { margin-top: 2px; width: 16px; height: 16px; flex-shrink: 0; cursor: pointer; }
.modal-field { display: flex; flex-direction: column; gap: 5px; }
.modal-field label { font-weight: bold; font-size: 0.85rem; color: #555; }
.modal-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.modal-footer {
  padding: 12px 18px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-cancel-modal {
  padding: 8px 18px;
  background: #f1f3f5;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  color: #555;
  font-size: 0.9rem;
}
.btn-submit-complete {
  padding: 8px 20px;
  background: #27ae60;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
}
.btn-submit-complete:hover:not(:disabled) { background: #219150; }
.btn-submit-complete:disabled { opacity: 0.5; cursor: not-allowed; }

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  font-size: 1.4rem;
  color: #aaa;
}

/* Markdown 相容 */
:deep(.markdown-body p)  { margin: 0.5em 0; line-height: 1.85; }
:deep(.markdown-body h2) { margin: 1.2em 0 0.5em; }
:deep(.markdown-body h3) { margin: 1em 0 0.4em; }
:deep(.footnotes)        { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ccc; font-size: 0.9rem; color: #666; }
:deep(.footnotes h2), :deep(.footnotes hr) { display: none; }

@media (max-width: 900px) {
  .annotation-panel { display: none; }
  .article-pane { padding: 16px; }
}
</style>
