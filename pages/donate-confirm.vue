<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

useSeoMeta({
  title: "贊助回填 — 無境界者",
  description: "感謝您的贊助，請填寫匯款資訊以完成確認。",
});

const route = useRoute();

const form = ref({
  name: "",
  email: "",
  date: "",
  amount: "",
  last5: "",
  is_public: "",
  message: "",
});

const errors = ref({});
const step = ref("form");
const errorMsg = ref("");

onMounted(() => {
  form.value.name = route.query.name || "";
  form.value.email = route.query.email || "";
});

const validate = () => {
  const e = {};
  if (!form.value.name.trim()) e.name = "請填寫您的姓名或機構名稱";
  if (!form.value.email.trim()) e.email = "請填寫電子郵件";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) e.email = "電子郵件格式不正確";
  if (!form.value.date.trim()) e.date = "請填寫匯款時間";
  if (!form.value.amount.trim()) e.amount = "請填寫匯款金額";
  if (!form.value.last5.trim()) e.last5 = "請填寫帳號末五碼";
  if (!form.value.is_public) e.is_public = "請選擇是否願意公開姓名";
  return e;
};

const handleSubmit = async () => {
  errors.value = validate();
  if (Object.keys(errors.value).length) return;
  step.value = "submitting";
  try {
    await $fetch("/api/donate-confirm", {
      method: "POST",
      body: {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        date: form.value.date.trim(),
        amount: form.value.amount.trim(),
        last5: form.value.last5.trim(),
        is_public: form.value.is_public,
        message: form.value.message.trim(),
      },
    });
    step.value = "success";
  } catch (err) {
    errorMsg.value = err?.data?.message || "送出失敗，請稍後再試。";
    step.value = "error";
  }
};
</script>

<template>
  <div>
    <h1 class="page-main-title">
      <span class="emoji">💌</span>贊助回填<span class="emoji">💌</span>
    </h1>
    <div class="main-divider"></div>

    <!-- 成功 -->
    <div v-if="step === 'success'" class="result-box success-box">
      <div class="result-icon">✅</div>
      <h2>感謝您的支持！</h2>
      <p class="no-indent">我們已收到您的回填資訊，確認匯款後將以電子郵件通知您。願您平安。</p>
      <a href="/subscribe" class="btn-subscribe" target="_blank" rel="noopener">📮 線上訂閱電子報</a>
    </div>

    <!-- 錯誤 -->
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
    <form v-else class="confirm-form" @submit.prevent="handleSubmit" novalidate>

      <div class="field" :class="{ 'has-error': errors.name }">
        <label>1. 姓名或機構名稱 <span class="required">*</span></label>
        <input type="text" v-model="form.name" placeholder="請輸入您的姓名或機構名稱" maxlength="50" />
        <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
      </div>

      <div class="field" :class="{ 'has-error': errors.email }">
        <label>2. 電子郵件 <span class="required">*</span></label>
        <input type="email" v-model="form.email" placeholder="請輸入電子郵件" />
        <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
      </div>

      <div class="field" :class="{ 'has-error': errors.date }">
        <label>3. 匯款時間 <span class="required">*</span></label>
        <input type="text" v-model="form.date" placeholder="例：2025/06/01" maxlength="30" />
        <span v-if="errors.date" class="field-error">{{ errors.date }}</span>
      </div>

      <div class="field" :class="{ 'has-error': errors.amount }">
        <label>4. 匯款金額（新台幣）<span class="required">*</span></label>
        <input type="text" v-model="form.amount" placeholder="例：500" maxlength="20" />
        <span v-if="errors.amount" class="field-error">{{ errors.amount }}</span>
      </div>

      <div class="field" :class="{ 'has-error': errors.last5 }">
        <label>5. 帳號末五碼 <span class="required">*</span></label>
        <input type="text" v-model="form.last5" placeholder="例：01234" maxlength="5" />
        <span v-if="errors.last5" class="field-error">{{ errors.last5 }}</span>
      </div>

      <div class="field" :class="{ 'has-error': errors.is_public }">
        <label>6. 是否願意公開姓名／機構名稱於財務明細 <span class="required">*</span></label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" value="願意公開" v-model="form.is_public" />
            願意公開
          </label>
          <label class="radio-label">
            <input type="radio" value="以匿名登錄" v-model="form.is_public" />
            以匿名登錄
          </label>
        </div>
        <span v-if="errors.is_public" class="field-error">{{ errors.is_public }}</span>
      </div>

      <div class="field">
        <label>7. 想跟我們說的話 <span class="optional">（選填）</span></label>
        <textarea v-model="form.message" rows="4" placeholder="歡迎留下任何鼓勵或想說的話…" maxlength="500"></textarea>
      </div>

      <div class="submit-wrap">
        <button type="submit" class="btn-submit">送出確認</button>
      </div>

      <div class="subscribe-hint">
        <p>尚未訂閱《無境界者》電子報嗎？每期出刊時我們將寄送通知至您的信箱：</p>
        <a href="/subscribe" class="btn-subscribe" target="_blank" rel="noopener">📮 線上訂閱電子報</a>
      </div>

    </form>
  </div>
