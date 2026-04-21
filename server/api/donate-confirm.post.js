// server/api/donate-confirm.post.js
// 贊助者回填後：寄通知信給編輯團隊，並寫入 Supabase donations 資料表
// （確認匯款信改由管理員在後台按「已確認」時由 donate-send-confirm.post.js 發送）
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const REPLY_EMAIL = "nonchurch2025@gmail.com";

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

  await transporter.sendMail({
    from: `《無境界者》雜誌 <${config.gmailUser}>`,
    to: REPLY_EMAIL,
    subject: `【贊助通知】${name.trim()} NT$${amount.trim()}`,
    html: buildTeamEmail(name.trim(), email.trim(), date.trim(), amount.trim(), last5.trim(), is_public, message?.trim() || ""),
  });

  // 寫入 Supabase（使用 service key 繞過 RLS）
  if (config.supabaseServiceKey && config.public?.supabaseUrl) {
    const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceKey);
    await supabase.from("donations").insert({
      name: name.trim(),
      email: email.trim(),
      donate_date: date.trim(),
      amount: amount.trim(),
      last5: last5.trim(),
      is_public,
      message: message?.trim() || null,
    });
  }

  return { success: true };
});
