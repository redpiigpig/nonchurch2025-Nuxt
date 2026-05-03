/**
 * 財務徵信「性質」分類與對應顏色
 * 前台 /finance 與後台 /admin/finance 共用，確保同樣文字呈現同樣顏色。
 *
 * 新增類別時直接在這裡加一筆，雙端立即同步。
 */

export const CATEGORY_COLORS = {
  個人贊助: "#2e7d32",
  機構補助: "#1565c0",
  專案贊助: "#1976d2",
  雜誌訂閱: "#00838f",
  紙本訂閱: "#00838f",
  紙本印製: "#e65100",
  雜誌寄送: "#7b1fa2",
  網路維護: "#37474f",
  雜費: "#78909c",
  利息: "#558b2f",
  編輯費用: "#bf360c",
  特稿稿費: "#880e4f",
  雜誌代碼申請: "#4e342e",
};

/** 下拉選單用：依字母（其實是 Object 插入順序）排列的類別名稱列表。 */
export const CATEGORY_LIST = Object.keys(CATEGORY_COLORS);

/** 取得類別顏色，未知類別 fallback 為灰色（讓使用者知道不在預設清單中）。 */
export function getCatColor(category) {
  return CATEGORY_COLORS[category] || "#666";
}
