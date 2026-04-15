// server/api/send-newsletter.post.js
// 發送電子報給所有訂閱者（Gmail SMTP + Nodemailer）
// Gmail 每日上限 ~500 封，每封間隔 400ms 避免限速

import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

/**
 * 純文字 → HTML（段落換行、URL 自動超連結）
 */
function textToHtml(text) {
  return text
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para
        .split("\n")
        .map((line) =>
          line.replace(
            /(https?:\/\/[^\s<>"]+)/g,
            '<a href="$1" style="color:#4caf50;">$1</a>'
          )
        )
        .join("<br>");
      return `<p style="margin:0 0 18px;line-height:1.9;">${lines}</p>`;
    })
    .join("");
}

/**
 * 包裝成完整 HTML Email（無境界者品牌樣式）
 * @param {string} unsubscribeUrl - 個人化取消訂閱連結（含 token）
 */
function buildEmailHtml(bodyHtml, pdfLink, unsubscribeUrl) {
  const pdfBtn = pdfLink
    ? `<div style="text-align:center;margin:28px 0;">
        <a href="${pdfLink}"
           style="display:inline-block;background:#4caf50;color:#fff;
                  padding:13px 36px;border-radius:30px;text-decoration:none;
                  font-weight:bold;font-size:16px;letter-spacing:0.05em;">
          📖 閱讀本期完整 PDF
        </a>
       </div>`
    : "";

  const unsubLink = unsubscribeUrl
    ? `<p style="margin:4px 0 0;">
        如欲取消訂閱，請
        <a href="${unsubscribeUrl}" style="color:#aaa;">點此連結</a>。
       </p>`
    : `<p style="margin:4px 0 0;">如欲取消訂閱，請回覆此郵件並告知。</p>`;

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>《無境界者》電子報</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;
             font-family:'Microsoft JhengHei','Noto Serif TC',serif;">
  <div style="max-width:620px;margin:24px auto;background:#fff;
              border-radius:8px;overflow:hidden;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4caf50,#81c784);
                padding:22px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;
                 letter-spacing:0.12em;font-weight:bold;">
        《無境界者》雜誌
      </h1>
    </div>

    <!-- Body -->
    <div style="padding:32px 36px;color:#333;font-size:15px;">
      ${bodyHtml}
      ${pdfBtn}
    </div>

    <!-- Footer -->
    <div style="background:#f8f8f8;border-top:1px solid #eee;
                padding:18px 36px;text-align:center;
                font-size:12px;color:#aaa;line-height:1.7;">
      <p style="margin:0 0 4px;">您收到此郵件是因為您曾訂閱《無境界者》雜誌電子報。</p>
      ${unsubLink}
    </div>
  </div>
</body>
</html>`;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  const { subject, bodyText, pdfLink, testEmail } = body;

  if (!subject?.trim() || !bodyText?.trim()) {
    throw createError({ statusCode: 400, message: "缺少主旨或內文" });
  }
  if (!config.gmailUser || !config.gmailAppPassword) {
    throw createError({
      statusCode: 500,
      message: "伺服器未設定 Gmail 環境變數（GMAIL_USER / GMAIL_APP_PASSWORD）",
    });
  }

  // ── 建立 Gmail transporter ──────────────────────────────────────
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.gmailUser,
      pass: config.gmailAppPassword,
    },
  });

  // ── 取得收件人清單 ──────────────────────────────────────────────
  let recipients;

  if (testEmail) {
    // 測試模式：只寄給指定信箱，用 demo token 預覽取消連結樣式
    recipients = [{ name: "測試讀者", email: testEmail.trim().toLowerCase(), unsubscribe_token: "demo-token-preview" }];
  } else {
    const supabase = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceKey
    );
    const { data, error } = await supabase
      .from("subscribers")
      .select("name, email, unsubscribe_token")
      .neq("is_active", false)
      .eq("unsubscribe_requested", false)
      .order("created_at", { ascending: true });

    if (error) throw createError({ statusCode: 500, message: error.message });
    recipients = data || [];
  }

  if (recipients.length === 0) {
    throw createError({ statusCode: 400, message: "沒有有效的訂閱者" });
  }

  // ── 逐一發送 ───────────────────────────────────────────────────
  const results = { success: [], failed: [] };
  const cleanPdfLink = pdfLink?.trim() || null;

  const siteUrl = config.siteUrl || "";

  for (const r of recipients) {
    // 替換姓名佔位符
    const personalizedText = bodyText.replace(/\{\{姓名\}\}/g, r.name);
    const bodyHtml = textToHtml(personalizedText);
    const unsubscribeUrl = r.unsubscribe_token
      ? `${siteUrl}/unsubscribe?token=${r.unsubscribe_token}`
      : null;
    const fullHtml = buildEmailHtml(bodyHtml, cleanPdfLink, unsubscribeUrl);

    try {
      await transporter.sendMail({
        from: `《無境界者》雜誌 <${config.gmailUser}>`,
        to: r.email,
        subject: subject.trim(),
        html: fullHtml,
      });
      results.success.push(r.email);
    } catch (err) {
      results.failed.push({ email: r.email, reason: err.message });
    }

    // Gmail 限速：每封間隔 400ms（正式發送時才延遲）
    if (!testEmail) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  return {
    success: true,
    total: recipients.length,
    successCount: results.success.length,
    failedCount: results.failed.length,
    failed: results.failed,
  };
});
