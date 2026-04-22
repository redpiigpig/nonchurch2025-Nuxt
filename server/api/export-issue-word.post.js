/**
 * 整期 Word 匯出 API
 * mode=local_python: 僅本機執行 scripts/generate_docx.py
 * mode=remote_python: 轉送到外部 Python 匯出服務
 * mode=disabled: 關閉匯出（建議線上環境）
 * JSON 格式：{ "articles": [...], "filename": "可選" }
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);
const DEFAULT_PATH = "/export/issue";

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

async function exportIssueByLocalPython(body) {
  const tempDir = path.join(process.cwd(), "temp");
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const tempJsonPath = path.join(tempDir, `issue-${stamp}.json`);
  const outputPath = path.join(tempDir, `issue-${stamp}.docx`);

  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(tempJsonPath, JSON.stringify(body, null, 2), "utf-8");

  const pythonScript = path.join(process.cwd(), "scripts", "generate_docx.py");
  const pythonBin = process.platform === "win32" ? "python" : "python3";
  const command = `${pythonBin} "${pythonScript}" "${tempJsonPath}" "${outputPath}"`;
  await execAsync(command);

  const fileBuffer = await fs.readFile(outputPath);
  await Promise.allSettled([fs.unlink(tempJsonPath), fs.unlink(outputPath)]);

  const defaultName = typeof body?.filename === "string" && body.filename.trim()
    ? body.filename.trim().replace(/[\\/:*?"<>|]/g, "_")
    : "issue-export.docx";
  const outName = defaultName.endsWith(".docx")
    ? defaultName
    : `${defaultName}.docx`;

  return {
    success: true,
    file: fileBuffer.toString("base64"),
    filename: outName,
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { articles, filename } = body || {};
  if (!Array.isArray(articles) || articles.length === 0) {
    return { success: false, error: "請提供 articles 陣列" };
  }

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
      return await exportIssueByLocalPython(body);
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
    config.wordExportIssuePath,
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
      body: JSON.stringify(body),
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
  const defaultName = typeof filename === "string" && filename.trim()
    ? filename.trim().replace(/[\\/:*?"<>|]/g, "_")
    : "issue-export.docx";
  const outName = defaultName.endsWith(".docx") ? defaultName : `${defaultName}.docx`;

  if (contentType.includes("application/json")) {
    const payload = await upstreamResponse.json();
    if (!payload?.success || !payload?.file) {
      throw createError({
        statusCode: 502,
        statusMessage: "Python export service JSON response missing success/file",
      });
    }
    return {
      ...payload,
      filename: payload.filename || outName,
    };
  }

  const bytes = Buffer.from(await upstreamResponse.arrayBuffer());
  return {
    success: true,
    file: bytes.toString("base64"),
    filename: outName,
  };
});
