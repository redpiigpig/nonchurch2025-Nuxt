/**
 * 整期 Word：與單篇 export-word 相同，呼叫 scripts/generate_docx.py（含圖片下載與版型）
 * JSON 格式：{ "articles": [ 與單篇相同欄位... ], "filename": "可選" }
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { articles, filename } = body || {};
    if (!Array.isArray(articles) || articles.length === 0) {
      return { success: false, error: "請提供 articles 陣列" };
    }

    const tempDir = path.join(process.cwd(), "temp");
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const tempJsonPath = path.join(tempDir, `issue-${stamp}.json`);
    const outputPath = path.join(tempDir, `issue-${stamp}.docx`);

    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(
      tempJsonPath,
      JSON.stringify({ articles }, null, 2),
      "utf-8",
    );

    const pythonScript = path.join(process.cwd(), "scripts", "generate_docx.py");
    const pythonBin = process.platform === "win32" ? "python" : "python3";
    const command = `${pythonBin} "${pythonScript}" "${tempJsonPath}" "${outputPath}"`;
    console.log("🐍 整期 Word:", command);

    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr) console.warn(stderr);

    const fileBuffer = await fs.readFile(outputPath);

    try {
      await fs.unlink(tempJsonPath);
      await fs.unlink(outputPath);
    } catch (e) {
      console.warn("清理暫存失敗:", e);
    }

    const safeName = typeof filename === "string" && filename.trim()
      ? filename.trim().replace(/[\\/:*?"<>|]/g, "_")
      : `issue-${stamp}.docx`;
    const outName = safeName.endsWith(".docx") ? safeName : `${safeName}.docx`;

    return {
      success: true,
      file: fileBuffer.toString("base64"),
      filename: outName,
    };
  } catch (error) {
    console.error("export-issue-word:", error);
    return {
      success: false,
      error: error.message || String(error),
    };
  }
});
