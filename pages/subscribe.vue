<script setup>
import { ref, computed } from "vue";

useSeoMeta({
  title: "線上訂閱 — 無境界者",
  description: "訂閱《無境界者》雙月刊，與我們一同探索信仰的無限可能。",
});

// ── 表單資料 ──────────────────────────────────────────────────────
const form = ref({
  name: "",
  gender: "",
  age_group: "",
  faith_background: "",
  email: "",
  how_found: "",
  how_found_other: "",
  message: "",
});

const step = ref("form"); // form | submitting | success | error
const errorMsg = ref("");

// ── 選項 ─────────────────────────────────────────────────────────
const genderOptions = ["男", "女", "非二元性別", "不便透露"];
const ageOptions = [
  "20 歲以下",
  "21–30 歲",
  "31–40 歲",
  "41–50 歲",
  "51–60 歲",
  "61 歲以上",
];
const howFoundOptions = [
  "朋友或家人介紹",
  "社群媒體（Facebook / Instagram / X 等）",
  "教會或信仰社群",
  "網路搜尋",
  "其他",
];

// ── 驗證 ─────────────────────────────────────────────────────────
const errors = ref({});

const validate = () => {
  const e = {};
  if (!form.value.name.trim()) e.name = "請填寫您的姓名";
  if (!form.value.gender) e.gender = "請選擇性別";
  if (!form.value.age_group) e.age_group = "請選擇年齡層";
  if (!form.value.faith_background.trim())
    e.faith_background = "請填寫信仰認同或所屬教會";
  if (!form.value.email.trim()) {
    e.email = "請填寫電子郵件";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) {
    e.email = "電子郵件格式不正確";
  }
  if (form.value.how_found === "其他" && !form.value.how_found_other.trim()) {
    e.how_found_other = "請說明您是如何得知的";
  }
  errors.value = e;
  return Object.keys(e).length === 0;
};

// ── 送出 ─────────────────────────────────────────────────────────
const handleSubmit = async () => {
  if (!validate()) return;

  step.value = "submitting";

  const howFound =
    form.value.how_found === "其他"
      ? form.value.how_found_other.trim()
      : form.value.how_found || null;

  try {
    await $fetch("/api/subscribe", {
      method: "POST",
      body: {
        name: form.value.name.trim(),
        gender: form.value.gender,
        age_group: form.value.age_group,
        faith_background: form.value.faith_background.trim(),
        email: form.value.email.trim(),
        how_found: howFound,
        message: form.value.message.trim() || null,
      },
    });
    step.value = "success";
  } catch (err) {
    errorMsg.value = err?.data?.message || "送出失敗，請稍後再試。";
    step.value = "error";
  }
};

const resetForm = () => {
  form.value = {
    name: "",
    gender: "",
    age_group: "",
    faith_background: "",
    email: "",
    how_found: "",
    how_found_other: "",
    message: "",
  };
  errors.value = {};
  step.value = "form";
  errorMsg.value = "";
};
</script>

<template>
  <div>
    <h1 class="page-main-title">
      <span class="emoji">📮</span>線上訂閱<span class="emoji">📮</span>
    </h1>
    <div class="main-divider"></div>

    <!-- 說明文字 -->
    <section class="intro-section">
      <p>
        《無境界者》是一個不以教會為本位的自由信仰論述平台，每雙數月月底出刊。訂閱後，我們會在每期發刊時寄送通知信件至您的信箱。以下資料僅作內部統計之用，不會對外公開或分享給任何第三方。
      </p>
    </section>

    <!-- 成功畫面 -->
    <div v-if="step === 'success'" class="result-box success-box">
      <div class="result-icon">✉️</div>
      <h2>訂閱成功！</h2>
      <p class="no-indent">
        感謝您訂閱《無境界者》。每當新一期出刊，我們將寄送通知至您的信箱。
      </p>
      <button class="btn-secondary" @click="resetForm">返回表單</button>
    </div>

    <!-- 錯誤畫面 -->
    <div v-else-if="step === 'error'" class="result-box error-box">
      <div class="result-icon">⚠️</div>
      <h2>送出失敗</h2>
      <p class="no-indent">{{ errorMsg }}</p>
      <button class="btn-secondary" @click="step = 'form'">返回修改</button>
    </div>

    <!-- 送出中 -->
    <div v-else-if="step === 'submitting'" class="result-box submitting-box">
      <div class="result-icon spinning">⏳</div>
      <p class="no-indent">正在送出，請稍候…</p>
    </div>

    <!-- 表單 -->
    <form
      v-else
      class="subscribe-form"
      @submit.prevent="handleSubmit"
      novalidate
    >
      <!-- 1. 姓名 -->
      <div class="field" :class="{ 'has-error': errors.name }">
        <label>1. 讀者姓名 <span class="required">*</span></label>
        <input
          type="text"
          v-model="form.name"
          placeholder="請輸入您的姓名"
          maxlength="50"
        />
        <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
      </div>

      <!-- 2. 性別 -->
      <div class="field" :class="{ 'has-error': errors.gender }">
        <label>2. 性別 <span class="required">*</span></label>
        <div class="radio-group">
          <label v-for="opt in genderOptions" :key="opt" class="radio-label">
            <input type="radio" :value="opt" v-model="form.gender" />
            {{ opt }}
          </label>
        </div>
        <span v-if="errors.gender" class="field-error">{{
          errors.gender
        }}</span>
      </div>

      <!-- 3. 年齡層 -->
      <div class="field" :class="{ 'has-error': errors.age_group }">
        <label>3. 年齡層 <span class="required">*</span></label>
        <p class="field-hint">僅作統計用，不會對外公開</p>
        <div class="radio-group">
          <label v-for="opt in ageOptions" :key="opt" class="radio-label">
            <input type="radio" :value="opt" v-model="form.age_group" />
            {{ opt }}
          </label>
        </div>
        <span v-if="errors.age_group" class="field-error">{{
          errors.age_group
        }}</span>
      </div>

      <!-- 4. 信仰認同或所屬教會 -->
      <div class="field" :class="{ 'has-error': errors.faith_background }">
        <label>4. 信仰認同或所屬教會 <span class="required">*</span></label>
        <p class="field-hint">
          可填寫多個答案，例如：「長老教會會友、目前無教會」
        </p>
        <textarea
          v-model="form.faith_background"
          rows="3"
          placeholder="請描述您的信仰背景或所屬教會…"
          maxlength="300"
        ></textarea>
        <span v-if="errors.faith_background" class="field-error">{{
          errors.faith_background
        }}</span>
      </div>

      <!-- 5. 電子郵件 -->
      <div class="field" :class="{ 'has-error': errors.email }">
        <label>5. 電子郵件 <span class="required">*</span></label>
        <p class="field-hint">訂閱通知將寄至此信箱</p>
        <input
          type="email"
          v-model="form.email"
          placeholder="example@email.com"
          maxlength="200"
        />
        <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
      </div>

      <!-- 6. 如何得知（新增問題） -->
      <div class="field">
        <label
          >6. 您是如何得知《無境界者》的？<span class="optional"
            >（選填）</span
          ></label
        >
        <div class="radio-group">
          <label v-for="opt in howFoundOptions" :key="opt" class="radio-label">
            <input type="radio" :value="opt" v-model="form.how_found" />
            {{ opt }}
          </label>
          <label class="radio-label">
            <input type="radio" value="" v-model="form.how_found" />
            不填答
          </label>
        </div>
        <div
          v-if="form.how_found === '其他'"
          class="other-input"
          :class="{ 'has-error': errors.how_found_other }"
        >
          <input
            type="text"
            v-model="form.how_found_other"
            placeholder="請說明…"
            maxlength="100"
          />
          <span v-if="errors.how_found_other" class="field-error">{{
            errors.how_found_other
          }}</span>
        </div>
      </div>

      <!-- 7. 想說的話 -->
      <div class="field">
        <label>7. 想對我們說的話<span class="optional">（選填）</span></label>
        <textarea
          v-model="form.message"
          rows="4"
          placeholder="歡迎留下任何建議、鼓勵或問題…"
          maxlength="1000"
        ></textarea>
        <div class="char-count" :class="{ warn: form.message.length > 900 }">
          {{ form.message.length }} / 1000
        </div>
      </div>

      <div class="submit-row">
        <button type="submit" class="btn-submit">送出訂閱</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
