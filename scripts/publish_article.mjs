// 文章 + 照片「一鍵上架」Pipeline（REST 版，走 service key，不需 IPv6 直連 DB）
//
// 用法：node scripts/publish_article.mjs scripts/_pub_9-3.json
//
// 對應 skill：.claude/skills/upload-article/SKILL.md
// 做的事（依序）：
//   1. 圖片上 Cloudinary（>10MB 自動用 ffmpeg 縮圖）→ images/articles/issue-{n}/{issue}-{order}-{seq}.jpg
//   2. content 內 [[圖片N]] 佔位符換成真實 URL（若有）
//   3.（可選）作者大頭貼上 Cloudinary、upsert authors、文章 linked_author_ids 連結
//   4. upsert articles（含 seo / summary / keyword）
//   5. 重寫 media_assets（編輯器顯示圖靠這張表）
//   6. ★ 一份備份進「投稿管理」：原始檔上 submissions/issue-{n}/、upsert submissions（status=converted, article_id 連結）
//
// 純函式（parseIssue / articleImage / buildArticleRow / buildSubmissionRow ...）抽出來供
// publish_article.test.mjs 測試，不碰網路。

import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinaryV2 } from "cloudinary";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CLOUD_NAME = "nonchurch2025";
const MAX_BYTES = 10 * 1024 * 1024; // Cloudinary 免費版單檔上限

/* ──────────────────────────── 純函式（可測試） ──────────────────────────── */

// 從 id 取期數："9-3父親的祈禱" → 9
export function parseIssue(id) {
  const m = String(id).match(/^(\d+)-/);
  if (!m) throw new Error(`無法從 id 解析期數：${id}`);
  return Number(m[1]);
}

// 從 id 取該期序號："9-3父親的祈禱" → 3
export function parseOrder(id) {
  const m = String(id).match(/^\d+-(\d+)/);
  if (!m) throw new Error(`無法從 id 解析序號：${id}`);
  return Number(m[1]);
}

// 文章內文圖正規命名：{issue}-{order}-{seq}，資料夾 images/articles/issue-{issue}
export function articleImage(issue, order, seq, ext = "jpg") {
  const folder = `images/articles/issue-${issue}`;
  const publicId = `${issue}-${order}-${seq}`;
  return { folder, publicId, url: versionlessUrl(`${folder}/${publicId}`, ext) };
}

// 作者大頭貼命名：author_{id}，資料夾 images/authors
export function authorImage(authorId, ext = "jpg") {
  const folder = "images/authors";
  const publicId = `author_${authorId}`;
  return { folder, publicId, url: versionlessUrl(`${folder}/${publicId}`, ext) };
}

// 投稿備份檔資料夾
export function submissionFolder(issue, kind = "images") {
  return kind === "images"
    ? `submissions/issue-${issue}/images`
    : `submissions/issue-${issue}`;
}

