/**
 * 財務徵信資料
 * Source of truth：每期財務明細
 *
 * 使用者：
 *  - pages/finance.vue（前台「每期財務明細」）
 *  - utils/metaTemplates.js（編輯資訊文章內動態組合「財務徵信」表格）
 *
 * 新增新一期財務時，在 periods 陣列加一筆即可，
 * 編輯資訊文章可以透過 meta-article 編輯器的「同步財務」按鈕重新拉取（規劃中）。
 */

export const periods = [
  {
    key: 4,
    label: "第四期",
    dateRange: "114.06.15 – 114.08.15",
    rows: [
      { id: "2501", note: "", date: "114.06.20", type: "收入", item: "張辰瑋贊助",     category: "個人贊助", unitPrice: null,    qty: null, total: 2000,  balance: 2000  },
      { id: "2502", note: "", date: "114.07.02", type: "收入", item: "昭慧法師贊助",   category: "個人贊助", unitPrice: null,    qty: null, total: 2000,  balance: 4000  },
      { id: "2503", note: "", date: "114.07.03", type: "支出", item: "第三期雜誌紙本", category: "紙本印製", unitPrice: null,    qty: null, total: 3530,  balance: 470   },
      { id: "2504", note: "", date: "114.07.03", type: "支出", item: "第三期雜誌寄送", category: "雜誌寄送", unitPrice: null,    qty: null, total: 146,   balance: 324   },
      { id: "2505", note: "", date: "114.07.03", type: "收入", item: "雜誌紙本訂閱",   category: "雜誌訂閱", unitPrice: 250,     qty: 13,   total: 3250,  balance: 3574  },
      { id: "2506", note: "", date: "114.07.07", type: "支出", item: "第三期雜誌寄送", category: "雜誌寄送", unitPrice: null,    qty: null, total: 330,   balance: 3244  },
      { id: "2507", note: "", date: "114.07.12", type: "支出", item: "文具費",         category: "雜費",     unitPrice: null,    qty: null, total: 68,    balance: 3176  },
      { id: "2508", note: "", date: "114.07.14", type: "支出", item: "購買網域",       category: "網路維護", unitPrice: null,    qty: null, total: 567,   balance: 2609  },
      { id: "2509", note: "", date: "114.07.15", type: "收入", item: "銀行利息",       category: "利息",     unitPrice: null,    qty: null, total: 1,     balance: 2610  },
      { id: "2510", note: "", date: "114.07.29", type: "支出", item: "雜誌紙本加印",   category: "紙本印製", unitPrice: null,    qty: null, total: 1524,  balance: 1086  },
      { id: "2511", note: "", date: "114.07.29", type: "支出", item: "雜誌紙本寄送",   category: "雜誌寄送", unitPrice: null,    qty: null, total: 110,   balance: 976   },
      { id: "2512", note: "", date: "114.08.02", type: "收入", item: "雜誌紙本訂閱",   category: "雜誌訂閱", unitPrice: 250,     qty: 5,    total: 1250,  balance: 2226  },
      { id: "2513", note: "", date: "114.08.02", type: "收入", item: "演講會支持收入", category: "專案贊助", unitPrice: null,    qty: null, total: 2950,  balance: 5176  },
    ],
  },
  {
    key: 5,
    label: "第五期",
    dateRange: "114.08.16 – 114.10.15",
    rows: [
      { id: "2514", note: "", date: "114.08.16", type: "收入", item: "性別營補助印刷費", category: "機構補助", unitPrice: null, qty: null, total: 18800, balance: 23976 },
      { id: "2515", note: "", date: "114.08.17", type: "支出", item: "網域續費",         category: "網路維護", unitPrice: null, qty: null, total: 154,   balance: 23822 },
      { id: "2516", note: "", date: "114.08.20", type: "支出", item: "雜誌紙本寄送",     category: "雜誌寄送", unitPrice: null, qty: null, total: 44,    balance: 23778 },
      { id: "2517", note: "", date: "114.08.27", type: "收入", item: "林書民贊助",       category: "個人贊助", unitPrice: null, qty: null, total: 1000,  balance: 24778 },
      { id: "2518", note: "", date: "114.09.04", type: "支出", item: "第四期雜誌印製",   category: "紙本印製", unitPrice: null, qty: null, total: 11600, balance: 13178 },
      { id: "2519", note: "", date: "114.09.04", type: "支出", item: "第四期雜誌寄送",   category: "雜誌寄送", unitPrice: null, qty: null, total: 1176,  balance: 12002 },
      { id: "2520", note: "", date: "114.09.13", type: "支出", item: "網域續費",         category: "網路維護", unitPrice: null, qty: null, total: 154,   balance: 11848 },
      { id: "2521", note: "", date: "114.09.15", type: "支出", item: "雜誌紙本寄送",     category: "雜誌寄送", unitPrice: null, qty: null, total: 55,    balance: 11793 },
      { id: "2522", note: "", date: "114.10.13", type: "支出", item: "網域續費",         category: "網路維護", unitPrice: null, qty: null, total: 154,   balance: 11639 },
    ],
  },
  {
    key: 6,
    label: "第六期",
    dateRange: "114.10.16 – 114.12.15",
    rows: [
      { id: "2523", note: "",  date: "114.10.31", type: "支出", item: "第五期雜誌印製",   category: "紙本印製", unitPrice: null, qty: null, total: 4138,  balance: 7501   },
      { id: "2524", note: "",  date: "114.11.03", type: "支出", item: "美術編輯年度費用", category: "編輯費用", unitPrice: null, qty: null, total: 8000,  balance: -499   },
      { id: "2525", note: "1", date: "114.11.03", type: "支出", item: "文字編輯年度費用", category: "編輯費用", unitPrice: null, qty: null, total: 12000, balance: -12499 },
      { id: "2526", note: "",  date: "114.11.03", type: "收入", item: "邱詠恩贊助",       category: "個人贊助", unitPrice: null, qty: null, total: 2000,  balance: -10499 },
      { id: "2527", note: "",  date: "114.11.10", type: "支出", item: "第五期雜誌寄送",   category: "雜誌寄送", unitPrice: null, qty: null, total: 394,   balance: -10893 },
      { id: "2528", note: "",  date: "114.11.12", type: "支出", item: "第五期雜誌加印",   category: "紙本印製", unitPrice: null, qty: null, total: 880,   balance: -11773 },
      { id: "2529", note: "",  date: "114.11.13", type: "支出", item: "網域續費",         category: "網路維護", unitPrice: null, qty: null, total: 154,   balance: -11927 },
      { id: "2530", note: "",  date: "114.11.14", type: "收入", item: "張辰瑋贊助",       category: "個人贊助", unitPrice: null, qty: null, total: 10000, balance: -1927  },
      { id: "2531", note: "",  date: "114.12.13", type: "支出", item: "網域續費",         category: "網路維護", unitPrice: null, qty: null, total: 154,   balance: -2081  },
      { id: "2532", note: "1", date: "114.12.15", type: "支出", item: "特稿作者稿費",     category: "特稿稿費", unitPrice: null, qty: null, total: 1500,  balance: -3581  },
    ],
  },
  {
    key: 7,
    label: "第七期",
    dateRange: "114.12.16 – 115.02.15",
    rows: [
      { id: "2601", note: "",  date: "114.12.30", type: "支出", item: "第六期雜誌印製", category: "紙本印製",     unitPrice: null,    qty: null, total: 6133, balance: -9714  },
      { id: "2602", note: "",  date: "115.01.05", type: "支出", item: "第六期雜誌加印", category: "紙本印製",     unitPrice: null,    qty: null, total: 1150, balance: -10864 },
      { id: "2603", note: "",  date: "115.01.05", type: "支出", item: "ISSN申請註冊",   category: "雜誌代碼申請", unitPrice: "50歐元", qty: null, total: 2045, balance: -12909 },
      { id: "2604", note: "",  date: "115.01.07", type: "支出", item: "第六期雜誌寄送", category: "雜誌寄送",     unitPrice: null,    qty: null, total: 494,  balance: -13403 },
      { id: "2605", note: "",  date: "115.01.13", type: "支出", item: "網域續費",       category: "網路維護",     unitPrice: "5美元",  qty: null, total: 160,  balance: -13563 },
      { id: "2606", note: "",  date: "115.02.13", type: "支出", item: "網域續費",       category: "網路維護",     unitPrice: "5美元",  qty: null, total: 160,  balance: -13723 },
      { id: "2607", note: "",  date: "115.02.15", type: "支出", item: "特稿作者稿費",   category: "特稿稿費",     unitPrice: null,    qty: null, total: 3000, balance: -16723 },
      { id: "2608", note: "",  date: "115.02.15", type: "收入", item: "何義麟教授贊助", category: "個人贊助",     unitPrice: null,    qty: null, total: 3000, balance: -13723 },
      { id: "2609", note: "",  date: "115.02.15", type: "收入", item: "弘誓青年會訂閱費", category: "紙本訂閱",  unitPrice: null,    qty: null, total: 4200, balance: -9523  },
    ],
  },
];

/** 取得指定期次的財務資料；找不到回傳 null。 */
export function getPeriodByIssue(issueId) {
  const num = parseInt(issueId, 10);
  if (Number.isNaN(num)) return null;
  return periods.find((p) => p.key === num) || null;
}
