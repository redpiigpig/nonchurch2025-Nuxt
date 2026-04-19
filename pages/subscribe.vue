<script setup>
import { ref, computed } from "vue";
import { useLanguage } from "~/composables/useLanguage";

const { currentLang } = useLanguage();

const i18n = {
  "zh-TW": {
    pageTitle: "線上訂閱",
    seoTitle: "線上訂閱 — 無境界者",
    seoDesc: "訂閱《無境界者》雙月刊，與我們一同探索信仰的無限可能。",
    intro: "《無境界者》是一個不以教會為本位的自由信仰論述平台，每雙數月月底出刊。訂閱後，我們會在每期發刊時寄送通知信件至您的信箱。以下資料僅作內部統計之用，不會對外公開或分享給任何第三方。",
    successTitle: "訂閱成功！",
    successMsg: "感謝您訂閱《無境界者》。每當新一期出刊，我們將寄送通知至您的信箱。",
    backToForm: "返回表單",
    errorTitle: "送出失敗",
    backToEdit: "返回修改",
    submitting: "正在送出，請稍候…",
    q1: "1. 讀者姓名",
    q1ph: "請輸入您的姓名",
    errName: "請填寫您的姓名",
    q2: "2. 性別",
    errGender: "請選擇性別",
    genderOptions: ["男", "女", "非二元性別", "不便透露"],
    q3: "3. 年齡層",
    q3hint: "僅作統計用，不會對外公開",
    errAge: "請選擇年齡層",
    ageOptions: ["20 歲以下", "21–30 歲", "31–40 歲", "41–50 歲", "51–60 歲", "61 歲以上"],
    q3b: "4. 居住縣市／國家",
    q3bph: "例：台北市／高雄市／香港／洛杉磯…",
    errRegion: "請填寫居住地區",
    q4: "5. 信仰認同或所屬教會",
    q4hint: "可填寫多個答案，例如：「長老教會會友、目前無教會」",
    q4ph: "請描述您的信仰背景或所屬教會…",
    errFaith: "請填寫信仰認同或所屬教會",
    q5: "6. 電子郵件",
    q5hint: "訂閱通知將寄至此信箱",
    errEmailRequired: "請填寫電子郵件",
    errEmailFormat: "電子郵件格式不正確",
    q6: "7. 您是如何得知《無境界者》的？",
    q6opt: "（選填）",
    howFoundOptions: ["朋友或家人介紹", "社群媒體（Facebook / Instagram / X 等）", "教會或信仰社群", "網路搜尋", "其他"],
    howFoundOther: "其他",
    howFoundNone: "不填答",
    howFoundOtherPh: "請說明…",
    errHowFound: "請說明您是如何得知的",
    q7: "8. 想對我們說的話",
    q7opt: "（選填）",
    q7ph: "歡迎留下任何建議、鼓勵或問題…",
    submit: "送出訂閱",
    required: "*",
  },
  "zh-HK": {
    pageTitle: "網上訂閱",
    seoTitle: "網上訂閱 — 無境界者",
    seoDesc: "訂閱《無境界者》雙月刊，與我們一同探索信仰嘅無限可能。",
    intro: "《無境界者》係一個唔以教會為本位嘅自由信仰論述平台，每雙數月月底出刊。訂閱後，我們會喺每期發刊時寄送通知信件至您嘅信箱。以下資料僅作內部統計之用，唔會對外公開或分享俾任何第三方。",
    successTitle: "訂閱成功！",
    successMsg: "感謝您訂閱《無境界者》。每當新一期出刊，我們將寄送通知至您嘅信箱。",
    backToForm: "返回表單",
    errorTitle: "送出失敗",
    backToEdit: "返回修改",
    submitting: "正在送出，請稍候…",
    q1: "1. 讀者姓名",
    q1ph: "請輸入您嘅姓名",
    errName: "請填寫您嘅姓名",
    q2: "2. 性別",
    errGender: "請選擇性別",
    genderOptions: ["男", "女", "非二元性別", "不便透露"],
    q3: "3. 年齡層",
    q3hint: "僅作統計用，唔會對外公開",
    errAge: "請選擇年齡層",
    ageOptions: ["20 歲以下", "21–30 歲", "31–40 歲", "41–50 歲", "51–60 歲", "61 歲以上"],
    q3b: "4. 居住縣市／國家",
    q3bph: "例：台北市／高雄市／香港／洛杉磯…",
    errRegion: "請填寫居住地區",
    q4: "5. 信仰認同或所屬教會",
    q4hint: "可填寫多個答案，例如：「長老教會會友、目前無教會」",
    q4ph: "請描述您嘅信仰背景或所屬教會…",
    errFaith: "請填寫信仰認同或所屬教會",
    q5: "6. 電子郵件",
    q5hint: "訂閱通知將寄至此信箱",
    errEmailRequired: "請填寫電子郵件",
    errEmailFormat: "電子郵件格式不正確",
    q6: "7. 您係如何得知《無境界者》嘅？",
    q6opt: "（選填）",
    howFoundOptions: ["朋友或家人介紹", "社群媒體（Facebook / Instagram / X 等）", "教會或信仰社群", "網路搜尋", "其他"],
    howFoundOther: "其他",
    howFoundNone: "不填答",
    howFoundOtherPh: "請說明…",
    errHowFound: "請說明您係如何得知嘅",
    q7: "8. 想對我們說嘅話",
    q7opt: "（選填）",
    q7ph: "歡迎留下任何建議、鼓勵或問題…",
    submit: "送出訂閱",
    required: "*",
  },
  "zh-CN": {
    pageTitle: "在线订阅",
    seoTitle: "在线订阅 — 无境界者",
    seoDesc: "订阅《无境界者》双月刊，与我们一同探索信仰的无限可能。",
    intro: "《无境界者》是一个不以教会为本位的自由信仰论述平台，每双数月月底出刊。订阅后，我们会在每期发刊时发送通知邮件至您的邮箱。以下资料仅作内部统计之用，不会对外公开或分享给任何第三方。",
    successTitle: "订阅成功！",
    successMsg: "感谢您订阅《无境界者》。每当新一期出刊，我们将发送通知至您的邮箱。",
    backToForm: "返回表单",
    errorTitle: "提交失败",
    backToEdit: "返回修改",
    submitting: "正在提交，请稍候…",
    q1: "1. 读者姓名",
    q1ph: "请输入您的姓名",
    errName: "请填写您的姓名",
    q2: "2. 性别",
    errGender: "请选择性别",
    genderOptions: ["男", "女", "非二元性别", "不便透露"],
    q3: "3. 年龄层",
    q3hint: "仅作统计用，不会对外公开",
    errAge: "请选择年龄层",
    ageOptions: ["20 岁以下", "21–30 岁", "31–40 岁", "41–50 岁", "51–60 岁", "61 岁以上"],
    q3b: "4. 居住县市／国家",
    q3bph: "例：台北市／高雄市／香港／洛杉矶…",
    errRegion: "请填写居住地区",
    q4: "5. 信仰认同或所属教会",
    q4hint: "可填写多个答案，例如：「长老教会会友、目前无教会」",
    q4ph: "请描述您的信仰背景或所属教会…",
    errFaith: "请填写信仰认同或所属教会",
    q5: "6. 电子邮件",
    q5hint: "订阅通知将发送至此邮箱",
    errEmailRequired: "请填写电子邮件",
    errEmailFormat: "电子邮件格式不正确",
    q6: "7. 您是如何得知《无境界者》的？",
    q6opt: "（选填）",
    howFoundOptions: ["朋友或家人介绍", "社交媒体（Facebook / Instagram / X 等）", "教会或信仰社群", "网络搜索", "其他"],
    howFoundOther: "其他",
    howFoundNone: "不填答",
    howFoundOtherPh: "请说明…",
    errHowFound: "请说明您是如何得知的",
    q7: "8. 想对我们说的话",
    q7opt: "（选填）",
    q7ph: "欢迎留下任何建议、鼓励或问题…",
    submit: "提交订阅",
    required: "*",
  },
  en: {
    pageTitle: "Subscribe",
    seoTitle: "Subscribe — Faith Without Boundary",
    seoDesc: "Subscribe to Faith Without Boundary bimonthly magazine and explore faith with us.",
    intro: "Faith Without Boundary is a free-thinking faith platform that publishes at the end of every even-numbered month. After subscribing, we will send you a notification email when each new issue is released. The information below is for internal statistics only and will not be shared with any third party.",
    successTitle: "Subscription successful!",
    successMsg: "Thank you for subscribing to Faith Without Boundary. We will notify you when each new issue is published.",
    backToForm: "Back to form",
    errorTitle: "Submission failed",
    backToEdit: "Go back",
    submitting: "Submitting, please wait…",
    q1: "1. Your name",
    q1ph: "Enter your name",
    errName: "Please enter your name",
    q2: "2. Gender",
    errGender: "Please select a gender",
    genderOptions: ["Male", "Female", "Non-binary", "Prefer not to say"],
    q3: "3. Age group",
    q3hint: "For statistics only, will not be made public",
    errAge: "Please select an age group",
    ageOptions: ["Under 20", "21–30", "31–40", "41–50", "51–60", "61 and above"],
    q3b: "4. City / Country of residence",
    q3bph: "e.g. Taipei / Hong Kong / Los Angeles…",
    errRegion: "Please enter your region",
    q4: "5. Faith background or church affiliation",
    q4hint: "You may provide multiple answers, e.g. \"Presbyterian church member, currently unchurched\"",
    q4ph: "Describe your faith background or church affiliation…",
    errFaith: "Please describe your faith background",
    q5: "6. Email address",
    q5hint: "Subscription notifications will be sent to this address",
    errEmailRequired: "Please enter your email",
    errEmailFormat: "Invalid email format",
    q6: "7. How did you hear about Faith Without Boundary?",
    q6opt: "(optional)",
    howFoundOptions: ["Friend or family", "Social media (Facebook / Instagram / X, etc.)", "Church or faith community", "Internet search", "Other"],
    howFoundOther: "Other",
    howFoundNone: "Prefer not to say",
    howFoundOtherPh: "Please describe…",
    errHowFound: "Please describe how you found us",
    q7: "8. Anything you'd like to share with us",
    q7opt: "(optional)",
    q7ph: "Feel free to leave suggestions, encouragement, or questions…",
    submit: "Subscribe",
    required: "*",
  },
  ja: {
    pageTitle: "オンライン購読",
    seoTitle: "オンライン購読 — 無境界者",
    seoDesc: "《無境界者》隔月刊を購読して、信仰の可能性を共に探求しましょう。",
    intro: "《無境界者》は教会中心主義にとらわれない自由な信仰論述プラットフォームです。偶数月の月末に発刊します。購読後、新号発刊のたびにメールでお知らせします。以下の情報は内部統計のみに使用され、第三者に公開・提供されることはありません。",
    successTitle: "購読が完了しました！",
    successMsg: "《無境界者》をご購読いただきありがとうございます。新号が発刊される際にメールでお知らせします。",
    backToForm: "フォームに戻る",
    errorTitle: "送信に失敗しました",
    backToEdit: "戻る",
    submitting: "送信中、しばらくお待ちください…",
    q1: "1. お名前",
    q1ph: "お名前を入力してください",
    errName: "お名前を入力してください",
    q2: "2. 性別",
    errGender: "性別を選択してください",
    genderOptions: ["男性", "女性", "ノンバイナリー", "回答しない"],
    q3: "3. 年齢層",
    q3hint: "統計目的のみ、外部に公開されません",
    errAge: "年齢層を選択してください",
    ageOptions: ["20歳未満", "21〜30歳", "31〜40歳", "41〜50歳", "51〜60歳", "61歳以上"],
    q3b: "4. お住まいの地域（市区町村・国）",
    q3bph: "例：台北市 / 高雄市 / 香港 / ロサンゼルス…",
    errRegion: "お住まいの地域を入力してください",
    q4: "5. 信仰の背景または所属教会",
    q4hint: "複数回答可（例：長老派教会員、現在は無教会）",
    q4ph: "信仰の背景や所属教会を記述してください…",
    errFaith: "信仰の背景を記入してください",
    q5: "6. メールアドレス",
    q5hint: "購読通知をこのアドレスに送信します",
    errEmailRequired: "メールアドレスを入力してください",
    errEmailFormat: "メールアドレスの形式が正しくありません",
    q6: "7. 《無境界者》をどのようにして知りましたか？",
    q6opt: "（任意）",
    howFoundOptions: ["友人・家族の紹介", "SNS（Facebook / Instagram / X など）", "教会または信仰コミュニティ", "インターネット検索", "その他"],
    howFoundOther: "その他",
    howFoundNone: "回答しない",
    howFoundOtherPh: "詳しく教えてください…",
    errHowFound: "どのようにして知ったか記入してください",
    q7: "8. 私たちへのメッセージ",
    q7opt: "（任意）",
    q7ph: "ご意見・励ましのお言葉・ご質問などをお気軽にどうぞ…",
    submit: "購読する",
    required: "*",
  },
  ko: {
    pageTitle: "온라인 구독",
    seoTitle: "온라인 구독 — 무경계자",
    seoDesc: "《무경계자》 격월간지를 구독하고 신앙의 무한한 가능성을 함께 탐구하세요.",
    intro: "《무경계자》는 교회 중심주의를 벗어난 자유로운 신앙 논술 플랫폼으로, 매 짝수 달 말일에 발간됩니다. 구독 후 새 호가 발간될 때마다 이메일로 알림을 보내드립니다. 아래 정보는 내부 통계 목적으로만 사용되며 제3자에게 공개되지 않습니다.",
    successTitle: "구독 성공！",
    successMsg: "《무경계자》를 구독해 주셔서 감사합니다. 새 호가 발간될 때마다 이메일로 알려드리겠습니다.",
    backToForm: "폼으로 돌아가기",
    errorTitle: "제출 실패",
    backToEdit: "돌아가기",
    submitting: "제출 중, 잠시 기다려 주세요…",
    q1: "1. 독자 성함",
    q1ph: "성함을 입력해 주세요",
    errName: "성함을 입력해 주세요",
    q2: "2. 성별",
    errGender: "성별을 선택해 주세요",
    genderOptions: ["남성", "여성", "논바이너리", "밝히고 싶지 않음"],
    q3: "3. 연령대",
    q3hint: "통계 목적으로만 사용되며 공개되지 않습니다",
    errAge: "연령대를 선택해 주세요",
    ageOptions: ["20세 미만", "21–30세", "31–40세", "41–50세", "51–60세", "61세 이상"],
    q3b: "4. 거주 지역",
    q3bph: "예: 台北市 / 高雄市 / 香港 / 洛杉磯…",
    errRegion: "거주 지역을 입력해 주세요",
    q4: "5. 신앙 정체성 또는 소속 교회",
    q4hint: "복수 답변 가능 (예: 장로교회 교인, 현재 무교회)",
    q4ph: "신앙 배경이나 소속 교회를 적어주세요…",
    errFaith: "신앙 배경을 입력해 주세요",
    q5: "6. 이메일 주소",
    q5hint: "구독 알림을 이 주소로 보내드립니다",
    errEmailRequired: "이메일 주소를 입력해 주세요",
    errEmailFormat: "이메일 형식이 올바르지 않습니다",
    q6: "7. 《무경계자》를 어떻게 알게 되셨나요？",
    q6opt: "（선택）",
    howFoundOptions: ["친구 또는 가족 소개", "소셜 미디어（Facebook / Instagram / X 등）", "교회 또는 신앙 공동체", "인터넷 검색", "기타"],
    howFoundOther: "기타",
    howFoundNone: "응답 안 함",
    howFoundOtherPh: "설명해 주세요…",
    errHowFound: "어떻게 알게 되셨는지 입력해 주세요",
    q7: "8. 하고 싶은 말",
    q7opt: "（선택）",
    q7ph: "제안, 격려, 질문 등 자유롭게 남겨주세요…",
    submit: "구독 신청",
    required: "*",
  },
};

