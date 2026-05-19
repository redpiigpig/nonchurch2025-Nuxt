// server/api/submit.post.js
// 新增投稿（POST）或修改投稿（POST with submission_id）
import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const body = await readBody(event);
  const {
    submission_id,   // 若有則為修改模式
    real_name, display_name, author_bio, email,
    is_first_submission, author_intro, avatar_url,
    issue_number, title, category, article_summary,
    keywords, notes, word_url, pdf_url, images, parsed_html,
  } = body;

  if (!real_name || !author_bio || !email || !title || !category)
    throw createError({ statusCode: 400, message: "缺少必填欄位" });

  // 修改與新增都需要 service role（繞過 RLS）
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  );

  const payload = {
    real_name,
    display_name: display_name || null,
    author_bio,
    email,
    is_first_submission: !!is_first_submission,
    author_intro: author_intro || null,
    avatar_url: avatar_url || null,
    issue_number: issue_number || null,
    title,
    category,
    article_summary: article_summary || null,
    keywords: keywords || [],
    notes: notes || null,
    word_url: word_url || null,
    pdf_url: pdf_url || null,
    images: images || [],
    parsed_html: parsed_html || null,
  };

  // ── 共用：寄出管理員通知（不阻塞主流程）─────────────────────────
  const fireNotify = async (mode, submissionId) => {
    const html = adminMailTemplate({
      title: mode === "updated" ? "📝 投稿已修改" : "📥 新投稿送達",
      lines: [
        { label: "標題", value: title },
        { label: "投稿者", value: `${real_name}${display_name ? `（${display_name}）` : ""}` },
        { label: "Email", value: email },
        { label: "類別", value: category },
        { label: "期別", value: issue_number ? `Vol.${issue_number}` : "未指定" },
        { label: "投稿 ID", value: submissionId },
      ],
      link: { url: `${config.siteUrl}/admin/submissions_manager`, label: "前往投稿管理" },
    });
    await notifyAdmin({
      subject: mode === "updated" ? `投稿修改：${title}` : `新投稿：${title}`,
      html,
    });
  };

  // ── 修改模式 ──────────────────────────────────────────────────────
  if (submission_id) {
    // 先驗證 email 對應
    const { data: existing } = await supabase
      .from("submissions")
      .select("email, status")
      .eq("id", submission_id)
      .single();

    if (!existing)
      throw createError({ statusCode: 404, message: "找不到該投稿" });
    if (existing.email !== email.trim())
      throw createError({ statusCode: 403, message: "Email 不符，無法修改" });
    if (existing.status === "converted")
      throw createError({ statusCode: 400, message: "此投稿已轉換為文章，無法修改" });

    const { error } = await supabase
      .from("submissions")
      .update({ ...payload, status: "submitted" }) // 修改後重置為待審核
      .eq("id", submission_id);

    if (error) throw createError({ statusCode: 500, message: error.message });
    fireNotify("updated", submission_id).catch(() => {}); // 背景寄信，失敗不影響回應
    return { success: true, id: submission_id, mode: "updated" };
  }

  // ── 新增模式 ──────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from("submissions")
    .insert([{ ...payload, status: "submitted" }])
    .select("id")
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });
  fireNotify("created", data.id).catch(() => {});
  return { success: true, id: data.id, mode: "created" };
});
