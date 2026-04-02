export const CDN = "https://res.cloudinary.com/nonchurch2025/image/upload";

/**
 * 取得 CDN 圖片完整 URL
 * @param {string} filename - 檔案名稱，例如 "topic.jpg"
 * @returns {string} 完整 URL
 */
export const cdnUrl = (filename) => `${CDN}/${filename}`;
