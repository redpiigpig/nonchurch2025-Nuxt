<script setup>
import { ref, computed, onMounted } from "vue";
import { useLanguage } from "~/composables/useLanguage";

const supabase = useSupabaseClient();
const { currentLang } = useLanguage();

// 紙本印製紀錄屬內部營運資料，只有後台（pages/admin/publication.vue）會傳 true。
const props = defineProps({
  showPrintRuns: { type: Boolean, default: false },
});

const contentMap = {
  "zh-TW": {
    pageTitle: "刊物資訊",
    pubInfoTitle: "出版資訊",
    fields: [
      { label: "刊　　名", value: "《無境界者》" },
      { label: "發　行　人", value: "張辰瑋" },
      { label: "創刊日期", value: "2025 年 1 月" },
      { label: "刊期頻率", value: "雙月刊（每兩個月出刊）" },
      { label: "出　版　地", value: "台北市，台灣" },
      { label: "官方網站", value: "http://nonchurch2025.com", isLink: true, href: "http://nonchurch2025.com" },
      { label: "聯絡信箱", value: "nonchurch2025@gmail.com", isLink: true, href: "mailto:nonchurch2025@gmail.com" },
      { label: "線上 ISSN", value: "3134-7576" },
      { label: "紙本 ISSN", value: "3134-7568" },
    ],
    issuesTitle: "各期刊物",
    upcomingBadge: "待出版",
    upcomingLabel: "即將出版",
    clickToDownload: "點擊封面下載 PDF",
    noPdf: "PDF 即將上線",
    issueLabel: (n) => `第 ${n} 期`,
    pr: {
      title: "紙本印製紀錄",
      colIssue: "期別", colDetail: "印製明細", colTotal: "累計",
      totalLabel: "合計", unit: "本", firstRun: "初版", reprint: "加印",
      empty: "尚無印製紀錄",
    },
  },
  "zh-HK": {
    pageTitle: "刊物資訊",
    pubInfoTitle: "出版資訊",
    fields: [
      { label: "刊　　名", value: "《無境界者》" },
      { label: "發　行　人", value: "張辰瑋" },
      { label: "創刊日期", value: "2025 年 1 月" },
      { label: "刊期頻率", value: "雙月刊（每兩個月出刊）" },
      { label: "出　版　地", value: "台北市，台灣" },
      { label: "官方網站", value: "http://nonchurch2025.com", isLink: true, href: "http://nonchurch2025.com" },
      { label: "聯絡信箱", value: "nonchurch2025@gmail.com", isLink: true, href: "mailto:nonchurch2025@gmail.com" },
      { label: "線上 ISSN", value: "3134-7576" },
      { label: "紙本 ISSN", value: "3134-7568" },
    ],
    issuesTitle: "各期刊物",
    upcomingBadge: "待出版",
    upcomingLabel: "即將出版",
    clickToDownload: "撳封面下載 PDF",
    noPdf: "PDF 即將上線",
    issueLabel: (n) => `第 ${n} 期`,
    pr: {
      title: "紙本印製紀錄",
      colIssue: "期別", colDetail: "印製明細", colTotal: "累計",
      totalLabel: "合計", unit: "本", firstRun: "初版", reprint: "加印",
      empty: "尚無印製紀錄",
    },
  },
  "zh-CN": {
    pageTitle: "刊物资讯",
    pubInfoTitle: "出版资讯",
    fields: [
      { label: "刊　　名", value: "《无境界者》" },
      { label: "发　行　人", value: "张辰玮" },
      { label: "创刊日期", value: "2025 年 1 月" },
      { label: "刊期频率", value: "双月刊（每两个月出刊）" },
      { label: "出　版　地", value: "台北市，台湾" },
      { label: "官方网站", value: "http://nonchurch2025.com", isLink: true, href: "http://nonchurch2025.com" },
      { label: "联络信箱", value: "nonchurch2025@gmail.com", isLink: true, href: "mailto:nonchurch2025@gmail.com" },
      { label: "线上 ISSN", value: "3134-7576" },
      { label: "纸本 ISSN", value: "3134-7568" },
    ],
    issuesTitle: "各期刊物",
    upcomingBadge: "待出版",
    upcomingLabel: "即将出版",
    clickToDownload: "点击封面下载 PDF",
    noPdf: "PDF 即将上线",
    issueLabel: (n) => `第 ${n} 期`,
    pr: {
      title: "纸本印制纪录",
      colIssue: "期别", colDetail: "印制明细", colTotal: "累计",
      totalLabel: "合计", unit: "本", firstRun: "初版", reprint: "加印",
      empty: "尚无印制纪录",
    },
  },
  en: {
    pageTitle: "Publication",
    pubInfoTitle: "Publication Details",
    fields: [
      { label: "Title", value: "Faith Without Boundary" },
      { label: "Publisher", value: "Chen-Wei Chang" },
      { label: "Founded", value: "January 2025" },
      { label: "Frequency", value: "Bimonthly" },
      { label: "Location", value: "Taipei, Taiwan" },
      { label: "Website", value: "http://nonchurch2025.com", isLink: true, href: "http://nonchurch2025.com" },
      { label: "Email", value: "nonchurch2025@gmail.com", isLink: true, href: "mailto:nonchurch2025@gmail.com" },
      { label: "Online ISSN", value: "3134-7576" },
      { label: "Print ISSN", value: "3134-7568" },
    ],
    issuesTitle: "All Issues",
    upcomingBadge: "Upcoming",
    upcomingLabel: "Coming Soon",
    clickToDownload: "Click cover to download PDF",
    noPdf: "PDF coming soon",
    issueLabel: (n) => `Vol. ${n}`,
    pr: {
      title: "Print Runs",
      colIssue: "Issue", colDetail: "Batches", colTotal: "Total",
      totalLabel: "Total", unit: "copies", firstRun: "1st run", reprint: "reprint",
      empty: "No print records yet",
    },
  },
  ja: {
    pageTitle: "刊行情報",
    pubInfoTitle: "出版情報",
    fields: [
      { label: "誌　　名", value: "《無境界者》" },
      { label: "発　行　人", value: "張辰瑋" },
      { label: "創刊日", value: "2025 年 1 月" },
      { label: "発行頻度", value: "隔月刊" },
      { label: "出版地", value: "台北市、台湾" },
      { label: "公式サイト", value: "http://nonchurch2025.com", isLink: true, href: "http://nonchurch2025.com" },
      { label: "連絡先", value: "nonchurch2025@gmail.com", isLink: true, href: "mailto:nonchurch2025@gmail.com" },
      { label: "電子版 ISSN", value: "3134-7576" },
      { label: "印刷版 ISSN", value: "3134-7568" },
    ],
    issuesTitle: "既刊一覧",
    upcomingBadge: "刊行予定",
    upcomingLabel: "近日公開",
    clickToDownload: "表紙クリックで PDF ダウンロード",
    noPdf: "PDF は近日公開",
    issueLabel: (n) => `第 ${n} 号`,
    pr: {
      title: "印刷部数",
      colIssue: "号", colDetail: "印刷内訳", colTotal: "累計",
      totalLabel: "合計", unit: "部", firstRun: "初版", reprint: "増刷",
      empty: "印刷記録はありません",
    },
  },
  ko: {
    pageTitle: "간행물 정보",
    pubInfoTitle: "출판 정보",
    fields: [
      { label: "간행물명", value: "《無境界者》" },
      { label: "발　행　인", value: "장진위" },
      { label: "창간일", value: "2025 년 1 월" },
      { label: "발행 주기", value: "격월간" },
      { label: "출　판　지", value: "타이베이, 대만" },
      { label: "공식 사이트", value: "http://nonchurch2025.com", isLink: true, href: "http://nonchurch2025.com" },
      { label: "이메일", value: "nonchurch2025@gmail.com", isLink: true, href: "mailto:nonchurch2025@gmail.com" },
      { label: "온라인 ISSN", value: "3134-7576" },
      { label: "인쇄본 ISSN", value: "3134-7568" },
    ],
    issuesTitle: "전체 호",
    upcomingBadge: "출판 예정",
    upcomingLabel: "곧 출판",
    clickToDownload: "표지 클릭으로 PDF 다운로드",
    noPdf: "PDF 곧 공개",
    issueLabel: (n) => `제 ${n} 호`,
    pr: {
      title: "인쇄 부수",
      colIssue: "호", colDetail: "인쇄 내역", colTotal: "누계",
      totalLabel: "합계", unit: "부", firstRun: "초판", reprint: "증쇄",
      empty: "인쇄 기록이 없습니다",
    },
  },
};

