<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { supabase } from "~/supabase";
import { useRouter, useRoute, onBeforeRouteLeave } from "vue-router";

definePageMeta({ layout: "admin", middleware: "auth" });
useHead({ title: "文章管理 - 無境界者後台" });

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const saveTimers = {}; // article.id → timer
const rowSaveStatus = ref({}); // article.id → 'saving' | 'saved' | 'error' | ''

const issuesOptions = ref([]);
const allArticles = ref([]);
const editedArticles = ref([]);
const selectedIssueId = ref(null);

const pdfInput = ref(null);
const uploadingPdfId = ref(null);

// ── 目前期刊資訊（封面/封底 PDF，供合併用）──
const currentIssue = ref(null);

// ── 合併期刊 PDF ──────────────────────────────────────────────────
const showMergeModal = ref(false);
const merging = ref(false);
const mergeResult = ref(null); // { url, pages_merged } or null

const openMergeModal = async () => {
  // 每次打開都重新拉最新的 cover_pdf / back_cover_pdf
  if (selectedIssueId.value) {
    const { data } = await supabase
      .from("issues")
      .select("cover_pdf, back_cover_pdf")
      .eq("id", selectedIssueId.value)
      .single();
    currentIssue.value = data;
  }
  mergeResult.value = null;
  showMergeModal.value = true;
};

const performMerge = async () => {
  merging.value = true;
  mergeResult.value = null;
  try {
    const articlesForMerge = editedArticles.value
      .filter((a) => a.issue === selectedIssueId.value)
      .map((a) => ({ id: a.id, title: a.title, seo_pdf: a.seo_pdf, page_start: a.page_start }));

    const res = await $fetch("/api/merge-pdfs", {
      method: "POST",
      body: {
        issueId: selectedIssueId.value,
        articles: articlesForMerge,
        cover_pdf: currentIssue.value?.cover_pdf || "",
        back_cover_pdf: currentIssue.value?.back_cover_pdf || "",
      },
    });

    if (!res.success) throw new Error(res.error);
    mergeResult.value = res;
  } catch (err) {
    alert("❌ 合併失敗：" + err.message);
  } finally {
    merging.value = false;
  }
};

// ── 分區定義 ──
const SECTION_ORDER = [
  "主題介紹",
  "特稿專區",
  "主題廣場",
  "多元講堂",
  "編輯資訊",
];
const SECTION_LABELS = {
  主題介紹: "📖 主題介紹",
  特稿專區: "✍️ 特稿專區",
  主題廣場: "🏛 主題廣場",
  多元講堂: "🎙 多元講堂",
  編輯資訊: "📋 編輯資訊",
};
const SECTION_NOTES = {
  主題介紹: "編輯室報告、本期作者簡介、封面故事",
  編輯資訊: "含投稿資訊／下期主題、編輯資訊／線上資訊",
};

// ── 資料載入 ──
const initData = async () => {
  loading.value = true;
  try {
    const { data: issuesData, error: ie } = await supabase
      .from("issues")
      .select("id, title, is_published")
      .order("id", { ascending: false });
    if (ie) throw ie;
    issuesOptions.value = issuesData;

    const qid = parseInt(route.query.issue);
    if (issuesOptions.value.some((i) => i.id === qid)) {
      selectedIssueId.value = qid;
    } else {
      // 預設：最近一期尚未發布（id 最小的未發布）；全部已發布則取最新一期
      const firstUnpublished = [...issuesOptions.value]
        .reverse()
        .find((i) => !i.is_published);
      selectedIssueId.value = firstUnpublished?.id ?? issuesOptions.value[0]?.id;
    }

    await fetchArticles();
  } catch (err) {
    alert("讀取資料失敗：" + err.message);
  } finally {
    loading.value = false;
  }
};

// ── 自動填入 SEO 圖片 ──
const autoFillSeoImages = async () => {
  const issueArticles = editedArticles.value.filter(
    (a) => a.issue === selectedIssueId.value && !a.seo_image,
  );
  if (!issueArticles.length) return;

  // 一次抓本期所有 media_assets
  const { data: allAssets } = await supabase
    .from("media_assets")
    .select("image_url, article_id, cloudinary_id, sort_order")
    .eq("issue_id", selectedIssueId.value)
    .order("sort_order", { ascending: true });

  const assetsByArticle = {};
  for (const a of allAssets || []) {
    if (!assetsByArticle[a.article_id]) assetsByArticle[a.article_id] = [];
    assetsByArticle[a.article_id].push(a);
  }

  // 作者簡介需要封面圖
  const needsCover = issueArticles.some((a) => a.title?.includes("作者簡介"));
  let coverImg = null;
  if (needsCover) {
    const { data: issueData } = await supabase
      .from("issues").select("cover_img").eq("id", selectedIssueId.value).single();
    coverImg = issueData?.cover_img || null;
  }

  for (const article of issueArticles) {
    const assets = assetsByArticle[article.id];
    if (assets?.length) {
      article.seo_image = assets[0].image_url;
    } else if (article.title?.includes("作者簡介") && coverImg) {
      article.seo_image = coverImg;
    }
  }
};

const fetchArticles = async () => {
  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, issue, title, author, seo, section, sort_order, page_start, proofread_status, proofread_by, proofread_date, article_type",
    );
  if (error) throw error;

  const processed = data.map((a) => ({
    ...a,
    idSuffix: a.id.replace(/^\d+-/, ""),
    seo_image: a.seo?.image || "",
    seo_pdf: a.seo?.pdf || "",
    section: SECTION_ORDER.includes(a.section) ? a.section : "主題介紹",
    page_start: a.page_start ?? null,
    proofread_status: a.proofread_status || "incomplete",
    article_type: a.article_type || "regular",
    isSaving: false,
  }));

  allArticles.value = processed;
  editedArticles.value = JSON.parse(JSON.stringify(processed));
  await autoFillSeoImages();
};

watch(selectedIssueId, (val) => {
  if (val) router.replace({ query: { ...route.query, issue: val } });
});

// ── 分區分組與嚴格數字排序 ──
const groupedArticles = computed(() => {
  const groups = {};
  SECTION_ORDER.forEach((s) => (groups[s] = []));

  editedArticles.value
    .filter((a) => a.issue === selectedIssueId.value)
    .forEach((a) => {
      const s = SECTION_ORDER.includes(a.section) ? a.section : "主題介紹";
      groups[s].push(a);
    });

  // 🌟 嚴格按照 ID 橫線後面的「數字」大小進行排序
  SECTION_ORDER.forEach((s) => {
    groups[s].sort((a, b) => {
      const numA = parseInt(a.idSuffix.match(/^\d+/)?.[0] || 999, 10);
      const numB = parseInt(b.idSuffix.match(/^\d+/)?.[0] || 999, 10);
      return numA - numB;
    });
  });

  return groups;
});

const orderedArticles = computed(() => {
  const result = [];
  SECTION_ORDER.forEach((s) =>
    result.push(...(groupedArticles.value[s] || [])),
  );
  return result;
});

const totalArticles = computed(() =>
  SECTION_ORDER.reduce(
    (n, s) => n + (groupedArticles.value[s]?.length || 0),
    0,
  ),
);

// ── 拖曳換區 ──
const draggedId = ref(null);
const dropSection = ref(null);
const dragHandleActive = ref(false); // 是否從 ⠿ 把手按下

