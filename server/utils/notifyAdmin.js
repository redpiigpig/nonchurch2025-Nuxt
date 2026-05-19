// server/utils/notifyAdmin.js
// 寄送站內事件通知到管理員信箱（redpiigpig@gmail.com 或 .env ADMIN_NOTIFY_EMAIL）。
// 由 nitro 自動匯入：在 server/api/*.post.js 內直接呼叫 notifyAdmin({...})。
// 失敗時只記 log，不丟錯誤給 caller，避免通知失敗影響主流程。

import nodemailer from "nodemailer";

let cachedTransporter = null;

function getTransporter(config) {
  if (cachedTransporter) return cachedTransporter;
  if (!config.gmailUser || !config.gmailAppPassword) return null;
  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.gmailUser, pass: config.gmailAppPassword },
  });
  return cachedTransporter;
}

/**
 * @param {object} opts
 * @param {string} opts.subject  信件主旨（會自動加上 [無境界者] 前綴）
 * @param {string} opts.html     信件 HTML 內容
 * @param {string} [opts.text]   純文字後備內容
 * @param {string} [opts.to]     收件人 email；省略則寄給 adminNotifyEmail
 */
export async function notifyAdmin({ subject, html, text, to }) {
  try {
    const config = useRuntimeConfig();
    const transporter = getTransporter(config);
    if (!transporter) {
      console.warn("[notifyAdmin] Gmail 環境變數未設定，略過通知");
      return { sent: false, reason: "no-config" };
    }
    const recipient = to || config.adminNotifyEmail;
    if (!recipient) {
      console.warn("[notifyAdmin] 收件人未設定");
      return { sent: false, reason: "no-recipient" };
    }
    await transporter.sendMail({
      from: `《無境界者》站內通知 <${config.gmailUser}>`,
      to: recipient,
      subject: `[無境界者] ${subject}`,
      html,
      text: text || subject,
    });
    return { sent: true };
  } catch (err) {
    console.error("[notifyAdmin] 寄信失敗:", err?.message || err);
    return { sent: false, reason: "send-error", error: err?.message };
  }
}

/** 共用：簡潔 HTML 模板（綠色 header + 內容區塊）*/
export function adminMailTemplate({ title, lines = [], link }) {
  const linesHtml = lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0;color:#666;width:90px;vertical-align:top;">${l.label}</td><td style="padding:6px 0;color:#222;">${l.value || "—"}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:620px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2c3e50,#3498db);padding:18px 28px;">
      <h1 style="margin:0;color:#fff;font-size:18px;letter-spacing:1px;">${title}</h1>
    </div>
    <div style="padding:24px 28px;color:#333;font-size:14px;line-height:1.7;">
      <table style="width:100%;border-collapse:collapse;">${linesHtml}</table>
      ${
        link
          ? `<div style="text-align:center;margin-top:24px;">
              <a href="${link.url}" style="display:inline-block;background:#3498db;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;">${link.label}</a>
            </div>`
          : ""
      }
    </div>
    <div style="background:#f8f8f8;border-top:1px solid #eee;padding:12px 28px;text-align:center;font-size:11px;color:#aaa;">
      此為《無境界者》後台自動通知，請勿直接回覆。
    </div>
  </div>
</body>
</html>`;
}
