// server/api/donate-inquiry.post.js
// 收到贊助意願後，寄匯款帳號至填寫者信箱
import nodemailer from "nodemailer";

const REPLY_EMAIL = "nonchurch2025@gmail.com";

function buildEmail(name, email, siteUrl) {
  const confirmUrl = `${siteUrl}/donate-confirm?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'DFKai-SB','標楷體',serif;">
  <div style="max-width:620px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:linear-gradient(135deg,#4caf50,#81c784);padding:22px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-family:'DFKai-SB','標楷體',serif;letter-spacing:2px;">《無境界者》雜誌</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.88);font-size:13px;">感謝您願意支持本刊</p>
    </div>

    <div style="padding:32px 36px;color:#333;font-size:15px;line-height:2;">
      <p>親愛的 ${name} 您好，</p>
      <p>感謝您對《無境界者》的支持與認同。以下是匯款資訊，請完成匯款後，點擊下方按鈕回覆告知，謝謝。</p>

      <div style="background:#f7f7f7;border-left:4px solid #4caf50;padding:16px 20px;margin:20px 0;border-radius:4px;line-height:2.2;">
        <div><strong>銀行：</strong>700 中華郵政</div>
        <div><strong>戶名：</strong>張辰瑋</div>
        <div><strong>帳號：</strong>000-2413-016-9098</div>
      </div>

      <p>完成匯款後，請點擊下方按鈕填寫回填表單：</p>

      <div style="text-align:center;margin:28px 0;">
        <a href="${confirmUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#4caf50,#81c784);color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:15px;font-family:'DFKai-SB','標楷體',serif;letter-spacing:1px;">
          ✉ 匯款完成，點此回填
        </a>
      </div>

      <p style="font-size:13px;color:#888;">若按鈕無法使用，請直接回覆此封信至 <a href="mailto:${REPLY_EMAIL}" style="color:#4caf50;">${REPLY_EMAIL}</a>，並告知：匯款時間、金額、帳號末五碼，以及是否願意公開姓名於財務明細。</p>

      <p style="margin-top:24px;">願文字事工的種子繼續在各方土地上生根，感謝您成為《無境界者》的守護者。</p>
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
  const { name, email } = await readBody(event);

  if (!name?.trim() || !email?.trim()) {
    throw createError({ statusCode: 400, message: "請填寫稱呼與電子信箱" });
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

  await transporter.sendMail({
    from: `《無境界者》雜誌 <${config.gmailUser}>`,
    to: email.trim(),
    subject: "《無境界者》贊助匯款帳號",
    html: buildEmail(name.trim(), email.trim(), config.siteUrl),
  });

  return { success: true };
});
