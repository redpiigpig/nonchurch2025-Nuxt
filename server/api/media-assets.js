// server/api/media-assets.js
// media_assets 表的 CRUD，使用 service key 繞過 RLS
import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  );

  const method = event.node.req.method;

  // POST：新增一筆 media_assets
  if (method === "POST") {
    const body = await readBody(event);
    const { issue_id, article_id, cloudinary_id, image_url, sort_order } = body;
    if (!article_id || !cloudinary_id || !image_url) {
      return { success: false, error: "缺少必要欄位" };
    }
    const { data, error } = await supabase.from("media_assets").insert({
      issue_id,
      article_id,
      cloudinary_id,
      image_url,
      sort_order,
    }).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  // DELETE：刪除一筆（by id）
  if (method === "DELETE") {
    const body = await readBody(event);
    const { id } = body;
    if (!id) return { success: false, error: "缺少 id" };
    const { error } = await supabase.from("media_assets").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // PATCH：批次更新 sort_order
  if (method === "PATCH") {
    const body = await readBody(event);
    const { updates } = body; // [{ id, sort_order }, ...]
    if (!Array.isArray(updates)) return { success: false, error: "updates 需為陣列" };
    const results = await Promise.all(
      updates.map(({ id, sort_order }) =>
        supabase.from("media_assets").update({ sort_order }).eq("id", id)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed) return { success: false, error: failed.error.message };
    return { success: true };
  }

  return { success: false, error: "不支援的方法" };
});
