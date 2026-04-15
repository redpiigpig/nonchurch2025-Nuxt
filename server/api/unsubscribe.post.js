// server/api/unsubscribe.post.js
// 讀者點「取消訂閱」連結後呼叫此 API：
// 1. 將 unsubscribe_requested 設為 true
// 2. 寄通知信給管理員

import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { token } = await readBody(event);

  if (!token) {
    throw createError({ statusCode: 400, message: "缺少驗證 token" });
  }

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  );

  // 用 token 找到訂閱者
  const { data: subscriber, error: findError } = await supabase
    .from("subscribers")
    .select("id, name, email, unsubscribe_requested")
    .eq("unsubscribe_token", token)
    .single();

  if (findError || !subscriber) {
    throw createError({ statusCode: 404, message: "找不到對應的訂閱記錄" });
  }

  // 切換：已申請 → 取消申請；未申請 → 申請
  const newState = !subscriber.unsubscribe_requested;

  const { error: updateError } = await supabase
    .from("subscribers")
    .update({
      unsubscribe_requested: newState,
      unsubscribe_requested_at: newState ? new Date().toISOString() : null,
    })
    .eq("id", subscriber.id);

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  // 只有「新申請」才寄通知給管理員（取消申請不通知）
  if (newState && config.gmailUser && config.gmailAppPassword) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: config.gmailUser, pass: config.gmailAppPassword },
      });

      const adminUrl = `${config.siteUrl}/admin/subscribers_manager`;

      await transporter.sendMail({
        from: `《無境界者》系統通知 <${config.gmailUser}>`,
        to: config.gmailUser,
        subject: `📮 取消訂閱申請 — ${subscriber.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff;border:1px solid #eee;border-radius:8px;">
            <h2 style="color:#c0392b;margin:0 0 16px;">取消訂閱申請</h2>
            <p style="line-height:1.8;color:#333;">
              <strong>${subscriber.name}</strong>（${subscriber.email}）
              申請取消訂閱《無境界者》電子報。
            </p>
            <p style="line-height:1.8;color:#333;">
              請至後台確認並刪除：
            </p>
            <div style="text-align:center;margin:20px 0;">
              <a href="${adminUrl}"
                 style="display:inline-block;background:#e74c3c;color:#fff;
                        padding:12px 28px;border-radius:6px;text-decoration:none;
                        font-weight:bold;">
                前往後台確認
              </a>
            </div>
            <p style="font-size:12px;color:#aaa;margin-top:20px;">
              此為系統自動通知，請勿回覆。
            </p>
          </div>
        `,
      });
    } catch (mailErr) {
      // 通知信失敗不影響主流程，僅記錄
      console.error("管理員通知信發送失敗：", mailErr.message);
    }
  }

  return { success: true, name: subscriber.name, requested: newState };
});
