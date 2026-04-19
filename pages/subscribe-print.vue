<script setup>
import { ref, computed } from "vue";
import { useLanguage } from "~/composables/useLanguage";

const { currentLang } = useLanguage();

useSeoMeta({
  title: "紙本訂閱 — 無境界者",
  description: "訂閱《無境界者》紙本雜誌，限量印刷直送到府。",
});

// ── i18n ─────────────────────────────────────────────────────────
const labels = {
  "zh-TW": {
    pageTitle: "紙本訂閱",
    sectionSub: "訂閱資訊",
    sectionReader: "讀者資料",
    successTitle: "表單送出成功！",
    successMsg: "感謝你對《無境界者》的支持！我們將盡快寄送繳費資訊至你的信箱，請留意收件。",
    backToForm: "返回表單",
    errorTitle: "送出失敗",
    backToEdit: "返回修改",
    submitting: "正在送出，請稍候…",
    // 訂閱欄位
    qEmail: "1. Email 信箱",
    qEmailHint: "我們將透過此信箱與你聯絡，提供繳費資訊與寄送通知。",
    errEmailRequired: "請填寫 Email",
    errEmailFormat: "Email 格式不正確",
    qSubType: "2. 訂閱方式",
    errSubType: "請選擇訂閱方式",
    optSingle: "單期訂閱",
    optYearly: "全年訂閱（2025 年共六期，01–12 月）",
    qIssues: "3. 若為單期訂閱，請選擇欲訂閱之期數（複選）",
    qIssuesHint: "（選擇年訂閱無須填此欄位）",
    issueOptions: ["01–02 月號", "03–04 月號", "05–06 月號", "07–08 月號", "09–10 月號", "11–12 月號"],
    errIssues: "請至少選擇一個期數",
    qRecipient: "4. 收件人姓名",
    qRecipientHint: "收件人姓名請務必正確，以利投遞。",
    errRecipient: "請填寫收件人姓名",
    qAddress: "5. 收件地址（含郵遞區號）",
    errAddress: "請填寫收件地址",
    qPhone: "6. 聯絡電話",
    qPhoneHint: "若遇地址錯誤或投遞問題，我們將以此聯絡。",
    errPhone: "請填寫聯絡電話",
    qNote: "7. 其他備註或寄送需求",
    qNoteOpt: "（選填）",
    // 讀者資料
    qName: "8. 讀者姓名",
    qNamePh: "請輸入您的姓名",
    errName: "請填寫讀者姓名",
    qGender: "9. 性別",
    errGender: "請選擇性別",
    genderOptions: ["男", "女", "非二元性別", "不便透露"],
    qAge: "10. 年齡層",
    qAgeHint: "僅作統計用，不會對外公開",
    errAge: "請選擇年齡層",
    ageOptions: ["20 歲以下", "21–30 歲", "31–40 歲", "41–50 歲", "51–60 歲", "61 歲以上"],
    qFaith: "11. 信仰認同或所屬教會",
    qFaithHint: "可填寫多個答案，例如：「長老教會會友、目前無教會」",
    qFaithPh: "請描述您的信仰背景或所屬教會…",
    errFaith: "請填寫信仰認同或所屬教會",
    qHowFound: "12. 您是如何得知《無境界者》的？",
    qHowFoundOpt: "（選填）",
    howFoundOptions: ["朋友或家人介紹", "社群媒體（Facebook / Instagram / X 等）", "教會或信仰社群", "網路搜尋", "其他"],
    howFoundOther: "其他",
    howFoundNone: "不填答",
    howFoundOtherPh: "請說明…",
    errHowFound: "請說明您是如何得知的",
    qMessage: "13. 想對我們說的話",
    qMessageOpt: "（選填）",
    qMessagePh: "歡迎留下任何建議、鼓勵或問題…",
    submit: "送出訂閱",
    required: "*",
  },
};

const t = computed(() => labels[currentLang.value] || labels["zh-TW"]);

// ── 表單資料 ──────────────────────────────────────────────────────
const form = ref({
  email: "",
  sub_type: "",
  issues: [],
  recipient_name: "",
  address: "",
  phone: "",
  note: "",
  reader_name: "",
  gender: "",
  age_group: "",
  faith_background: "",
  how_found: "",
  how_found_other: "",
  message: "",
});

const step = ref("form");
const errorMsg = ref("");
const errors = ref({});

