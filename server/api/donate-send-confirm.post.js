// server/api/donate-send-confirm.post.js
// 管理員在後台按「已確認匯款」時，寄確認信給贊助者
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
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.88);font-size:13px;">感謝您的贊助支持</p>
    </div>

    <div style="padding:32px 36px;color:#333;font-size:15px;line-height:2;">
      <p>親愛的 ${name} 您好，</p>
      <p>我們已確認收到您的匯款，非常感謝您對《無境界者》的支持與認同！您的贊助將成為我們持續出版的重要動力。</p>
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

export default defineEventHandler(async (event) => {
  await requireAdminUser(event);
  const config = useRuntimeConfig();
  const { name, email } = await readBody(event);

  if (!name?.trim() || !email?.trim()) {
    throw createError({ statusCode: 400, message: "缺少姓名或信箱" });
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
    subject: "《無境界者》已確認收到您的贊助匯款，感謝您！",
    html: buildDonorEmail(name.trim(), config.siteUrl),
  });

  return { success: true };
});
