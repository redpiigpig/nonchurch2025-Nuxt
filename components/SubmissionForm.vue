<script setup>
import { ref, nextTick } from "vue";
import { supabase } from "~/supabase";

const props = defineProps({
  issueNumber: { type: Number, default: null },
});

// ════════════════════════════════════════════════════════════════
// ── 頁面模式：new | modify ────────────────────────────────────
// ════════════════════════════════════════════════════════════════
const pageMode = ref("new"); // 'new' | 'modify'

// 步驟：new → form/submitting/success/error
//       modify → lookup/results/editing/submitting/success/error
const step = ref("form");

const switchMode = (mode) => {
  pageMode.value = mode;
  step.value = mode === "new" ? "form" : "lookup";
  resetForm();
};

// ════════════════════════════════════════════════════════════════
// ── 修改模式：查詢 ────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
const lookupName = ref("");
const lookupEmail = ref("");
const lookupLoading = ref(false);
const lookupResults = ref([]);
const lookupError = ref("");
const editingId = ref(null);
const editingTitle = ref("");

// 現有檔案（修改模式下顯示）
const existingWordUrl = ref(null);
const existingPdfUrl = ref(null);
const existingImages = ref([]);

const statusLabel = { submitted: "待審核", reviewing: "審核中", accepted: "已接受", rejected: "已拒絕", converted: "已轉文章" };
const statusColor = { submitted: "#e67e22", reviewing: "#2980b9", accepted: "#27ae60", rejected: "#c0392b", converted: "#8e44ad" };

const doLookup = async () => {
  lookupError.value = "";
  if (!lookupName.value.trim() || !lookupEmail.value.trim()) {
    lookupError.value = "請填寫姓名與 Email";
    return;
  }
  lookupLoading.value = true;
  lookupResults.value = [];
  try {
    const res = await $fetch("/api/submission-lookup", {
      method: "POST",
      body: { name: lookupName.value.trim(), email: lookupEmail.value.trim() },
    });
    if (!res.success) throw new Error();
    lookupResults.value = res.data || [];
    if (lookupResults.value.length === 0)
      lookupError.value = "找不到符合的投稿記錄，請確認姓名（本名或筆名）與 Email 是否正確。";
    else
      step.value = "results";
  } catch {
    lookupError.value = "查詢失敗，請稍後再試。";
  } finally {
    lookupLoading.value = false;
  }
};

const selectForEdit = async (sub) => {
  if (sub.status === "converted") {
    alert("此投稿已轉換為文章，無法修改。");
    return;
  }
  step.value = "submitting";
  submitProgress.value = "載入投稿資料...";
  try {
    const res = await $fetch("/api/submission-lookup", {
      method: "POST",
      body: { id: sub.id, email: lookupEmail.value.trim() },
    });
    if (!res.success || !res.data) throw new Error("找不到資料");
    const d = res.data;
    editingId.value = d.id;
    editingTitle.value = d.title;

    form.value = {
      real_name: d.real_name || "",
      display_name: d.display_name || "",
      author_bio: d.author_bio || "",
      email: d.email || "",
      is_first_submission: d.is_first_submission,
      author_intro: d.author_intro || "",
      article_summary: d.article_summary || "",
      title: d.title || "",
      category: d.category || "",
      notes: d.notes || "",
    };
    keywords.value = Array.isArray(d.keywords) ? [...d.keywords] : [];
    existingWordUrl.value = d.word_url || null;
    existingPdfUrl.value = d.pdf_url || null;
    existingImages.value = Array.isArray(d.images) ? [...d.images] : [];

    // 既有大頭貼
    if (d.avatar_url) {
      existingAvatarUrl.value = d.avatar_url;
      avatarPreview.value = d.avatar_url;
    }

    step.value = "editing";
  } catch (err) {
    alert("載入失敗：" + (err.message || "請稍後再試"));
    step.value = "results";
  }
};

// ════════════════════════════════════════════════════════════════
// ── 表單欄位 ──────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
const submitProgress = ref("");
const errorMsg = ref("");

const form = ref({
  real_name: "", display_name: "", author_bio: "", email: "",
  is_first_submission: null, author_intro: "", article_summary: "",
  title: "", category: "", notes: "",
});

const keywords = ref([]);
const keywordInput = ref("");
const addKeyword = () => {
  const kw = keywordInput.value.trim();
  if (!kw || keywords.value.length >= 5) return;
  if (!keywords.value.includes(kw)) keywords.value.push(kw);
  keywordInput.value = "";
};
const removeKeyword = (i) => keywords.value.splice(i, 1);
const onKeydownKw = (e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } };

const categories = [
  "專題文章", "評論與回應", "人物專訪", "生命故事",
  "時事感想", "文藝創作", "公告與剪影", "文獻與翻譯",
  "光影時刻", "實驗園地",
];

// ════════════════════════════════════════════════════════════════
// ── 舊作者帶入 ───────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
const oldAuthorMatches = ref([]);
const oldAuthorLoading = ref(false);
const oldAuthorDone = ref(false);
const oldAuthorSearched = ref(false);