const t = computed(() => i18n[currentLang.value] || i18n["zh-TW"]);

useSeoMeta({
  title: () => t.value.seoTitle,
  description: () => t.value.seoDesc,
});

// ── 表單資料 ──────────────────────────────────────────────────────
const form = ref({
  name: "",
  gender: "",
  age_group: "",
  region: "",
  faith_background: "",
  email: "",
  how_found: "",
  how_found_other: "",
  message: "",
});

const step = ref("form"); // form | submitting | success | error
const errorMsg = ref("");

// ── 驗證 ─────────────────────────────────────────────────────────
const errors = ref({});

const validate = () => {
  const e = {};
  if (!form.value.name.trim()) e.name = t.value.errName;
  if (!form.value.gender) e.gender = t.value.errGender;
  if (!form.value.age_group) e.age_group = t.value.errAge;
  if (!form.value.region.trim()) e.region = t.value.errRegion;
  if (!form.value.faith_background.trim()) e.faith_background = t.value.errFaith;
  if (!form.value.email.trim()) {
    e.email = t.value.errEmailRequired;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) {
    e.email = t.value.errEmailFormat;
  }
  if (form.value.how_found === t.value.howFoundOther && !form.value.how_found_other.trim()) {
    e.how_found_other = t.value.errHowFound;
  }
  errors.value = e;
  return Object.keys(e).length === 0;
};