</template>

<style scoped>
.main-divider {
  width: 100%;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  margin: 20px auto 40px;
}

.confirm-form {
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
.required { color: #e74c3c; margin-left: 2px; }
.optional { font-weight: normal; color: #999; font-size: 0.9rem; margin-left: 4px; }

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
.has-error textarea { border-color: #e74c3c; }
.field-error { display: block; color: #e74c3c; font-size: 0.87rem; margin-top: 5px; }

.radio-group { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
.radio-label {
  display: flex; align-items: center; gap: 8px;
  cursor: pointer; font-weight: normal; color: #444; font-size: 1rem;
}
.radio-label input[type="radio"] { width: auto; cursor: pointer; accent-color: #5b9bd5; }

.submit-wrap { text-align: center; margin-top: 12px; }
.btn-submit {
  background: linear-gradient(135deg, #4caf50, #81c784);
  color: #fff; border: none;
  padding: 12px 40px; border-radius: 6px;
  font-size: 1.1rem; font-family: inherit;
  cursor: pointer; letter-spacing: 1px;
  transition: opacity 0.2s;
}
.btn-submit:hover { opacity: 0.88; }

.subscribe-hint {
  text-align: center;
  margin-top: 40px;
  padding-top: 28px;
  border-top: 1px solid #eee;
  color: #666;
  font-size: 0.95rem;
  line-height: 1.8;
}
.subscribe-hint p { margin-bottom: 14px; text-indent: 0; }

.btn-subscribe {
  display: inline-block;
  background: linear-gradient(135deg, #4caf50, #81c784);
  color: #fff; text-decoration: none;
  padding: 11px 30px; border-radius: 6px;
  font-size: 1rem; font-family: inherit;
  letter-spacing: 1px; transition: opacity 0.2s;
}
.btn-subscribe:hover { opacity: 0.88; }

/* result boxes */
.result-box {
  max-width: 520px; margin: 2rem auto;
  padding: 2.5rem 2rem; border-radius: 10px;
  text-align: center; line-height: 2;
}
.success-box { background: #f0faf0; border: 1px solid #b2dfdb; }
.error-box   { background: #fff5f5; border: 1px solid #ffcdd2; }
.submitting-box { background: #f8f8f8; }
.result-icon { font-size: 2.5rem; margin-bottom: 1rem; }
.result-box h2 { margin: 0 0 0.5rem; color: #333; }
.no-indent { text-indent: 0; }
.result-box .btn-subscribe { margin-top: 1.4rem; }

.btn-secondary {
  margin-top: 1.2rem; padding: 9px 28px;
  border: 1px solid #aaa; border-radius: 6px;
  background: #fff; font-family: inherit; font-size: 1rem; cursor: pointer;
}
.btn-secondary:hover { background: #f5f5f5; }

@keyframes spin { to { transform: rotate(360deg); } }
.spinning { display: inline-block; animation: spin 1s linear infinite; }
</style>
