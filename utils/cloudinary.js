/**
 * 為 Cloudinary URL 插入轉換參數
 * 自動轉 WebP/AVIF + 壓縮品質，大幅縮小傳輸量
 *
 * @param {string} url     - 原始 Cloudinary URL
 * @param {string} transforms - Cloudinary 轉換字串，例如 "f_auto,q_auto,w_400"
 * @returns {string} 加上轉換參數的 URL
 */
export function cloudinaryUrl(url, transforms) {
  if (!url || !transforms) return url;
  // 只處理 Cloudinary URL
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  // 避免重複插入
  const afterMarker = url.slice(idx + marker.length);
  if (afterMarker.startsWith("f_") || afterMarker.startsWith("w_") || afterMarker.startsWith("q_")) {
    return url;
  }
  return url.slice(0, idx + marker.length) + transforms + "/" + afterMarker;
}

// 常用預設轉換組合
export const CLD = {
  /** Header logo / icon，固定小尺寸 */
  logoIcon: "f_auto,q_auto,w_60",
  /** Header 文字圖，固定寬度 */
  logoText: "f_auto,q_auto,w_180",
  /** 封面圖，手機版約 400px，桌機 < 500px */
  cover: "f_auto,q_auto,w_500",
  /** 作者大頭貼，160px 顯示尺寸使用 2x 圖，避免高密度螢幕模糊 */
  avatar: "f_auto,q_auto,w_320,h_320,c_fill,g_face",
  /** 文章縮圖 */
  thumb: "f_auto,q_auto,w_300",
};