const t = computed(() => contentMap[currentLang.value] || contentMap["zh-TW"]);

function reverseRows(arr, cols = 3) {
  const rows = [];
  for (let i = 0; i < arr.length; i += cols) rows.push(arr.slice(i, i + cols));
  rows.reverse();
  return rows.flat();
}

const allIssues = ref([]);
const printRuns = ref([]);

onMounted(async () => {
  if (props.showPrintRuns) fetchPrintRuns();
  const CDN = "https://res.cloudinary.com/nonchurch2025/image/upload";
  const { data } = await supabase
    .from("issues")
    .select("id, title, date, cover_img, is_published")
    .order("id", { ascending: true });
  if (!data) return;

  const published = data.filter((i) => i.is_published);
  const nextUnpublished = data.find((i) => !i.is_published) || null;

  const toCard = (iss, isUpcoming = false) => ({
    isUpcoming,
    number: iss.id,
    year: 2025 + Math.floor((iss.id - 1) / 6),
    title: iss.title || "",
    date: iss.date || "",
    coverImg: iss.cover_img?.startsWith("http") ? iss.cover_img : `${CDN}/cover-${iss.id}.png`,
    pdfLink: isUpcoming ? null : `${CDN}/Vol.${iss.id}.pdf`,
  });

  const cards = published.map((i) => toCard(i));
  if (nextUnpublished) cards.push(toCard(nextUnpublished, true));
  allIssues.value = cards;
});

