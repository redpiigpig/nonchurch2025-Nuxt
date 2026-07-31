import nodemailer from "nodemailer";
import {
  ISSUE_9_REPLY_EMAIL,
  escapeIssue9Html,
  getIssue9OrdersClient,
} from "../../../utils/issue9Orders.js";

function buildConfirmationEmail(order) {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans TC','Microsoft JhengHei',sans-serif;">
  <div style="max-width:620px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2f6f32,#66a96a);padding:22px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:1px;">第九期紙本訂購確認</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">龐君華會督紀念專輯</p>
    </div>
    <div style="padding:30px 34px;color:#333;font-size:15px;line-height:1.9;">
      <p>親愛的 ${escapeIssue9Html(order.name)} 您好：</p>
      <p>我們已確認收到您訂購《無境界者》第九期紙本的匯款，謝謝您的支持。</p>
      <table style="width:100%;border-collapse:collapse;background:#f8faf8;border-left:4px solid #66a96a;">
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;width:120px;">訂購本數</th><td style="padding:9px 14px;">${order.copies} 本</td></tr>
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;">確認金額</th><td style="padding:9px 14px;font-weight:700;">NT$ ${Number(order.amount).toLocaleString("zh-TW")}</td></tr>
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;">帳號後五碼</th><td style="padding:9px 14px;">${escapeIssue9Html(order.last5)}</td></tr>
      </table>
      <p style="margin-top:24px;">紙本預計於九月份寄出。若收件資料有異動，請直接回覆此信告知我們。</p>
      <p>如有任何問題，也歡迎回信至 <a href="mailto:${ISSUE_9_REPLY_EMAIL}" style="color:#2f6f32;">${ISSUE_9_REPLY_EMAIL}</a>。</p>
    </div>
    <div style="background:#f8f8f8;border-top:1px solid #eee;padding:14px 30px;text-align:center;font-size:12px;color:#999;">
      《無境界者》雜誌編輯團隊
    </div>
  </div>
</body>
</html>`;
}

export default defineEventHandler(async (event) => {
  await requireAdminUser(event);
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: "訂單編號不正確。" });
  }

  const config = useRuntimeConfig();
  if (!config.gmailUser || !config.gmailAppPassword) {
    throw createError({ statusCode: 500, message: "伺服器尚未設定寄信功能。" });
  }

  const supabase = getIssue9OrdersClient();
  const { data: order, error: loadError } = await supabase
    .from("issue_9_payment_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    throw createError({ statusCode: 500, message: `載入訂單失敗：${loadError.message}` });
  }
  if (!order) {
    throw createError({ statusCode: 404, message: "找不到這筆訂單。" });
  }
  if (order.confirmed && order.confirmation_email_sent_at) {
    return { order, alreadyConfirmed: true };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.gmailUser, pass: config.gmailAppPassword },
  });

  await transporter.sendMail({
    from: `《無境界者》雜誌 <${config.gmailUser}>`,
    to: order.email,
    replyTo: ISSUE_9_REPLY_EMAIL,
    subject: "《無境界者》第九期紙本訂購匯款已確認",
    html: buildConfirmationEmail(order),
  });

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("issue_9_payment_orders")
    .update({
      confirmed: true,
      confirmed_at: order.confirmed_at || now,
      confirmation_email_sent_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    throw createError({
      statusCode: 500,
      message: `確認信已寄出，但狀態更新失敗：${updateError.message}`,
    });
  }

  return { order: updated, alreadyConfirmed: false };
});
