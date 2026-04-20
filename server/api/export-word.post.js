/**
 * Word 文件生成 API
 * 呼叫 Python 腳本生成專業排版的 Word 文件
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export default defineEventHandler(async (event) => {
  try {
    // 讀取請求資料
    const articleData = await readBody(event);

    console.log("📥 收到文章資料:", articleData.id);

    // 準備路徑
    const tempDir = path.join(process.cwd(), "temp");
    const tempJsonPath = path.join(tempDir, `${articleData.id}.json`);
    const outputPath = path.join(tempDir, `${articleData.id}.docx`);

    // 確保 temp 資料夾存在
    await fs.mkdir(tempDir, { recursive: true });

    // 寫入臨時 JSON 檔案
    console.log("📝 寫入臨時 JSON:", tempJsonPath);
    await fs.writeFile(
      tempJsonPath,
      JSON.stringify(articleData, null, 2),
      "utf-8",
    );

    // 呼叫 Python 腳本
    const pythonScript = path.join(
      process.cwd(),
      "scripts",
      "generate_docx.py",
    );
    const pythonBin = process.platform === "win32" ? "python" : "python3";
    const command = `${pythonBin} "${pythonScript}" "${tempJsonPath}" "${outputPath}"`;

    console.log("🐍 執行 Python 腳本:", command);

    const { stdout, stderr } = await execAsync(command);

    if (stdout) console.log("Python 輸出:", stdout);
    if (stderr) console.error("Python 錯誤:", stderr);

    // 讀取生成的 Word 檔案
    console.log("📖 讀取生成的 Word 檔案:", outputPath);
    const fileBuffer = await fs.readFile(outputPath);

    // 清理臨時檔案
    console.log("🧹 清理臨時檔案");
    try {
      await fs.unlink(tempJsonPath);
      await fs.unlink(outputPath);
    } catch (cleanupError) {
      console.warn("清理臨時檔案失敗:", cleanupError);
    }

    // 回傳 Base64 編碼的檔案
    console.log("✅ 成功生成 Word 文件");
    return {
      success: true,
      file: fileBuffer.toString("base64"),
      filename: `${articleData.id}.docx`,
    };
  } catch (error) {
    console.error("❌ 生成 Word 失敗:", error);

    // 嘗試清理臨時檔案（即使失敗）
    if (event.context.params?.id) {
      const tempDir = path.join(process.cwd(), "temp");
      const tempJsonPath = path.join(
        tempDir,
        `${event.context.params.id}.json`,
      );
      const outputPath = path.join(tempDir, `${event.context.params.id}.docx`);

      try {
        await fs.unlink(tempJsonPath);
      } catch {}
      try {
        await fs.unlink(outputPath);
      } catch {}
    }

    return {
      success: false,
      error: error.message,
      details: error.stack,
    };
  }
});
