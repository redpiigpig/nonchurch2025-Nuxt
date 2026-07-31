/**
 * Remove raw Markdown-style footnote references from preview/list text.
 * Article detail pages keep the original markers so they can render as links.
 */
export function stripFootnoteReferences(value) {
  if (value == null) return value;

  return String(value)
    .replace(/\[\^\d+\]/g, "")
    .replace(/[ \t]+([，。！？；：、])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
