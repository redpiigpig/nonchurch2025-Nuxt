// server/api/media.js
import { v2 as cloudinary } from "cloudinary";
import { readMultipartFormData } from "h3";

const PUBLIC_SUBMISSION_FOLDER = /^submissions\/(?:issue-[1-9]\d*|unsorted)(?:\/images)?$/;
const MAX_PUBLIC_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PUBLIC_DOCUMENT_BYTES = 25 * 1024 * 1024;
const MAX_PUBLIC_MULTIPART_BYTES = MAX_PUBLIC_DOCUMENT_BYTES + 1024 * 1024;

function startsWithBytes(buffer, bytes) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function publicUploadResourceType(folderPath, fileField) {
  const filename = String(fileField.filename || "");
  const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
  const data = fileField.data;
  const isImageFolder = folderPath.endsWith("/images");

  if (isImageFolder) {
    if (data.length > MAX_PUBLIC_IMAGE_BYTES) {
      throw createError({ statusCode: 413, message: "圖片不可超過 10MB" });
    }

    const isJpeg = ["jpg", "jpeg"].includes(ext) && startsWithBytes(data, [0xff, 0xd8, 0xff]);
    const isPng = ext === "png" && startsWithBytes(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const isGif = ext === "gif" && ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii"));
    const isWebp = ext === "webp" && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
    if (!isJpeg && !isPng && !isGif && !isWebp) {
      throw createError({ statusCode: 415, message: "只接受 JPG、PNG、GIF 或 WebP 圖片" });
    }
    return "image";
  }

  if (data.length > MAX_PUBLIC_DOCUMENT_BYTES) {
    throw createError({ statusCode: 413, message: "投稿檔案不可超過 25MB" });
  }

  const isPdf = ext === "pdf" && data.subarray(0, 5).toString("ascii") === "%PDF-";
  const isDocx = ext === "docx" && (
    startsWithBytes(data, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWithBytes(data, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWithBytes(data, [0x50, 0x4b, 0x07, 0x08])
  );
  const isDoc = ext === "doc" && startsWithBytes(data, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (!isPdf && !isDocx && !isDoc) {
    throw createError({ statusCode: 415, message: "只接受 PDF、DOCX 或 DOC 投稿檔案" });
  }
  return "raw";
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
  });

  const method = event.node.req.method;

  // 驗證：GET（瀏覽媒體庫）與 PUT（刪除/改名）僅限登入的工作人員；
  // POST 例外開放未登入的公開投稿，但只能上傳到 submissions/ 資料夾（見下方檢查）。
  let authUser = null;
  try {
    authUser = await requireAdminUser(event);
  } catch (err) {
    if (method !== "POST") throw err;
  }

  // 1. 讀取列表與資料夾 (GET)
  if (method === "GET") {
    const query = getQuery(event);
    const folderPath = query.path || "";

    try {
      // 取得子資料夾
      const foldersResult = folderPath
        ? await cloudinary.api
            .sub_folders(folderPath)
            .catch(() => ({ folders: [] }))
        : await cloudinary.api.root_folders().catch(() => ({ folders: [] }));

      // 🌟 核心修正：改用 Search API 尋找檔案
      // 這樣無論 Cloudinary 是舊版(依賴 public_id) 還是新版(動態資料夾) 都能正確抓出內容
      const searchExp = folderPath ? `folder="${folderPath}"` : 'folder=""';

      const filesResult = await cloudinary.search
        .expression(searchExp)
        .max_results(100)
        .execute()
        .catch((err) => {
          console.error("Search API Error:", err);
          return { resources: [] };
        });

      const formattedFolders = (foldersResult.folders || []).map((f) => ({
        name: f.name,
        isFolder: true,
        fullPath: f.path,
      }));

      // 將 Search API 找出來的檔案格式化
      const formattedFiles = (filesResult.resources || []).map((f) => {
        const baseName = f.public_id.split("/").pop();
        const fileName =
          f.format && !baseName.endsWith(`.${f.format}`)
            ? `${baseName}.${f.format}`
            : baseName;

        return {
          name: fileName,
          isFolder: false,
          fullPath: f.public_id,
          url: f.secure_url,
          format: f.format || "raw",
          resource_type: f.resource_type,
          size: f.bytes,
          updated_at: f.created_at,
        };
      });

      return { success: true, data: [...formattedFolders, ...formattedFiles] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 2. 上傳檔案 (POST)
  if (method === "POST") {
    try {
      if (!authUser) {
        const declaredLength = Number(getHeader(event, "content-length") || 0);
        if (Number.isFinite(declaredLength) && declaredLength > MAX_PUBLIC_MULTIPART_BYTES) {
          throw createError({ statusCode: 413, message: "投稿請求不可超過 26MB" });
        }
      }
      const formData = await readMultipartFormData(event);
      if (!formData) throw new Error("No form data");

      const fileField = formData.find((f) => f.name === "file");
      const pathField = formData.find((f) => f.name === "path");
      const filenameField = formData.find((f) => f.name === "filename");
      if (!fileField) throw new Error("No file provided");

      const folderPath = pathField ? pathField.data.toString() : "";
      const customFilename = filenameField ? filenameField.data.toString() : null;
      let resourceType = "auto";

      // 未登入者（公開投稿表單）只能傳到 submissions/，且不得自訂檔名
      if (!authUser) {
        if (!PUBLIC_SUBMISSION_FOLDER.test(folderPath) || customFilename) {
          throw createError({ statusCode: 401, message: "請先登入" });
        }
        resourceType = publicUploadResourceType(folderPath, fileField);
      }
      const base64Data = `data:${fileField.type || "application/octet-stream"};base64,${fileField.data.toString("base64")}`;

      const uploadOptions = { resource_type: resourceType };
      if (customFilename) {
        // 完整指定 public_id（含資料夾路徑），精確命名，強制覆蓋同名檔案
        uploadOptions.public_id = folderPath ? `${folderPath}/${customFilename}` : customFilename;
        uploadOptions.overwrite = true;
        uploadOptions.invalidate = true;
      } else {
        uploadOptions.folder = folderPath;
        // 公開投稿由伺服器產生唯一名稱且禁止覆寫，避免同名檔互相取代。
        uploadOptions.use_filename = !!authUser;
        uploadOptions.unique_filename = !authUser;
        uploadOptions.overwrite = !!authUser;
      }

      const result = await cloudinary.uploader.upload(base64Data, uploadOptions);

      return { success: true, data: result };
    } catch (error) {
      if (error.statusCode) throw error; // 驗證錯誤照原狀態碼回傳
      return { success: false, error: error.message };
    }
  }

  // 3. 刪除、改名與建立資料夾 (PUT)
  if (method === "PUT") {
    const body = await readBody(event);
    try {
      if (body.action === "delete") {
        await cloudinary.uploader.destroy(body.public_id, {
          resource_type: body.resource_type || "image",
        });
        return { success: true };
      } else if (body.action === "rename") {
        await cloudinary.uploader.rename(body.from_id, body.to_id, {
          resource_type: body.resource_type || "image",
        });
        return { success: true };
      } else if (body.action === "create_folder") {
        await cloudinary.api.create_folder(body.folder_path);
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
});
