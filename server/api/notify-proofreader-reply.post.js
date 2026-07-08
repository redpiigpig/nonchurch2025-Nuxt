// server/api/notify-proofreader-reply.post.js
// 編輯在 EditorView 對某條校對標記填寫了回覆並按下「替換」或「✓ 標記解決」時，
// 由前端 fire-and-forget 呼叫此端點，通知校對員（noah110742@gmail.com）來看回應。
// 條件：editorReply 必須是「使用者實際打字的內容」（自動產生的「已替換為：xxx」不在此列）。

const ACTION_LABEL = {
  adopted: "✅ 採用替換",
  resolved: "✓ 標記解決",
};

const escapeHtml = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const truncate = (s = "", max = 80) =>
  s.length > max ? s.slice(0, max) + "…" : s;

export default defineEventHandler(async (event) => {
  await requireAdminUser(event);
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const {
    article_id,
    article_title,
    selected_text,
    proofreader_note,
    editor_reply,
    action, // 'adopted' | 'resolved'
    replaced_with, // 替換時的新文字（選填）
  } = body || {};

  if (!article_id) throw createError({ statusCode: 400, message: "缺少 article_id" });
  if (!editor_reply || !String(editor_reply).trim()) {
    // 沒回覆就不寄，避免雜訊
    return { success: true, sent: false, reason: "no-reply" };
  }

  const lines = [
    { label: "文章", value: `${escapeHtml(article_title || "—")}（${escapeHtml(article_id)}）` },
    {
      label: "標記位置",
      value: `「${escapeHtml(truncate(selected_text || "", 80))}」`,
    },
    {
      label: "你的校對",
      value: proofreader_note ? escapeHtml(proofreader_note) : "（無備註）",
    },
    {
      label: "編輯回覆",
      value: `<span style="background:#fff8e1;padding:2px 6px;border-radius:3px;">${escapeHtml(editor_reply)}</span>`,
    },
    { label: "處理動作", value: ACTION_LABEL[action] || action || "—" },
  ];
  if (action === "adopted" && replaced_with) {
    lines.splice(4, 0, {
      label: "新文字",
      value: `「${escapeHtml(truncate(replaced_with, 80))}」`,
    });
  }

  const html = adminMailTemplate({
    title: "💬 編輯回覆了你的校對標記",
    lines,
    link: {
      url: `${config.siteUrl}/admin/proofread/${article_id}`,
      label: "前往查看校對頁",
    },
  });

  const result = await notifyAdmin({
    to: config.proofreaderNotifyEmail,
    subject: `編輯回覆：${article_title || article_id}`,
    html,
  });

  return { success: true, ...result };
});