// ── 驗證 ─────────────────────────────────────────────────────────
const validate = () => {
  const e = {};
  const { email, sub_type, issues, recipient_name, address, phone, reader_name, gender, age_group, faith_background, how_found, how_found_other } = form.value;
  const tv = t.value;

  if (!email.trim()) {
    e.email = tv.errEmailRequired;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    e.email = tv.errEmailFormat;
  }
  if (!sub_type) e.sub_type = tv.errSubType;
  if (sub_type === tv.optSingle && issues.length === 0) e.issues = tv.errIssues;
  if (!recipient_name.trim()) e.recipient_name = tv.errRecipient;
  if (!address.trim()) e.address = tv.errAddress;
  if (!phone.trim()) e.phone = tv.errPhone;
  if (!reader_name.trim()) e.reader_name = tv.errName;
  if (!gender) e.gender = tv.errGender;
  if (!age_group) e.age_group = tv.errAge;
  if (!faith_background.trim()) e.faith_background = tv.errFaith;
  if (how_found === tv.howFoundOther && !how_found_other.trim()) e.how_found_other = tv.errHowFound;

  errors.value = e;
  return Object.keys(e).length === 0;
};

// ── 送出 ─────────────────────────────────────────────────────────
const handleSubmit = async () => {
  if (!validate()) return;
  step.value = "submitting";

  const tv = t.value;
  const howFound =
    form.value.how_found === tv.howFoundOther
      ? form.value.how_found_other.trim()
      : form.value.how_found || null;

  try {
    await $fetch("/api/subscribe-print", {
      method: "POST",
      body: {
        email: form.value.email.trim(),
        sub_type: form.value.sub_type,
        issues: form.value.sub_type === tv.optSingle ? form.value.issues : [],
        recipient_name: form.value.recipient_name.trim(),
        address: form.value.address.trim(),
        phone: form.value.phone.trim(),
        note: form.value.note.trim() || null,
        reader_name: form.value.reader_name.trim(),
        gender: form.value.gender,
        age_group: form.value.age_group,
        faith_background: form.value.faith_background.trim(),
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
    email: "",
    sub_type: "",
    issues: [],
    recipient_name: "",
    address: "",
    phone: "",
    note: "",
    reader_name: "",
    gender: "",
    age_group: "",
    faith_background: "",
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
      <span class="emoji">📦</span>{{ t.pageTitle }}<span class="emoji">📦</span>
    </h1>
    <div class="main-divider"></div>

    <!-- 說明文字 -->
    <section class="info-section">
      <p>感謝你對《無境界者》雜誌的支持與關注！</p>
      <p>我們的紙本雜誌每兩個月出刊一次，並以限量印刷的方式發送給訂閱者。每本價格為 <strong>350 元</strong>（含郵資），印製完畢後將直接寄送至你指定的地址（限台灣本島；離島與外島需另外計算郵費，國外恕無法寄送紙本）。</p>

      <div class="notice-box">
        <h3>📌 訂閱須知</h3>
        <p class="no-indent">每一期雜誌僅印製一次，為配合印刷流程，請於下列時間前填寫表單：</p>
        <ul>
          <li>05–06 月份雜誌：<strong>6 月 30 日</strong> 截止</li>
          <li>07–08 月份雜誌：<strong>8 月 30 日</strong> 截止</li>
          <li>09–10 月份雜誌：<strong>10 月 30 日</strong> 截止</li>
          <li>11–12 月份雜誌：<strong>12 月 30 日</strong> 截止</li>
        </ul>
        <p class="no-indent">錯過填表期限者，會算入下一期申請，等到下一期印製時再補寄。</p>
        <p class="no-indent">表單送出後，我們將寄送一封 Email，提供繳費資訊（ATM 或轉帳匯款），並請你回信確認轉帳帳號末五碼與收件資訊。</p>
        <p class="no-indent">收到款項後，我們將以中華郵政寄送雜誌，預計於出刊後一週內完成寄出。</p>
      </div>

      <div class="options-box">
        <h3>📦 你可以選擇</h3>
        <ul>
          <li><strong>單期訂閱</strong>：選擇當期或之前的期數各別訂閱</li>
          <li><strong>全年訂閱</strong>：一次訂購 2025 年全年度（共 6 期），全年總價為 <strong>2100 元</strong>，之後的期數會在出刊後定期寄送</li>
        </ul>
      </div>
    </section>

    <!-- 成功畫面 -->
    <div v-if="step === 'success'" class="result-box success-box">
      <div class="result-icon">✉️</div>
      <h2>{{ t.successTitle }}</h2>
      <p class="no-indent">{{ t.successMsg }}</p>
      <button class="btn-secondary" @click="resetForm">{{ t.backToForm }}</button>
    </div>

    <!-- 錯誤畫面 -->
    <div v-else-if="step === 'error'" class="result-box error-box">
      <div class="result-icon">⚠️</div>
      <h2>{{ t.errorTitle }}</h2>
      <p class="no-indent">{{ errorMsg }}</p>
      <button class="btn-secondary" @click="step = 'form'">{{ t.backToEdit }}</button>
    </div>

    <!-- 送出中 -->
    <div v-else-if="step === 'submitting'" class="result-box submitting-box">
      <div class="result-icon spinning">⏳</div>
      <p class="no-indent">{{ t.submitting }}</p>
    </div>

    <!-- 表單 -->
    <form v-else class="subscribe-form" @submit.prevent="handleSubmit" novalidate>

      <!-- ── 訂閱資訊 ── -->
      <h2 class="section-title">{{ t.sectionSub }}</h2>

      <!-- 1. Email -->
      <div class="field" :class="{ 'has-error': errors.email }">
        <label>{{ t.qEmail }} <span class="required">{{ t.required }}</span></label>
        <p class="field-hint">{{ t.qEmailHint }}</p>
        <input type="email" v-model="form.email" placeholder="example@email.com" maxlength="200" />
        <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
      </div>

      <!-- 2. 訂閱方式 -->
      <div class="field" :class="{ 'has-error': errors.sub_type }">
        <label>{{ t.qSubType }} <span class="required">{{ t.required }}</span></label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" :value="t.optSingle" v-model="form.sub_type" />
            {{ t.optSingle }}
          </label>
          <label class="radio-label">
            <input type="radio" :value="t.optYearly" v-model="form.sub_type" />
            {{ t.optYearly }}
          </label>
        </div>
        <span v-if="errors.sub_type" class="field-error">{{ errors.sub_type }}</span>
      </div>

      <!-- 3. 期數選擇（單期才顯示）-->
      <div v-if="form.sub_type === t.optSingle" class="field" :class="{ 'has-error': errors.issues }">
        <label>{{ t.qIssues }}</label>
        <p class="field-hint">{{ t.qIssuesHint }}</p>
        <div class="checkbox-group">
          <label v-for="issue in t.issueOptions" :key="issue" class="checkbox-label">
            <input type="checkbox" :value="issue" v-model="form.issues" />
            {{ issue }}
          </label>
        </div>
        <span v-if="errors.issues" class="field-error">{{ errors.issues }}</span>
      </div>

      <!-- 4. 收件人姓名 -->
      <div class="field" :class="{ 'has-error': errors.recipient_name }">
        <label>{{ t.qRecipient }} <span class="required">{{ t.required }}</span></label>
        <p class="field-hint">{{ t.qRecipientHint }}</p>
        <input type="text" v-model="form.recipient_name" placeholder="請輸入收件人姓名" maxlength="50" />
        <span v-if="errors.recipient_name" class="field-error">{{ errors.recipient_name }}</span>
      </div>

      <!-- 5. 收件地址 -->
      <div class="field" :class="{ 'has-error': errors.address }">
        <label>{{ t.qAddress }} <span class="required">{{ t.required }}</span></label>
        <input type="text" v-model="form.address" placeholder="請輸入完整收件地址（含郵遞區號）" maxlength="200" />
        <span v-if="errors.address" class="field-error">{{ errors.address }}</span>
      </div>

      <!-- 6. 聯絡電話 -->
      <div class="field" :class="{ 'has-error': errors.phone }">
        <label>{{ t.qPhone }} <span class="required">{{ t.required }}</span></label>
        <p class="field-hint">{{ t.qPhoneHint }}</p>
        <input type="tel" v-model="form.phone" placeholder="請輸入聯絡電話" maxlength="30" />
        <span v-if="errors.phone" class="field-error">{{ errors.phone }}</span>
      </div>

      <!-- 7. 備註 -->
      <div class="field">
        <label>{{ t.qNote }}<span class="optional">{{ t.qNoteOpt }}</span></label>
        <textarea v-model="form.note" rows="3" placeholder="例：請用掛號、有門禁請按樓管電話…" maxlength="300"></textarea>
      </div>

      <!-- ── 讀者資料 ── -->
      <h2 class="section-title">{{ t.sectionReader }}</h2>

      <!-- 8. 讀者姓名 -->
      <div class="field" :class="{ 'has-error': errors.reader_name }">
        <label>{{ t.qName }} <span class="required">{{ t.required }}</span></label>
        <input type="text" v-model="form.reader_name" :placeholder="t.qNamePh" maxlength="50" />
        <span v-if="errors.reader_name" class="field-error">{{ errors.reader_name }}</span>
      </div>

      <!-- 9. 性別 -->
      <div class="field" :class="{ 'has-error': errors.gender }">
        <label>{{ t.qGender }} <span class="required">{{ t.required }}</span></label>
        <div class="radio-group">
          <label v-for="opt in t.genderOptions" :key="opt" class="radio-label">
            <input type="radio" :value="opt" v-model="form.gender" />
            {{ opt }}
          </label>
        </div>
        <span v-if="errors.gender" class="field-error">{{ errors.gender }}</span>
      </div>

      <!-- 10. 年齡層 -->
      <div class="field" :class="{ 'has-error': errors.age_group }">
        <label>{{ t.qAge }} <span class="required">{{ t.required }}</span></label>
        <p class="field-hint">{{ t.qAgeHint }}</p>
        <div class="radio-group">
          <label v-for="opt in t.ageOptions" :key="opt" class="radio-label">
            <input type="radio" :value="opt" v-model="form.age_group" />
            {{ opt }}
          </label>
        </div>
        <span v-if="errors.age_group" class="field-error">{{ errors.age_group }}</span>
      </div>

      <!-- 11. 信仰認同 -->
      <div class="field" :class="{ 'has-error': errors.faith_background }">
        <label>{{ t.qFaith }} <span class="required">{{ t.required }}</span></label>
        <p class="field-hint">{{ t.qFaithHint }}</p>
        <textarea v-model="form.faith_background" rows="3" :placeholder="t.qFaithPh" maxlength="300"></textarea>
        <span v-if="errors.faith_background" class="field-error">{{ errors.faith_background }}</span>
      </div>

      <!-- 12. 如何得知 -->
      <div class="field">
        <label>{{ t.qHowFound }}<span class="optional">{{ t.qHowFoundOpt }}</span></label>
        <div class="radio-group">
          <label v-for="opt in t.howFoundOptions" :key="opt" class="radio-label">
            <input type="radio" :value="opt" v-model="form.how_found" />
            {{ opt }}
          </label>
          <label class="radio-label">
            <input type="radio" value="" v-model="form.how_found" />
            {{ t.howFoundNone }}
          </label>
        </div>
        <div
          v-if="form.how_found === t.howFoundOther"
          class="other-input"
          :class="{ 'has-error': errors.how_found_other }"
        >
          <input type="text" v-model="form.how_found_other" :placeholder="t.howFoundOtherPh" maxlength="100" />
          <span v-if="errors.how_found_other" class="field-error">{{ errors.how_found_other }}</span>
        </div>
      </div>

      <!-- 13. 想說的話 -->
      <div class="field">
        <label>{{ t.qMessage }}<span class="optional">{{ t.qMessageOpt }}</span></label>
        <textarea v-model="form.message" rows="4" :placeholder="t.qMessagePh" maxlength="1000"></textarea>
        <div class="char-count" :class="{ warn: form.message.length > 900 }">
          {{ form.message.length }} / 1000
        </div>
      </div>

      <div class="submit-row">
        <button type="submit" class="btn-submit">{{ t.submit }}</button>
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

/* ── 說明區塊 ── */
.info-section {
  margin-bottom: 2.5rem;
}
.notice-box,
.options-box {
  background: #f8faf8;
  border-left: 4px solid #4caf50;
  border-radius: 0 8px 8px 0;
  padding: 16px 20px;
  margin: 1.2rem 0;
}
.notice-box h3,
.options-box h3 {
  margin: 0 0 10px;
  font-size: 1.05rem;
  color: #2c3e50;
}
.notice-box ul,
.options-box ul {
  margin: 8px 0 8px 1.2rem;
  padding: 0;
  color: #444;
  line-height: 1.9;
}
.notice-box p,
.options-box p {
  text-indent: 0;
  margin: 6px 0 0;
  font-size: 0.97rem;
}

/* ── 表單 ── */
.subscribe-form {
  max-width: 640px;
  margin: 0 auto;
}
.section-title {
  font-size: 1.2rem;
  color: #2c3e50;
  border-bottom: 2px solid #4caf50;
  padding-bottom: 6px;
  margin: 2rem 0 1.2rem;
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
.field input[type="tel"],
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
.radio-group,
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}
.radio-label,
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
  color: #444;
  font-size: 1rem;
}
.radio-label input,
.checkbox-label input {
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
  transition: transform 0.2s, background-color 0.2s;
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
