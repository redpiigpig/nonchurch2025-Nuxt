// utils/formatSpecWatcher.js
import fs from "fs";
import path from "path";
import { parseFormatSpec } from "./formatSpecParser";

let cachedSpec = null;

export function getFormatSpec() {
  if (!cachedSpec) {
    cachedSpec = parseFormatSpec();
    watchSpecFile();
  }
  return cachedSpec;
}

function watchSpecFile() {
  const specPath = path.join(process.cwd(), "stores/form.md");

  fs.watch(specPath, (eventType) => {
    if (eventType === "change") {
      console.log("📋 格式規範已更新，重新載入...");
      cachedSpec = parseFormatSpec();
    }
  });
}