const onDragStart = (e, article) => {
  if (!dragHandleActive.value) {
    e.preventDefault();
    return;
  }
  draggedId.value = article.id;
  e.dataTransfer.effectAllowed = "move";
};
const onDragOver = (e, section) => {
  e.preventDefault();
  dropSection.value = section;
};
const onDragLeave = (e) => {
  if (!e.currentTarget.contains(e.relatedTarget)) dropSection.value = null;
};
const onDrop = (e, section) => {
  e.preventDefault();
  const article = editedArticles.value.find((a) => a.id === draggedId.value);
  if (article) {
    article.section = section;
  }
  draggedId.value = null;
  dropSection.value = null;
};
const onDragEnd = () => {
  draggedId.value = null;
  dropSection.value = null;
  dragHandleActive.value = false;
};

// ── 頁數連動 ──
const prevPageStart = ref({});
const onPageFocus = (a) => {
  prevPageStart.value[a.id] = a.page_start;
};
const onPageBlur = (a) => {
  const prev = prevPageStart.value[a.id];
  if (prev === undefined || prev === a.page_start) return;
  const delta = (a.page_start || 0) - (prev || 0);
  if (!delta) return;
  const ordered = orderedArticles.value;
  const idx = ordered.findIndex((x) => x.id === a.id);
  for (let i = idx + 1; i < ordered.length; i++) {
    if (ordered[i].page_start != null) {
      ordered[i].page_start = Math.max(1, (ordered[i].page_start || 1) + delta);
    }
  }
};

// ── PDF 上傳邏輯 (Cloudinary) ──
const triggerPdfUpload = (article) => {
  uploadingPdfId.value = article.id;
  pdfInput.value.click();
};

