// server/api/delete-article.post.js
// 刪除文章：使用 service role key 繞過 RLS，同時清除 Cloudinary 圖片與 media_assets 記錄
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

export default defineEventHandler(async (event) => {
  await requireAdminUser(event);
  const config = useRuntimeConfig();

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  );

  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
  });

  const { articleId } = await readBody(event);
  if (!articleId) throw createError({ statusCode: 400, message: "缺少 articleId" });

  // 1. 查出此文章的所有媒體資產
  const { data: assets, error: assetErr } = await supabase
    .from("media_assets")
    .select("id, cloudinary_id")
    .eq("article_id", articleId);

  if (assetErr) throw createError({ statusCode: 500, message: "查詢媒體資產失敗：" + assetErr.message });

  // 2. 從 Cloudinary 刪除實體圖片（逐一，失敗不中斷）
  const cloudinaryResults = [];
  if (assets && assets.length > 0) {
    for (const img of assets) {
      try {
        await cloudinary.uploader.destroy(img.cloudinary_id, { resource_type: "image" });
        cloudinaryResults.push({ id: img.cloudinary_id, ok: true });
      } catch (e) {
        cloudinaryResults.push({ id: img.cloudinary_id, ok: false, err: e.message });
      }
    }

    // 3. 刪除 media_assets DB 記錄
    const { error: delAssetErr } = await supabase
      .from("media_assets")
      .delete()
      .eq("article_id", articleId);
    if (delAssetErr) throw createError({ statusCode: 500, message: "刪除媒體記錄失敗：" + delAssetErr.message });
  }

  // 4. 刪除文章本體
  const { error: delErr } = await supabase
    .from("articles")
    .delete()
    .eq("id", articleId);
  if (delErr) throw createError({ statusCode: 500, message: "刪除文章失敗：" + delErr.message });

  return {
    success: true,
    deletedImages: assets?.length || 0,
    cloudinaryResults,
  };
});
