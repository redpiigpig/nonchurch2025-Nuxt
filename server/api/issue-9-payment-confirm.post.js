import nodemailer from "nodemailer";

const REPLY_EMAIL = "nonchurch2025@gmail.com";
const UNIT_PRICE = 350;

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function buildTeamEmail({ name, email, copies, last5, message }) {
  const amount = copies * UNIT_PRICE;
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
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;width:120px;">姓名</th><td style="padding:9px 14px;">${escapeHtml(name)}</td></tr>
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;">聯繫 Email</th><td style="padding:9px 14px;">${escapeHtml(email)}</td></tr>
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;">訂購本數</th><td style="padding:9px 14px;">${copies} 本</td></tr>
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;">應匯金額</th><td style="padding:9px 14px;font-weight:700;">NT$ ${amount.toLocaleString("zh-TW")}</td></tr>
        <tr><th style="padding:9px 14px;text-align:left;color:#687268;">帳號後五碼</th><td style="padding:9px 14px;font-weight:700;">${escapeHtml(last5)}</td></tr>
        ${message ? `<tr><th style="padding:9px 14px;text-align:left;color:#687268;vertical-align:top;">備註</th><td style="padding:9px 14px;">${escapeHtml(message)}</td></tr>` : ""}
      </table>
      <p style="margin-top:22px;color:#777;font-size:13px;">確認匯款後，可直接回覆此信通知訂購者；回覆地址已設為訂購者的 Email。</p>
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
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const copies = Number(body?.copies);
  const last5 = String(body?.last5 || "").trim();
  const message = String(body?.message || "").trim();

  if (!name || !email || !Number.isInteger(copies) || copies < 1 || copies > 1000 || !/^\d{5}$/.test(last5)) {
    throw createError({ statusCode: 400, message: "請確認姓名、Email、訂購本數與帳號後五碼。" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, message: "Email 格式不正確。" });
  }
  if (name.length > 60 || email.length > 200 || message.length > 500) {
    throw createError({ statusCode: 400, message: "填寫內容超過長度限制。" });
  }
  if (!config.gmailUser || !config.gmailAppPassword) {
    throw createError({ statusCode: 500, message: "伺服器尚未設定寄信功能。" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.gmailUser, pass: config.gmailAppPassword },
  });

  await transporter.sendMail({
    from: `《無境界者》雜誌 <${config.gmailUser}>`,
    to: REPLY_EMAIL,
    replyTo: email,
    subject: `【第九期紙本匯款】${name}｜${copies} 本｜NT$ ${(copies * UNIT_PRICE).toLocaleString("zh-TW")}`,
    html: buildTeamEmail({ name, email, copies, last5, message }),
  });

  return { success: true };
});