async function fetchPrintRuns() {
  const { data } = await supabase
    .from("issue_print_runs")
    .select("issue, print_date, copies, is_reprint, note")
    .order("issue", { ascending: true })
    .order("print_date", { ascending: true });
  printRuns.value = data || [];
}

/** 每期一列：印製明細（依日期）＋ 累計本數。 */
const printRunsByIssue = computed(() => {
  const map = new Map();
  for (const r of printRuns.value) {
    if (!map.has(r.issue)) map.set(r.issue, { issue: r.issue, runs: [], total: 0 });
    const g = map.get(r.issue);
    g.runs.push(r);
    g.total += r.copies;
  }
  return [...map.values()].sort((a, b) => a.issue - b.issue);
});

const printRunsTotal = computed(() =>
  printRunsByIssue.value.reduce((s, g) => s + g.total, 0),
);

const fmtRunDate = (d) => String(d || "").replaceAll("-", ".");

// 依年份降冪分組，每組內 reverseRows
const issuesByYear = computed(() => {
  const map = {};
  allIssues.value.forEach((c) => {
    if (!map[c.year]) map[c.year] = [];
    map[c.year].push(c);
  });
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => b - a)
    .map((year) => ({ year, cards: reverseRows(map[year], 3) }));
});
</script>

<template>
  <div class="publication-page">
    <h1 class="page-main-title">
      <span class="emoji">📓</span>{{ t.pageTitle }}<span class="emoji">📓</span>
    </h1>
    <div class="main-divider"></div>

    <!-- 出版資訊 -->
    <section class="pub-info-section">
      <h3 class="section-heading">{{ t.pubInfoTitle }}</h3>
      <table class="pub-info-table">
        <tbody>
          <tr v-for="field in t.fields" :key="field.label">
            <td class="field-label">{{ field.label }}</td>
            <td class="field-value">
              <a v-if="field.isLink" :href="field.href" target="_blank" rel="noopener">{{ field.value }}</a>
              <span v-else>{{ field.value }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 各期刊物 -->
    <section class="issues-section">
      <h3 class="section-heading">{{ t.issuesTitle }}</h3>

      <template v-for="(group, idx) in issuesByYear" :key="group.year">
        <h2 class="year-label">{{ group.year }}</h2>
        <div class="issues-grid">
          <div v-for="card in group.cards" :key="card.isUpcoming ? 'upcoming' : card.number" class="issue-card">
            <div class="cover-wrap">
              <div v-if="card.isUpcoming" class="cover-placeholder">
                <span class="upcoming-badge">{{ t.upcomingBadge }}</span>
              </div>
              <a v-else-if="card.coverImg && card.pdfLink" :href="card.pdfLink" target="_blank" rel="noopener" :title="t.clickToDownload">
                <img :src="cloudinaryUrl(card.coverImg, CLD.cover)" :alt="`Vol.${card.number} ${card.title}`" class="cover-img" loading="lazy" decoding="async" />
              </a>
              <div v-else-if="card.coverImg" class="cover-no-pdf">
                <img :src="cloudinaryUrl(card.coverImg, CLD.cover)" :alt="`Vol.${card.number} ${card.title}`" class="cover-img" loading="lazy" decoding="async" />
                <div class="no-pdf-overlay">{{ t.noPdf }}</div>
              </div>
              <div v-else class="cover-placeholder">
                <span class="upcoming-badge">{{ t.noPdf }}</span>
              </div>
            </div>
            <div class="card-info">
              <div class="card-issue-label">
                <span v-if="card.isUpcoming">{{ t.issueLabel(card.number) }}　{{ t.upcomingLabel }}</span>
                <span v-else>{{ t.issueLabel(card.number) }}</span>
              </div>
              <div class="card-date">{{ card.date }}</div>
              <NuxtLink v-if="!card.isUpcoming" class="card-title" :to="`/home/issue/${card.number}`">{{ card.title }}</NuxtLink>
              <span v-else class="card-title card-title--plain">{{ card.title }}</span>
            </div>
          </div>
        </div>
        <hr v-if="idx < issuesByYear.length - 1" class="year-divider" />
      </template>
    </section>

    <!-- 紙本印製紀錄（僅後台顯示） -->
    <section v-if="showPrintRuns" class="print-runs-section">
      <h3 class="section-heading">{{ t.pr.title }}</h3>

      <p v-if="!printRunsByIssue.length" class="print-runs-empty">{{ t.pr.empty }}</p>

      <table v-else class="print-runs-table">
        <thead>
          <tr>
            <th class="pr-col-issue">{{ t.pr.colIssue }}</th>
            <th class="pr-col-detail">{{ t.pr.colDetail }}</th>
            <th class="pr-col-total">{{ t.pr.colTotal }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in printRunsByIssue" :key="g.issue">
            <td class="pr-issue">{{ t.issueLabel(g.issue) }}</td>
            <td class="pr-detail">
              <span v-for="(r, i) in g.runs" :key="r.print_date + '-' + i" class="pr-run" :title="r.note || ''">
                <span class="pr-date">{{ fmtRunDate(r.print_date) }}</span>
                <span class="pr-kind" :class="{ 'pr-kind--reprint': r.is_reprint }">
                  {{ r.is_reprint ? t.pr.reprint : t.pr.firstRun }}
                </span>
                <span class="pr-copies">{{ r.copies }} {{ t.pr.unit }}</span>
              </span>
            </td>
            <td class="pr-total">{{ g.total }} {{ t.pr.unit }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td class="pr-issue">{{ t.pr.totalLabel }}</td>
            <td></td>
            <td class="pr-total">{{ printRunsTotal }} {{ t.pr.unit }}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  </div>
</template>

<style scoped>
.publication-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1.5rem 4rem;
}

.section-heading {
  font-size: 1.4rem;
  color: #444;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  line-height: 1.4;
  margin: 2.5rem 0 1rem;
}

.pub-info-table { border-collapse: collapse; width: 100%; max-width: 600px; }
.pub-info-table tr { border-bottom: 1px solid #eee; }

.field-label {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  color: #555; font-size: 1rem;
  padding: 0.6rem 1.2rem 0.6rem 0;
  white-space: nowrap; vertical-align: top; width: 7em;
}
.field-value {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  color: #555; font-size: 1rem; padding: 0.6rem 0;
}
.field-value a { color: #4a7c59; text-decoration: none; }
.field-value a:hover { text-decoration: underline; }

.year-label {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.5rem; font-weight: bold; color: #111;
  text-align: center; margin: 0.5rem 0 1.2rem; letter-spacing: 0.05em;
}
.year-divider { border: none; border-top: 1px solid #ddd; margin: 2rem 0 1.5rem; }

.issues-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem 1.5rem;
  margin-bottom: 0.5rem;
}
.issue-card { display: flex; flex-direction: column; }

.cover-wrap {
  position: relative; width: 100%; aspect-ratio: 176 / 250;
  background: #f5f5f5; overflow: hidden; border: 1px solid #e0e0e0;
}
.cover-wrap > a { display: block; width: 100%; height: 100%; }
.cover-img { width: 100%; height: 100%; object-fit: contain; display: block; transition: transform 0.3s ease; }
.cover-wrap > a:hover .cover-img { transform: scale(1.05); }

.cover-no-pdf { position: relative; width: 100%; height: 100%; }
.no-pdf-overlay {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: rgba(0,0,0,0.45); color: #fff;
  font-size: 0.8rem; text-align: center; padding: 0.4rem 0; font-family: sans-serif;
}
.cover-placeholder {
  width: 100%; height: 100%; background: #d8d8c8;
  display: flex; align-items: center; justify-content: center;
}
.upcoming-badge {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1.1rem; color: #666; letter-spacing: 0.1em; text-align: center; padding: 0 0.5rem;
}

.card-info { padding: 0.7rem 0.2rem 0; }
.card-issue-label { font-family: sans-serif; font-size: 0.78rem; color: #888; margin-bottom: 0.2rem; }
.card-date { font-family: "Times New Roman", "DFKai-SB", "標楷體", serif; font-size: 0.85rem; color: #777; margin-bottom: 0.3rem; }
.card-title {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 1rem; color: #007bff; line-height: 1.4;
  text-decoration: none; display: block;
}
.card-title:hover { color: #4a7c59; text-decoration: underline; }
.card-title--plain { cursor: default; color: #555; }
.card-title--plain:hover { color: #555; text-decoration: none; }

/* ── 紙本印製紀錄（後台） ── */
.print-runs-table {
  border-collapse: collapse;
  width: 100%;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
  font-size: 0.95rem;
  color: #555;
}
.print-runs-table th {
  text-align: left;
  font-weight: normal;
  color: #888;
  font-size: 0.85rem;
  padding: 0.5rem 0.8rem 0.5rem 0;
  border-bottom: 1px solid #ddd;
  white-space: nowrap;
}
.print-runs-table td {
  padding: 0.6rem 0.8rem 0.6rem 0;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: top;
}
.print-runs-table tfoot td {
  border-bottom: none;
  border-top: 1px solid #ddd;
  font-weight: bold;
  color: #333;
}
.pr-col-issue { width: 6em; }
.pr-col-total { width: 5em; text-align: right; }
.pr-issue { white-space: nowrap; }
.pr-total { text-align: right; white-space: nowrap; font-weight: bold; color: #333; }

.pr-detail { line-height: 1.9; }
.pr-run { display: inline-block; margin-right: 1.2rem; white-space: nowrap; }
.pr-date { color: #777; }
.pr-kind {
  font-family: sans-serif;
  font-size: 0.7rem;
  color: #4a7c59;
  border: 1px solid #cfe0d4;
  border-radius: 3px;
  padding: 0.05rem 0.32rem;
  margin: 0 0.35rem;
  vertical-align: 0.08em;
}
.pr-kind--reprint { color: #9a7b3f; border-color: #e6d8bd; }

.print-runs-empty { color: #999; font-size: 0.95rem; }

@media (max-width: 700px) {
  .issues-grid { grid-template-columns: repeat(2, 1fr); gap: 1.5rem 1rem; }
  .print-runs-table { font-size: 0.88rem; }
  .pr-run { display: block; margin-right: 0; }
}
@media (max-width: 440px) {
  .issues-grid { grid-template-columns: 1fr; }
}
</style>