const handlePdfUpload = async (event) => {
  const file = event.target.files[0];
  if (!file || !uploadingPdfId.value) return;

  const targetArticle = editedArticles.value.find(
    (a) => a.id === uploadingPdfId.value,
  );
  if (!targetArticle) return;

  targetArticle.isSaving = true;
  try {
    // 🌟 核心防呆：自動將 PDF 重新命名為 "PDF_7-1_標題.pdf" 的格式
    const safeTitle = targetArticle.title.replace(/[\\/:*?"<>| ]/g, "_"); // 移除不能當作檔名的特殊字元與空白
    const newFileName = `PDF_${targetArticle.id}_${safeTitle}.pdf`;

    // 利用原有的檔案內容，產生一個具有新檔名的 File 物件
    const renamedFile = new File([file], newFileName, { type: file.type });

    const formData = new FormData();
    formData.append("file", renamedFile); // 上傳重新命名過後的檔案
    formData.append("path", `articles/issue-${selectedIssueId.value}/pdfs`);

    // 呼叫 Cloudinary API
    const response = await $fetch("/api/media", {
      method: "POST",
      body: formData,
    });

    if (!response.success) throw new Error(response.error);

    targetArticle.seo_pdf = response.data.secure_url;
    alert(
      `✅ PDF 上傳成功！已自動命名為：\n${newFileName}`,
    );
  } catch (err) {
    alert("❌ PDF 上傳失敗：" + err.message);
  } finally {
    targetArticle.isSaving = false;
    uploadingPdfId.value = null;
    event.target.value = "";
  }
};

// ── 儲存邏輯 ──
const isChanged = (item, orig) =>
  item.idSuffix !== orig.id.replace(/^\d+-/, "") ||
  item.title !== orig.title ||
  item.author !== orig.author ||
  item.seo_image !== (orig.seo?.image || "") ||
  item.seo_pdf !== (orig.seo?.pdf || "") ||
  item.section !==
    (SECTION_ORDER.includes(orig.section) ? orig.section : "主題介紹") ||
  item.page_start !== (orig.page_start ?? null);

// auto-save watch 排除 idSuffix：id 變更會導致 :key 改變 → DOM 重建 → 輸入框失焦
const isChangedExcludingId = (item, orig) =>
  item.title !== orig.title ||
  item.author !== orig.author ||
  item.seo_image !== (orig.seo?.image || "") ||
  item.seo_pdf !== (orig.seo?.pdf || "") ||
  item.section !==
    (SECTION_ORDER.includes(orig.section) ? orig.section : "主題介紹") ||
  item.page_start !== (orig.page_start ?? null);


const performUpdate = async (article) => {
  const newId = `${article.issue}-${article.idSuffix}`;
  const computedSortOrder = parseInt(
    article.idSuffix.match(/^\d+/)?.[0] || 999,
    10,
  );

  const updates = {
    title: article.title,
    author: article.author,
    seo: {
      ...(article.seo || {}),
      image: article.seo_image,
      pdf: article.seo_pdf,
    },
    section: article.section,
    sort_order: computedSortOrder,
    page_start: article.page_start,
  };

  const { error } = await supabase
    .from("articles")
    .update({ ...updates, id: newId })
    .eq("id", article.id);

  if (error) throw error;
  article.id = newId;
};

const syncOriginal = (article) => {
  const i = allArticles.value.findIndex((o) => o.id === article.id);
  if (i !== -1) allArticles.value[i] = JSON.parse(JSON.stringify(article));
};

const savingAll = ref(false);

const saveAll = async () => {
  const changed = editedArticles.value.filter((a) => {
    const orig = allArticles.value.find((o) => o.id === a.id);
    return orig && isChanged(a, orig);
  });
  // 清掉所有 pending timers
  Object.keys(saveTimers).forEach((id) => {
    clearTimeout(saveTimers[id]);
    delete saveTimers[id];
  });
  if (!changed.length) return;
  savingAll.value = true;
  try {
    await Promise.all(changed.map((a) => autoSaveRow(a)));
  } finally {
    savingAll.value = false;
  }
};

const autoSaveRow = async (article) => {
  delete saveTimers[article.id];
  article.isSaving = true;
  rowSaveStatus.value[article.id] = "saving";
  try {
    await performUpdate(article);
    syncOriginal(article);
    rowSaveStatus.value[article.id] = "saved";
    setTimeout(() => {
      if (rowSaveStatus.value[article.id] === "saved")
        rowSaveStatus.value[article.id] = "";
    }, 2000);
  } catch {
    rowSaveStatus.value[article.id] = "error";
  } finally {
    article.isSaving = false;
  }
};

watch(
  editedArticles,
  (newVal) => {
    newVal.forEach((article) => {
      const orig = allArticles.value.find((o) => o.id === article.id);
      if (!orig || !isChangedExcludingId(article, orig)) return;
      if (saveTimers[article.id]) clearTimeout(saveTimers[article.id]);
      saveTimers[article.id] = setTimeout(() => autoSaveRow(article), 1500);
    });
  },
  { deep: true },
);

// idSuffix 離開欄位才存，避免打到一半被 id 變更觸發 DOM 重建
const saveIdOnBlur = async (article) => {
  const orig = allArticles.value.find((o) => o.id === article.id);
  if (!orig) return;
  if (article.idSuffix === orig.id.replace(/^\d+-/, "")) return;
  if (saveTimers[article.id]) {
    clearTimeout(saveTimers[article.id]);
    delete saveTimers[article.id];
  }
  await autoSaveRow(article);
};

const goToEditor = (article) => {
  const type = article.article_type || "regular";
  if (type === "toc") {
    router.push(`/admin/toc-editor/${article.id}`);
  } else if (type === "submission_info" || type === "editorial_info") {
    router.push(`/admin/meta-article/${article.id}`);
  } else {
    router.push(`/admin/editor/${article.id}`);
  }
};

// ── 下載 Word ──
const downloadingWord = ref(null);
const TOC_SECTION_ORDER = ["主題介紹", "特稿專區", "主題廣場", "多元講堂", "編輯資訊"];
const TOC_SECTIONS_WITH_SEPARATOR = new Set(["特稿專區", "主題廣場", "多元講堂", "編輯資訊"]);
const TOC_SECTIONS_WITH_LABEL = new Set(["特稿專區", "主題廣場", "多元講堂"]);
const TOC_CATEGORY_COLORS = {
  "封面故事": "#7d6c29", "專題文章": "#C00000",
  "人物專訪": "#FFC000", "評論與回應": "#ED7D31",
  "生命故事": "#46b175", "公告與剪影": "#6a5acd",
  "時事評論": "#0070C0", "時事感想": "#0070C0",
  "文藝創作": "#27408b", "光影時刻": "#7d6c29",
  "實驗園地": "#db7093", "文獻與翻譯": "#548235",
};

const generateTocHTML = (issueArticles) => {
  const sorted = [...issueArticles]
    .filter((a) => a.article_type !== "toc")
    .map((a) => ({
      ...a,
      author: a.author_display || a.author || "",
      section: TOC_SECTION_ORDER.includes(a.section) ? a.section : "主題介紹",
      _seq: parseInt(a.id.match(/-(\d+)/)?.[1] || a.sort_order || 999),
    }))
    .sort((a, b) => {
      const si = TOC_SECTION_ORDER.indexOf(a.section);
      const sj = TOC_SECTION_ORDER.indexOf(b.section);
      return si !== sj ? si - sj : a._seq - b._seq;
    })
    .map((a, i) => ({ ...a, tocSeq: i + 1 }));

  const parts = [];
  let lastSection = null;
  for (const a of sorted) {
    if (a.section !== lastSection) {
      if (TOC_SECTIONS_WITH_SEPARATOR.has(a.section)) {
        parts.push('<div class="custom-divider"></div>');
        if (TOC_SECTIONS_WITH_LABEL.has(a.section)) {
          parts.push(`<h3>${a.section}</h3>`);
        }
      }
      lastSection = a.section;
    }
    const seqStr = String(a.tocSeq).padStart(2, "0");
    const color = a.category ? (TOC_CATEGORY_COLORS[a.category] || "#000000") : null;
    const catTag = a.category ? `<span style="color:${color};font-size:10pt">【${a.category}】</span>` : "";
    const subtitlePart = a.subtitle ? `<br>──${a.subtitle}` : "";
    const page = a.page_start != null ? a.page_start : "—";
    const author = a.author ? `｜${a.author}` : "";
    parts.push(`<p class="toc-line"><strong>${seqStr}</strong> ${catTag}${a.title}${subtitlePart}${author}｜pp. ${page}</p>`);
  }
  return parts.join("\n");
};

const downloadWord = async (article) => {
  downloadingWord.value = article.id;
  try {
    let exportData;

    if (article.article_type === "toc") {
      // 目次：即時從同期文章生成最新 HTML
      const { data: issueArts, error: iaErr } = await supabase
        .from("articles")
        .select("id, title, subtitle, author, author_display, category, section, sort_order, page_start, article_type")
        .eq("issue", article.issue);
      if (iaErr) throw iaErr;
      exportData = {
        id: article.id,
        article_type: "toc",
        title: "目次",
        subtitle: "", category: "", author: "", author_title: "",
        remark: "", keyword: "", footnotes: [],
        issue: article.issue, issue_title: "", page_start: null,
        content: generateTocHTML(issueArts || []),
      };
    } else {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, subtitle, category, author, author_title, remark, keyword, content, footnotes, issue, issue_title, page_start, media_assets(image_url, sort_order)")
        .eq("id", article.id)
        .single();
      if (error) throw error;
      const assets = data.media_assets || [];
      const resolvedContent = (data.content || "").replace(
        /\[\[圖片(\d+)\]\]/g,
        (match, orderStr) => {
          const found = assets.find((m) => m.sort_order === parseInt(orderStr));
          return found ? found.image_url : match;
        },
      );
      exportData = { ...data, content: resolvedContent };
    }

    const response = await fetch("/api/export-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exportData),
    });
    const result = await response.json();
    if (result.success) {
      const bytes = new Uint8Array(atob(result.file).split("").map((c) => c.charCodeAt(0)));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      throw new Error(result.error || "生成失敗");
    }
  } catch (err) {
    alert("下載 Word 失敗：" + err.message);
  } finally {
    downloadingWord.value = null;
  }
};

// ── 刪除文章（含媒體庫圖片，透過後端 service role 執行） ──
const deleteArticle = async (article) => {
  if (!confirm(`確定要刪除文章「${article.title}」（${article.id}）？\n媒體庫中屬於此文章的圖片也會一併從 Cloudinary 刪除。\n此操作無法復原！`)) return;
  try {
    const res = await $fetch("/api/delete-article", {
      method: "POST",
      body: { articleId: article.id },
    });
    editedArticles.value = editedArticles.value.filter((a) => a.id !== article.id);
    allArticles.value = allArticles.value.filter((a) => a.id !== article.id);
    alert(`✅ 已刪除文章「${article.title}」${res.deletedImages ? `及 ${res.deletedImages} 張媒體圖片` : ""}`);
  } catch (err) {
    alert("刪除失敗：" + (err.data?.message || err.message));
  }
};

// ── 圖片選擇器 ──
const showImgPicker = ref(false);
const imgPickerTarget = ref(null); // 正在編輯的 article
const imgPickerList = ref([]);
const imgPickerLoading = ref(false);

const openImgPicker = async (article) => {
  imgPickerTarget.value = article;
  imgPickerList.value = [];
  showImgPicker.value = true;
  imgPickerLoading.value = true;
  try {
    // 1. 先查 media_assets DB
    const { data: dbAssets } = await supabase
      .from("media_assets")
      .select("image_url, article_id, cloudinary_id")
      .eq("article_id", article.id)
      .order("sort_order", { ascending: true });

    let images = (dbAssets || []).map((r) => ({ url: r.image_url, label: r.cloudinary_id || r.article_id }));

    // 2. DB 沒有 → 去 Cloudinary 抓，篩出前綴符合的
    if (images.length === 0) {
      // article.id 格式: "{issue}-{seq}{title}"，例如 "7-5林家嫺"
      const seqMatch = article.id.match(/^(\d+)-(\d+)/);
      if (seqMatch) {
        const issueNum = seqMatch[1];
        const seqNum = seqMatch[2];
        const prefix = `issue${issueNum}_${seqNum}-`; // e.g. "issue7_5-"
        try {
          const res = await $fetch("/api/media", {
            method: "GET",
            query: { path: `images/articles/issue-${issueNum}` },
          });
          if (res.success && res.data) {
            images = res.data
              .filter((f) => {
                const name = f.public_id?.split("/").pop() || "";
                return name.startsWith(prefix);
              })
              .map((f) => ({ url: f.secure_url, label: f.public_id?.split("/").pop() }));
          }
        } catch { /* Cloudinary 失敗就略過 */ }
      }
    }

    imgPickerList.value = images;

    // 3. 自動預選第一張
    if (!article.seo_image && images.length > 0) {
      article.seo_image = images[0].url;
    }
    // 4. 本期作者簡介：無圖時用封面圖
    if (!article.seo_image && article.title?.includes("作者簡介")) {
      const { data: issueData } = await supabase
        .from("issues").select("cover_img").eq("id", article.issue).single();
      if (issueData?.cover_img) article.seo_image = issueData.cover_img;
    }
  } catch (e) {
    alert("載入圖片失敗：" + e.message);
  } finally {
    imgPickerLoading.value = false;
  }
};

const pickImage = (img) => {
  if (imgPickerTarget.value) imgPickerTarget.value.seo_image = img.url;
  showImgPicker.value = false;
  imgPickerTarget.value = null;
};

// ── 文章類型對照 ──
const ARTICLE_TYPES = [
  { value: "regular",         label: "一般文章" },
  { value: "toc",             label: "📋 目次" },
  { value: "submission_info", label: "📮 投稿資訊" },
  { value: "editorial_info",  label: "📋 編輯資訊" },
];

// ── 新增文章 modal ──
const showAddModal = ref(false);
const addForm = ref({ seq: "", title: "", section: "主題介紹", article_type: "regular" });
const addSaving = ref(false);
const closeAddModal = () => {
  showAddModal.value = false;
  addForm.value = { seq: "", title: "", section: "主題介紹", article_type: "regular" };
};

const submitAddArticle = async () => {
  if (!addForm.value.seq.toString().trim()) return alert("請填寫序號");
  if (!addForm.value.title.trim()) return alert("請填寫標題");
  if (!selectedIssueId.value) return;
  const idSuffix = `${addForm.value.seq}${addForm.value.title.trim()}`;
  const newId = `${selectedIssueId.value}-${idSuffix}`;
  if (editedArticles.value.some((a) => a.id === newId))
    return alert(`ID「${newId}」已存在`);

  const section = addForm.value.section;
  const computedSortOrder = parseInt(addForm.value.seq, 10) || 999;

  const stub = {
    id: newId,
    issue: selectedIssueId.value,
    title: addForm.value.title.trim(),
    author: "",
    seo: {},
    section,
    sort_order: computedSortOrder,
    page_start: null,
    idSuffix,
    seo_image: "",
    seo_pdf: "",
    article_type: addForm.value.article_type || "regular",
    isSaving: false,
  };
  addSaving.value = true;
  try {
    const { error } = await supabase.from("articles").insert({
      id: stub.id,
      issue: stub.issue,
      title: stub.title,
      section: stub.section,
      sort_order: stub.sort_order,
      article_type: stub.article_type,
      is_published: false,
    });
    if (error) throw error;
    editedArticles.value.push(stub);
    allArticles.value.push(JSON.parse(JSON.stringify(stub)));
    closeAddModal();
  } catch (err) {
    alert("新增失敗：" + err.message);
  } finally {
    addSaving.value = false;
  }
};

onBeforeRouteLeave(async (_to, _from, next) => {
  const pendingIds = Object.keys(saveTimers);
  if (pendingIds.length > 0) {
    pendingIds.forEach((id) => clearTimeout(saveTimers[id]));
    const pending = editedArticles.value.filter((a) =>
      pendingIds.includes(String(a.id)),
    );
    await Promise.all(pending.map((a) => autoSaveRow(a)));
  }
  next();
});
const handleBeforeUnload = (e) => {
  if (Object.keys(saveTimers).length > 0) {
    e.preventDefault();
    e.returnValue = "";
  }
};
onMounted(() => {
  initData();
  window.addEventListener("beforeunload", handleBeforeUnload);
});
onBeforeUnmount(() =>
  window.removeEventListener("beforeunload", handleBeforeUnload),
);

// ════════════════════════════════════════════════════════════════
// ── 待處理投稿（已接受，尚未轉文章）────────────────────────────
// ════════════════════════════════════════════════════════════════
const pendingSubmissions = ref([]);
const loadingSubmissions = ref(false);
const convertingId = ref(null);

// 分區選項（與現有 SECTION_ORDER 一致）
const SUBMIT_SECTIONS = ["主題介紹", "特稿專區", "主題廣場", "多元講堂", "編輯資訊"];

// 每筆投稿的暫存 section 選擇
const submissionSection = ref({});
// 每筆投稿的模式：'new'（新文章）或 'existing'（加入現有文章）
const submissionMode = ref({});
// 每筆投稿在「現有文章」模式下選擇的目標文章 id
const submissionTargetId = ref({});

const fetchPendingSubmissions = async () => {
  if (!selectedIssueId.value) return;
  loadingSubmissions.value = true;
  const { data } = await supabase
    .from("submissions")
    .select("id, title, real_name, display_name, category, created_at, word_url, parsed_html, article_summary, keywords, author_bio")
    .eq("status", "accepted")
    .eq("issue_number", selectedIssueId.value);
  pendingSubmissions.value = data || [];
  // 預設分區
  for (const s of pendingSubmissions.value) {
    if (!submissionSection.value[s.id]) submissionSection.value[s.id] = "主題廣場";
    if (!submissionMode.value[s.id]) submissionMode.value[s.id] = "new";
  }
  loadingSubmissions.value = false;
};

// 當選擇期數變更時重新抓
watch(selectedIssueId, fetchPendingSubmissions);

const convertToArticle = async (sub) => {
  const mode = submissionMode.value[sub.id] || "new";
  const isExisting = mode === "existing";
  const targetId = submissionTargetId.value[sub.id];

  if (isExisting && !targetId) return alert("請先選擇要更新的目標文章");
  if (!sub.parsed_html?.trim()) return alert("此投稿沒有已解析的 Word 內容，無法轉換");
  if (!confirm(`確定要將「${sub.title}」${isExisting ? `的內容更新到文章 ${targetId}` : "建立為新文章草稿"}？`)) return;

  convertingId.value = sub.id;
  try {
    // ── 1. 呼叫 AI 分類 ──────────────────────────────────────
    const issueInfo = issuesOptions.value.find((i) => i.id === selectedIssueId.value);
    const issueTitle = issueInfo?.title || "";
    const issueArticles = editedArticles.value.filter((a) => a.issue === selectedIssueId.value);
    const maxSeq = issueArticles.reduce((max, a) => {
      const m = a.id.match(/-(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const nextSeq = maxSeq + 1;

    let classified = null;
    try {
      const res = await $fetch("/api/classify-article", {
        method: "POST",
        body: { html: sub.parsed_html, issueNumber: selectedIssueId.value, issueTitle, nextSeq },
      });
      classified = res.classified;
    } catch (aiErr) {
      if (!confirm(`⚠️ AI 分類失敗（${aiErr.message}）\n要改用原始內容繼續轉換嗎？`)) return;
    }

    // ── 2. 組合文章資料 ──────────────────────────────────────
    const authorName = sub.display_name || sub.real_name;
    const section = submissionSection.value[sub.id] || "主題廣場";
    const articleData = {
      title:    classified?.title    || sub.title,
      author:   classified?.author   || authorName,
      subtitle: classified?.subtitle || "",
      category: classified?.category || sub.category,
      summary:  classified?.summary  || sub.article_summary || "",
      keyword:  classified?.keyword  || (Array.isArray(sub.keywords) ? sub.keywords.join("、") : (sub.keywords || "")),
      content:  classified?.content  || sub.parsed_html,
      footnotes: classified?.footnotes || [],
      seo: classified?.seo ? { description: classified.seo.description, keywords: classified.seo.keywords } : {},
      section,
      is_published: false,
      article_type: "regular",
    };

    // ── 3a. 更新現有文章 ──────────────────────────────────────
    if (isExisting) {
      const { error: updateErr } = await supabase.from("articles").update(articleData).eq("id", targetId);
      if (updateErr) throw updateErr;
      await supabase.from("submissions").update({ status: "converted", article_id: targetId }).eq("id", sub.id);
      pendingSubmissions.value = pendingSubmissions.value.filter((s) => s.id !== sub.id);
      await initData();
      alert(`✅ 已成功更新文章：${targetId}`);
    } else {
      // ── 3b. 建立新文章 ──────────────────────────────────────
      const titleShort = articleData.title.replace(/\s/g, "").slice(0, 4);
      const newId = `${selectedIssueId.value}-${nextSeq}${titleShort}`;
      const newArticle = { id: newId, issue: selectedIssueId.value, sort_order: nextSeq, ...articleData };
      const { error: insertErr } = await supabase.from("articles").insert([newArticle]);
      if (insertErr) throw insertErr;
      await supabase.from("submissions").update({ status: "converted", article_id: newId }).eq("id", sub.id);
      pendingSubmissions.value = pendingSubmissions.value.filter((s) => s.id !== sub.id);
      await initData();
      alert(`✅ 已成功建立草稿：${newId}`);
    }
  } catch (err) {
    alert("❌ 轉換失敗：" + err.message);
  } finally {
    convertingId.value = null;
  }
};
</script>

<template>
  <div class="articles-manager">
    <div class="header">
      <h2>📚 文章管理</h2>
      <p class="desc">
        更改 ID 數字將「自動重新排序」；更改分區請透過左側 ⠿ 拖曳。
      </p>
    </div>

    <div class="toolbar-container">
      <div class="toolbar-left">
        <label>選擇期數：</label>
        <div class="select-wrapper">
          <select v-model="selectedIssueId">
            <option
              v-for="issue in issuesOptions"
              :key="issue.id"
              :value="issue.id"
            >
              Vol.{{ issue.id }} - {{ issue.title }}
            </option>
          </select>
        </div>
        <span class="count-badge">共 {{ totalArticles }} 篇文章</span>
        <button class="btn-new" @click="showAddModal = true">
          ＋ 新增文章
        </button>
        <button class="btn-save-all" @click="saveAll" :disabled="savingAll">
          {{ savingAll ? "儲存中..." : "💾 全部儲存" }}
        </button>
      </div>
      <div class="toolbar-right">
        <button class="btn-merge-pdf" @click="openMergeModal" title="將此期所有文章 PDF 合併成完整期刊">
          🔗 合併成期刊 PDF
        </button>
      </div>
    </div>

    <input
      type="file"
      ref="pdfInput"
      accept="application/pdf"
      style="display: none"
      @change="handlePdfUpload"
    />

    <div v-if="loading" class="loading">載入中...</div>
    <div v-else class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th width="30"></th>
            <th width="220">ID(自動排序)</th>
            <th width="60">頁數</th>
            <th width="200">主標題</th>
            <th width="130">圖片 SEO</th>
            <th width="100">上傳 PDF</th>
            <th width="90">校對狀態</th>
            <th width="150">操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="section in SECTION_ORDER" :key="section">
            <tr
              class="section-divider-row"
              :class="{ 'drop-active': dropSection === section }"
              @dragover="onDragOver($event, section)"
              @dragleave="onDragLeave"
              @drop="onDrop($event, section)"
            >
              <td colspan="8">
                <span class="section-label">{{ SECTION_LABELS[section] }}</span>
                <span class="section-note" v-if="SECTION_NOTES[section]">{{
                  SECTION_NOTES[section]
                }}</span>
                <span class="section-count"
                  >{{ groupedArticles[section]?.length || 0 }} 篇</span
                >
              </td>
            </tr>

            <tr
              v-for="article in groupedArticles[section]"
              :key="article.id"
              draggable="true"
              @dragstart="onDragStart($event, article)"
              @dragend="onDragEnd"
              :class="{
                dragging: draggedId === article.id,
                'toc-row': article.article_type === 'toc',
                'meta-row': article.article_type === 'submission_info' || article.article_type === 'editorial_info',
              }"
            >
              <td
                class="drag-handle"
                title="拖曳以更換分區"
                @mousedown="dragHandleActive = true"
                @mouseup="dragHandleActive = false"
              >⠿</td>
              <td class="id-cell">
                <div class="id-cell-inner">
                  <span class="id-prefix">{{ article.issue }}-</span>
                  <input
                    type="text"
                    v-model="article.idSuffix"
                    class="table-input id-input"
                    placeholder="例如: 1編輯室報告"
                    :class="{
                      'id-changed':
                        article.issue + '-' + article.idSuffix !== article.id,
                    }"
                    @blur="saveIdOnBlur(article)"
                  />
                </div>
              </td>
              <td>
                <input
                  type="number"
                  v-model.number="article.page_start"
                  class="table-input page-input"
                  min="1"
                  @focus="onPageFocus(article)"
                  @blur="onPageBlur(article)"
                />
              </td>
              <td>
                <input
                  type="text"
                  v-model="article.title"
                  class="table-input"
                />
              </td>
              <td>
                <div class="seo-image-cell">
                  <img
                    v-if="article.seo_image"
                    :src="article.seo_image"
                    class="seo-thumb"
                    @click="openImgPicker(article)"
                    title="點擊更換圖片"
                  />
                  <input
                    type="text"
                    v-model="article.seo_image"
                    class="table-input seo-input"
                    placeholder="貼上網址..."
                  />
                  <button class="btn-img-pick" @click="openImgPicker(article)" title="從媒體庫選圖">🖼</button>
                </div>
              </td>
              <td class="pdf-cell">
                <div class="pdf-actions">
                  <a
                    v-if="article.seo_pdf"
                    :href="article.seo_pdf"
                    target="_blank"
                    class="pdf-link"
                    >👀 預覽</a
                  >
                  <button
                    class="btn-pdf-upload"
                    @click="triggerPdfUpload(article)"
                  >
                    {{
                      article.isSaving && uploadingPdfId === article.id
                        ? "上傳中..."
                        : "📄 上傳"
                    }}
                  </button>
                </div>
              </td>
              <td class="proofread-cell">
                <span
                  class="proofread-badge"
                  :class="'badge-' + article.proofread_status"
                >
                  {{
                    article.proofread_status === "completed"
                      ? "✅ 完成"
                      : article.proofread_status === "in_progress"
                        ? "🔄 進行中"
                        : article.proofread_status === "pending"
                          ? "⬜ 待校對"
                          : "🔴 未完成"
                  }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="action-buttons">
                  <button
                    class="btn-edit"
                    @click="goToEditor(article)"
                    :title="article.article_type === 'toc' ? '進入目次編輯器' : (article.article_type === 'submission_info' || article.article_type === 'editorial_info') ? '進入專用編輯介面' : '進入內文編輯器'"
                  >
                    {{ article.article_type === 'toc' ? '📋' : (article.article_type === 'submission_info' || article.article_type === 'editorial_info') ? '📝' : '✏️' }}
                  </button>
                  <NuxtLink
                    :to="`/admin/proofread/${article.id}`"
                    class="btn-proofread"
                    title="進入校對畫面"
                    >🔍</NuxtLink
                  >
                  <button
                    v-if="article.article_type !== 'submission_info' && article.article_type !== 'editorial_info'"
                    class="btn-word"
                    :disabled="downloadingWord === article.id"
                    @click="downloadWord(article)"
                    title="下載 Word"
                  >{{ downloadingWord === article.id ? '⏳' : '📥' }}</button>
                  <button
                    class="btn-delete"
                    @click="deleteArticle(article)"
                    title="刪除此文章"
                  >🗑️</button>
                </div>
                <div v-if="rowSaveStatus[article.id]" class="row-save-status">
                  <template v-if="rowSaveStatus[article.id] === 'saving'">⏳</template>
                  <template v-else-if="rowSaveStatus[article.id] === 'saved'">✅</template>
                  <template v-else-if="rowSaveStatus[article.id] === 'error'">❌</template>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- ════════════════════════════════════════════════════════
         ── 待處理投稿區塊 ──────────────────────────────────── -->
    <div class="pending-submissions-section">
      <div class="pending-header" @click="fetchPendingSubmissions">
        <h3>📥 待轉換投稿
          <span class="pending-count" v-if="pendingSubmissions.length > 0">{{ pendingSubmissions.length }}</span>
        </h3>
        <p class="pending-desc">已接受、尚未轉換為文章的投稿。設定分區後點「跑 AI 分類」即可建立草稿。</p>
      </div>

      <div v-if="loadingSubmissions" class="pending-loading">載入中...</div>
      <div v-else-if="pendingSubmissions.length === 0" class="pending-empty">
        目前本期沒有待處理的投稿。
      </div>
      <div v-else class="pending-table-wrapper">
        <table class="pending-table">
          <thead>
            <tr>
              <th>標題 / 作者</th>
              <th>類型</th>
              <th>轉換設定</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in pendingSubmissions" :key="sub.id">
              <td class="sub-title">
                <div>{{ sub.title }}</div>
                <div class="sub-author">{{ sub.display_name || sub.real_name }}</div>
              </td>
              <td><span class="tag-cat">{{ sub.category }}</span></td>
              <td class="convert-settings">
                <!-- 模式切換 -->
                <div class="mode-toggle">
                  <label :class="['mode-btn', submissionMode[sub.id] === 'new' ? 'active' : '']">
                    <input type="radio" :name="`mode-${sub.id}`" value="new" v-model="submissionMode[sub.id]" />
                    ＋ 新文章
                  </label>
                  <label :class="['mode-btn', submissionMode[sub.id] === 'existing' ? 'active' : '']">
                    <input type="radio" :name="`mode-${sub.id}`" value="existing" v-model="submissionMode[sub.id]" />
                    → 現有文章
                  </label>
                </div>
                <!-- 新文章模式：選分區 -->
                <div v-if="submissionMode[sub.id] === 'new'" class="setting-row">
                  <label class="setting-lbl">分區</label>
                  <select v-model="submissionSection[sub.id]" class="section-select">
                    <option v-for="sec in SUBMIT_SECTIONS" :key="sec" :value="sec">{{ sec }}</option>
                  </select>
                </div>
                <!-- 現有文章模式：選目標文章 -->
                <div v-else class="setting-row">
                  <label class="setting-lbl">目標文章</label>
                  <select v-model="submissionTargetId[sub.id]" class="section-select">
                    <option value="">— 請選擇 —</option>
                    <option
                      v-for="art in editedArticles.filter(a => a.issue === selectedIssueId)"
                      :key="art.id"
                      :value="art.id"
                    >{{ art.id }} {{ art.title }}</option>
                  </select>
                </div>
              </td>
              <td>
                <div class="sub-actions">
                  <a v-if="sub.word_url" :href="sub.word_url" target="_blank" class="btn-dl">📄 Word</a>
                  <button
                    class="btn-convert"
                    :disabled="convertingId === sub.id"
                    @click="convertToArticle(sub)"
                  >
                    {{ convertingId === sub.id ? 'AI 處理中...' : '✨ AI 轉換' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── 合併期刊 PDF Modal ── -->
    <div v-if="showMergeModal" class="modal-overlay" @click.self="showMergeModal = false">
      <div class="modal merge-modal">
        <div class="modal-header">
          <h3>🔗 合併期刊 PDF — Vol.{{ selectedIssueId }}</h3>
          <button class="modal-close" @click="showMergeModal = false">×</button>
        </div>
        <div class="modal-body">
          <p class="merge-desc">
            合併順序：<strong>封面 PDF → 文章（依頁數排序）→ 封底 PDF</strong>
            <br />合併結果上傳到 Cloudinary <code>magazines/</code> 資料夾，命名為 <code>Vol.{{ selectedIssueId }}.pdf</code>。
          </p>

          <table class="merge-table">
            <thead>
              <tr>
                <th width="30">#</th>
                <th>名稱</th>
                <th width="60">頁數</th>
                <th width="80">PDF 狀態</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>—</td>
                <td>封面 PDF</td>
                <td>—</td>
                <td>
                  <span v-if="currentIssue?.cover_pdf" class="badge-ok">✅ 已上傳</span>
                  <span v-else class="badge-miss">❌ 缺少</span>
                </td>
              </tr>
              <template v-for="a in [...editedArticles.filter(x => x.issue === selectedIssueId)].sort((a,b) => (a.page_start??9999)-(b.page_start??9999))" :key="a.id">
                <tr>
                  <td class="text-center">{{ a.page_start ?? '—' }}</td>
                  <td>{{ a.id }} {{ a.title }}</td>
                  <td>{{ a.page_start ?? '—' }}</td>
                  <td>
                    <span v-if="a.seo_pdf" class="badge-ok">✅</span>
                    <span v-else class="badge-miss">❌ 缺少</span>
                  </td>
                </tr>
              </template>
              <tr>
                <td>—</td>
                <td>封底 PDF</td>
                <td>—</td>
                <td>
                  <span v-if="currentIssue?.back_cover_pdf" class="badge-ok">✅ 已上傳</span>
                  <span v-else class="badge-miss">❌ 缺少</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="mergeResult" class="merge-result">
            <p>🎉 合併成功！共 <strong>{{ mergeResult.pages_merged }}</strong> 頁</p>
            <a :href="mergeResult.url" target="_blank" class="btn-download-merged">
              📥 下載 Vol.{{ selectedIssueId }}.pdf
            </a>
            <p class="merge-url">{{ mergeResult.url }}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showMergeModal = false" :disabled="merging">取消</button>
          <button class="btn-new" @click="performMerge" :disabled="merging">
            {{ merging ? "合併中，請稍候..." : "🔗 開始合併並上傳" }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── 圖片選擇器 Modal ── -->
    <div v-if="showImgPicker" class="modal-overlay" @click.self="showImgPicker = false">
      <div class="modal img-picker-modal">
        <div class="modal-header">
          <h3>🖼 選擇圖片（Vol.{{ selectedIssueId }}）</h3>
          <button class="modal-close" @click="showImgPicker = false">×</button>
        </div>
        <div class="modal-body img-picker-body">
          <div v-if="imgPickerLoading" class="img-picker-loading">載入中...</div>
          <div v-else-if="!imgPickerList.length" class="img-picker-empty">此期尚無媒體圖片</div>
          <div v-else class="img-picker-grid">
            <div
              v-for="img in imgPickerList"
              :key="img.url"
              class="img-picker-item"
              :class="{ selected: imgPickerTarget?.seo_image === img.url }"
              @click="pickImage(img)"
            >
              <img :src="img.url" :alt="img.label || ''" loading="lazy" />
              <div class="img-picker-label">{{ img.label }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
      <div class="modal">
        <div class="modal-header">
          <h3>新增文章</h3>
          <button class="modal-close" @click="closeAddModal">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-row">
            <div class="modal-field" style="flex: 1">
              <label>文章篇序 (數字)</label>
              <input
                type="number"
                v-model.number="addForm.seq"
                class="table-input"
                placeholder="例如: 1"
              />
            </div>
            <div class="modal-field" style="flex: 3">
              <label>主標題</label>
              <input
                type="text"
                v-model="addForm.title"
                class="table-input"
                placeholder="請輸入標題"
              />
            </div>
          </div>
          <div class="modal-field">
            <label>所屬分區</label>
            <select v-model="addForm.section" class="table-input">
              <option v-for="s in SECTION_ORDER" :key="s" :value="s">
                {{ SECTION_LABELS[s] }}
              </option>
            </select>
          </div>
          <div class="modal-field">
            <label>文章類型</label>
            <select v-model="addForm.article_type" class="table-input">
              <option v-for="t in ARTICLE_TYPES" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
            <small class="modal-type-hint">
              <template v-if="addForm.article_type === 'toc'">目次模式：專用目次編輯器，可直接修改各篇頁數並自動生成目次內文。</template>
              <template v-else-if="addForm.article_type === 'submission_info'">投稿資訊模式：使用簡化編輯器，並可從期刊主題管理的 CFP 資料一鍵同步內文。</template>
              <template v-else-if="addForm.article_type === 'editorial_info'">編輯資訊模式：使用簡化編輯器，獨立管理。</template>
              <template v-else>一般文章，使用完整文章編輯器。</template>
            </small>
          </div>
          <div class="modal-id-preview">
            即將建立的 ID:
            <strong
              >{{ selectedIssueId }}-{{ addForm.seq
              }}{{ addForm.title }}</strong
            >
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-cancel"
            @click="closeAddModal"
            :disabled="addSaving"
          >
            取消
          </button>
          <button
            class="btn-new"
            @click="submitAddArticle"
            :disabled="addSaving"
          >
            {{ addSaving ? "建立中..." : "確認建立" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.articles-manager {
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden; /* 防止整個頁面出現水平捲軸 */
}

.header {
  text-align: center;
  margin-bottom: 20px;
}
.header h2 {
  color: #2c3e50;
  margin-bottom: 5px;
}
.desc {
  color: #666;
  font-size: 1rem;
  margin: 0;
}

/* ── 工具列 ── */
.toolbar-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
  background: #f8f9fa;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}
.toolbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.select-wrapper select {
  padding: 8px 12px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-width: 240px;
  cursor: pointer;
  background: white;
}
.count-badge {
  background: #e9ecef;
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 0.9rem;
  color: #555;
  font-weight: bold;
}
.btn-new {
  padding: 8px 16px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-new:hover {
  background: #219150;
}
.btn-save-all {
  padding: 8px 16px;
  background: #2980b9;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-save-all:hover:not(:disabled) {
  background: #1f6391;
}
.btn-save-all:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}


.loading {
  text-align: center;
  font-size: 1.2rem;
  color: #666;
  margin: 40px;
}

/* ── 表格 ── */
.table-wrapper {
  width: 100%;
  background: white;
  border-radius: 8px;
  overflow-x: auto; /* 只有表格內部可以捲動，不影響外部版面 */
  border: 2px solid #2c3e50;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}
.data-table th,
.data-table td {
  padding: 10px 8px;
  border: 1px solid #dee2e6;
  vertical-align: middle;
  text-align: left; /* td 預設靠左 */
}

/* 🌟 表格標題置中 */
.data-table th {
  background: #2c3e50;
  color: white;
  font-weight: bold;
  font-size: 0.85rem;
  white-space: nowrap;
  border-color: #3d5166;
  text-align: center;
}

/* 分區標題列 */
.section-divider-row td {
  background: #f1f3f5;
  padding: 7px 12px;
  border: 1px solid #dee2e6;
  border-left: 4px solid #2c3e50;
}
.section-divider-row.drop-active td {
  background: #dbeafe;
  border-left-color: #3498db;
}
.section-label {
  font-weight: bold;
  color: #2c3e50;
  font-size: 0.95rem;
  margin-right: 8px;
}
.section-note {
  font-size: 0.8rem;
  color: #999;
  font-style: italic;
  margin-right: 8px;
}
.section-count {
  background: #dee2e6;
  color: #555;
  font-size: 0.78rem;
  padding: 1px 7px;
  border-radius: 10px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: white;
  border-radius: 10px;
  width: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
}
.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  line-height: 1;
}
.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.modal-field label {
  display: block;
  font-weight: bold;
  font-size: 0.85rem;
  color: #555;
  margin-bottom: 6px;
}
.modal-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
.modal-id-preview {
  font-size: 0.85rem;
  color: #666;
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}
.modal-id-preview strong {
  color: #2c3e50;
}
.modal-type-hint {
  display: block;
  margin-top: 5px;
  font-size: 0.8rem;
  color: #888;
  font-style: italic;
}
.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-cancel {
  padding: 8px 18px;
  background: #f1f3f5;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  cursor: pointer;
  color: #555;
}

/* 拖曳把手 */
.drag-handle {
  cursor: grab;
  color: #aaa;
  font-size: 1.2rem;
  text-align: center;
  user-select: none;
}
.drag-handle:active {
  cursor: grabbing;
}

tr.dragging {
  opacity: 0.4;
}

/* ID 欄位 */
.id-cell {
  vertical-align: middle;
}
.id-cell-inner {
  display: flex;
  align-items: center;
  gap: 2px;
}
.id-prefix {
  font-family: monospace;
  font-weight: bold;
  color: #999;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 0.85rem;
}
.id-input {
  font-family: monospace;
  font-size: 0.95rem;
  color: #007bff;
  font-weight: bold;
  min-width: 0;
  flex: 1;
}
.id-changed {
  border-color: #e67e22 !important;
  background: #fff8f0;
  color: #e67e22;
}

/* 頁數欄位 */
.page-input {
  width: 100%;
  text-align: center;
  padding: 6px 4px;
}

/* 一般輸入 */
.table-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border 0.15s;
  box-sizing: border-box;
}
.table-input:focus {
  border-color: #3498db;
  outline: none;
}
.seo-image-cell {
  display: flex;
  gap: 4px;
  align-items: center;
}

.seo-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #ddd;
  flex-shrink: 0;
  cursor: pointer;
}
.seo-thumb:hover { border-color: #3498db; }

.btn-img-pick {
  flex-shrink: 0;
  padding: 4px 6px;
  background: #e8f4fd;
  border: 1px solid #b8d4ea;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
}
.btn-img-pick:hover { background: #cce5f7; }

/* 圖片選擇器 Modal */
.img-picker-modal {
  width: 820px !important;
  max-width: 95vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
}
.img-picker-body {
  overflow-y: auto;
  flex: 1;
  padding: 16px !important;
}
.img-picker-loading,
.img-picker-empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
}
.img-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.img-picker-item {
  border: 2px solid #dee2e6;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.img-picker-item:hover { border-color: #3498db; }
.img-picker-item.selected { border-color: #27ae60; box-shadow: 0 0 0 2px #a9dfbf; }
.img-picker-item img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  display: block;
}
.img-picker-label {
  font-size: 0.7rem;
  color: #888;
  padding: 3px 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #f8f9fa;
}

/* SEO 網址欄：截斷顯示，不撐開版面 */
.seo-input {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  color: #888;
  font-size: 0.8rem;
}
.seo-input:focus {
  color: #333;
}

/* PDF 上傳區 */
.data-table td.pdf-cell {
  text-align: center;
}
.pdf-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.pdf-link {
  font-size: 0.85rem;
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
  background: #e7f1ff;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.pdf-link:hover {
  text-decoration: underline;
  background: #cfe2ff;
}
.btn-pdf-upload {
  background: #6c757d;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}
.btn-pdf-upload:hover {
  background: #5a6268;
}

/* 校對狀態 */
.data-table td.proofread-cell {
  vertical-align: middle;
  text-align: center;
}
.proofread-badge {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: bold;
  padding: 3px 8px;
  border-radius: 10px;
  white-space: nowrap;
}
.badge-incomplete {
  background: #f8d7da;
  color: #721c24;
}
.badge-pending {
  background: #e9ecef;
  color: #666;
}
.badge-in_progress {
  background: #fff3cd;
  color: #856404;
}
.badge-completed {
  background: #d4edda;
  color: #155724;
}

/* 操作按鈕 */
.data-table td.actions-cell {
  vertical-align: middle;
}
.action-buttons {
  display: flex;
  gap: 6px;
  justify-content: center;
}
.btn-edit,
.btn-proofread,
.btn-word {
  border: none;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: transform 0.1s;
  text-decoration: none;
}
.row-save-status {
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.2;
  margin-top: 2px;
}
.btn-edit {
  background: #17a2b8;
  color: white;
}
.btn-edit:hover {
  background: #138496;
}
.btn-proofread {
  background: #11998e;
  color: white;
}
.btn-proofread:hover {
  background: #0d7a70;
}
.btn-word {
  background: #6c757d;
  color: white;
}
.btn-word:hover {
  background: #545b62;
}
.btn-word:disabled {
  opacity: 0.6;
  cursor: default;
}
.btn-delete {
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1.4;
  text-decoration: none;
}
.btn-delete:hover { background: #c0392b; }
.btn-edit:active,
.btn-proofread:active,
.btn-word:active,
.btn-delete:active {
  transform: scale(0.95);
}

/* ── 目錄列 / meta 列特殊樣式 ── */
tr.toc-row td {
  background: #fef9e7;
}
tr.meta-row td {
  background: #f0f4ff;
}

/* ── 合併 PDF 按鈕 ── */
.btn-merge-pdf {
  padding: 8px 14px;
  background: #8e44ad;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}
.btn-merge-pdf:hover {
  background: #7d3c98;
}

/* ── 合併 PDF Modal ── */
.merge-modal {
  width: 680px !important;
  max-width: 96vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.merge-modal .modal-body {
  overflow-y: auto;
  flex: 1;
}
.merge-desc {
  font-size: 0.9rem;
  color: #555;
  background: #f8f9fa;
  padding: 10px 14px;
  border-radius: 6px;
  border-left: 3px solid #8e44ad;
  margin-bottom: 12px;
}
.merge-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.merge-table th,
.merge-table td {
  padding: 7px 10px;
  border: 1px solid #dee2e6;
}
.merge-table th {
  background: #f1f3f5;
  font-weight: bold;
  color: #444;
}
.badge-ok {
  color: #27ae60;
  font-weight: bold;
}
.badge-miss {
  color: #e74c3c;
  font-weight: bold;
}
.merge-result {
  margin-top: 16px;
  padding: 14px;
  background: #eafaf1;
  border: 1px solid #a9dfbf;
  border-radius: 8px;
  text-align: center;
}
.merge-result p {
  margin: 0 0 10px;
  color: #1e8449;
  font-weight: bold;
}
.btn-download-merged {
  display: inline-block;
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 1rem;
  transition: background 0.2s;
}
.btn-download-merged:hover {
  background: #219a52;
}
.merge-url {
  margin-top: 8px;
  font-size: 0.75rem;
  color: #888;
  word-break: break-all;
}

/* ── 待處理投稿 ─────────────────────────────────────────── */
.pending-submissions-section {
  margin-top: 36px;
  border: 2px dashed #b8cce4;
  border-radius: 10px;
  padding: 20px 24px;
  background: #f0f6ff;
}
.pending-header { margin-bottom: 14px; }
.pending-header h3 { margin: 0 0 4px; color: #1a4f7a; font-size: 1.05rem; display: flex; align-items: center; gap: 8px; }
.pending-count { background: #e74c3c; color: white; border-radius: 12px; padding: 1px 8px; font-size: 0.8rem; }
.pending-desc { margin: 0; font-size: 0.85rem; color: #5a7a9a; }
.pending-loading, .pending-empty { text-align: center; color: #999; padding: 20px 0; font-size: 0.9rem; }
.pending-table-wrapper { overflow-x: auto; }
.pending-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.pending-table th { background: #d0e4f7; color: #1a4f7a; padding: 8px 10px; text-align: left; }
.pending-table td { padding: 8px 10px; border-bottom: 1px solid #d8e8f8; vertical-align: middle; }
.pending-table tr:hover td { background: #e8f2fc; }
.sub-title { font-weight: 600; color: #2c3e50; }
.sub-author { font-size: 0.8rem; color: #666; margin-top: 2px; }
.tag-cat { background: #e8f0fe; color: #2c5aa0; padding: 2px 8px; border-radius: 12px; font-size: 0.78rem; white-space: nowrap; }
.convert-settings { min-width: 240px; }
.mode-toggle { display: flex; gap: 6px; margin-bottom: 6px; }
.mode-btn { display: flex; align-items: center; gap: 4px; padding: 3px 10px; border: 1px solid #bbb; border-radius: 14px; font-size: 0.8rem; cursor: pointer; color: #555; background: #f5f5f5; user-select: none; }
.mode-btn input[type=radio] { display: none; }
.mode-btn.active { background: #2c3e50; color: white; border-color: #2c3e50; }
.setting-row { display: flex; align-items: center; gap: 6px; }
.setting-lbl { font-size: 0.78rem; color: #666; white-space: nowrap; }
.section-select { padding: 4px 8px; border: 1px solid #ccc; border-radius: 5px; font-size: 0.85rem; max-width: 180px; }
.sub-actions { display: flex; gap: 6px; align-items: center; }
.btn-dl { padding: 4px 10px; background: #e8f4fd; color: #1a6fa8; border-radius: 5px; text-decoration: none; font-size: 0.82rem; }
.btn-dl:hover { background: #d0e8f9; }
.btn-convert { padding: 5px 12px; background: #2c3e50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem; white-space: nowrap; }
.btn-convert:hover:not(:disabled) { background: #34495e; }
.btn-convert:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 768px) {
  .toolbar-container {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-left,
  .toolbar-right {
    flex-direction: column;
    width: 100%;
  }
}
</style>
