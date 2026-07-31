import nodemailer from "nodemailer";
import {
  ISSUE_9_REPLY_EMAIL,
  ISSUE_9_UNIT_PRICE,
  escapeIssue9Html,
  getIssue9OrdersClient,
  validateIssue9OrderInput,
} from "../utils/issue9Orders.js";

function buildTeamEmail({ name, email, copies, last5, message, adminUrl }) {
  const amount = copies * ISSUE_9_UNIT_PRICE;
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans TC','Microsoft JhengHei',sans-serif;">
  <div style="max-width:620px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2f6f32,#66a96a);padding:22px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:1px;">第九期紙本匯款回覆</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">龐會督紀念專輯</p>
    </div>
    <div style="padding:30px 34px;color:#333;font-size:15px;line-height:1.9;">
      <p>有一筆新的紙本訂購匯款回覆，請核對郵局帳戶：</p>
      <table style="width:100%;border-collapse:collapse;background:#f8faf8;border-left:4px solid #66a96a;">
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;width:120px;">姓名</th><td style="padding:9px 14px;">${escapeIssue9Html(name)}</td></tr>
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;">聯繫 Email</th><td style="padding:9px 14px;">${escapeIssue9Html(email)}</td></tr>
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;">訂購本數</th><td style="padding:9px 14px;">${copies} 本</td></tr>
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;">應匯金額</th><td style="padding:9px 14px;font-weight:700;">NT$ ${amount.toLocaleString("zh-TW")}</td></tr>
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;">帳號後五碼</th><td style="padding:9px 14px;font-weight:700;">${escapeIssue9Html(last5)}</td></tr>
        ${message ? `<tr><th style="padding:9px 14px;text-align:left;color:#687268;vertical-align:top;">備註</th><td style="padding:9px 14px;">${escapeIssue9Html(message)}</td></tr>` : ""}
      </table>
      <div style="margin:26px 0;text-align:center;">
        <a href="${adminUrl}" style="display:inline-block;padding:12px 24px;border-radius:6px;background:#2f6f32;color:#fff;text-decoration:none;font-weight:700;">前往後台確認收款</a>
      </div>
      <p style="margin-top:22px;color:#777;font-size:13px;">在後台按下「確認收款並寄信」後，系統會寄出確認信給訂購者。</p>
    </div>
    <div style="background:#f8f8f8;border-top:1px solid #eee;padding:14px 30px;text-align:center;font-size:12px;color:#999;">
      《無境界者》雜誌編輯團隊
    </div>
  </div>
</body>
</html>`;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const { name, email, copies, last5, message } = validateIssue9OrderInput(body);

  const supabase = getIssue9OrdersClient();
  const { data: order, error: insertError } = await supabase
    .from("issue_9_payment_orders")
    .insert({ name, email, copies, unit_price: ISSUE_9_UNIT_PRICE, last5, message })
    .select("id")
    .single();

  if (insertError || !order) {
    console.error("issue 9 payment order insert failed", insertError?.message);
    throw createError({ statusCode: 500, message: "匯款資料暫時無法儲存，請稍後再試。" });
  }

  if (!config.gmailUser || !config.gmailAppPassword) {
    return { success: true, orderId: order.id, notificationSent: false };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.gmailUser, pass: config.gmailAppPassword },
  });

  try {
    await transporter.sendMail({
      from: `《無境界者》雜誌 <${config.gmailUser}>`,
      to: ISSUE_9_REPLY_EMAIL,
      replyTo: email,
      subject: `【第九期紙本匯款】${name}｜${copies} 本｜NT$ ${(copies * ISSUE_9_UNIT_PRICE).toLocaleString("zh-TW")}`,
      html: buildTeamEmail({
        name,
        email,
        copies,
        last5,
        message,
        adminUrl: `${config.siteUrl}/admin/issue-9-payments?order=${order.id}`,
      }),
    });
    return { success: true, orderId: order.id, notificationSent: true };
  } catch (error) {
    console.error("issue 9 payment notification email failed", error?.message);
    return { success: true, orderId: order.id, notificationSent: false };
  }
});