const lookupOldAuthor = async () => {
  const nameParts = [form.value.display_name.trim(), form.value.real_name.trim()].filter(Boolean);
  if (nameParts.length === 0) return;
  oldAuthorLoading.value = true;
  oldAuthorSearched.value = true;
  oldAuthorMatches.value = [];
  const orParts = nameParts.map((n) => `name.ilike.%${n}%`).join(",");
  // 同時搜尋公開名（name）與本名（real_name）
  const orPartsExtended = nameParts
    .flatMap((n) => [`name.ilike.%${n}%`, `real_name.ilike.%${n}%`])
    .join(",");
  const { data } = await supabase
    .from("authors")
    .select("name, real_name, email, bio, author_image")
    .or(orPartsExtended)
    .limit(5);
  oldAuthorMatches.value = data || [];
  oldAuthorLoading.value = false;
};

const selectOldAuthor = (author) => {
  // 帶入筆名（authors.name 是公開顯示名，即筆名）
  if (!form.value.display_name.trim()) {
    form.value.display_name = author.name || "";
  }
  // 帶入 Email（只在空白時填入，避免覆蓋已填的）
  if (!form.value.email.trim() && author.email) {
    form.value.email = author.email;
  }
  // 帶入自介
  if (author.bio) form.value.author_intro = author.bio;
  // 帶入大頭貼
  if (author.author_image && !avatarFile.value) {
    existingAvatarUrl.value = author.author_image;
    avatarPreview.value = author.author_image;
  }
  oldAuthorMatches.value = [];
  oldAuthorDone.value = true;
};

const dismissOldAuthor = () => {
  oldAuthorMatches.value = [];
  oldAuthorDone.value = true;
};

// ════════════════════════════════════════════════════════════════
// ── 檔案狀態 ─────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
const wordFile = ref(null);
const pdfFile = ref(null);
const imageFiles = ref([]);
const wordInput = ref(null);
const pdfInput = ref(null);
const imgInput = ref(null);

const handleWordChange = (e) => { wordFile.value = e.target.files[0] || null; };
const handlePdfChange = (e) => { pdfFile.value = e.target.files[0] || null; };
const handleImgChange = (e) => {
  const files = Array.from(e.target.files);
  for (const f of files) {
    if (imageFiles.value.length >= 20) break;
    imageFiles.value.push({ file: f, previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null, name: f.name });
  }
  e.target.value = "";
};
const removeImage = (i) => {
  if (imageFiles.value[i].previewUrl) URL.revokeObjectURL(imageFiles.value[i].previewUrl);
  const arr = [...imageFiles.value];
  arr.splice(i, 1);
  imageFiles.value = arr;
};
const reorderNewImage = (fromIdx, newPos) => {
  const toIdx = Math.min(Math.max(newPos - 1, 0), imageFiles.value.length - 1);
  if (fromIdx === toIdx) return;
  const arr = [...imageFiles.value];
  const [item] = arr.splice(fromIdx, 1);
  arr.splice(toIdx, 0, item);
  imageFiles.value = arr;
};

const removeExistingImage = (i) => {
  const arr = [...existingImages.value];
  arr.splice(i, 1);
  existingImages.value = arr;
};
const reorderExistingImage = (fromIdx, newPos) => {
  const toIdx = Math.min(Math.max(newPos - 1, 0), existingImages.value.length - 1);
  if (fromIdx === toIdx) return;
  const arr = [...existingImages.value];
  const [item] = arr.splice(fromIdx, 1);
  arr.splice(toIdx, 0, item);
  existingImages.value = arr;
};

// 大頭貼
const avatarFile = ref(null);
const avatarPreview = ref(null);
const existingAvatarUrl = ref(null);
const avatarInput = ref(null);
const handleAvatarChange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  avatarFile.value = f;
  avatarPreview.value = URL.createObjectURL(f);
  existingAvatarUrl.value = null;
};

// ════════════════════════════════════════════════════════════════
// ── 驗證 ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
const errors = ref({});
const validate = () => {
  const e = {};
  if (!form.value.real_name.trim()) e.real_name = "必填";
  if (!form.value.author_bio.trim()) e.author_bio = "必填";
  if (!form.value.email.trim()) e.email = "必填";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) e.email = "Email 格式不正確";
  if (form.value.is_first_submission === null) e.is_first_submission = "請選擇";
  if (form.value.is_first_submission && !form.value.author_intro.trim()) e.author_intro = "初次投稿請填寫作者自介";
  if (!form.value.title.trim()) e.title = "必填";
  if (!form.value.category) e.category = "請選擇投稿類型";
  if (!form.value.article_summary.trim()) e.article_summary = "必填";
  // 新投稿必須要有檔案；修改模式可以保留既有檔案
  const hasFile = wordFile.value || pdfFile.value || existingWordUrl.value || existingPdfUrl.value;
  if (!hasFile) e.files = "請至少上傳 Word 或 PDF 其中一個";
  errors.value = e;
  return Object.keys(e).length === 0;
};

// ════════════════════════════════════════════════════════════════
// ── Cloudinary 上傳 ──────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
const uploadFile = async (file, folder) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", folder);
  const res = await $fetch("/api/media", { method: "POST", body: formData });
  if (!res.success) throw new Error(res.error || "上傳失敗");
  return res.data.secure_url;
};

const parseWord = async (file) => {
  try {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.default.convertToHtml(
      { arrayBuffer },
      { convertImage: mammoth.images.inline(async () => ({ src: "" })) }
    );
    return result.value || "";
  } catch { return ""; }
};

