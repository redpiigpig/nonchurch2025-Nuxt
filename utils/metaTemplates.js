/**
 * 投稿資訊 / 編輯資訊文章內容範本
 *
 * - buildSubmissionInfoHtml(issue)
 *     從 issue 的 cfp_title / cfp_theme / cfp_deadline / cfp_image 組合「投稿資訊」HTML
 * - buildEditorialInfoHtml(issue, financePeriod)
 *     從 issue + 對應期次的財務資料組合「編輯資訊」HTML
 *
 * 兩者皆輸出純 HTML 字串，可直接寫入 articles.content。
 *
 * 主標題（「投稿資訊」/「編輯資訊」）放在 articles.title 欄位，
 * 不寫進 content；前台 articles/[id].vue 與 export-word 會將 title 視為 H1 自動呈現。
 *
 * 列表項：用 `<p>● ...` 形式，因為 generate_docx.py 不認 <ul><li>，
 *   只認段落首字 `●` / `•` 為 bullet（_add_bullet_line, generate_docx.py:2373）。
 */

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// ─────────────────────────────── 投稿資訊 ──────────────────────────────

const SUBMIT_INTRO =
  "《無境界者》雜誌是一個不以教會為本位的自由信仰論述平台，同時也是一份實驗性的線上刊物，定期於雙數月月底發刊，並向社會大眾徵稿。每期皆設有當期主題，投稿者可依主題投稿，亦可自由發揮。";

const SUBMIT_TYPES = [
  ["專題文章", "探討當期主題或其他議題的學術性或半學術性文章，約 1,000-6,000 字。"],
  ["評論與回應", "針對具有信仰啟發性的書籍、文章進行評論，或回應本刊及其他信仰刊物的文章，約 500-6,000 字。"],
  ["人物專訪", "訪談對台灣教會史具獨特意義的人物，或針對特殊議題採訪重要人物並記錄其見解，約 2,000-12,000 字。"],
  ["生命故事", "個人生命經歷、日常信仰體悟，或參與活動的心得分享，約 500-6,000 字。"],
  ["時事感想", "對政治、社會、文化、教界時事的感想，或書寫時事對信仰的啟發，約 500-6,000 字。"],
  ["文藝創作", "與信仰相關的詩詞、散文、短篇小說、歌詞、樂譜、圖畫等創作。格式、篇幅不限，但篇幅過長者建議以連載形式投稿。"],
  ["公告與剪影", "友好團體活動公告或活動紀錄，可附海報、照片或相關連結，約 500-2,000 字。"],
  ["光影時刻", "以照片講述信仰故事，最多 5 張照片。若符合當期主題，投稿作品亦可能被選為封面故事，文字 500 字以下。"],
  ["實驗園地", "各類實驗性創作，格式不拘，投稿前請先與編輯聯絡討論。"],
];

const SUBMIT_RULES = [
  ["投稿方式", "請掃描右方的投稿連結，或直接來信 nonchurch2025@gmail.com 投稿。"],
  ["匿名發表", "作品可匿名刊登，但投稿時仍須於電子郵件中附上真實姓名。首次投稿的作者請提供 100-150 字的個人簡介。"],
  ["公開發表與稿酬", "本刊為公開的非營利網路平台，所有發表作品皆視為公開發表，恕無稿酬。"],
  ["作品原創性與責任", "投稿作品可為原創或已公開發表之作品（如網路文章、紙本刊登文章、過期演講稿，請註明來源）。若內容涉及侵權（圖文引用、抄襲等），作者需自行負責，本刊不為任何作者之信仰論述背書。"],
  ["學術文章格式", "文史類文章請依《國史館館刊》寫作格式撰寫；社會科學類文章請依《臺灣宗教研究》撰稿體例。"],
  ["截稿期限與審稿", "每期截稿日為單數月月底（刊登前一個月）。若當期來稿過多，且投稿作品與當期主題無關，編輯部將視情況調整刊登順序。"],
  ["編輯原則", "本刊原則上維持作品原貌，僅進行錯別字、語詞誤用、格式調整等校對，並會與原作者協商。但本刊保留最終編輯權。"],
  ["退稿與刊登權限", "若投稿作品不符合本刊需求，或須大幅修改，編輯部將提供退稿說明。但本刊對作品的刊登與否保有最終裁量權。"],
  ["聯繫方式", "如對本刊信仰特色、投稿規範有任何疑問，請來信詢問 nonchurch2025@gmail.com。"],
];

/**
 * 投稿資訊 HTML
 *  - issue: { id, cfp_title, cfp_theme, cfp_deadline, cfp_image }
 *  - 若 cfp_* 欄位皆未填，下期主題段以 placeholder 取代
 */
export function buildSubmissionInfoHtml(issue = {}) {
  const parts = [];

  // 介紹段
  parts.push(`<p>${SUBMIT_INTRO}</p>`);

  // 下期主題
  parts.push(
    `<p><strong>下期主題：「${issue.cfp_title ? escapeHtml(issue.cfp_title) : "（待編輯）"}」</strong></p>`,
  );

  // 下期主題圖片
  if (issue.cfp_image) {
    parts.push(`<figure><img src="${escapeHtml(issue.cfp_image)}" alt="下期主題"></figure>`);
  }

  // 主題說明
  if (issue.cfp_theme) {
    const paras = String(issue.cfp_theme).split(/\n+/).map((s) => s.trim()).filter(Boolean);
    for (const p of paras) parts.push(`<p>${escapeHtml(p)}</p>`);
  } else {
    parts.push(`<p>（請於期刊主題管理填入下期徵稿說明，再回此頁同步。）</p>`);
  }

  // 截稿期限
  if (issue.cfp_deadline) {
    parts.push(`<p>📌截稿期限：${escapeHtml(issue.cfp_deadline)}</p>`);
  }

  // 投稿類型
  parts.push(`<p><strong>投稿類型</strong></p>`);
  for (const [name, desc] of SUBMIT_TYPES) {
    parts.push(`<p>● <strong>${escapeHtml(name)}</strong>：${escapeHtml(desc)}</p>`);
  }

  // 投稿方式
  parts.push(`<p><strong>投稿方式</strong></p>`);
  for (const [name, desc] of SUBMIT_RULES) {
    parts.push(`<p>● <strong>${escapeHtml(name)}</strong>：${escapeHtml(desc)}</p>`);
  }

  return parts.join("\n");
}

