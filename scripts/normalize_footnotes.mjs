import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((l) => !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

const normalize = (input = "") => {
  let s = String(input);

  s = s
    .replace(/&lt;b&gt;/gi, "<strong>")
    .replace(/&lt;\/b&gt;/gi, "</strong>")
    .replace(/&lt;strong&gt;/gi, "<strong>")
    .replace(/&lt;\/strong&gt;/gi, "</strong>")
    .replace(/&lt;i&gt;/gi, "<i>")
    .replace(/&lt;\/i&gt;/gi, "</i>")
    .replace(/&lt;em&gt;/gi, '<span class="kaiti">')
    .replace(/&lt;\/em&gt;/gi, "</span>")
    .replace(/&lt;u&gt;/gi, "<u>")
    .replace(/&lt;\/u&gt;/gi, "</u>")
    .replace(/&lt;span class=&quot;kaiti&quot;&gt;/gi, '<span class="kaiti">')
    .replace(/&lt;\/span&gt;/gi, "</span>");

  // 專案歷史規則：**text** => 標楷體；*text* => 粗體
  s = s.replace(/\*\*([^*]+)\*\*/g, '<span class="kaiti">$1</span>');
  s = s.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");

  // 相容舊資料：<em> 視為標楷體
  s = s.replace(/<em>/gi, '<span class="kaiti">').replace(/<\/em>/gi, "</span>");

  // 清除舊 Word 標籤
  while (/<font\b[^>]*>/i.test(s)) {
    s = s.replace(/<font\b[^>]*>([\s\S]*?)<\/font>/gi, "$1");
  }
  s = s.replace(/<span\s+style="[^"]*">([\s\S]*?)<\/span>/gi, "$1");

  // 清掉空的標楷體包裹
  s = s.replace(/<span class="kaiti">\s*<\/span>/gi, "");

  return s.trim();
};

const { data, error } = await supabase.from("articles").select("id,footnotes");
if (error) {
  console.error("FETCH_ERROR", error.message);
  process.exit(1);
}

let changedArticles = 0;
let changedFootnotes = 0;
const changedIds = [];

for (const row of data || []) {
  const footnotes = Array.isArray(row.footnotes) ? row.footnotes : null;
  if (!footnotes || footnotes.length === 0) continue;

  let changed = false;
  const next = footnotes.map((fn) => {
    const oldText = String(fn?.text ?? "");
    const newText = normalize(oldText);
    if (newText !== oldText) {
      changed = true;
      changedFootnotes++;
    }
    return { ...fn, text: newText };
  });

  if (!changed) continue;

  const { error: uErr } = await supabase
    .from("articles")
    .update({ footnotes: next })
    .eq("id", row.id);

  if (uErr) {
    console.error("UPDATE_ERROR", row.id, uErr.message);
    continue;
  }

  changedArticles++;
  changedIds.push(row.id);
}

console.log(
  JSON.stringify(
    {
      changedArticles,
      changedFootnotes,
      changedIds,
    },
    null,
    2,
  ),
);
