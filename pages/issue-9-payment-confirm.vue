<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

useSeoMeta({
  title: "第九期紙本匯款回覆 — 無境界者",
  description: "回填《無境界者》第九期龐會督紀念專輯紙本訂購匯款資訊。",
  robots: "noindex, nofollow",
});

const route = useRoute();
const unitPrice = 350;

const form = ref({
  name: "",
  email: "",
  copies: 1,
  last5: "",
  message: "",
});

const errors = ref({});
const step = ref("form");
const errorMsg = ref("");
const total = computed(() => Number(form.value.copies || 0) * unitPrice);

onMounted(() => {
  const copies = Number.parseInt(String(route.query.copies || "1"), 10);
  form.value.copies = Number.isInteger(copies) && copies > 0 && copies <= 1000 ? copies : 1;
});

const validate = () => {
  const nextErrors = {};
  const copies = Number(form.value.copies);

  if (!form.value.name.trim()) nextErrors.name = "請填寫姓名";
  if (!form.value.email.trim()) nextErrors.email = "請填寫聯繫 Email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) {
    nextErrors.email = "Email 格式不正確";
  }
  if (!Number.isInteger(copies) || copies < 1 || copies > 1000) {
    nextErrors.copies = "本數須為 1 至 1000 的整數";
  }
  if (!/^\d{5}$/.test(form.value.last5.trim())) {
    nextErrors.last5 = "請填寫五位數的匯款帳號後五碼";
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) return;
  step.value = "submitting";

  try {
    await $fetch("/api/issue-9-payment-confirm", {
      method: "POST",
      body: {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        copies: Number(form.value.copies),
        last5: form.value.last5.trim(),
        message: form.value.message.trim(),
      },
    });
    step.value = "success";
  } catch (error) {
    errorMsg.value = error?.data?.message || "送出失敗，請稍後再試，或直接回覆原匯款信。";
    step.value = "error";
  }
};
</script>

<template>
  <div>
    <h1 class="page-main-title">
      <span class="emoji">💌</span>第九期紙本匯款回覆<span class="emoji">💌</span>
    </h1>
    <div class="main-divider"></div>

    <div v-if="step === 'success'" class="result-box success-box">
      <div class="result-icon">✅</div>
      <h2>匯款資料已送出</h2>
      <p>我們會核對款項，確認後於九月份寄出《無境界者》第九期紙本，謝謝您的訂購。</p>
    </div>

    <div v-else-if="step === 'error'" class="result-box error-box">
      <div class="result-icon">⚠️</div>
      <h2>送出失敗</h2>
      <p>{{ errorMsg }}</p>
      <button class="secondary-button" type="button" @click="step = 'form'">返回修改</button>
    </div>

    <div v-else-if="step === 'submitting'" class="result-box submitting-box">
      <div class="result-icon">⏳</div>
      <p>正在送出匯款資料，請稍候…</p>
    </div>

    <form v-else class="payment-form" @submit.prevent="handleSubmit" novalidate>
      <section class="order-summary" aria-labelledby="order-summary-title">
        <h2 id="order-summary-title">訂購摘要</h2>
        <table>
          <tbody>
            <tr><th>刊物</th><td>《無境界者》第九期「龐會督紀念專輯」</td></tr>
            <tr><th>每本含運</th><td>NT$ {{ unitPrice.toLocaleString('zh-TW') }}</td></tr>
            <tr><th>訂購本數</th><td>{{ form.copies }} 本</td></tr>
            <tr><th>應匯金額</th><td class="total">NT$ {{ total.toLocaleString('zh-TW') }}</td></tr>
          </tbody>
        </table>
      </section>

      <p class="intro">完成匯款後，請填寫以下資料並按下「送出匯款回覆」。我們確認款項後，將於九月份寄出。</p>

      <div class="field" :class="{ 'has-error': errors.name }">
        <label for="name">姓名 <span class="required">*</span></label>
        <input id="name" v-model="form.name" type="text" maxlength="60" autocomplete="name" />
        <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
      </div>

      <div class="field" :class="{ 'has-error': errors.email }">
        <label for="email">聯繫 Email <span class="required">*</span></label>
        <input id="email" v-model="form.email" type="email" maxlength="200" autocomplete="email" />
        <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
      </div>

      <div class="field" :class="{ 'has-error': errors.copies }">
        <label for="copies">訂購本數 <span class="required">*</span></label>
        <input id="copies" v-model.number="form.copies" type="number" min="1" max="1000" inputmode="numeric" />
        <span v-if="errors.copies" class="field-error">{{ errors.copies }}</span>
      </div>

      <div class="field" :class="{ 'has-error': errors.last5 }">
        <label for="last5">匯款帳號後五碼 <span class="required">*</span></label>
        <input
          id="last5"
          v-model="form.last5"
          type="text"
          inputmode="numeric"
          pattern="[0-9]{5}"
          maxlength="5"
          placeholder="例：01234"
          autocomplete="off"
        />
        <span v-if="errors.last5" class="field-error">{{ errors.last5 }}</span>
      </div>

      <div class="field">
        <label for="message">備註 <span class="optional">（選填）</span></label>
        <textarea id="message" v-model="form.message" rows="4" maxlength="500" placeholder="如匯款人姓名不同，請在此註明"></textarea>
      </div>

      <button class="submit-button" type="submit">送出匯款回覆</button>
    </form>
  </div>