// ════════════════════════════════════════════════════════════════
// ── 提交 ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
const handleSubmit = async () => {
  if (!validate()) {
    await nextTick();
    document.querySelector(".field-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  step.value = "submitting";
  errorMsg.value = "";

  try {
    const folder = props.issueNumber ? `submissions/issue-${props.issueNumber}` : "submissions/unsorted";

    // 決定 Word URL
    let wordUrl = existingWordUrl.value;
    let parsedHtml = null;
    if (wordFile.value) {
      submitProgress.value = "正在上傳 Word 檔案...";
      wordUrl = await uploadFile(wordFile.value, folder);
      submitProgress.value = "正在解析 Word 內容...";
      parsedHtml = await parseWord(wordFile.value);
    }

    // 決定 PDF URL
    let pdfUrl = existingPdfUrl.value;
    if (pdfFile.value) {
      submitProgress.value = "正在上傳 PDF 檔案...";
      pdfUrl = await uploadFile(pdfFile.value, folder);
    }

    // 圖片：既有 + 新上傳，合併後排序
    const uploadedNewImages = [];
    if (imageFiles.value.length > 0) {
      const imgFolder = `${folder}/images`;
      for (let i = 0; i < imageFiles.value.length; i++) {
        submitProgress.value = `正在上傳圖片 ${i+1} / ${imageFiles.value.length}...`;
        const url = await uploadFile(imageFiles.value[i].file, imgFolder);
        uploadedNewImages.push({ url, name: imageFiles.value[i].name, order: existingImages.value.length + i + 1 });
      }
    }
    const allImages = [
      ...existingImages.value.map((img, i) => ({ ...img, order: i + 1 })),
      ...uploadedNewImages,
    ];

    // 大頭貼
    let avatarUrl = existingAvatarUrl.value;
    if (avatarFile.value) {
      submitProgress.value = "正在上傳大頭貼...";
      avatarUrl = await uploadFile(avatarFile.value, "images/authors");
    }

    submitProgress.value = "正在儲存投稿資料...";
    const res = await $fetch("/api/submit", {
      method: "POST",
      body: {
        submission_id: editingId.value || undefined,
        real_name: form.value.real_name.trim(),
        display_name: form.value.display_name.trim() || null,
        author_bio: form.value.author_bio.trim(),
        email: form.value.email.trim(),
        is_first_submission: form.value.is_first_submission,
        author_intro: form.value.author_intro.trim() || null,
        avatar_url: avatarUrl,
        issue_number: props.issueNumber,
        title: form.value.title.trim(),
        category: form.value.category,
        article_summary: form.value.article_summary.trim(),
        keywords: keywords.value,
        notes: form.value.notes.trim() || null,
        word_url: wordUrl,
        pdf_url: pdfUrl,
        images: allImages,
        parsed_html: parsedHtml,
      },
    });

    if (!res.success) throw new Error("儲存失敗");
    step.value = "success";
  } catch (err) {
    errorMsg.value = err.message || "發生錯誤，請稍後再試";
    step.value = "error";
  }
};

// ════════════════════════════════════════════════════════════════
// ── 重置 ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
const resetForm = () => {
  form.value = { real_name: "", display_name: "", author_bio: "", email: "", is_first_submission: null, author_intro: "", article_summary: "", title: "", category: "", notes: "" };
  keywords.value = [];
  wordFile.value = null; pdfFile.value = null; imageFiles.value = [];
  avatarFile.value = null; avatarPreview.value = null;
  existingAvatarUrl.value = null; existingWordUrl.value = null;
  existingPdfUrl.value = null; existingImages.value = [];
  editingId.value = null; editingTitle.value = "";
  errors.value = {}; errorMsg.value = ""; submitProgress.value = "";
  oldAuthorMatches.value = []; oldAuthorLoading.value = false;
  oldAuthorDone.value = false; oldAuthorSearched.value = false;
};

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const isFormStep = (s) => ["form", "editing"].includes(s);
</script>

<template>
  <div class="submission-form">

    <!-- ── 模式切換 Tab ─────────────────────────────────────── -->
    <div class="mode-tabs">
      <button :class="['mode-tab', { active: pageMode === 'new' }]" @click="switchMode('new')">✏️ 新增投稿</button>
      <button :class="['mode-tab', { active: pageMode === 'modify' }]" @click="switchMode('modify')">🔄 修改已投稿</button>
    </div>

    <!-- ════════════════════════════════════════════════════════
         ── 修改模式：查詢畫面 ─────────────────────────────── -->
    <div v-if="pageMode === 'modify' && step === 'lookup'" class="lookup-box">
      <h3>查詢您的投稿記錄</h3>
      <p class="lookup-hint">請輸入您投稿時使用的姓名（本名或筆名）及 Email，即可查詢並修改稿件。</p>
      <div class="lookup-fields">
        <div class="lookup-field">
          <label>投稿姓名（本名或筆名）</label>
          <input v-model="lookupName" type="text" placeholder="請輸入投稿時的姓名" @keydown.enter="doLookup" />
        </div>
        <div class="lookup-field">
          <label>投稿 Email</label>
          <input v-model="lookupEmail" type="email" placeholder="請輸入投稿時的 Email" @keydown.enter="doLookup" />
        </div>
      </div>
      <p v-if="lookupError" class="lookup-error">{{ lookupError }}</p>
      <button class="btn-lookup" :disabled="lookupLoading" @click="doLookup">
        {{ lookupLoading ? '查詢中...' : '🔍 查詢我的投稿' }}
      </button>
    </div>

    <!-- ── 修改模式：結果列表 ──────────────────────────────── -->
    <div v-else-if="pageMode === 'modify' && step === 'results'" class="results-box">
      <div class="results-header">
        <h3>找到 {{ lookupResults.length }} 筆投稿記錄</h3>
        <button class="btn-back" @click="step = 'lookup'">← 重新查詢</button>
      </div>
      <div class="result-list">
        <div v-for="sub in lookupResults" :key="sub.id" class="result-item">
          <div class="result-info">
            <div class="result-title">{{ sub.title }}</div>
            <div class="result-meta">
              <span class="tag-cat">{{ sub.category }}</span>
              <span v-if="sub.issue_number" class="result-issue">Vol.{{ sub.issue_number }}</span>
              <span class="result-date">{{ formatDate(sub.created_at) }}</span>
              <span class="status-dot" :style="{ background: statusColor[sub.status] }">{{ statusLabel[sub.status] }}</span>
            </div>
          </div>
          <button
            v-if="sub.status !== 'converted'"
            class="btn-select-edit"
            @click="selectForEdit(sub)"
          >選擇修改</button>
          <span v-else class="converted-note">已轉文章</span>
        </div>
      </div>
    </div>

    <!-- ── 修改中 banner ────────────────────────────────────── -->
    <div v-if="step === 'editing'" class="editing-banner">
      <span>🔄 正在修改：<strong>{{ editingTitle }}</strong></span>
      <button class="btn-cancel-edit" @click="step = 'results'">取消修改</button>
    </div>

    <!-- ════════════════════════════════════════════════════════
         ── 結果畫面 ────────────────────────────────────────── -->
    <div v-if="step === 'success'" class="result-box success">
      <div class="result-icon">✅</div>
      <h3>{{ editingId ? '修改已送出！' : '投稿已送出！' }}</h3>
      <p>{{ editingId ? '您的稿件已更新，編輯團隊將盡快重新審閱。' : '感謝您的投稿，編輯團隊將盡快審閱並以 Email 回覆是否刊登。' }}</p>
      <button class="btn-secondary" @click="resetForm(); step = pageMode === 'new' ? 'form' : 'lookup'">
        {{ pageMode === 'new' ? '再次投稿' : '返回查詢' }}
      </button>
    </div>

    <div v-else-if="step === 'submitting'" class="result-box submitting">
      <div class="spinner"></div>
      <h3>正在提交中，請稍候⋯</h3>
      <p class="progress-msg">{{ submitProgress }}</p>
    </div>

    <div v-else-if="step === 'error'" class="result-box error">
      <div class="result-icon">❌</div>
      <h3>提交失敗</h3>
      <p>{{ errorMsg }}</p>
      <button class="btn-secondary" @click="step = editingId ? 'editing' : 'form'">返回修改</button>
    </div>

    <!-- ════════════════════════════════════════════════════════
         ── 投稿表單主體（新增 or 修改時共用） ────────────── -->
    <form v-else-if="isFormStep(step)" @submit.prevent="handleSubmit" novalidate>

      <!-- ■ 作者資訊 -->
      <div class="form-section">
        <h3 class="section-title">作者資訊</h3>

        <div class="field" :class="{ 'has-error': errors.real_name }">
          <label>作者真實姓名 <span class="required">*</span></label>
          <p class="field-hint">本刊歡迎使用筆名發表，但在投稿時，仍請填寫真實姓名，以示自負文責。若使用筆名者，本刊不會對外透露真實姓名，在網站上的「專欄作者」區也會使用筆名顯示。</p>
          <input v-model="form.real_name" type="text" placeholder="請填寫真實姓名" />
          <span v-if="errors.real_name" class="field-error">{{ errors.real_name }}</span>
        </div>

        <div class="field">
          <label>發表暱稱（筆名）</label>
          <p class="field-hint">若以本名發表者，無須填寫此欄位。若有多個筆名或同時用真名和筆名發表，網站上的「專欄作者」區也會有多個欄位。</p>
          <input v-model="form.display_name" type="text" placeholder="若以本名發表可留空" />
        </div>

        <!-- ── 舊作者帶入 ── -->
        <div v-if="!editingId" class="old-author-section">
          <div v-if="!oldAuthorDone" class="old-author-trigger">
            <button
              type="button"
              class="btn-old-author"
              :disabled="oldAuthorLoading || (!form.display_name.trim() && !form.real_name.trim())"
              @click="lookupOldAuthor"
            >
              {{ oldAuthorLoading ? '查詢中...' : '🔍 我是舊作者，帶入資料' }}
            </button>
            <span class="old-author-hint-inline">（填寫本名或筆名後可點擊查詢）</span>
          </div>

          <!-- 查無結果 -->
          <div v-if="oldAuthorSearched && !oldAuthorLoading && oldAuthorMatches.length === 0 && !oldAuthorDone" class="old-author-no-match">
            找不到符合的作者記錄，請繼續填寫下方欄位。
            <button type="button" class="btn-dismiss-old" @click="oldAuthorDone = true">知道了</button>
          </div>

          <!-- 有符合結果 -->
          <div v-if="oldAuthorMatches.length > 0" class="old-author-matches">
            <p class="old-author-match-title">找到以下作者，請選擇符合的一位：</p>
            <div v-for="author in oldAuthorMatches" :key="author.name" class="old-author-item">
              <img v-if="author.author_image" :src="author.author_image" class="old-author-thumb" />
              <div v-else class="old-author-thumb-placeholder">👤</div>
              <div class="old-author-info">
                <div class="old-author-name">{{ author.name }}</div>
                <div v-if="author.bio" class="old-author-bio">{{ author.bio.slice(0, 60) }}{{ author.bio.length > 60 ? '…' : '' }}</div>
              </div>
              <button type="button" class="btn-select-author" @click="selectOldAuthor(author)">選擇</button>
            </div>
            <button type="button" class="btn-dismiss-old" @click="dismissOldAuthor">都不是我</button>
          </div>

          <!-- 已帶入 -->
          <div v-if="oldAuthorDone" class="old-author-done">✅ 已帶入作者資料，如有需要可直接修改下方欄位。</div>
        </div>

        <div class="field" :class="{ 'has-error': errors.author_bio }">
          <label>作者身分 <span class="required">*</span></label>
          <p class="field-hint">可填信仰認同、工作、學歷、或其他身分。例如：約瑟──拿撒勒人、木匠、長老教會會友。</p>
          <input v-model="form.author_bio" type="text" placeholder="例如：拿撒勒人、木匠、長老教會會友" />
          <span v-if="errors.author_bio" class="field-error">{{ errors.author_bio }}</span>
        </div>

        <div class="field" :class="{ 'has-error': errors.email }">
          <label>聯絡 Email <span class="required">*</span></label>
          <p class="field-hint">本刊會以電子信箱回覆是否刊登稿件。</p>
          <input v-model="form.email" type="email" placeholder="example@email.com" :readonly="!!editingId" />
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
        </div>

        <div class="field" :class="{ 'has-error': errors.is_first_submission }">
          <label>是否是初次投稿本刊 <span class="required">*</span></label>
          <div class="radio-group">
            <label class="radio-label"><input type="radio" :value="true" v-model="form.is_first_submission" /> 是，這是我第一次投稿</label>
            <label class="radio-label"><input type="radio" :value="false" v-model="form.is_first_submission" /> 否，我曾經投稿過</label>
          </div>
          <span v-if="errors.is_first_submission" class="field-error">{{ errors.is_first_submission }}</span>
        </div>

        <div class="field first-extra" :class="{ 'has-error': errors.author_intro }">
          <label>
            作者自介{{ form.is_first_submission === false ? '（更新用，選填）' : '' }}
            <span v-if="form.is_first_submission" class="required">*</span>
          </label>
          <p class="field-hint">約100-150字，會刊登在網站上。若要更新自介亦可填寫，但請在後面附註（更新）。</p>
          <textarea v-model="form.author_intro" rows="4" placeholder="請簡介自己的信仰背景與相關經歷（約100-150字）"></textarea>
          <div class="char-count" :class="{ warn: form.author_intro.length > 160 }">{{ form.author_intro.length }} 字</div>
          <span v-if="errors.author_intro" class="field-error">{{ errors.author_intro }}</span>
        </div>

        <div class="field first-extra">
          <label>作者大頭貼{{ form.is_first_submission === false ? '（更新用，選填）' : '' }}</label>
          <p class="field-hint">會刊登在網站上，若要更新亦可上傳。照片可以是本人、教堂、聖像、風景照、卡通人物照、手繪圖，確保圖片版權無虞即可。</p>
          <div class="avatar-upload" @click="avatarInput?.click()">
            <img v-if="avatarPreview" :src="avatarPreview" class="avatar-preview" />
            <div v-else class="avatar-placeholder">
              <span>點擊上傳大頭貼</span>
              <span class="hint-small">JPG / PNG / GIF / WebP</span>
            </div>
          </div>
          <input ref="avatarInput" type="file" accept="image/*" style="display:none" @change="handleAvatarChange" />
          <button v-if="avatarFile || existingAvatarUrl" type="button" class="btn-remove-sm" @click="avatarFile=null; avatarPreview=null; existingAvatarUrl=null">移除圖片</button>
        </div>
      </div>

      <!-- ■ 文章資訊 -->
      <div class="form-section">
        <h3 class="section-title">文章資訊</h3>

        <div class="field" :class="{ 'has-error': errors.title }">
          <label>文章標題 <span class="required">*</span></label>
          <input v-model="form.title" type="text" placeholder="請填寫文章標題" />
          <span v-if="errors.title" class="field-error">{{ errors.title }}</span>
        </div>

        <div class="field" :class="{ 'has-error': errors.category }">
          <label>投稿類型 <span class="required">*</span></label>
          <select v-model="form.category">
            <option value="">請選擇投稿類型</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
          <span v-if="errors.category" class="field-error">{{ errors.category }}</span>
        </div>

        <div class="field" :class="{ 'has-error': errors.article_summary }">
          <label>投稿文章簡介 <span class="required">*</span></label>
          <p class="field-hint">約100-150字，會刊登在網站上。</p>
          <textarea v-model="form.article_summary" rows="4" placeholder="請簡介文章主旨（約100-150字）"></textarea>
          <div class="char-count" :class="{ warn: form.article_summary.length > 160 }">{{ form.article_summary.length }} 字</div>
          <span v-if="errors.article_summary" class="field-error">{{ errors.article_summary }}</span>
        </div>

        <div class="field">
          <label>文章關鍵字</label>
          <p class="field-hint">至多 5 個，輸入後按 Enter 或點「新增」。</p>
          <div class="keyword-tags">
            <span v-for="(kw, i) in keywords" :key="i" class="tag">
              {{ kw }}<button type="button" @click="removeKeyword(i)" class="tag-remove">×</button>
            </span>
          </div>
          <div v-if="keywords.length < 5" class="keyword-input-row">
            <input v-model="keywordInput" type="text" placeholder="輸入關鍵字" @keydown="onKeydownKw" />
            <button type="button" class="btn-add-kw" @click="addKeyword">新增</button>
          </div>
          <div v-else class="hint-small">已達 5 個上限</div>
        </div>

        <div class="field">
          <label>備註</label>
          <textarea v-model="form.notes" rows="3" placeholder="如有其他補充事項，請填寫於此（選填）"></textarea>
        </div>
      </div>

      <!-- ■ 檔案上傳 -->
      <div class="form-section">
        <h3 class="section-title">檔案上傳</h3>

        <div class="field" :class="{ 'has-error': errors.files }">
          <label>投稿檔案 <span class="required">*</span></label>
          <p class="field-hint">請同時附上 Word 檔及 PDF 檔。（至少上傳一種）</p>

          <div class="file-row">
            <!-- Word -->
            <div class="file-slot" :class="{ filled: wordFile || existingWordUrl }">
              <div class="file-slot-label">📄 Word 檔（.docx）</div>
              <div v-if="existingWordUrl && !wordFile" class="existing-file">
                <a :href="existingWordUrl" target="_blank">已上傳原稿</a>
                <span class="hint-small">（如需更換請選擇新檔案）</span>
              </div>
              <div v-if="wordFile" class="file-name">{{ wordFile.name }}</div>
              <button type="button" class="btn-file" @click="wordInput?.click()">
                {{ wordFile ? '重新選擇' : (existingWordUrl ? '更換檔案' : '選擇檔案') }}
              </button>
              <button v-if="wordFile" type="button" class="btn-remove-sm" @click="wordFile=null">移除</button>
              <input ref="wordInput" type="file" accept=".docx,.doc" style="display:none" @change="handleWordChange" />
            </div>

            <!-- PDF -->
            <div class="file-slot" :class="{ filled: pdfFile || existingPdfUrl }">
              <div class="file-slot-label">📑 PDF 檔（.pdf）</div>
              <div v-if="existingPdfUrl && !pdfFile" class="existing-file">
                <a :href="existingPdfUrl" target="_blank">已上傳原稿</a>
                <span class="hint-small">（如需更換請選擇新檔案）</span>
              </div>
              <div v-if="pdfFile" class="file-name">{{ pdfFile.name }}</div>
              <button type="button" class="btn-file" @click="pdfInput?.click()">
                {{ pdfFile ? '重新選擇' : (existingPdfUrl ? '更換檔案' : '選擇檔案') }}
              </button>
              <button v-if="pdfFile" type="button" class="btn-remove-sm" @click="pdfFile=null">移除</button>
              <input ref="pdfInput" type="file" accept=".pdf" style="display:none" @change="handlePdfChange" />
            </div>
          </div>
          <span v-if="errors.files" class="field-error">{{ errors.files }}</span>
        </div>

        <!-- 附圖 -->
        <div class="field">
          <label>文章附圖（選填，可多張）</label>
          <p class="field-hint">若文章有附圖，請在此上傳圖片原檔。每張上限 10MB，最多 20 張。上傳後可調整順序。</p>

          <!-- 既有圖片（修改模式） -->
          <div v-if="existingImages.length > 0" class="image-list-label">原有圖片（可調整順序或移除）</div>
          <div v-if="existingImages.length > 0" class="image-list">
            <div v-for="(img, i) in existingImages" :key="'e'+i" class="image-item existing-img">
              <img :src="img.url" class="img-thumb" />
              <div class="img-name">{{ img.name || `圖片 ${i+1}` }}</div>
              <div class="img-actions">
                <label class="order-label">順序</label>
                <input type="number" class="order-input" :value="i+1" min="1" :max="existingImages.length" @change="reorderExistingImage(i, +$event.target.value)" />
                <button type="button" @click="removeExistingImage(i)" class="btn-remove-sm">✕</button>
              </div>
            </div>
          </div>

          <!-- 新上傳圖片 -->
          <div v-if="imageFiles.length > 0" class="image-list-label">新增圖片</div>
          <div v-if="imageFiles.length > 0" class="image-list">
            <div v-for="(img, i) in imageFiles" :key="'n'+i" class="image-item">
              <img v-if="img.previewUrl" :src="img.previewUrl" class="img-thumb" />
              <div v-else class="img-thumb-placeholder">📎</div>
              <div class="img-name">{{ img.name }}</div>
              <div class="img-actions">
                <label class="order-label">順序</label>
                <input type="number" class="order-input" :value="i+1" min="1" :max="imageFiles.length" @change="reorderNewImage(i, +$event.target.value)" />
                <button type="button" @click="removeImage(i)" class="btn-remove-sm">✕</button>
              </div>
            </div>
          </div>

          <button type="button" class="btn-file" @click="imgInput?.click()" style="margin-top:8px">＋ 新增圖片</button>
          <input ref="imgInput" type="file" accept="image/*" multiple style="display:none" @change="handleImgChange" />
        </div>
      </div>

      <div class="submit-row">
        <button type="submit" class="btn-submit">
          {{ editingId ? '送出修改' : '送出投稿' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.submission-form {
  max-width: 720px;
  margin: 0 auto;
  font-size: 1.25rem;
}

/* ── 模式 Tab ── */
.mode-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 28px;
  border-bottom: 2px solid #ddd;
}
.mode-tab {
  padding: 10px 24px;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: #f5f5f5;
  color: #777;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: -2px;
  transition: all 0.2s;
}
.mode-tab:hover { background: #eee; color: #444; }
.mode-tab.active {
  background: white;
  color: #2c3e50;
  border-color: #ddd;
  border-bottom-color: white;
  font-weight: bold;
}

/* ── 查詢區塊 ── */
.lookup-box {
  background: #fff; border: 1px solid #e0e0e0; border-radius: 10px;
  padding: 28px 32px;
}
.lookup-box h3 { margin: 0 0 8px; color: #2c3e50; }
.lookup-hint { color: #777; font-size: 0.9rem; margin: 0 0 20px; text-indent: 0; }
.lookup-fields { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.lookup-field { flex: 1; min-width: 200px; }
.lookup-field label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 1rem; }
.lookup-field input { width: 100%; padding: 10px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; box-sizing: border-box; }
.lookup-error { color: #e74c3c; font-size: 0.9rem; margin: 8px 0 0; }
.btn-lookup {
  margin-top: 8px; padding: 10px 28px; background: #2c3e50; color: white;
  border: none; border-radius: 7px; font-size: 1rem; cursor: pointer;
}
.btn-lookup:hover:not(:disabled) { background: #34495e; }
.btn-lookup:disabled { opacity: 0.6; cursor: default; }

/* ── 結果列表 ── */
.results-box { background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 24px 28px; }
.results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.results-header h3 { margin: 0; color: #2c3e50; }
.btn-back { background: none; border: 1px solid #ccc; border-radius: 5px; padding: 5px 12px; cursor: pointer; font-size: 0.9rem; }
.result-list { display: flex; flex-direction: column; gap: 10px; }
.result-item {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border: 1px solid #eee; border-radius: 8px; background: #fafafa;
}
.result-info { flex: 1; }
.result-title { font-weight: 600; color: #2c3e50; margin-bottom: 4px; }
.result-meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.tag-cat { background: #e8f0fe; color: #2c5aa0; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; }
.result-issue { font-size: 0.8rem; color: #666; }
.result-date { font-size: 0.8rem; color: #999; }
.status-dot { padding: 2px 8px; border-radius: 12px; color: white; font-size: 0.75rem; font-weight: 600; }
.btn-select-edit {
  padding: 6px 14px; background: #2c3e50; color: white;
  border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; white-space: nowrap;
}
.btn-select-edit:hover { background: #34495e; }
.converted-note { font-size: 0.8rem; color: #8e44ad; white-space: nowrap; }

/* ── 修改中 Banner ── */
.editing-banner {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px;
  padding: 10px 16px; margin-bottom: 20px; font-size: 0.95rem; color: #856404;
}
.btn-cancel-edit { background: none; border: 1px solid #856404; color: #856404; padding: 4px 10px; border-radius: 5px; cursor: pointer; font-size: 0.85rem; }

/* ── 舊作者帶入 ── */
.old-author-section { margin-bottom: 22px; }
.old-author-trigger { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.btn-old-author {
  padding: 8px 18px; background: #1a6fa8; color: white;
  border: none; border-radius: 7px; font-size: 1rem; cursor: pointer; transition: background 0.2s;
}
.btn-old-author:hover:not(:disabled) { background: #155d8e; }
.btn-old-author:disabled { opacity: 0.5; cursor: default; }
.old-author-hint-inline { font-size: 0.85rem; color: #999; }
.old-author-no-match {
  margin-top: 8px; padding: 10px 14px; background: #fff8e1;
  border: 1px solid #ffe082; border-radius: 7px; font-size: 0.9rem; color: #856404;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.old-author-matches {
  margin-top: 10px; padding: 14px 16px; background: #e8f4fd;
  border: 1px solid #b8d8f0; border-radius: 8px;
}
.old-author-match-title { font-size: 0.9rem; color: #1a6fa8; font-weight: 600; margin: 0 0 10px; }
.old-author-item {
  display: flex; align-items: center; gap: 12px; padding: 8px 10px;
  background: white; border-radius: 6px; margin-bottom: 6px;
}
.old-author-thumb { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.old-author-thumb-placeholder { width: 44px; height: 44px; background: #e0e0e0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
.old-author-info { flex: 1; min-width: 0; }
.old-author-name { font-weight: 600; color: #2c3e50; font-size: 0.95rem; }
.old-author-bio { font-size: 0.8rem; color: #777; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-select-author { padding: 5px 14px; background: #1a6fa8; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem; white-space: nowrap; }
.btn-select-author:hover { background: #155d8e; }
.btn-dismiss-old { margin-top: 6px; padding: 5px 14px; background: none; border: 1px solid #aaa; border-radius: 5px; cursor: pointer; font-size: 0.85rem; color: #666; }
.btn-dismiss-old:hover { background: #f5f5f5; }
.old-author-done {
  padding: 9px 14px; background: #f0fff4; border: 1px solid #c8e6c9;
  border-radius: 7px; font-size: 0.9rem; color: #27ae60;
}

/* ── 表單區塊 ── */
.form-section {
  background: #fff; border: 1px solid #e0e0e0; border-radius: 10px;
  padding: 28px 32px; margin-bottom: 24px;
}
.section-title {
  font-size: 1.35rem; font-weight: bold; color: #2c3e50;
  margin: 0 0 20px; padding-bottom: 10px; border-bottom: 2px solid #eee; text-align: left;
}
.field { margin-bottom: 22px; }
.field label { display: block; font-weight: 600; color: #333; margin-bottom: 4px; }
.required { color: #e74c3c; }
.field-hint { font-size: 1rem; color: #777; margin: 0 0 8px; line-height: 1.6; text-indent: 0; }
.field input[type="text"],
.field input[type="email"],
.field select,
.field textarea {
  width: 100%; padding: 11px 14px; border: 1px solid #ccc;
  border-radius: 6px; font-size: 1.2rem; font-family: inherit; box-sizing: border-box; transition: border-color 0.2s;
}
.field input:focus, .field select:focus, .field textarea:focus {
  outline: none; border-color: #5b9bd5; box-shadow: 0 0 0 2px rgba(91,155,213,0.15);
}
.field input[readonly] { background: #f5f5f5; color: #888; }
.has-error input, .has-error select, .has-error textarea { border-color: #e74c3c; }
.field-error { display: block; color: #e74c3c; font-size: 0.85rem; margin-top: 4px; }
.char-count { font-size: 0.82rem; color: #999; text-align: right; margin-top: 3px; }
.char-count.warn { color: #e67e22; }

.radio-group { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
.radio-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: normal; color: #444; }
.radio-label input { width: auto; }

.first-extra { background: #f8f9ff; border-radius: 8px; padding: 16px; border: 1px dashed #c0c8e8; }

.avatar-upload {
  width: 120px; height: 120px; border-radius: 50%; border: 2px dashed #ccc;
  cursor: pointer; overflow: hidden; display: flex; align-items: center;
  justify-content: center; background: #f9f9f9;
}
.avatar-preview { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { display: flex; flex-direction: column; align-items: center; gap: 4px; color: #aaa; font-size: 0.8rem; }

.keyword-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tag { background: #e8f0fe; color: #2c5aa0; padding: 4px 10px; border-radius: 20px; font-size: 0.9rem; display: flex; align-items: center; gap: 4px; }
.tag-remove { background: none; border: none; cursor: pointer; color: #666; font-size: 1rem; padding: 0; }
.keyword-input-row { display: flex; gap: 8px; }
.keyword-input-row input { flex: 1; }
.btn-add-kw { padding: 8px 14px; background: #2c3e50; color: white; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap; }
.hint-small { font-size: 0.8rem; color: #999; margin-top: 4px; }

/* ── 檔案 ── */
.file-row { display: flex; gap: 16px; flex-wrap: wrap; }
.file-slot { flex: 1; min-width: 200px; border: 2px dashed #ddd; border-radius: 8px; padding: 16px; text-align: center; background: #fafafa; }
.file-slot.filled { border-color: #27ae60; background: #f0fff4; }
.file-slot-label { font-weight: 600; color: #555; margin-bottom: 8px; }
.file-name { font-size: 0.85rem; color: #27ae60; margin-bottom: 8px; word-break: break-all; }
.existing-file { font-size: 0.85rem; margin-bottom: 8px; }
.existing-file a { color: #1a6fa8; }
.btn-file { display: inline-block; padding: 7px 16px; background: #2c3e50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
.btn-file:hover { background: #34495e; }
.btn-remove-sm { display: inline-block; margin-top: 6px; padding: 4px 10px; background: none; border: 1px solid #e74c3c; color: #e74c3c; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }

.image-list-label { font-size: 0.9rem; color: #888; margin: 8px 0 4px; }
.image-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
.image-item { display: flex; align-items: center; gap: 12px; background: #f5f5f5; border-radius: 6px; padding: 8px 12px; }
.existing-img { background: #edf7ee; border: 1px solid #c8e6c9; }
.img-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
.img-thumb-placeholder { width: 48px; height: 48px; background: #e0e0e0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
.img-name { flex: 1; font-size: 0.85rem; color: #555; word-break: break-all; }
.img-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.order-label { font-size: 0.75rem; color: #999; white-space: nowrap; }
.order-input { width: 48px; padding: 3px 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem; text-align: center; }

/* ── 提交 ── */
.submit-row { text-align: center; padding: 8px 0 24px; }
.btn-submit { padding: 16px 56px; background: #2c3e50; color: white; border: none; border-radius: 8px; font-size: 1.3rem; font-weight: bold; cursor: pointer; transition: background 0.2s; }
.btn-submit:hover { background: #34495e; }

/* ── 結果畫面 ── */
.result-box { text-align: center; padding: 48px 32px; border-radius: 12px; border: 1px solid #e0e0e0; background: #fff; }
.result-icon { font-size: 3rem; margin-bottom: 12px; }
.result-box h3 { font-size: 1.4rem; margin-bottom: 10px; color: #2c3e50; }
.result-box p { color: #666; margin-bottom: 20px; text-indent: 0; }
.btn-secondary { padding: 10px 28px; background: #fff; border: 2px solid #2c3e50; color: #2c3e50; border-radius: 8px; cursor: pointer; font-size: 1rem; }
.submitting { border-color: #5b9bd5; }
.progress-msg { font-size: 0.9rem; color: #5b9bd5; text-indent: 0; }
.spinner { width: 40px; height: 40px; margin: 0 auto 16px; border: 4px solid #e0e0e0; border-top-color: #2c3e50; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .form-section { padding: 20px 16px; }
  .file-row { flex-direction: column; }
  .lookup-box { padding: 20px 16px; }
  .old-author-trigger { flex-direction: column; align-items: flex-start; gap: 6px; }
  .old-author-hint-inline { font-size: 0.8rem; }
  .btn-old-author { width: 100%; text-align: center; }
  .old-author-item { flex-wrap: wrap; }
  .mode-tabs { gap: 2px; }
  .mode-tab { padding: 8px 14px; font-size: 0.9rem; }
}
</style>
