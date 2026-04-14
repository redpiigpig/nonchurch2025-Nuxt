// utils/formatSpecWatcher.js
// 純前端版：移除 fs/path，不做檔案監聽（部署環境不支援）
import { parseFormatSpec } from "./formatSpecParser";

let cachedSpec = null;

export function getFormatSpec() {
  if (!cachedSpec) {
    cachedSpec = parseFormatSpec();
  }
  return cachedSpec;
}
