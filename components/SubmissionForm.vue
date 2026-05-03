<script setup>
import { ref, computed, nextTick } from "vue";
import { useLanguage } from "~/composables/useLanguage";

const supabase = useSupabaseClient();
const { currentLang } = useLanguage();

const i18n = {
  "zh-TW": {
    tabNew: "✏️ 新增投稿",
    tabModify: "🔄 修改已投稿",
    lookupTitle: "查詢您的投稿記錄",
    lookupHint: "請輸入您投稿時使用的姓名（本名或筆名）及 Email，即可查詢並修改稿件。",
    lookupNameLabel: "投稿姓名（本名或筆名）",
    lookupNamePh: "請輸入投稿時的姓名",
    lookupEmailLabel: "投稿 Email",
    lookupEmailPh: "請輸入投稿時的 Email",
    lookupBtn: "🔍 查詢我的投稿",
    lookupBtnLoading: "查詢中...",
    lookupErrEmpty: "請填寫姓名與 Email",
    lookupErrNotFound: "找不到符合的投稿記錄，請確認姓名（本名或筆名）與 Email 是否正確。",
    lookupErrFail: "查詢失敗，請稍後再試。",
    resultsTitle: (n) => `找到 ${n} 筆投稿記錄`,
    resultsBack: "← 重新查詢",
    selectEdit: "選擇修改",
    converted: "已轉文章",
    convertedAlert: "此投稿已轉換為文章，無法修改。",
    loadingData: "載入投稿資料...",
    loadFail: "載入失敗：",
    editingBanner: "🔄 正在修改：",
    cancelEdit: "取消修改",
    successTitleNew: "投稿已送出！",
    successTitleEdit: "修改已送出！",
    successMsgNew: "感謝您的投稿，編輯團隊將盡快審閱並以 Email 回覆是否刊登。",
    successMsgEdit: "您的稿件已更新，編輯團隊將盡快重新審閱。",
    submitAgain: "再次投稿",
    backToLookup: "返回查詢",
    submittingTitle: "正在提交中，請稍候⋯",
    errorTitle: "提交失敗",
    backToEdit: "返回修改",
    sectionAuthor: "作者資訊",
    sectionArticle: "文章資訊",
    sectionFiles: "檔案上傳",
    realNameLabel: "作者真實姓名",
    realNameHint: "本刊歡迎使用筆名發表，但在投稿時，仍請填寫真實姓名，以示自負文責。若使用筆名者，本刊不會對外透露真實姓名，在網站上的「專欄作者」區也會使用筆名顯示。",
    realNamePh: "請填寫真實姓名",
    displayNameLabel: "發表暱稱（筆名）",
    displayNameHint: "若以本名發表者，無須填寫此欄位。若有多個筆名或同時用真名和筆名發表，網站上的「專欄作者」區也會有多個欄位。",
    displayNamePh: "若以本名發表可留空",
    oldAuthorBtn: "🔍 我是舊作者，帶入資料",
    oldAuthorBtnLoading: "查詢中...",
    oldAuthorHint: "（填寫本名或筆名後可點擊查詢）",
    oldAuthorNoMatch: "找不到符合的作者記錄，請繼續填寫下方欄位。",
    oldAuthorDismiss: "知道了",
    oldAuthorMatchTitle: "找到以下作者，請選擇符合的一位：",
    oldAuthorSelect: "選擇",
    oldAuthorNotMe: "都不是我",
    oldAuthorDone: "✅ 已帶入作者資料，如有需要可直接修改下方欄位。",
    bioLabel: "作者身分",
    bioHint: "可填信仰認同、工作、學歷、或其他身分。例如：約瑟──拿撒勒人、木匠、長老教會會友。",
    bioPh: "例如：拿撒勒人、木匠、長老教會會友",
    emailLabel: "聯絡 Email",
    emailHint: "本刊會以電子信箱回覆是否刊登稿件。",
    firstSubLabel: "是否是初次投稿本刊",
    firstSubYes: "是，這是我第一次投稿",
    firstSubNo: "否，我曾經投稿過",
    introLabel: "作者自介",
    introLabelUpdate: "（更新用，選填）",
    introHint: "約100-150字，會刊登在網站上。若要更新自介亦可填寫，但請在後面附註（更新）。",
    introPh: "請簡介自己的信仰背景與相關經歷（約100-150字）",
    avatarLabel: "作者大頭貼",
    avatarHint: "會刊登在網站上，若要更新亦可上傳。照片可以是本人、教堂、聖像、風景照、卡通人物照、手繪圖，確保圖片版權無虞即可。",
    avatarClick: "點擊上傳大頭貼",
    avatarRemove: "移除圖片",
    titleLabel: "文章標題",
    titlePh: "請填寫文章標題",
    categoryLabel: "投稿類型",
    categoryPh: "請選擇投稿類型",
    summaryLabel: "投稿文章簡介",
    summaryHint: "約100-150字，會刊登在網站上。",
    summaryPh: "請簡介文章主旨（約100-150字）",
    keywordLabel: "文章關鍵字",
    keywordHint: "至多 5 個，輸入後按 Enter 或點「新增」。",
    keywordPh: "輸入關鍵字",
    keywordAdd: "新增",
    keywordMax: "已達 5 個上限",
    notesLabel: "備註",
    notesPh: "如有其他補充事項，請填寫於此（選填）",
    filesLabel: "投稿檔案",
    filesHint: "請同時附上 Word 檔及 PDF 檔。（至少上傳一種）",
    wordLabel: "📄 Word 檔（.docx）",
    pdfLabel: "📑 PDF 檔（.pdf）",
    existingFile: "已上傳原稿",
    existingHint: "（如需更換請選擇新檔案）",
    chooseFile: "選擇檔案",
    replaceFile: "更換檔案",
    reselect: "重新選擇",
    remove: "移除",
    imagesLabel: "文章附圖（選填，可多張）",
    imagesHint: "若文章有附圖，請在此上傳圖片原檔。每張上限 10MB，最多 20 張。上傳後可調整順序。",
    existingImagesTitle: "原有圖片（可調整順序或移除）",
    newImagesTitle: "新增圖片",
    orderLabel: "順序",
    addImage: "＋ 新增圖片",
    submitNew: "送出投稿",
    submitEdit: "送出修改",
    errRequired: "必填",
    errEmailFormat: "Email 格式不正確",
    errFirstSub: "請選擇",
    errAuthorIntro: "初次投稿請填寫作者自介",
    errCategory: "請選擇投稿類型",
    errFiles: "請至少上傳 Word 或 PDF 其中一個",
    uploadingWord: "正在上傳 Word 檔案...",
    parsingWord: "正在解析 Word 內容...",
    uploadingPdf: "正在上傳 PDF 檔案...",
    uploadingImg: (i, total) => `正在上傳圖片 ${i} / ${total}...`,
    uploadingAvatar: "正在上傳大頭貼...",
    savingData: "正在儲存投稿資料...",
    uploadFail: "上傳失敗",
    saveFail: "儲存失敗",
    errGeneric: "發生錯誤，請稍後再試",
    statusLabel: { submitted: "待審核", reviewing: "審核中", accepted: "已接受", rejected: "已拒絕", converted: "已轉文章" },
  },
  "zh-HK": {
    tabNew: "✏️ 新增投稿",
    tabModify: "🔄 修改已投稿",
    lookupTitle: "查詢您嘅投稿記錄",
    lookupHint: "請輸入您投稿時使用嘅姓名（本名或筆名）及 Email，即可查詢並修改稿件。",
    lookupNameLabel: "投稿姓名（本名或筆名）",
    lookupNamePh: "請輸入投稿時嘅姓名",
    lookupEmailLabel: "投稿 Email",
    lookupEmailPh: "請輸入投稿時嘅 Email",
    lookupBtn: "🔍 查詢我嘅投稿",
    lookupBtnLoading: "查詢中...",
    lookupErrEmpty: "請填寫姓名與 Email",
    lookupErrNotFound: "搵唔到符合嘅投稿記錄，請確認姓名（本名或筆名）與 Email 係咪正確。",
    lookupErrFail: "查詢失敗，請稍後再試。",
    resultsTitle: (n) => `搵到 ${n} 筆投稿記錄`,
    resultsBack: "← 重新查詢",
    selectEdit: "選擇修改",
    converted: "已轉文章",
    convertedAlert: "此投稿已轉換為文章，無法修改。",
    loadingData: "載入投稿資料...",
    loadFail: "載入失敗：",
    editingBanner: "🔄 正在修改：",
    cancelEdit: "取消修改",
    successTitleNew: "投稿已送出！",
    successTitleEdit: "修改已送出！",
    successMsgNew: "感謝您嘅投稿，編輯團隊將盡快審閱並以 Email 回覆係咪刊登。",
    successMsgEdit: "您嘅稿件已更新，編輯團隊將盡快重新審閱。",
    submitAgain: "再次投稿",
    backToLookup: "返回查詢",
    submittingTitle: "正在提交中，請稍候⋯",
    errorTitle: "提交失敗",
    backToEdit: "返回修改",
    sectionAuthor: "作者資訊",
    sectionArticle: "文章資訊",
    sectionFiles: "檔案上傳",
    realNameLabel: "作者真實姓名",
    realNameHint: "本刊歡迎使用筆名發表，但投稿時仍請填寫真實姓名，以示自負文責。若使用筆名者，本刊唔會對外透露真實姓名，網站上嘅「專欄作者」區亦會使用筆名顯示。",
    realNamePh: "請填寫真實姓名",
    displayNameLabel: "發表暱稱（筆名）",
    displayNameHint: "若以本名發表者，無須填寫此欄位。",
    displayNamePh: "若以本名發表可留空",
    oldAuthorBtn: "🔍 我係舊作者，帶入資料",
    oldAuthorBtnLoading: "查詢中...",
    oldAuthorHint: "（填寫本名或筆名後可點擊查詢）",
    oldAuthorNoMatch: "搵唔到符合嘅作者記錄，請繼續填寫下方欄位。",
    oldAuthorDismiss: "知道了",
    oldAuthorMatchTitle: "搵到以下作者，請選擇符合嘅一位：",
    oldAuthorSelect: "選擇",
    oldAuthorNotMe: "都唔係我",
    oldAuthorDone: "✅ 已帶入作者資料，如有需要可直接修改下方欄位。",
    bioLabel: "作者身分",
    bioHint: "可填信仰認同、工作、學歷、或其他身分。例如：約瑟──拿撒勒人、木匠、長老教會會友。",
    bioPh: "例如：拿撒勒人、木匠、長老教會會友",
    emailLabel: "聯絡 Email",
    emailHint: "本刊會以電子信箱回覆係咪刊登稿件。",
    firstSubLabel: "係咪初次投稿本刊",
    firstSubYes: "係，呢係我第一次投稿",
    firstSubNo: "唔係，我曾經投稿過",
    introLabel: "作者自介",
    introLabelUpdate: "（更新用，選填）",
    introHint: "約100-150字，會刊登在網站上。若要更新自介亦可填寫，但請在後面附註（更新）。",
    introPh: "請簡介自己嘅信仰背景與相關經歷（約100-150字）",
    avatarLabel: "作者大頭貼",
    avatarHint: "會刊登在網站上，若要更新亦可上傳。",
    avatarClick: "點擊上傳大頭貼",
    avatarRemove: "移除圖片",
    titleLabel: "文章標題",
    titlePh: "請填寫文章標題",
    categoryLabel: "投稿類型",
    categoryPh: "請選擇投稿類型",
    summaryLabel: "投稿文章簡介",
    summaryHint: "約100-150字，會刊登在網站上。",
    summaryPh: "請簡介文章主旨（約100-150字）",
    keywordLabel: "文章關鍵字",
    keywordHint: "至多 5 個，輸入後按 Enter 或點「新增」。",
    keywordPh: "輸入關鍵字",
    keywordAdd: "新增",
    keywordMax: "已達 5 個上限",
    notesLabel: "備註",
    notesPh: "如有其他補充事項，請填寫於此（選填）",
    filesLabel: "投稿檔案",
    filesHint: "請同時附上 Word 檔及 PDF 檔。（至少上傳一種）",
    wordLabel: "📄 Word 檔（.docx）",
    pdfLabel: "📑 PDF 檔（.pdf）",
    existingFile: "已上傳原稿",
    existingHint: "（如需更換請選擇新檔案）",
    chooseFile: "選擇檔案",
    replaceFile: "更換檔案",
    reselect: "重新選擇",
    remove: "移除",
    imagesLabel: "文章附圖（選填，可多張）",
    imagesHint: "若文章有附圖，請在此上傳圖片原檔。每張上限 10MB，最多 20 張。上傳後可調整順序。",
    existingImagesTitle: "原有圖片（可調整順序或移除）",
    newImagesTitle: "新增圖片",
    orderLabel: "順序",
    addImage: "＋ 新增圖片",
    submitNew: "送出投稿",
    submitEdit: "送出修改",
    errRequired: "必填",
    errEmailFormat: "Email 格式不正確",
    errFirstSub: "請選擇",
    errAuthorIntro: "初次投稿請填寫作者自介",
    errCategory: "請選擇投稿類型",
    errFiles: "請至少上傳 Word 或 PDF 其中一個",
    uploadingWord: "正在上傳 Word 檔案...",
    parsingWord: "正在解析 Word 內容...",
    uploadingPdf: "正在上傳 PDF 檔案...",
    uploadingImg: (i, total) => `正在上傳圖片 ${i} / ${total}...`,
    uploadingAvatar: "正在上傳大頭貼...",
    savingData: "正在儲存投稿資料...",
    uploadFail: "上傳失敗",
    saveFail: "儲存失敗",
    errGeneric: "發生錯誤，請稍後再試",
    statusLabel: { submitted: "待審核", reviewing: "審核中", accepted: "已接受", rejected: "已拒絕", converted: "已轉文章" },
  },
  "zh-CN": {
    tabNew: "✏️ 新增投稿",
    tabModify: "🔄 修改已投稿",
    lookupTitle: "查询您的投稿记录",
    lookupHint: "请输入您投稿时使用的姓名（真实姓名或笔名）及 Email，即可查询并修改稿件。",
    lookupNameLabel: "投稿姓名（真实姓名或笔名）",
    lookupNamePh: "请输入投稿时的姓名",
    lookupEmailLabel: "投稿 Email",
    lookupEmailPh: "请输入投稿时的 Email",
    lookupBtn: "🔍 查询我的投稿",
    lookupBtnLoading: "查询中...",
    lookupErrEmpty: "请填写姓名与 Email",
    lookupErrNotFound: "未找到符合的投稿记录，请确认姓名（真实姓名或笔名）与 Email 是否正确。",
    lookupErrFail: "查询失败，请稍后再试。",
    resultsTitle: (n) => `找到 ${n} 条投稿记录`,
    resultsBack: "← 重新查询",
    selectEdit: "选择修改",
    converted: "已转文章",
    convertedAlert: "此投稿已转换为文章，无法修改。",
    loadingData: "正在加载投稿资料...",
    loadFail: "加载失败：",
    editingBanner: "🔄 正在修改：",
    cancelEdit: "取消修改",
    successTitleNew: "投稿已提交！",
    successTitleEdit: "修改已提交！",
    successMsgNew: "感谢您的投稿，编辑团队将尽快审阅并以 Email 回复是否刊登。",
    successMsgEdit: "您的稿件已更新，编辑团队将尽快重新审阅。",
    submitAgain: "再次投稿",
    backToLookup: "返回查询",
    submittingTitle: "正在提交中，请稍候⋯",
    errorTitle: "提交失败",
    backToEdit: "返回修改",
    sectionAuthor: "作者信息",
    sectionArticle: "文章信息",
    sectionFiles: "文件上传",
    realNameLabel: "作者真实姓名",
    realNameHint: "本刊欢迎使用笔名发表，但投稿时仍请填写真实姓名，以示自负文责。若使用笔名者，本刊不会对外透露真实姓名。",
    realNamePh: "请填写真实姓名",
    displayNameLabel: "发表笔名",
    displayNameHint: "若以本名发表者，无须填写此栏位。",
    displayNamePh: "若以本名发表可留空",
    oldAuthorBtn: "🔍 我是老作者，导入资料",
    oldAuthorBtnLoading: "查询中...",
    oldAuthorHint: "（填写本名或笔名后可点击查询）",
    oldAuthorNoMatch: "未找到符合的作者记录，请继续填写下方栏位。",
    oldAuthorDismiss: "知道了",
    oldAuthorMatchTitle: "找到以下作者，请选择符合的一位：",
    oldAuthorSelect: "选择",
    oldAuthorNotMe: "都不是我",
    oldAuthorDone: "✅ 已导入作者资料，如有需要可直接修改下方栏位。",
    bioLabel: "作者身份",
    bioHint: "可填信仰认同、工作、学历或其他身份。例如：约瑟──拿撒勒人、木匠、长老教会会友。",
    bioPh: "例如：拿撒勒人、木匠、长老教会会友",
    emailLabel: "联系 Email",
    emailHint: "本刊会以电子邮件回复是否刊登稿件。",
    firstSubLabel: "是否是初次投稿本刊",
    firstSubYes: "是，这是我第一次投稿",
    firstSubNo: "否，我曾经投稿过",
    introLabel: "作者自介",
    introLabelUpdate: "（更新用，选填）",
    introHint: "约100-150字，会刊登在网站上。若要更新自介亦可填写，但请在后面附注（更新）。",
    introPh: "请简介自己的信仰背景与相关经历（约100-150字）",
    avatarLabel: "作者头像",
    avatarHint: "会刊登在网站上，若要更新亦可上传。",
    avatarClick: "点击上传头像",
    avatarRemove: "移除图片",
    titleLabel: "文章标题",
    titlePh: "请填写文章标题",
    categoryLabel: "投稿类型",
    categoryPh: "请选择投稿类型",
    summaryLabel: "投稿文章简介",
    summaryHint: "约100-150字，会刊登在网站上。",
    summaryPh: "请简介文章主旨（约100-150字）",
    keywordLabel: "文章关键字",
    keywordHint: "至多 5 个，输入后按 Enter 或点「添加」。",
    keywordPh: "输入关键字",
    keywordAdd: "添加",
    keywordMax: "已达 5 个上限",
    notesLabel: "备注",
    notesPh: "如有其他补充事项，请填写于此（选填）",
    filesLabel: "投稿文件",
    filesHint: "请同时附上 Word 文件及 PDF 文件。（至少上传一种）",
    wordLabel: "📄 Word 文件（.docx）",
    pdfLabel: "📑 PDF 文件（.pdf）",
    existingFile: "已上传原稿",
    existingHint: "（如需更换请选择新文件）",
    chooseFile: "选择文件",
    replaceFile: "更换文件",
    reselect: "重新选择",
    remove: "移除",
    imagesLabel: "文章附图（选填，可多张）",
    imagesHint: "若文章有附图，请在此上传图片原文件。每张上限 10MB，最多 20 张。上传后可调整顺序。",
    existingImagesTitle: "原有图片（可调整顺序或移除）",
    newImagesTitle: "新增图片",
    orderLabel: "顺序",
    addImage: "＋ 新增图片",
    submitNew: "提交投稿",
    submitEdit: "提交修改",
    errRequired: "必填",
    errEmailFormat: "Email 格式不正确",
    errFirstSub: "请选择",
    errAuthorIntro: "初次投稿请填写作者自介",
    errCategory: "请选择投稿类型",
    errFiles: "请至少上传 Word 或 PDF 其中一个",
    uploadingWord: "正在上传 Word 文件...",
    parsingWord: "正在解析 Word 内容...",
    uploadingPdf: "正在上传 PDF 文件...",
    uploadingImg: (i, total) => `正在上传图片 ${i} / ${total}...`,
    uploadingAvatar: "正在上传头像...",
    savingData: "正在保存投稿资料...",
    uploadFail: "上传失败",
    saveFail: "保存失败",
    errGeneric: "发生错误，请稍后再试",
    statusLabel: { submitted: "待审核", reviewing: "审核中", accepted: "已接受", rejected: "已拒绝", converted: "已转文章" },
  },
  en: {
    tabNew: "✏️ New Submission",
    tabModify: "🔄 Edit Submission",
    lookupTitle: "Look up your submission",
    lookupHint: "Enter the name (real name or pen name) and email you used when submitting to find and edit your submission.",
    lookupNameLabel: "Name used (real name or pen name)",
    lookupNamePh: "Enter the name you submitted with",
    lookupEmailLabel: "Email used",
    lookupEmailPh: "Enter the email you submitted with",
    lookupBtn: "🔍 Find my submission",
    lookupBtnLoading: "Searching...",
    lookupErrEmpty: "Please enter your name and email",
    lookupErrNotFound: "No matching submission found. Please check your name (real name or pen name) and email.",
    lookupErrFail: "Search failed. Please try again later.",
    resultsTitle: (n) => `Found ${n} submission${n === 1 ? "" : "s"}`,
    resultsBack: "← Search again",
    selectEdit: "Edit",
    converted: "Published",
    convertedAlert: "This submission has been converted to an article and cannot be edited.",
    loadingData: "Loading submission data...",
    loadFail: "Load failed: ",
    editingBanner: "🔄 Editing: ",
    cancelEdit: "Cancel editing",
    successTitleNew: "Submission sent!",
    successTitleEdit: "Edit submitted!",
    successMsgNew: "Thank you for your submission. The editorial team will review it and reply by email.",
    successMsgEdit: "Your submission has been updated. The editorial team will review it again shortly.",
    submitAgain: "Submit again",
    backToLookup: "Back to search",
    submittingTitle: "Submitting, please wait⋯",
    errorTitle: "Submission failed",
    backToEdit: "Go back",
    sectionAuthor: "Author Information",
    sectionArticle: "Article Information",
    sectionFiles: "File Upload",
    realNameLabel: "Author's real name",
    realNameHint: "Pen names are welcome, but please provide your real name when submitting to acknowledge authorial responsibility. If you use a pen name, it will be displayed on the site instead of your real name.",
    realNamePh: "Enter your real name",
    displayNameLabel: "Pen name (display name)",
    displayNameHint: "Leave blank if publishing under your real name.",
    displayNamePh: "Leave blank to publish under your real name",
    oldAuthorBtn: "🔍 I'm a returning author — import my info",
    oldAuthorBtnLoading: "Searching...",
    oldAuthorHint: "(Enter your name first, then click to search)",
    oldAuthorNoMatch: "No matching author found. Please continue filling in the fields below.",
    oldAuthorDismiss: "Got it",
    oldAuthorMatchTitle: "Found the following authors. Please select the matching one:",
    oldAuthorSelect: "Select",
    oldAuthorNotMe: "None of these",
    oldAuthorDone: "✅ Author info imported. You may edit the fields below as needed.",
    bioLabel: "Author identity",
    bioHint: "May include faith affiliation, occupation, education, or other identity. e.g. Joseph — Nazarene, carpenter, Presbyterian church member.",
    bioPh: "e.g. Nazarene, carpenter, Presbyterian church member",
    emailLabel: "Contact email",
    emailHint: "We will email you our decision regarding your submission.",
    firstSubLabel: "Is this your first submission to this publication?",
    firstSubYes: "Yes, this is my first submission",
    firstSubNo: "No, I have submitted before",
    introLabel: "Author bio",
    introLabelUpdate: "(for update, optional)",
    introHint: "About 100–150 words, to be published on the website. You may also update your bio here — please add '(update)' at the end.",
    introPh: "Brief description of your faith background and relevant experience (approx. 100–150 words)",
    avatarLabel: "Author photo",
    avatarHint: "To be published on the website. You may upload a portrait, church photo, icon, landscape, cartoon, or illustration — please ensure you have rights to the image.",
    avatarClick: "Click to upload photo",
    avatarRemove: "Remove image",
    titleLabel: "Article title",
    titlePh: "Enter the article title",
    categoryLabel: "Submission type",
    categoryPh: "Select a submission type",
    summaryLabel: "Article summary",
    summaryHint: "About 100–150 words, to be published on the website.",
    summaryPh: "Brief summary of the article (approx. 100–150 words)",
    keywordLabel: "Keywords",
    keywordHint: "Up to 5 keywords. Press Enter or click 'Add' after each.",
    keywordPh: "Enter a keyword",
    keywordAdd: "Add",
    keywordMax: "Maximum of 5 reached",
    notesLabel: "Notes",
    notesPh: "Any additional notes (optional)",
    filesLabel: "Submission files",
    filesHint: "Please upload both a Word file and a PDF file. (At least one is required.)",
    wordLabel: "📄 Word file (.docx)",
    pdfLabel: "📑 PDF file (.pdf)",
    existingFile: "Previously uploaded",
    existingHint: "(Select a new file to replace)",
    chooseFile: "Choose file",
    replaceFile: "Replace file",
    reselect: "Reselect",
    remove: "Remove",
    imagesLabel: "Article images (optional, multiple allowed)",
    imagesHint: "Upload original image files if your article includes images. Max 10MB per image, up to 20 images. You can reorder after uploading.",
    existingImagesTitle: "Existing images (reorder or remove)",
    newImagesTitle: "New images",
    orderLabel: "Order",
    addImage: "＋ Add image",
    submitNew: "Submit",
    submitEdit: "Submit changes",
    errRequired: "Required",
    errEmailFormat: "Invalid email format",
    errFirstSub: "Please select",
    errAuthorIntro: "First-time submitters must provide an author bio",
    errCategory: "Please select a submission type",
    errFiles: "Please upload at least one Word or PDF file",
    uploadingWord: "Uploading Word file...",
    parsingWord: "Parsing Word content...",
    uploadingPdf: "Uploading PDF file...",
    uploadingImg: (i, total) => `Uploading image ${i} / ${total}...`,
    uploadingAvatar: "Uploading author photo...",
    savingData: "Saving submission data...",
    uploadFail: "Upload failed",
    saveFail: "Save failed",
    errGeneric: "An error occurred. Please try again later.",
    statusLabel: { submitted: "Pending", reviewing: "Under review", accepted: "Accepted", rejected: "Rejected", converted: "Published" },
  },
  ja: {
    tabNew: "✏️ 新規投稿",
    tabModify: "🔄 投稿を修正",
    lookupTitle: "投稿記録の検索",
    lookupHint: "投稿時に使用した氏名（本名またはペンネーム）とメールアドレスを入力して、投稿を検索・修正できます。",
    lookupNameLabel: "投稿時の氏名（本名またはペンネーム）",
    lookupNamePh: "投稿時の氏名を入力してください",
    lookupEmailLabel: "投稿時のメールアドレス",
    lookupEmailPh: "投稿時のメールアドレスを入力してください",
    lookupBtn: "🔍 投稿を検索する",
    lookupBtnLoading: "検索中...",
    lookupErrEmpty: "氏名とメールアドレスを入力してください",
    lookupErrNotFound: "一致する投稿記録が見つかりません。氏名（本名またはペンネーム）とメールアドレスを確認してください。",
    lookupErrFail: "検索に失敗しました。しばらくしてから再試行してください。",
    resultsTitle: (n) => `${n} 件の投稿記録が見つかりました`,
    resultsBack: "← 再検索",
    selectEdit: "修正する",
    converted: "掲載済み",
    convertedAlert: "この投稿はすでに記事に変換されており、修正できません。",
    loadingData: "投稿データを読み込み中...",
    loadFail: "読み込み失敗：",
    editingBanner: "🔄 修正中：",
    cancelEdit: "修正をキャンセル",
    successTitleNew: "投稿が送信されました！",
    successTitleEdit: "修正が送信されました！",
    successMsgNew: "ご投稿ありがとうございます。編集チームが審査し、掲載可否をメールでご連絡します。",
    successMsgEdit: "原稿が更新されました。編集チームが改めて審査いたします。",
    submitAgain: "再度投稿する",
    backToLookup: "検索に戻る",
    submittingTitle: "送信中、しばらくお待ちください⋯",
    errorTitle: "送信に失敗しました",
    backToEdit: "戻る",
    sectionAuthor: "著者情報",
    sectionArticle: "記事情報",
    sectionFiles: "ファイルアップロード",
    realNameLabel: "著者の本名",
    realNameHint: "ペンネームでの投稿を歓迎しますが、投稿時は本名を記入してください。ペンネームを使用する場合、サイト上では本名は公開されません。",
    realNamePh: "本名を入力してください",
    displayNameLabel: "ペンネーム（表示名）",
    displayNameHint: "本名で投稿する場合は空欄のままにしてください。",
    displayNamePh: "本名で投稿する場合は空欄",
    oldAuthorBtn: "🔍 既存の著者として情報を取り込む",
    oldAuthorBtnLoading: "検索中...",
    oldAuthorHint: "（本名またはペンネームを入力後にクリック）",
    oldAuthorNoMatch: "一致する著者記録が見つかりません。下のフィールドに入力を続けてください。",
    oldAuthorDismiss: "わかりました",
    oldAuthorMatchTitle: "以下の著者が見つかりました。該当する方を選択してください：",
    oldAuthorSelect: "選択",
    oldAuthorNotMe: "該当なし",
    oldAuthorDone: "✅ 著者情報を取り込みました。必要に応じて下のフィールドを編集してください。",
    bioLabel: "著者の属性",
    bioHint: "信仰の背景、職業、学歴などを記入できます。例：ヨセフ──ナザレ人、大工、長老教会員。",
    bioPh: "例：ナザレ人、大工、長老教会員",
    emailLabel: "連絡先メールアドレス",
    emailHint: "掲載可否をこのアドレスにメールでお知らせします。",
    firstSubLabel: "本誌への投稿は初めてですか？",
    firstSubYes: "はい、初めての投稿です",
    firstSubNo: "いいえ、以前に投稿したことがあります",
    introLabel: "著者プロフィール",
    introLabelUpdate: "（更新用、任意）",
    introHint: "約100〜150字、ウェブサイトに掲載されます。更新する場合は末尾に「（更新）」と付記してください。",
    introPh: "信仰の背景と関連経験を簡単に紹介してください（約100〜150字）",
    avatarLabel: "著者写真",
    avatarHint: "ウェブサイトに掲載されます。人物写真、教会、聖像、風景、イラストなど可。著作権にご注意ください。",
    avatarClick: "クリックして写真をアップロード",
    avatarRemove: "画像を削除",
    titleLabel: "記事タイトル",
    titlePh: "記事タイトルを入力してください",
    categoryLabel: "投稿カテゴリー",
    categoryPh: "カテゴリーを選択してください",
    summaryLabel: "記事概要",
    summaryHint: "約100〜150字、ウェブサイトに掲載されます。",
    summaryPh: "記事の主旨を簡潔に説明してください（約100〜150字）",
    keywordLabel: "キーワード",
    keywordHint: "最大5個まで。入力後 Enter または「追加」をクリック。",
    keywordPh: "キーワードを入力",
    keywordAdd: "追加",
    keywordMax: "上限の5個に達しました",
    notesLabel: "備考",
    notesPh: "その他の補足事項があればご記入ください（任意）",
    filesLabel: "投稿ファイル",
    filesHint: "Word ファイルと PDF ファイルの両方を添付してください。（少なくとも一方は必須）",
    wordLabel: "📄 Word ファイル（.docx）",
    pdfLabel: "📑 PDF ファイル（.pdf）",
    existingFile: "アップロード済み",
    existingHint: "（差し替える場合は新しいファイルを選択）",
    chooseFile: "ファイルを選択",
    replaceFile: "ファイルを差し替え",
    reselect: "再選択",
    remove: "削除",
    imagesLabel: "記事画像（任意、複数可）",
    imagesHint: "記事に画像がある場合は元のファイルをアップロードしてください。1枚最大10MB、最大20枚。アップロード後に順序を変更できます。",
    existingImagesTitle: "既存の画像（順序変更・削除可）",
    newImagesTitle: "新規画像",
    orderLabel: "順序",
    addImage: "＋ 画像を追加",
    submitNew: "投稿する",
    submitEdit: "修正を送信",
    errRequired: "必須",
    errEmailFormat: "メールアドレスの形式が正しくありません",
    errFirstSub: "選択してください",
    errAuthorIntro: "初めて投稿する場合は著者プロフィールが必要です",
    errCategory: "カテゴリーを選択してください",
    errFiles: "Word または PDF ファイルを少なくとも1つアップロードしてください",
    uploadingWord: "Word ファイルをアップロード中...",
    parsingWord: "Word の内容を解析中...",
    uploadingPdf: "PDF ファイルをアップロード中...",
    uploadingImg: (i, total) => `画像 ${i} / ${total} をアップロード中...`,
    uploadingAvatar: "著者写真をアップロード中...",
    savingData: "投稿データを保存中...",
    uploadFail: "アップロードに失敗しました",
    saveFail: "保存に失敗しました",
    errGeneric: "エラーが発生しました。しばらくしてから再試行してください。",
    statusLabel: { submitted: "審査待ち", reviewing: "審査中", accepted: "採用", rejected: "不採用", converted: "掲載済み" },
  },
  ko: {
    tabNew: "✏️ 새 투고",
    tabModify: "🔄 투고 수정",
    lookupTitle: "투고 기록 조회",
    lookupHint: "투고 시 사용한 이름（본명 또는 필명）과 이메일을 입력하면 투고 내용을 조회하고 수정할 수 있습니다.",
    lookupNameLabel: "투고 시 이름（본명 또는 필명）",
    lookupNamePh: "투고 시 사용한 이름을 입력해 주세요",
    lookupEmailLabel: "투고 시 이메일",
    lookupEmailPh: "투고 시 사용한 이메일을 입력해 주세요",
    lookupBtn: "🔍 내 투고 찾기",
    lookupBtnLoading: "조회 중...",
    lookupErrEmpty: "이름과 이메일을 입력해 주세요",
    lookupErrNotFound: "일치하는 투고 기록을 찾을 수 없습니다. 이름（본명 또는 필명）과 이메일을 확인해 주세요.",
    lookupErrFail: "조회에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    resultsTitle: (n) => `투고 기록 ${n}건을 찾았습니다`,
    resultsBack: "← 다시 조회",
    selectEdit: "수정 선택",
    converted: "게재 완료",
    convertedAlert: "이 투고는 이미 문서로 변환되어 수정할 수 없습니다.",
    loadingData: "투고 데이터를 불러오는 중...",
    loadFail: "불러오기 실패: ",
    editingBanner: "🔄 수정 중: ",
    cancelEdit: "수정 취소",
    successTitleNew: "투고가 전송되었습니다！",
    successTitleEdit: "수정이 전송되었습니다！",
    successMsgNew: "투고해 주셔서 감사합니다. 편집팀이 검토 후 이메일로 게재 여부를 알려드리겠습니다.",
    successMsgEdit: "원고가 업데이트되었습니다. 편집팀이 다시 검토하겠습니다.",
    submitAgain: "다시 투고하기",
    backToLookup: "조회로 돌아가기",
    submittingTitle: "제출 중, 잠시 기다려 주세요⋯",
    errorTitle: "제출 실패",
    backToEdit: "돌아가기",
    sectionAuthor: "저자 정보",
    sectionArticle: "원고 정보",
    sectionFiles: "파일 업로드",
    realNameLabel: "저자 실명",
    realNameHint: "필명 투고를 환영하지만, 투고 시에는 실명을 기재해 주세요. 필명을 사용하는 경우 실명은 외부에 공개되지 않습니다.",
    realNamePh: "실명을 입력해 주세요",
    displayNameLabel: "필명（표시 이름）",
    displayNameHint: "본명으로 투고하는 경우 비워 두세요.",
    displayNamePh: "본명으로 투고 시 비워 두세요",
    oldAuthorBtn: "🔍 기존 저자입니다 — 정보 불러오기",
    oldAuthorBtnLoading: "조회 중...",
    oldAuthorHint: "（본명 또는 필명 입력 후 클릭）",
    oldAuthorNoMatch: "일치하는 저자 기록을 찾을 수 없습니다. 아래 필드를 계속 작성해 주세요.",
    oldAuthorDismiss: "알겠습니다",
    oldAuthorMatchTitle: "다음 저자를 찾았습니다. 해당하는 분을 선택해 주세요:",
    oldAuthorSelect: "선택",
    oldAuthorNotMe: "해당 없음",
    oldAuthorDone: "✅ 저자 정보를 불러왔습니다. 필요에 따라 아래 필드를 수정해 주세요.",
    bioLabel: "저자 정체성",
    bioHint: "신앙 정체성, 직업, 학력 등을 기재할 수 있습니다. 예: 요셉──나사렛 사람, 목수, 장로교 교인.",
    bioPh: "예: 나사렛 사람, 목수, 장로교 교인",
    emailLabel: "연락처 이메일",
    emailHint: "게재 여부를 이 이메일로 알려드립니다.",
    firstSubLabel: "이 잡지에 처음 투고하시나요？",
    firstSubYes: "예, 처음 투고합니다",
    firstSubNo: "아니요, 이전에 투고한 적이 있습니다",
    introLabel: "저자 소개",
    introLabelUpdate: "（업데이트용, 선택）",
    introHint: "약 100-150자, 웹사이트에 게재됩니다. 소개를 업데이트하려면 끝에 '（업데이트）'를 붙여주세요.",
    introPh: "신앙 배경과 관련 경험을 간략히 소개해 주세요（약 100-150자）",
    avatarLabel: "저자 사진",
    avatarHint: "웹사이트에 게재됩니다. 인물 사진, 교회, 성상, 풍경, 일러스트 등 가능 — 저작권이 있는 이미지를 사용해 주세요.",
    avatarClick: "클릭하여 사진 업로드",
    avatarRemove: "이미지 제거",
    titleLabel: "원고 제목",
    titlePh: "원고 제목을 입력해 주세요",
    categoryLabel: "투고 유형",
    categoryPh: "투고 유형을 선택해 주세요",
    summaryLabel: "원고 요약",
    summaryHint: "약 100-150자, 웹사이트에 게재됩니다.",
    summaryPh: "원고의 주제를 간략히 요약해 주세요（약 100-150자）",
    keywordLabel: "키워드",
    keywordHint: "최대 5개. 입력 후 Enter 또는 '추가' 클릭.",
    keywordPh: "키워드 입력",
    keywordAdd: "추가",
    keywordMax: "최대 5개에 도달했습니다",
    notesLabel: "비고",
    notesPh: "추가 사항이 있으면 여기에 기재해 주세요（선택）",
    filesLabel: "투고 파일",
    filesHint: "Word 파일과 PDF 파일을 모두 첨부해 주세요. （최소 하나 필수）",
    wordLabel: "📄 Word 파일（.docx）",
    pdfLabel: "📑 PDF 파일（.pdf）",
    existingFile: "업로드된 원고",
    existingHint: "（교체하려면 새 파일을 선택하세요）",
    chooseFile: "파일 선택",
    replaceFile: "파일 교체",
    reselect: "다시 선택",
    remove: "제거",
    imagesLabel: "원고 이미지（선택, 여러 장 가능）",
    imagesHint: "원고에 이미지가 있으면 원본 파일을 업로드해 주세요. 장당 최대 10MB, 최대 20장. 업로드 후 순서 조정 가능.",
    existingImagesTitle: "기존 이미지（순서 변경 또는 제거 가능）",
    newImagesTitle: "새 이미지",
    orderLabel: "순서",
    addImage: "＋ 이미지 추가",
    submitNew: "투고 제출",
    submitEdit: "수정 제출",
    errRequired: "필수",
    errEmailFormat: "이메일 형식이 올바르지 않습니다",
    errFirstSub: "선택해 주세요",
    errAuthorIntro: "처음 투고하는 경우 저자 소개가 필요합니다",
    errCategory: "투고 유형을 선택해 주세요",
    errFiles: "Word 또는 PDF 파일을 최소 하나 업로드해 주세요",
    uploadingWord: "Word 파일 업로드 중...",
    parsingWord: "Word 내용 분석 중...",
    uploadingPdf: "PDF 파일 업로드 중...",
    uploadingImg: (i, total) => `이미지 ${i} / ${total} 업로드 중...`,
    uploadingAvatar: "저자 사진 업로드 중...",
    savingData: "투고 데이터 저장 중...",
    uploadFail: "업로드 실패",
    saveFail: "저장 실패",
    errGeneric: "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    statusLabel: { submitted: "검토 대기", reviewing: "검토 중", accepted: "채택", rejected: "거절", converted: "게재 완료" },
  },
};

