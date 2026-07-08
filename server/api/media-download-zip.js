// server/api/media-download-zip.js
// 產生「下載本期所有文章圖片」的 Cloudinary zip 連結。
// 前端帶 ?issue=N，後端蒐集該期所有文章圖片的 public_id，
// 再用 cloudinary.utils.download_zip_url 產生一個簽名 zip 下載連結回傳。
import { v2 as cloudinary } from "cloudinary";

export default defineEventHandler(async (event) => {
  await requireAdminUser(event);
  const config = useRuntimeConfig();
  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
  });

  const query = getQuery(event);
  const issue = String(query.issue || "").trim();
  if (!issue || !/^\d+$/.test(issue)) {
    return { success: false, error: "缺少有效的 issue 參數" };
  }

  // 同一期文章圖片歷史上散落在三種位置 / 命名：
  //   1. 根目錄        issue{N}_*           （第 1～7 期舊資料）
  //   2. articles/issue-{N}/                （第 8、9 期舊命名）
  //   3. images/articles/issue-{N}/         （正規路徑，新命名 {N}-篇-序）
  const prefixes = [
    `issue${issue}_`,
    `articles/issue-${issue}/`,
    `images/articles/issue-${issue}/`,
  ];

  try {
    const idSet = new Set();
    for (const prefix of prefixes) {
      let nextCursor = null;
      do {
        const res = await cloudinary.api.resources({
          type: "upload",
          resource_type: "image",
          prefix,
          max_results: 500,
          next_cursor: nextCursor,
        });
        (res.resources || []).forEach((r) => idSet.add(r.public_id));
        nextCursor = res.next_cursor;
      } while (nextCursor);
    }

    const publicIds = [...idSet];
    if (publicIds.length === 0) {
      return { success: false, error: `第 ${issue} 期目前沒有任何文章圖片可下載` };
    }

    const url = cloudinary.utils.download_zip_url({
      public_ids: publicIds,
      resource_type: "image",
      // 下載後的 zip 檔名
      target_public_id: `nonchurch-issue-${issue}-images`,
    });

    return { success: true, url, count: publicIds.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
