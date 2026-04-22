/**
 * Word 匯出 API
 * mode=local_python: 僅本機執行 scripts/generate_docx.py
 * mode=remote_python: 轉送到外部 Python 匯出服務
 * mode=disabled: 關閉匯出（建議線上環境）
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);
const DEFAULT_PATH = "/export/article";

function buildServiceUrl(baseUrl, endpointPath) {
  const base = String(baseUrl || "").trim();
  const path = String(endpointPath || DEFAULT_PATH).trim();
  if (!base) return null;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/+$/, "")}${normalizedPath}`;
}

function getWordExportMode(config) {
  return String(config.wordExportMode || "disabled").trim().toLowerCase();
}

async function exportByLocalPython(articleData) {
  const tempDir = path.join(process.cwd(), "temp");
  const safeId = String(articleData?.id || `article-${Date.now()}`);
  const tempJsonPath = path.join(tempDir, `${safeId}.json`);
  const outputPath = path.join(tempDir, `${safeId}.docx`);

  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(tempJsonPath, JSON.stringify(articleData, null, 2), "utf-8");

  const pythonScript = path.join(process.cwd(), "scripts", "generate_docx.py");
  const pythonBin = process.platform === "win32" ? "python" : "python3";
  const command = `${pythonBin} "${pythonScript}" "${tempJsonPath}" "${outputPath}"`;
  await execAsync(command);

  const fileBuffer = await fs.readFile(outputPath);
  await Promise.allSettled([fs.unlink(tempJsonPath), fs.unlink(outputPath)]);

  return {
    success: true,
    file: fileBuffer.toString("base64"),
    filename: `${safeId}.docx`,
  };
}

export default defineEventHandler(async (event) => {
  const articleData = await readBody(event);
  const config = useRuntimeConfig();
  const mode = getWordExportMode(config);

  if (mode === "disabled") {
    throw createError({
      statusCode: 503,
      statusMessage: "Word export is disabled on this environment",
    });
  }

  if (mode === "local_python") {
    if (process.env.NODE_ENV === "production") {
      throw createError({
        statusCode: 503,
        statusMessage:
          "WORD_EXPORT_MODE=local_python is not allowed in production",
      });
    }
    try {
      return await exportByLocalPython(articleData);
    } catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Local Python export failed: ${error.message}`,
      });
    }
  }

  if (mode !== "remote_python") {
    throw createError({
      statusCode: 500,
      statusMessage: `Unsupported WORD_EXPORT_MODE: ${mode}`,
    });
  }

  const serviceUrl = buildServiceUrl(
    config.wordExportServiceUrl,
    config.wordExportArticlePath,
  );
  if (!serviceUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing WORD_EXPORT_SERVICE_URL runtime config",
    });
  }

  const headers = { "Content-Type": "application/json" };
  if (config.wordExportServiceToken) {
    headers.Authorization = `Bearer ${config.wordExportServiceToken}`;
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(serviceUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(articleData),
    });
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: `Python export service unreachable: ${error.message}`,
    });
  }

  if (!upstreamResponse.ok) {
    const errText = await upstreamResponse.text();
    throw createError({
      statusCode: 502,
      statusMessage: `Python export service error (${upstreamResponse.status}): ${errText}`,
    });
  }

  const contentType = upstreamResponse.headers.get("content-type") || "";

  // If Python service already returns JSON { success, file(base64), filename }, passthrough it.
  if (contentType.includes("application/json")) {
    const payload = await upstreamResponse.json();
    if (!payload?.success || !payload?.file) {
      throw createError({
        statusCode: 502,
        statusMessage: "Python export service JSON response missing success/file",
      });
    }
    return payload;
  }

  // If Python service returns raw .docx bytes, convert to base64 for current frontend contract.
  const bytes = Buffer.from(await upstreamResponse.arrayBuffer());
  return {
    success: true,
    file: bytes.toString("base64"),
    filename: `${articleData?.id || "article"}.docx`,
  };
});