p {
  text-indent: 2rem;
  line-height: 1.8;
  color: #444;
  margin-bottom: 1rem;
  text-align: justify;
}
.no-indent {
  text-indent: 0 !important;
}

.main-divider {
  width: 100%;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  margin: 20px auto;
}

.intro-section {
  margin-bottom: 2rem;
}

/* ── 表單 ── */
.subscribe-form {
  max-width: 640px;
  margin: 0 auto;
}

.field {
  margin-bottom: 28px;
}
.field label {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
  font-size: 1.05rem;
}
.required {
  color: #e74c3c;
  margin-left: 2px;
}
.optional {
  font-weight: normal;
  color: #999;
  font-size: 0.9rem;
  margin-left: 4px;
}

.field-hint {
  font-size: 0.95rem;
  color: #777;
  margin: 0 0 8px;
  line-height: 1.6;
  text-indent: 0;
}

.field input[type="text"],
.field input[type="email"],
.field textarea {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1.1rem;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s;
  line-height: 1.6;
}
.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: #5b9bd5;
  box-shadow: 0 0 0 2px rgba(91, 155, 213, 0.15);
}
.has-error input,
.has-error textarea {
  border-color: #e74c3c;
}
.field-error {
  display: block;
  color: #e74c3c;
  font-size: 0.87rem;
  margin-top: 5px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
  color: #444;
  font-size: 1rem;
}
.radio-label input[type="radio"] {
  width: auto;
  cursor: pointer;
  accent-color: #5b9bd5;
}

.other-input {
  margin-top: 10px;
  padding-left: 24px;
}
.other-input input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  box-sizing: border-box;
}
.other-input.has-error input {
  border-color: #e74c3c;
}

.char-count {
  font-size: 0.82rem;
  color: #999;
  text-align: right;
  margin-top: 4px;
}
.char-count.warn {
  color: #e67e22;
}

/* ── 送出按鈕 ── */
.submit-row {
  text-align: center;
  margin-top: 36px;
  margin-bottom: 48px;
}
.btn-submit {
  padding: 14px 64px;
  background-color: #5b9bd5;
  color: white;
  font-size: 1.3rem;
  font-weight: bold;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition:
    transform 0.2s,
    background-color 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.12);
  font-family: inherit;
}
.btn-submit:hover {
  background-color: #4a8bc4;
  transform: translateY(-3px);
}

/* ── 結果畫面 ── */
.result-box {
  max-width: 520px;
  margin: 3rem auto;
  text-align: center;
  padding: 40px 32px;
  border-radius: 12px;
}
.success-box {
  background: #f0fff4;
  border: 1px solid #a8e6ba;
}
.error-box {
  background: #fff5f5;
  border: 1px solid #f5c6c6;
}
.submitting-box {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
}
.result-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
.spinning {
  display: inline-block;
  animation: spin 1.5s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.result-box h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
}
.btn-secondary {
  margin-top: 1.5rem;
  padding: 10px 36px;
  background: white;
  border: 1.5px solid #aaa;
  border-radius: 30px;
  font-size: 1rem;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-secondary:hover {
  background: #f5f5f5;
}
</style>
