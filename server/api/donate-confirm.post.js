// server/api/donate-confirm.post.js
// 贊助者回填後：寄確認信給贊助者、寄通知信給編輯團隊
import nodemailer from "nodemailer";

const REPLY_EMAIL = "nonchurch2025@gmail.com";

function buildDonorEmail(name, siteUrl) {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'DFKai-SB','標楷體',serif;">
  <div style="max-width:620px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:linear-gradient(135deg,#4caf50,#81c784);padding:22px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-family:'DFKai-SB','標楷體',serif;letter-spacing:2px;">《無境界者》雜誌</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.88);font-size:13px;">感謝您的支持與回填</p>
    </div>

    <div style="padding:32px 36px;color:#333;font-size:15px;line-height:2;">
      <p>親愛的 ${name} 您好，</p>
      <p>我們已收到您的回填資訊，感謝您對《無境界者》的贊助。我們將盡快確認匯款，確認完成後將另行通知您。</p>
      <p>若您有任何問題，歡迎隨時回信至
        <a href="mailto:${REPLY_EMAIL}" style="color:#4caf50;">${REPLY_EMAIL}</a>。
      </p>
      <p style="margin-top:24px;">尚未訂閱《無境界者》電子報嗎？每期出刊時我們將寄送通知至您的信箱，歡迎加入我們的讀者社群：</p>

      <div style="text-align:center;margin:28px 0;">
        <a href="${siteUrl}/subscribe"
           style="display:inline-block;background:linear-gradient(135deg,#4caf50,#81c784);color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:15px;font-family:'DFKai-SB','標楷體',serif;letter-spacing:1px;">
          📮 線上訂閱電子報
        </a>
      </div>

      <p>願文字事工的種子繼續在各方土地上生根，感謝您成為《無境界者》的守護者。</p>
    </div>

    <div style="background:#f8f8f8;border-top:1px solid #eee;padding:16px 36px;text-align:center;font-size:12px;color:#aaa;line-height:1.8;">
      《無境界者》雜誌編輯團隊<br>
      <a href="mailto:${REPLY_EMAIL}" style="color:#aaa;">${REPLY_EMAIL}</a>
    </div>

  </div>
</body>
</html>`;
}

function buildTeamEmail(name, email, date, amount, last5, is_public, message) {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'DFKai-SB','標楷體',serif;">
  <div style="max-width:620px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:linear-gradient(135deg,#4caf50,#81c784);padding:22px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-family:'DFKai-SB','標楷體',serif;letter-spacing:2px;">《無境界者》雜誌</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.88);font-size:13px;">收到新的贊助回填通知</p>
    </div>

    <div style="padding:32px 36px;color:#333;font-size:15px;line-height:2;">
      <p>有新的贊助者完成回填，請確認匯款：</p>

      <div style="background:#f7f7f7;border-left:4px solid #4caf50;padding:16px 20px;margin:20px 0;border-radius:4px;line-height:2.4;">
        <div><strong>姓名：</strong>${name}</div>
        <div><strong>電子郵件：</strong>${email}</div>
        <div><strong>匯款時間：</strong>${date}</div>
        <div><strong>匯款金額：</strong>NT$ ${amount}</div>
        <div><strong>帳號末五碼：</strong>${last5}</div>
        <div><strong>是否公開姓名：</strong>${is_public}</div>
        ${message ? `<div><strong>留言：</strong>${message}</div>` : ""}
      </div>

      <p style="font-size:13px;color:#888;">請至郵局帳戶確認匯款，並回信至贊助者信箱告知確認完成，謝謝。</p>
    </div>

    <div style="background:#f8f8f8;border-top:1px solid #eee;padding:16px 36px;text-align:center;font-size:12px;color:#aaa;line-height:1.8;">
      《無境界者》雜誌編輯團隊<br>
      <a href="mailto:${REPLY_EMAIL}" style="color:#aaa;">${REPLY_EMAIL}</a>
    </div>

  </div>
</body>
</html>`;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { name, email, date, amount, last5, is_public, message } = await readBody(event);

  if (!name?.trim() || !email?.trim() || !date?.trim() || !amount?.trim() || !last5?.trim() || !is_public) {
    throw createError({ statusCode: 400, message: "請填寫所有必填欄位" });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw createError({ statusCode: 400, message: "電子郵件格式不正確" });
  }
  if (!config.gmailUser || !config.gmailAppPassword) {
    throw createError({ statusCode: 500, message: "伺服器未設定 Gmail 環境變數" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.gmailUser, pass: config.gmailAppPassword },
  });

  await Promise.all([
    transporter.sendMail({
      from: `《無境界者》雜誌 <${config.gmailUser}>`,
      to: email.trim(),
      subject: "《無境界者》感謝您的贊助——已收到回填資訊",
      html: buildDonorEmail(name.trim(), config.siteUrl),
    }),
    transporter.sendMail({
      from: `《無境界者》雜誌 <${config.gmailUser}>`,
      to: REPLY_EMAIL,
      subject: `【贊助通知】${name.trim()} NT$${amount.trim()}`,
      html: buildTeamEmail(name.trim(), email.trim(), date.trim(), amount.trim(), last5.trim(), is_public, message?.trim() || ""),
    }),
  ]);

  return { success: true };
});
