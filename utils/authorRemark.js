/**
 * 作者區「備註」拆成多行，與前台／校對作者區等距排版一致。
 * 支援：<p>…</p> 多段、段落內 <br>、純文字含 <br>。
 */
export function splitAuthorRemarkLines(html) {
  if (!html) return [];
  const raw = String(html).trim();
  if (!raw) return [];

  const paras = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(raw)) !== null) {
    paras.push(m[1].trim());
  }

  if (paras.length) {
    const out = [];
    for (const body of paras) {
      for (const part of body.split(/<br\s*\/?>/i)) {
        const t = part.trim();
        if (t) out.push(t);
      }
    }
    return out;
  }

  return raw
    .split(/<br\s*\/?>/i)
    .map((p) => p.trim())
    .filter(Boolean);
}