</template>

<style scoped>
.main-divider {
  width: 100%;
  height: 4px;
  margin: 20px auto 36px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.payment-form,
.result-box {
  max-width: 680px;
  margin: 0 auto;
}

.order-summary {
  padding: 24px;
  margin-bottom: 24px;
  background: #f7faf7;
  border-left: 4px solid #4caf50;
  border-radius: 0 10px 10px 0;
}

.order-summary h2 {
  margin: 0 0 14px;
  color: #2c3e50;
  font-size: 1.25rem;
}

.order-summary table {
  width: 100%;
  border-collapse: collapse;
}

.order-summary th,
.order-summary td {
  padding: 9px 0;
  border-bottom: 1px solid #dde8dd;
  text-align: left;
  vertical-align: top;
}

.order-summary th {
  width: 120px;
  color: #667066;
  font-weight: 500;
}

.order-summary tr:last-child th,
.order-summary tr:last-child td {
  border-bottom: 0;
}

.order-summary .total {
  color: #26712a;
  font-size: 1.2rem;
  font-weight: 700;
}

.intro {
  margin: 0 0 26px;
  color: #555;
  line-height: 1.8;
  text-indent: 0;
}

.field {
  margin-bottom: 24px;
}

.field label {
  display: block;
  margin-bottom: 7px;
  color: #2c3e50;
  font-size: 1.04rem;
  font-weight: 600;
}

.field input,
.field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 13px;
  border: 1px solid #c9c9c9;
  border-radius: 7px;
  color: #333;
  font: inherit;
  font-size: 1.05rem;
  line-height: 1.6;
}

.field input:focus,
.field textarea:focus {
  outline: 0;
  border-color: #4caf50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.14);
}

.has-error input,
.has-error textarea {
  border-color: #d84343;
}

.required,
.field-error {
  color: #d84343;
}

.optional {
  color: #888;
  font-size: 0.9rem;
  font-weight: 400;
}

.field-error {
  display: block;
  margin-top: 5px;
  font-size: 0.88rem;
}

.submit-button,
.secondary-button {
  border: 0;
  border-radius: 7px;
  font: inherit;
  cursor: pointer;
}

.submit-button {
  display: block;
  min-width: 220px;
  margin: 30px auto 0;
  padding: 13px 28px;
  background: linear-gradient(135deg, #388e3c, #66bb6a);
  color: #fff;
  font-size: 1.08rem;
  letter-spacing: 1px;
}

.submit-button:hover,
.secondary-button:hover {
  opacity: 0.88;
}

.result-box {
  padding: 36px 28px;
  border-radius: 10px;
  text-align: center;
}

.result-box p {
  margin: 0;
  line-height: 1.9;
  text-indent: 0;
}

.success-box { background: #f0faf0; border: 1px solid #b2dfb5; }
.error-box { background: #fff5f5; border: 1px solid #ffcaca; }
.submitting-box { background: #f7f7f7; }
.result-icon { margin-bottom: 8px; font-size: 2.4rem; }
.secondary-button { margin-top: 18px; padding: 9px 24px; background: #fff; border: 1px solid #aaa; }

@media (max-width: 640px) {
  .order-summary { padding: 18px 16px; }
  .order-summary th { width: 94px; }
}
</style>