// 無版本號的 Cloudinary URL（與站上其他文章一致，避免每次上傳 URL 變動）
export function versionlessUrl(fullPublicId, ext = "jpg") {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${fullPublicId}.${ext}`;
}

// content 內 [[圖片1]]、[[圖片2]]… 換成 urls[0]、urls[1]…
export function replacePlaceholders(content, urls) {
  if (!content) return content;
  return content.replace(/\[\[圖片(\d+)\]\]/g, (whole, n) => {
    const url = urls[Number(n) - 1];
    return url || whole;
  });
}

// 組 articles upsert row
export function buildArticleRow(d, { content, linkedAuthorIds }) {
  return {
    id: d.id,
    title: d.title,
    subtitle: d.subtitle ?? "",
    issue: d.issue ?? parseIssue(d.id),
    issue_title: d.issue_title ?? undefined,
    category: d.category ?? null,
    section: d.section ?? null,
    author: d.author ?? null,
    author_display: d.author_display ?? d.author ?? null,
    author_title: d.author_title ?? "",
    keyword: d.keyword ?? "",
    summary: d.summary ?? "",
    content,
    footnotes: Array.isArray(d.footnotes) ? d.footnotes : [],
    seo: d.seo ?? {},
    article_type: d.article_type ?? "regular",
    type: d.type ?? "text",
    is_published: !!d.is_published,
    sort_order: d.sort_order ?? parseOrder(d.id),
    linked_author_ids: linkedAuthorIds ?? [],
    updated_at: new Date().toISOString(),
  };
}

// 組 media_assets rows
export function buildMediaAssets(articleId, issue, images) {
  return images.map((img, i) => ({
    issue_id: issue,
    article_id: articleId,
    cloudinary_id: img.publicIdFull,
    image_url: img.url,
    sort_order: img.seq ?? i + 1,
  }));
}

// 組 submissions 備份 row（status=converted，article_id 連結回文章）
export function buildSubmissionRow(d, uploaded) {
  const sub = d.submission ?? {};
  return {
    real_name: sub.real_name ?? d.author_display ?? d.author ?? d.title,
    display_name: sub.display_name ?? d.author_display ?? d.author ?? null,
    author_bio: sub.author_bio ?? d.newAuthor?.bio ?? d.author_title ?? "（編輯部上架，無投稿者自介）",
    email: sub.email ?? "editor-upload@nonchurch.local",
    is_first_submission: !!sub.is_first_submission,
    author_intro: sub.author_intro ?? d.author_title ?? null,
    avatar_url: uploaded.avatarUrl ?? null,
    issue_number: d.issue ?? parseIssue(d.id),
    title: d.title,
    category: d.category ?? "未分類",
    article_summary: d.summary ?? null,
    keywords: Array.isArray(d.keywords) ? d.keywords : [],
    notes: sub.notes ?? "由 publish_article.mjs 自動備份（編輯部直接上架）",
    word_url: uploaded.wordUrl ?? null,
    pdf_url: uploaded.pdfUrl ?? null,
    images: uploaded.imageUrls ?? [],
    parsed_html: uploaded.content ?? d.content ?? null,
    article_id: d.id,
    status: "converted",
  };
}

export function buildAuthorRow(author, descriptor, issue, avatarUrl) {
  const row = {
    id: author.id,
    name: author.name,
    bio: author.bio,
    author_image: avatarUrl,
    years: author.years ?? [issue >= 7 ? 2026 : 2025],
    is_published: author.is_published ?? false,
  };
  const realName = author.real_name ?? descriptor.submission?.real_name;
  const email = author.email ?? descriptor.submission?.email;
  if (realName != null && realName !== "") row.real_name = realName;
  if (email != null && email !== "") row.email = email;
  return row;
}

/* ──────────────────────────── 副作用（網路 / 檔案） ──────────────────────────── */

export function loadEnv(file = ".env") {
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((l) => !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
      }),
  );
}

// >10MB 的 JPEG 用 ffmpeg 等比縮到寬度 <=2200、品質 q=3，回傳可上傳的路徑
function ensureUploadable(srcPath) {
  const bytes = fs.statSync(srcPath).size;
  if (bytes <= MAX_BYTES) return srcPath;
  const out = path.join(process.env.TEMP || ".", `_pub_${path.basename(srcPath)}.jpg`);
  console.log(`  ↳ ${path.basename(srcPath)} ${Math.round(bytes / 1024 / 1024)}MB 超過 10MB，ffmpeg 縮圖中…`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", srcPath,
    "-vf", "scale='min(2200,iw)':-2", "-q:v", "3", out, "-y"]);
  return out;
}

function makeCloudinary(env) {
  cloudinaryV2.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  return cloudinaryV2;
}

function fileDataUri(srcPath) {
  const ext = path.extname(srcPath).toLowerCase();
  const mime = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }[ext] || "application/octet-stream";
  return `data:${mime};base64,${fs.readFileSync(srcPath).toString("base64")}`;
}

async function uploadImage(cl, srcPath, folder, publicId) {
  const uploadPath = ensureUploadable(srcPath);
  const r = await cl.uploader.upload(fileDataUri(uploadPath), {
    folder, public_id: publicId, overwrite: true, invalidate: true,
  });
  return r.secure_url;
}

async function uploadRaw(cl, srcPath, folder, publicId) {
  const r = await cl.uploader.upload(fileDataUri(srcPath), {
    folder, public_id: publicId, resource_type: "auto", overwrite: true, invalidate: true,
  });
  return r.secure_url;
}

/* ──────────────────────────── 主流程 ──────────────────────────── */

export async function publishArticle(d, { dryRun = false } = {}) {
  const env = loadEnv();
  const issue = d.issue ?? parseIssue(d.id);
  const order = parseOrder(d.id);
  const cl = dryRun ? null : makeCloudinary(env);
  const supabase = dryRun ? null : createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

  // 1) 內文圖
  const images = [];
  for (const img of d.images ?? []) {
    const seq = img.seq ?? images.length + 1;
    const meta = articleImage(issue, order, seq, img.ext ?? "jpg");
    let url = meta.url;
    if (!dryRun) url = await uploadImage(cl, img.src, meta.folder, meta.publicId);
    console.log(`  圖片 #${seq}: ${url}`);
    images.push({ seq, url, publicIdFull: `${meta.folder}/${meta.publicId}`, src: img.src });
  }

  // 2) 佔位符替換（content 沒寫 [[圖片N]] 就原樣）
  const content = replacePlaceholders(d.content, images.map((i) => i.url));

  // 3) 作者
  let linkedAuthorIds = Array.isArray(d.linked_author_ids) ? d.linked_author_ids.slice() : [];
  let avatarUrl = null;
  if (d.newAuthor) {
    const a = d.newAuthor;
    const meta = authorImage(a.id, a.avatarExt ?? "jpg");
    avatarUrl = a.author_image ?? meta.url;
    if (!dryRun && a.avatar) avatarUrl = await uploadImage(cl, a.avatar, meta.folder, meta.publicId);
    if (!dryRun) {
      const { error } = await supabase
        .from("authors")
        .upsert([buildAuthorRow(a, d, issue, avatarUrl)], { onConflict: "id" });
      if (error) throw new Error("authors upsert 失敗：" + error.message);
    }
    if (!linkedAuthorIds.includes(a.id)) linkedAuthorIds.push(a.id);
    console.log(`  作者 #${a.id} ${a.name} → ${avatarUrl}`);
  }

  // 4) 文章
  const row = buildArticleRow(d, { content, linkedAuthorIds });
  if (!dryRun) {
    const { error } = await supabase.from("articles").upsert(row, { onConflict: "id" });
    if (error) throw new Error("articles upsert 失敗：" + error.message);
  }
  console.log(`  文章 ${d.id} ✓（content ${content.length} 字, linked ${JSON.stringify(linkedAuthorIds)}）`);

  // 5) media_assets（先清掉舊的再寫）
  const mediaRows = buildMediaAssets(d.id, issue, images);
  if (!dryRun && images.length) {
    await supabase.from("media_assets").delete().eq("article_id", d.id);
    const { error } = await supabase.from("media_assets").insert(mediaRows);
    if (error) throw new Error("media_assets insert 失敗：" + error.message);
  }

  // 6) ★ 投稿管理備份：原始檔上 submissions/、upsert submissions
  const imageUrls = [];
  let wordUrl = null, pdfUrl = null;
  if (!dryRun) {
    for (const img of images) {
      const url = await uploadRaw(
        cl,
        img.src,
        submissionFolder(issue, "images"),
        `submission-${issue}-${order}-image-${img.seq}`,
      );
      imageUrls.push({ url, name: path.basename(img.src), order: img.seq });
    }
    for (const [index, doc] of (d.sourceDocs ?? []).entries()) {
      const u = await uploadRaw(
        cl,
        doc,
        submissionFolder(issue, "docs"),
        `submission-${issue}-${order}-source-${index + 1}`,
      );
      if (/\.pdf$/i.test(doc)) pdfUrl = u; else wordUrl = u;
    }
  }
  const subRow = buildSubmissionRow(d, { avatarUrl, imageUrls, wordUrl, pdfUrl, content });
  if (!dryRun) {
    // 同一篇文章只留一筆備份：先找有沒有舊的
    const { data: ex } = await supabase.from("submissions").select("id").eq("article_id", d.id).limit(1);
    if (ex && ex.length) {
      const { error } = await supabase.from("submissions").update(subRow).eq("id", ex[0].id);
      if (error) throw new Error("submissions update 失敗：" + error.message);
      console.log(`  投稿備份 ✓（更新 submission #${ex[0].id}）`);
    } else {
      const { data, error } = await supabase.from("submissions").insert([subRow]).select("id").single();
      if (error) throw new Error("submissions insert 失敗：" + error.message);
      console.log(`  投稿備份 ✓（新增 submission #${data.id}）`);
    }
  }

  return { row, mediaRows, subRow, images, linkedAuthorIds };
}

/* ──────────────────────────── CLI ──────────────────────────── */

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const jsonPath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!jsonPath) {
    console.error("用法: node scripts/publish_article.mjs <descriptor.json> [--dry-run]");
    process.exit(1);
  }
  const d = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  publishArticle(d, { dryRun })
    .then(() => console.log(dryRun ? "（dry-run，未寫入）完成" : "全部完成 ✓"))
    .catch((e) => { console.error("✗", e.message); process.exit(1); });
}
