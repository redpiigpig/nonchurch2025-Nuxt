// server/api/media.js
import { v2 as cloudinary } from "cloudinary";
import { readMultipartFormData } from "h3";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
  });

  const method = event.node.req.method;

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
      const formData = await readMultipartFormData(event);
      if (!formData) throw new Error("No form data");

      const fileField = formData.find((f) => f.name === "file");
      const pathField = formData.find((f) => f.name === "path");
      const filenameField = formData.find((f) => f.name === "filename");
      if (!fileField) throw new Error("No file provided");

      const folderPath = pathField ? pathField.data.toString() : "";
      const customFilename = filenameField ? filenameField.data.toString() : null;
      const base64Data = `data:${fileField.type || "application/octet-stream"};base64,${fileField.data.toString("base64")}`;

      const uploadOptions = { resource_type: "auto" };
      if (customFilename) {
        // 完整指定 public_id（含資料夾路徑），精確命名
        uploadOptions.public_id = folderPath ? `${folderPath}/${customFilename}` : customFilename;
      } else {
        uploadOptions.folder = folderPath;
        uploadOptions.use_filename = true;
        uploadOptions.unique_filename = false;
      }

      const result = await cloudinary.uploader.upload(base64Data, uploadOptions);

      return { success: true, data: result };
    } catch (error) {
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