// ─────────────────────────────── 編輯資訊 ──────────────────────────────

const EDITORIAL_GROUP = [
  ["主編", "張辰瑋"],
  ["美術編輯", "梁晴朗"],
  ["文字編輯", "邱詠恩"],
  ["封面設計", "梁晴朗"],
  ["網站設計", "張辰瑋"],
  ["Facebook 粉專經營", "邱詠恩"],
  ["Instagram、Threads 粉專經營", "梁晴朗"],
];

const ONLINE_INFO = [
  ["無境界者官網", "http://nonchurch2025.com"],
  ["臉書粉專", "https://www.facebook.com/profile.php?id=61573500811055"],
  ["Instagram 粉專", "https://www.instagram.com/nonchurch2025/"],
  ["Threads 粉專", "https://www.threads.com/@nonchurch2025"],
  ["電子郵件", "nonchurch2025@gmail.com"],
];

/** issue.date 例：「2026年01-02月號」/「2026.04」→「2026年1月」 */
function formatPublishDate(rawDate) {
  if (!rawDate) return "";
  const s = String(rawDate);
  let m = s.match(/(\d{4})年(\d{1,2})/);
  if (m) return `${m[1]}年${parseInt(m[2], 10)}月`;
  m = s.match(/(\d{4})\.(\d{1,2})/);
  if (m) return `${m[1]}年${parseInt(m[2], 10)}月`;
  return s;
}

const fmtNum = (n) => {
  if (n === null || n === undefined || n === "") return "";
  return Number(n).toLocaleString("zh-TW");
};

/** 中文數字（一二三...十一） */
const ZH_NUM = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
function toZhIssueNum(id) {
  const n = parseInt(id, 10);
  if (Number.isNaN(n)) return String(id ?? "");
  if (n <= 10) return ZH_NUM[n];
  if (n < 20) return `十${ZH_NUM[n - 10]}`;
  return String(n);
}

/**
 * 編輯資訊 HTML
 *  - issue: { id, title, date }
 *  - financePeriod: { dateRange, rows[] } 來自 stores/finance_data.js
 */
export function buildEditorialInfoHtml(issue = {}, financePeriod = null) {
  const parts = [];

  // 編輯群
  parts.push(`<p><strong>《無境界者》編輯群</strong></p>`);
  for (const [role, name] of EDITORIAL_GROUP) {
    // 用全形空白把 role 與 name 隔開，視覺接近範例 word 的 table 對齊效果
    parts.push(`<p>${escapeHtml(role)}　${escapeHtml(name)}</p>`);
  }

  // 線上資訊
  parts.push(`<p><strong>《無境界者》線上資訊</strong></p>`);
  for (const [k, v] of ONLINE_INFO) {
    parts.push(`<p>${escapeHtml(k)}：${escapeHtml(v)}</p>`);
  }

  // 財務徵信
  if (financePeriod && financePeriod.rows && financePeriod.rows.length > 0) {
    parts.push(`<p><strong>《無境界者》財務徵信</strong></p>`);
    if (financePeriod.dateRange) {
      parts.push(`<p>（${escapeHtml(financePeriod.dateRange)}）</p>`);
    }
    const tbl = [];
    tbl.push(`<table class="data-table">`);
    tbl.push(
      `<tr><th>編號</th><th>日期</th><th>收入/支出</th><th>項目</th><th>性質</th><th>單價（元）</th><th>數量</th><th>總價（元）</th><th>結餘（元）</th></tr>`,
    );
    for (const r of financePeriod.rows) {
      tbl.push(
        `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.type)}</td><td>${escapeHtml(r.item)}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(r.unitPrice ?? "")}</td><td>${escapeHtml(r.qty ?? "")}</td><td>${fmtNum(r.total)}</td><td>${fmtNum(r.balance)}</td></tr>`,
      );
    }
    tbl.push(`</table>`);
    parts.push(tbl.join(""));
  }

  // 版權頁
  parts.push(`<p><strong>版權頁 | Colophon</strong></p>`);
  parts.push(`<p><strong>刊　名：</strong>《無境界者》</p>`);
  parts.push(
    `<p><strong>卷　期：</strong>第${toZhIssueNum(issue.id)}期${issue.title ? `：${escapeHtml(issue.title)}` : ""}</p>`,
  );
  parts.push(`<p><strong>出版日期：</strong>${escapeHtml(formatPublishDate(issue.date))}</p>`);
  parts.push(`<p><strong>發行人∕出版者：</strong>張辰瑋</p>`);
  parts.push(`<p><strong>刊期頻率：</strong>雙月刊</p>`);
  parts.push(`<p><strong>官方網站：</strong>http://nonchurch2025.com</p>`);
  parts.push(`<p><strong>聯絡信箱：</strong>nonchurch2025@gmail.com</p>`);

  const year = formatPublishDate(issue.date).match(/^(\d{4})/)?.[1] || new Date().getFullYear();
  parts.push(`<p><strong>Copyright © ${year} Faith Without Borders. All rights reserved.</strong></p>`);

  return parts.join("\n");
}