// ── 送出 ─────────────────────────────────────────────────────────
const handleSubmit = async () => {
  if (!validate()) return;

  step.value = "submitting";

  const howFound =
    form.value.how_found === t.value.howFoundOther
      ? form.value.how_found_other.trim()
      : form.value.how_found || null;

  try {
    await $fetch("/api/subscribe", {
      method: "POST",
      body: {
        name: form.value.name.trim(),
        gender: form.value.gender,
        age_group: form.value.age_group,
        region: form.value.region.trim(),
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
    region: "",
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
      <span class="emoji">📮</span>{{ t.pageTitle }}<span class="emoji">📮</span>
    </h1>
    <div class="main-divider"></div>

    <!-- 說明文字 -->
    <section class="intro-section">
      <p>{{ t.intro }}</p>
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
    <form
      v-else
      class="subscribe-form"
      @submit.prevent="handleSubmit"
      novalidate
    >
      <!-- 1. 姓名 -->
      <div class="field" :class="{ 'has-error': errors.name }">
        <label>{{ t.q1 }} <span class="required">{{ t.required }}</span></label>
        <input
          type="text"
          v-model="form.name"
          :placeholder="t.q1ph"
          maxlength="50"
        />
        <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
      </div>

      <!-- 2. 性別 -->
      <div class="field" :class="{ 'has-error': errors.gender }">
        <label>{{ t.q2 }} <span class="required">{{ t.required }}</span></label>
        <div class="radio-group">
          <label v-for="opt in t.genderOptions" :key="opt" class="radio-label">
            <input type="radio" :value="opt" v-model="form.gender" />
            {{ opt }}
          </label>
        </div>
        <span v-if="errors.gender" class="field-error">{{ errors.gender }}</span>
      </div>

      <!-- 3. 年齡層 -->
      <div class="field" :class="{ 'has-error': errors.age_group }">
        <label>{{ t.q3 }} <span class="required">{{ t.required }}</span></label>
        <p class="field-hint">{{ t.q3hint }}</p>
        <div class="radio-group">
          <label v-for="opt in t.ageOptions" :key="opt" class="radio-label">
            <input type="radio" :value="opt" v-model="form.age_group" />
            {{ opt }}
          </label>
        </div>
        <span v-if="errors.age_group" class="field-error">{{ errors.age_group }}</span>
      </div>

      <!-- 4. 居住縣市／國家 -->
      <div class="field" :class="{ 'has-error': errors.region }">
        <label>{{ t.q3b }} <span class="required">{{ t.required }}</span></label>
        <input
          type="text"
          v-model="form.region"
          :placeholder="t.q3bph"
          maxlength="100"
        />
        <span v-if="errors.region" class="field-error">{{ errors.region }}</span>
      </div>

      <!-- 5. 信仰認同或所屬教會 -->
      <div class="field" :class="{ 'has-error': errors.faith_background }">
        <label>{{ t.q4 }} <span class="required">{{ t.required }}</span></label>
        <p class="field-hint">{{ t.q4hint }}</p>
        <textarea
          v-model="form.faith_background"
          rows="3"
          :placeholder="t.q4ph"
          maxlength="300"
        ></textarea>
        <span v-if="errors.faith_background" class="field-error">{{ errors.faith_background }}</span>
      </div>

      <!-- 5. 電子郵件 -->
      <div class="field" :class="{ 'has-error': errors.email }">
        <label>{{ t.q5 }} <span class="required">{{ t.required }}</span></label>
        <p class="field-hint">{{ t.q5hint }}</p>
        <input
          type="email"
          v-model="form.email"
          placeholder="example@email.com"
          maxlength="200"
        />
        <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
      </div>

      <!-- 6. 如何得知 -->
      <div class="field">
        <label>{{ t.q6 }}<span class="optional">{{ t.q6opt }}</span></label>
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
          <input
            type="text"
            v-model="form.how_found_other"
            :placeholder="t.howFoundOtherPh"
            maxlength="100"
          />
          <span v-if="errors.how_found_other" class="field-error">{{ errors.how_found_other }}</span>
        </div>
      </div>

      <!-- 7. 想說的話 -->
      <div class="field">
        <label>{{ t.q7 }}<span class="optional">{{ t.q7opt }}</span></label>
        <textarea
          v-model="form.message"
          rows="4"
          :placeholder="t.q7ph"
          maxlength="1000"
        ></textarea>
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
