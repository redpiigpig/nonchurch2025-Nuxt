// server/api/notify-proofread-complete.post.js
// 校對員按下「✓ 確認完成校對」並成功寫入 DB 後，由 ProofreadView 呼叫此端點通知管理員。
// 這個 API 不重複寫 DB，只負責寄通知信，因此不需要 service key。
// 不做嚴格驗證（避免擋住通知）——這是純通知，沒有資料寫入動作。

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const { article_id, title, proofread_by, proofread_date, annotation_count } = body || {};

  if (!article_id) {
    throw createError({ statusCode: 400, message: "缺少 article_id" });
  }

  const html = adminMailTemplate({
    title: "✓ 校對完成",
    lines: [
      { label: "文章 ID", value: article_id },
      { label: "標題", value: title || "—" },
      { label: "校對者", value: proofread_by || "—" },
      { label: "校對日期", value: proofread_date || "—" },
      { label: "標記數", value: annotation_count != null ? String(annotation_count) : "—" },
    ],
    link: {
      url: `${config.siteUrl}/admin/editor/${article_id}`,
      label: "前往編輯文章",
    },
  });

  const result = await notifyAdmin({
    subject: `校對完成：${title || article_id}`,
    html,
  });

  return { success: true, ...result };
});
