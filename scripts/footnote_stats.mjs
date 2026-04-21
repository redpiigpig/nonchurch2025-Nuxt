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
  s = s.replace(/\*\*([^*]+)\*\*/g, '<span class="kaiti">$1</span>');
  s = s.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
  s = s.replace(/<em>/gi, '<span class="kaiti">').replace(/<\/em>/gi, "</span>");
  while (/<font\b[^>]*>/i.test(s)) {
    s = s.replace(/<font\b[^>]*>([\s\S]*?)<\/font>/gi, "$1");
  }
  s = s.replace(/<span\s+style="[^"]*">([\s\S]*?)<\/span>/gi, "$1");
  s = s.replace(/<span class="kaiti">\s*<\/span>/gi, "");
  return s.trim();
};

const { data, error } = await supabase.from("articles").select("id,title,footnotes");
if (error) {
  console.error(error.message);
  process.exit(1);
}

let total = data.length;
let withFn = 0;
let withoutFn = 0;
let clean = 0;
let needs = 0;
let totalFootnotes = 0;
const sampleClean = [];

for (const row of data) {
  const f = Array.isArray(row.footnotes) ? row.footnotes : [];
  if (!f.length) {
    withoutFn++;
    continue;
  }
  withFn++;
  totalFootnotes += f.length;
  let changed = false;
  for (const n of f) {
    const oldText = String(n?.text ?? "");
    if (normalize(oldText) !== oldText) {
      changed = true;
      break;
    }
  }
  if (changed) needs++;
  else {
    clean++;
    if (sampleClean.length < 15) sampleClean.push(row.id);
  }
}

console.log(
  JSON.stringify(
    {
      totalArticles: total,
      withFootnotes: withFn,
      withoutFootnotes: withoutFn,
      totalFootnoteItems: totalFootnotes,
      withFootnotesAlreadyClean: clean,
      withFootnotesNeedNormalization: needs,
      sampleAlreadyCleanIds: sampleClean,
    },
    null,
    2,
  ),
);