const t = computed(() => i18n[currentLang.value] || i18n["zh-TW"]);

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

const statusColor = { submitted: "#e67e22", reviewing: "#2980b9", accepted: "#27ae60", rejected: "#c0392b", converted: "#8e44ad" };

const doLookup = async () => {
  lookupError.value = "";
  if (!lookupName.value.trim() || !lookupEmail.value.trim()) {
    lookupError.value = t.value.lookupErrEmpty;
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
      lookupError.value = t.value.lookupErrNotFound;
    else
      step.value = "results";
  } catch {
    lookupError.value = t.value.lookupErrFail;
  } finally {
    lookupLoading.value = false;
  }
};

const selectForEdit = async (sub) => {
  if (sub.status === "converted") {
    alert(t.value.convertedAlert);
    return;
  }
  step.value = "submitting";
  submitProgress.value = t.value.loadingData;
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
    alert(t.value.loadFail + (err.message || t.value.errGeneric));
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
  "時事評論", "文藝創作", "公告與剪影", "文獻與翻譯",
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
  if (!form.value.real_name.trim()) e.real_name = t.value.errRequired;
  if (!form.value.author_bio.trim()) e.author_bio = t.value.errRequired;
  if (!form.value.email.trim()) e.email = t.value.errRequired;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) e.email = t.value.errEmailFormat;
  if (form.value.is_first_submission === null) e.is_first_submission = t.value.errFirstSub;
  if (form.value.is_first_submission && !form.value.author_intro.trim()) e.author_intro = t.value.errAuthorIntro;
  if (!form.value.title.trim()) e.title = t.value.errRequired;
  if (!form.value.category) e.category = t.value.errCategory;
  if (!form.value.article_summary.trim()) e.article_summary = t.value.errRequired;
  // 新投稿必須要有檔案；修改模式可以保留既有檔案
  const hasFile = wordFile.value || pdfFile.value || existingWordUrl.value || existingPdfUrl.value;
  if (!hasFile) e.files = t.value.errFiles;
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
  if (!res.success) throw new Error(res.error || t.value.uploadFail);
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
      submitProgress.value = t.value.uploadingWord;
      wordUrl = await uploadFile(wordFile.value, folder);
      submitProgress.value = t.value.parsingWord;
      parsedHtml = await parseWord(wordFile.value);
    }

    // 決定 PDF URL
    let pdfUrl = existingPdfUrl.value;
    if (pdfFile.value) {
      submitProgress.value = t.value.uploadingPdf;
      pdfUrl = await uploadFile(pdfFile.value, folder);
    }

    // 圖片：既有 + 新上傳，合併後排序
    const uploadedNewImages = [];
    if (imageFiles.value.length > 0) {
      const imgFolder = `${folder}/images`;
      for (let i = 0; i < imageFiles.value.length; i++) {
        submitProgress.value = t.value.uploadingImg(i + 1, imageFiles.value.length);
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
      submitProgress.value = t.value.uploadingAvatar;
      avatarUrl = await uploadFile(avatarFile.value, "images/authors");
    }

    submitProgress.value = t.value.savingData;
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

    if (!res.success) throw new Error(t.value.saveFail);
    step.value = "success";
  } catch (err) {
    errorMsg.value = err.message || t.value.errGeneric;
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
      <button :class="['mode-tab', { active: pageMode === 'new' }]" @click="switchMode('new')">{{ t.tabNew }}</button>
      <button :class="['mode-tab', { active: pageMode === 'modify' }]" @click="switchMode('modify')">{{ t.tabModify }}</button>
    </div>

    <!-- ════════════════════════════════════════════════════════
         ── 修改模式：查詢畫面 ─────────────────────────────── -->
    <div v-if="pageMode === 'modify' && step === 'lookup'" class="lookup-box">
      <h3>{{ t.lookupTitle }}</h3>
      <p class="lookup-hint">{{ t.lookupHint }}</p>
      <div class="lookup-fields">
        <div class="lookup-field">
          <label>{{ t.lookupNameLabel }}</label>
          <input v-model="lookupName" type="text" :placeholder="t.lookupNamePh" @keydown.enter="doLookup" />
        </div>
        <div class="lookup-field">
          <label>{{ t.lookupEmailLabel }}</label>
          <input v-model="lookupEmail" type="email" :placeholder="t.lookupEmailPh" @keydown.enter="doLookup" />
        </div>
      </div>
      <p v-if="lookupError" class="lookup-error">{{ lookupError }}</p>
      <button class="btn-lookup" :disabled="lookupLoading" @click="doLookup">
        {{ lookupLoading ? t.lookupBtnLoading : t.lookupBtn }}
      </button>
    </div>

    <!-- ── 修改模式：結果列表 ──────────────────────────────── -->
    <div v-else-if="pageMode === 'modify' && step === 'results'" class="results-box">
      <div class="results-header">
        <h3>{{ t.resultsTitle(lookupResults.length) }}</h3>
        <button class="btn-back" @click="step = 'lookup'">{{ t.resultsBack }}</button>
      </div>
      <div class="result-list">
        <div v-for="sub in lookupResults" :key="sub.id" class="result-item">
          <div class="result-info">
            <div class="result-title">{{ sub.title }}</div>
            <div class="result-meta">
              <span class="tag-cat">{{ sub.category }}</span>
              <span v-if="sub.issue_number" class="result-issue">Vol.{{ sub.issue_number }}</span>
              <span class="result-date">{{ formatDate(sub.created_at) }}</span>
              <span class="status-dot" :style="{ background: statusColor[sub.status] }">{{ t.statusLabel[sub.status] }}</span>
            </div>
          </div>
          <button
            v-if="sub.status !== 'converted'"
            class="btn-select-edit"
            @click="selectForEdit(sub)"
          >{{ t.selectEdit }}</button>
          <span v-else class="converted-note">{{ t.converted }}</span>
        </div>
      </div>
    </div>

    <!-- ── 修改中 banner ────────────────────────────────────── -->
    <div v-if="step === 'editing'" class="editing-banner">
      <span>{{ t.editingBanner }}<strong>{{ editingTitle }}</strong></span>
      <button class="btn-cancel-edit" @click="step = 'results'">{{ t.cancelEdit }}</button>
    </div>

    <!-- ════════════════════════════════════════════════════════
         ── 結果畫面 ────────────────────────────────────────── -->
    <div v-if="step === 'success'" class="result-box success">
      <div class="result-icon">✅</div>
      <h3>{{ editingId ? t.successTitleEdit : t.successTitleNew }}</h3>
      <p>{{ editingId ? t.successMsgEdit : t.successMsgNew }}</p>
      <button class="btn-secondary" @click="resetForm(); step = pageMode === 'new' ? 'form' : 'lookup'">
        {{ pageMode === 'new' ? t.submitAgain : t.backToLookup }}
      </button>
    </div>

    <div v-else-if="step === 'submitting'" class="result-box submitting">
      <div class="spinner"></div>
      <h3>{{ t.submittingTitle }}</h3>
      <p class="progress-msg">{{ submitProgress }}</p>
    </div>

    <div v-else-if="step === 'error'" class="result-box error">
      <div class="result-icon">❌</div>
      <h3>{{ t.errorTitle }}</h3>
      <p>{{ errorMsg }}</p>
      <button class="btn-secondary" @click="step = editingId ? 'editing' : 'form'">{{ t.backToEdit }}</button>
    </div>

    <!-- ════════════════════════════════════════════════════════
         ── 投稿表單主體（新增 or 修改時共用） ────────────── -->
    <form v-else-if="isFormStep(step)" @submit.prevent="handleSubmit" novalidate>

      <!-- ■ 作者資訊 -->
      <div class="form-section">
        <h3 class="section-title">{{ t.sectionAuthor }}</h3>

        <div class="field" :class="{ 'has-error': errors.real_name }">
          <label>{{ t.realNameLabel }} <span class="required">*</span></label>
          <p class="field-hint">{{ t.realNameHint }}</p>
          <input v-model="form.real_name" type="text" :placeholder="t.realNamePh" />
          <span v-if="errors.real_name" class="field-error">{{ errors.real_name }}</span>
        </div>

        <div class="field">
          <label>{{ t.displayNameLabel }}</label>
          <p class="field-hint">{{ t.displayNameHint }}</p>
          <input v-model="form.display_name" type="text" :placeholder="t.displayNamePh" />
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
              {{ oldAuthorLoading ? t.oldAuthorBtnLoading : t.oldAuthorBtn }}
            </button>
            <span class="old-author-hint-inline">{{ t.oldAuthorHint }}</span>
          </div>

          <!-- 查無結果 -->
          <div v-if="oldAuthorSearched && !oldAuthorLoading && oldAuthorMatches.length === 0 && !oldAuthorDone" class="old-author-no-match">
            {{ t.oldAuthorNoMatch }}
            <button type="button" class="btn-dismiss-old" @click="oldAuthorDone = true">{{ t.oldAuthorDismiss }}</button>
          </div>

          <!-- 有符合結果 -->
          <div v-if="oldAuthorMatches.length > 0" class="old-author-matches">
            <p class="old-author-match-title">{{ t.oldAuthorMatchTitle }}</p>
            <div v-for="author in oldAuthorMatches" :key="author.name" class="old-author-item">
              <img v-if="author.author_image" :src="author.author_image" class="old-author-thumb" />
              <div v-else class="old-author-thumb-placeholder">👤</div>
              <div class="old-author-info">
                <div class="old-author-name">{{ author.name }}</div>
                <div v-if="author.bio" class="old-author-bio">{{ author.bio.slice(0, 60) }}{{ author.bio.length > 60 ? '…' : '' }}</div>
              </div>
              <button type="button" class="btn-select-author" @click="selectOldAuthor(author)">{{ t.oldAuthorSelect }}</button>
            </div>
            <button type="button" class="btn-dismiss-old" @click="dismissOldAuthor">{{ t.oldAuthorNotMe }}</button>
          </div>

          <!-- 已帶入 -->
          <div v-if="oldAuthorDone" class="old-author-done">{{ t.oldAuthorDone }}</div>
        </div>

        <div class="field" :class="{ 'has-error': errors.author_bio }">
          <label>{{ t.bioLabel }} <span class="required">*</span></label>
          <p class="field-hint">{{ t.bioHint }}</p>
          <input v-model="form.author_bio" type="text" :placeholder="t.bioPh" />
          <span v-if="errors.author_bio" class="field-error">{{ errors.author_bio }}</span>
        </div>

        <div class="field" :class="{ 'has-error': errors.email }">
          <label>{{ t.emailLabel }} <span class="required">*</span></label>
          <p class="field-hint">{{ t.emailHint }}</p>
          <input v-model="form.email" type="email" placeholder="example@email.com" :readonly="!!editingId" />
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
        </div>

        <div class="field" :class="{ 'has-error': errors.is_first_submission }">
          <label>{{ t.firstSubLabel }} <span class="required">*</span></label>
          <div class="radio-group">
            <label class="radio-label"><input type="radio" :value="true" v-model="form.is_first_submission" /> {{ t.firstSubYes }}</label>
            <label class="radio-label"><input type="radio" :value="false" v-model="form.is_first_submission" /> {{ t.firstSubNo }}</label>
          </div>
          <span v-if="errors.is_first_submission" class="field-error">{{ errors.is_first_submission }}</span>
        </div>

        <div class="field first-extra" :class="{ 'has-error': errors.author_intro }">
          <label>
            {{ t.introLabel }}{{ form.is_first_submission === false ? t.introLabelUpdate : '' }}
            <span v-if="form.is_first_submission" class="required">*</span>
          </label>
          <p class="field-hint">{{ t.introHint }}</p>
          <textarea v-model="form.author_intro" rows="4" :placeholder="t.introPh"></textarea>
          <div class="char-count" :class="{ warn: form.author_intro.length > 160 }">{{ form.author_intro.length }}</div>
          <span v-if="errors.author_intro" class="field-error">{{ errors.author_intro }}</span>
        </div>

        <div class="field first-extra">
          <label>{{ t.avatarLabel }}{{ form.is_first_submission === false ? t.introLabelUpdate : '' }}</label>
          <p class="field-hint">{{ t.avatarHint }}</p>
          <div class="avatar-upload" @click="avatarInput?.click()">
            <img v-if="avatarPreview" :src="avatarPreview" class="avatar-preview" />
            <div v-else class="avatar-placeholder">
              <span>{{ t.avatarClick }}</span>
              <span class="hint-small">JPG / PNG / GIF / WebP</span>
            </div>
          </div>
          <input ref="avatarInput" type="file" accept="image/*" style="display:none" @change="handleAvatarChange" />
          <button v-if="avatarFile || existingAvatarUrl" type="button" class="btn-remove-sm" @click="avatarFile=null; avatarPreview=null; existingAvatarUrl=null">{{ t.avatarRemove }}</button>
        </div>
      </div>

      <!-- ■ 文章資訊 -->
      <div class="form-section">
        <h3 class="section-title">{{ t.sectionArticle }}</h3>

        <div class="field" :class="{ 'has-error': errors.title }">
          <label>{{ t.titleLabel }} <span class="required">*</span></label>
          <input v-model="form.title" type="text" :placeholder="t.titlePh" />
          <span v-if="errors.title" class="field-error">{{ errors.title }}</span>
        </div>

        <div class="field" :class="{ 'has-error': errors.category }">
          <label>{{ t.categoryLabel }} <span class="required">*</span></label>
          <select v-model="form.category">
            <option value="">{{ t.categoryPh }}</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
          <span v-if="errors.category" class="field-error">{{ errors.category }}</span>
        </div>

        <div class="field" :class="{ 'has-error': errors.article_summary }">
          <label>{{ t.summaryLabel }} <span class="required">*</span></label>
          <p class="field-hint">{{ t.summaryHint }}</p>
          <textarea v-model="form.article_summary" rows="4" :placeholder="t.summaryPh"></textarea>
          <div class="char-count" :class="{ warn: form.article_summary.length > 160 }">{{ form.article_summary.length }}</div>
          <span v-if="errors.article_summary" class="field-error">{{ errors.article_summary }}</span>
        </div>

        <div class="field">
          <label>{{ t.keywordLabel }}</label>
          <p class="field-hint">{{ t.keywordHint }}</p>
          <div class="keyword-tags">
            <span v-for="(kw, i) in keywords" :key="i" class="tag">
              {{ kw }}<button type="button" @click="removeKeyword(i)" class="tag-remove">×</button>
            </span>
          </div>
          <div v-if="keywords.length < 5" class="keyword-input-row">
            <input v-model="keywordInput" type="text" :placeholder="t.keywordPh" @keydown="onKeydownKw" />
            <button type="button" class="btn-add-kw" @click="addKeyword">{{ t.keywordAdd }}</button>
          </div>
          <div v-else class="hint-small">{{ t.keywordMax }}</div>
        </div>

        <div class="field">
          <label>{{ t.notesLabel }}</label>
          <textarea v-model="form.notes" rows="3" :placeholder="t.notesPh"></textarea>
        </div>
      </div>

      <!-- ■ 檔案上傳 -->
      <div class="form-section">
        <h3 class="section-title">{{ t.sectionFiles }}</h3>

        <div class="field" :class="{ 'has-error': errors.files }">
          <label>{{ t.filesLabel }} <span class="required">*</span></label>
          <p class="field-hint">{{ t.filesHint }}</p>

          <div class="file-row">
            <!-- Word -->
            <div class="file-slot" :class="{ filled: wordFile || existingWordUrl }">
              <div class="file-slot-label">{{ t.wordLabel }}</div>
              <div v-if="existingWordUrl && !wordFile" class="existing-file">
                <a :href="existingWordUrl" target="_blank">{{ t.existingFile }}</a>
                <span class="hint-small">{{ t.existingHint }}</span>
              </div>
              <div v-if="wordFile" class="file-name">{{ wordFile.name }}</div>
              <button type="button" class="btn-file" @click="wordInput?.click()">
                {{ wordFile ? t.reselect : (existingWordUrl ? t.replaceFile : t.chooseFile) }}
              </button>
              <button v-if="wordFile" type="button" class="btn-remove-sm" @click="wordFile=null">{{ t.remove }}</button>
              <input ref="wordInput" type="file" accept=".docx,.doc" style="display:none" @change="handleWordChange" />
            </div>

            <!-- PDF -->
            <div class="file-slot" :class="{ filled: pdfFile || existingPdfUrl }">
              <div class="file-slot-label">{{ t.pdfLabel }}</div>
              <div v-if="existingPdfUrl && !pdfFile" class="existing-file">
                <a :href="existingPdfUrl" target="_blank">{{ t.existingFile }}</a>
                <span class="hint-small">{{ t.existingHint }}</span>
              </div>
              <div v-if="pdfFile" class="file-name">{{ pdfFile.name }}</div>
              <button type="button" class="btn-file" @click="pdfInput?.click()">
                {{ pdfFile ? t.reselect : (existingPdfUrl ? t.replaceFile : t.chooseFile) }}
              </button>
              <button v-if="pdfFile" type="button" class="btn-remove-sm" @click="pdfFile=null">{{ t.remove }}</button>
              <input ref="pdfInput" type="file" accept=".pdf" style="display:none" @change="handlePdfChange" />
            </div>
          </div>
          <span v-if="errors.files" class="field-error">{{ errors.files }}</span>
        </div>

        <!-- 附圖 -->
        <div class="field">
          <label>{{ t.imagesLabel }}</label>
          <p class="field-hint">{{ t.imagesHint }}</p>

          <!-- 既有圖片（修改模式） -->
          <div v-if="existingImages.length > 0" class="image-list-label">{{ t.existingImagesTitle }}</div>
          <div v-if="existingImages.length > 0" class="image-list">
            <div v-for="(img, i) in existingImages" :key="'e'+i" class="image-item existing-img">
              <img :src="img.url" class="img-thumb" />
              <div class="img-name">{{ img.name || `${i+1}` }}</div>
              <div class="img-actions">
                <label class="order-label">{{ t.orderLabel }}</label>
                <input type="number" class="order-input" :value="i+1" min="1" :max="existingImages.length" @change="reorderExistingImage(i, +$event.target.value)" />
                <button type="button" @click="removeExistingImage(i)" class="btn-remove-sm">✕</button>
              </div>
            </div>
          </div>

          <!-- 新上傳圖片 -->
          <div v-if="imageFiles.length > 0" class="image-list-label">{{ t.newImagesTitle }}</div>
          <div v-if="imageFiles.length > 0" class="image-list">
            <div v-for="(img, i) in imageFiles" :key="'n'+i" class="image-item">
              <img v-if="img.previewUrl" :src="img.previewUrl" class="img-thumb" />
              <div v-else class="img-thumb-placeholder">📎</div>
              <div class="img-name">{{ img.name }}</div>
              <div class="img-actions">
                <label class="order-label">{{ t.orderLabel }}</label>
                <input type="number" class="order-input" :value="i+1" min="1" :max="imageFiles.length" @change="reorderNewImage(i, +$event.target.value)" />
                <button type="button" @click="removeImage(i)" class="btn-remove-sm">✕</button>
              </div>
            </div>
          </div>

          <button type="button" class="btn-file" @click="imgInput?.click()" style="margin-top:8px">{{ t.addImage }}</button>
          <input ref="imgInput" type="file" accept="image/*" multiple style="display:none" @change="handleImgChange" />
        </div>
      </div>

      <div class="submit-row">
        <button type="submit" class="btn-submit">
          {{ editingId ? t.submitEdit : t.submitNew }}
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
