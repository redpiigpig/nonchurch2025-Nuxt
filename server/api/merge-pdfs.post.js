// server/api/merge-pdfs.post.js
// 呼叫 scripts/merge_pdfs.py，將一期所有文章 PDF 合併後上傳 Cloudinary

import { spawn } from "child_process";
import { join } from "path";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  const {
    issueId,
    articles = [],
    cover_pdf = "",
    back_cover_pdf = "",
  } = body;

  if (!issueId) {
    return { success: false, error: "issueId 是必填項目" };
  }

  // ── 建立有序的 PDF URL 清單 ───────────────────────────────────────
  const urls = [];

  // 1. 封面 PDF
  if (cover_pdf) urls.push(cover_pdf);

  // 2. 文章 PDF（依 page_start 升序，過濾掉沒有 PDF 的）
  const sorted = [...articles]
    .filter((a) => a.seo_pdf)
    .sort((a, b) => (a.page_start ?? 9999) - (b.page_start ?? 9999));
  sorted.forEach((a) => urls.push(a.seo_pdf));

  // 3. 封底 PDF
  if (back_cover_pdf) urls.push(back_cover_pdf);

  if (urls.length === 0) {
    return {
      success: false,
      error: "沒有可合併的 PDF，請先為文章上傳 PDF 檔案",
    };
  }

  const input = JSON.stringify({
    urls,
    output_name: `Vol.${issueId}.pdf`,
    folder: "magazines",
  });

  const scriptPath = join(process.cwd(), "scripts", "merge_pdfs.py");

  return new Promise((resolve) => {
    const py = spawn("python", [scriptPath], {
      env: {
        ...process.env,
        CLOUDINARY_CLOUD_NAME: config.cloudinaryCloudName,
        CLOUDINARY_API_KEY: config.cloudinaryApiKey,
        CLOUDINARY_API_SECRET: config.cloudinaryApiSecret,
        PYTHONIOENCODING: "utf-8",
      },
    });

    let stdout = "";
    let stderr = "";

    py.stdin.write(input);
    py.stdin.end();

    py.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    py.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    py.on("close", (code) => {
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch {
        resolve({
          success: false,
          error: stderr.trim() || stdout.trim() || `Python 程序異常結束 (exit ${code})`,
        });
      }
    });

    py.on("error", (err) => {
      resolve({ success: false, error: `無法啟動 Python：${err.message}` });
    });
  });
});
