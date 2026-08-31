// publish_article.mjs 純函式測試（不碰網路 / 不寫 DB）
// 跑法：node scripts/publish_article.test.mjs
// 對應 skill：.claude/skills/upload-article/SKILL.md

import assert from "node:assert/strict";
import {
  parseIssue, parseOrder, articleImage, authorImage, submissionFolder,
  versionlessUrl, replacePlaceholders, buildArticleRow, buildMediaAssets,
  buildSubmissionRow, mergeSubmissionRow, buildAuthorRow, publishArticle,
} from "./publish_article.mjs";

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log("  ✓", name); };

console.log("publish_article 純函式測試");

test("parseIssue / parseOrder 從 id 解析", () => {
  assert.equal(parseIssue("9-3父親的祈禱"), 9);
  assert.equal(parseIssue("12-1標題"), 12);
  assert.equal(parseOrder("9-3父親的祈禱"), 3);
  assert.equal(parseOrder("9-10一位牧者之死"), 10);
  assert.throws(() => parseIssue("沒有數字"));
});

test("articleImage 正規命名 {issue}-{order}-{seq} + 無版本號 URL", () => {
  const m = articleImage(9, 3, 1);
  assert.equal(m.folder, "images/articles/issue-9");
  assert.equal(m.publicId, "9-3-1");
  assert.equal(m.url, "https://res.cloudinary.com/nonchurch2025/image/upload/images/articles/issue-9/9-3-1.jpg");
});

test("authorImage author_{id}", () => {
  const m = authorImage(44);
  assert.equal(m.folder, "images/authors");
  assert.equal(m.publicId, "author_44");
  assert.match(m.url, /images\/authors\/author_44\.jpg$/);
});

test("buildSubmissionRow 保留首次投稿與完整作者資料", () => {
  const r = buildSubmissionRow(
    { id: "10-8在相遇中", title: "在相遇中", author: "演霙法師", category: "生命故事", issue: 10,
      submission: { real_name: "釋演霙", display_name: "演霙法師", author_bio: "佛光大學佛教學系博士生",
        email: "author@example.com", is_first_submission: true, author_intro: "作者自介" } },
    { avatarUrl: "ava" },
  );
  assert.equal(r.real_name, "釋演霙");
  assert.equal(r.display_name, "演霙法師");
  assert.equal(r.author_bio, "佛光大學佛教學系博士生");
  assert.equal(r.email, "author@example.com");
  assert.equal(r.is_first_submission, true);
  assert.equal(r.author_intro, "作者自介");
});

test("submissionFolder 圖片 vs 文件", () => {
  assert.equal(submissionFolder(9), "submissions/issue-9/images");
  assert.equal(submissionFolder(9, "docs"), "submissions/issue-9");
});

test("versionlessUrl 不含 v123 版本號", () => {
  assert.equal(versionlessUrl("images/x/y"), "https://res.cloudinary.com/nonchurch2025/image/upload/images/x/y.jpg");
  assert.doesNotMatch(versionlessUrl("a/b"), /\/v\d+\//);
});

test("replacePlaceholders 換 [[圖片N]]、缺圖時原樣保留", () => {
  const out = replacePlaceholders('<img src="[[圖片1]]"><img src="[[圖片2]]">', ["A.jpg"]);
  assert.equal(out, '<img src="A.jpg"><img src="[[圖片2]]">');
  assert.equal(replacePlaceholders("無佔位符", ["A"]), "無佔位符");
});

test("buildArticleRow 帶入預設與計算欄位", () => {
  const r = buildArticleRow(
    { id: "9-3父親的祈禱", title: "父親的祈禱", author: "龐亮軒", category: "封面故事",
      seo: { image: "x" }, footnotes: [], is_published: false },
    { content: "<p>內文</p>", linkedAuthorIds: [44] },
  );
  assert.equal(r.issue, 9);
  assert.equal(r.sort_order, 3);          // 由 id 推導
  assert.equal(r.author_display, "龐亮軒"); // 缺省 fallback 到 author
  assert.equal(r.article_type, "regular");
  assert.equal(r.type, "text");
  assert.equal(r.is_published, false);
  assert.deepEqual(r.linked_author_ids, [44]);
  assert.equal(r.content, "<p>內文</p>");
  assert.ok(r.updated_at);
});

test("buildMediaAssets 對齊 cloudinary_id / sort_order", () => {
  const rows = buildMediaAssets("9-3父親的祈禱", 9, [
    { seq: 1, url: "u1", publicIdFull: "images/articles/issue-9/9-3-1" },
  ]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    issue_id: 9, article_id: "9-3父親的祈禱",
    cloudinary_id: "images/articles/issue-9/9-3-1", image_url: "u1", sort_order: 1,
  });
});

test("buildSubmissionRow 一定產生備份且連回文章（status=converted）", () => {
  const r = buildSubmissionRow(
    { id: "9-3父親的祈禱", title: "父親的祈禱", author: "龐亮軒", author_display: "龐亮軒",
      author_title: "龐君華會督之子", category: "封面故事", summary: "摘要", issue: 9,
      newAuthor: { bio: "龐君華牧師之子，藝術工作者。" } },
    { avatarUrl: "ava", imageUrls: [{ url: "i1", name: "圖片.jpg", order: 1 }], content: "<p>內文</p>" },
  );
  assert.equal(r.article_id, "9-3父親的祈禱");
  assert.equal(r.status, "converted");
  assert.equal(r.issue_number, 9);
  assert.equal(r.title, "父親的祈禱");
  assert.equal(r.category, "封面故事");
  assert.equal(r.avatar_url, "ava");
  assert.deepEqual(r.images, [{ url: "i1", name: "圖片.jpg", order: 1 }]);
  assert.equal(r.parsed_html, "<p>內文</p>");
  // submissions NOT NULL 欄位都要有值
  for (const k of ["real_name", "author_bio", "email", "title", "category"]) {
    assert.ok(r[k], `必填欄位 ${k} 不可空`);
  }
});

test("buildSubmissionRow email 缺省給 placeholder（不違反 NOT NULL）", () => {
  const r = buildSubmissionRow({ id: "9-3x", title: "t", category: "c" }, {});
  assert.match(r.email, /@/);
});

test("mergeSubmissionRow 轉網站來稿時保留投稿者自己填的欄位", () => {
  const existing = {
    id: 26,
    real_name: "廖本恩", display_name: "廖本恩", email: "benboopower@gmail.com",
    author_bio: "無教會者", author_intro: "中國神學研究院研究員…",
    is_first_submission: true, avatar_url: "投稿時的大頭貼",
    keywords: ["羅馬書", "聖經接受史"],
    images: [{ url: "投稿附圖", name: "p1.jpg", order: 1 }],
    word_url: "投稿的 docx", pdf_url: null,
    notes: "投稿系統誤填第12期，編輯部改排第十期",
    status: "submitted", article_id: null,
  };
  const editorRow = buildSubmissionRow(
    { id: "10-15某某", title: "某某", category: "專題文章", issue: 10, summary: "編輯部摘要" },
    { content: "<p>編輯後 HTML</p>" },
  );
  const r = mergeSubmissionRow(existing, editorRow);

  // 投稿者資料原封不動
  assert.equal(r.email, "benboopower@gmail.com");
  assert.equal(r.real_name, "廖本恩");
  assert.equal(r.is_first_submission, true);
  assert.equal(r.author_intro, "中國神學研究院研究員…");
  assert.equal(r.notes, "投稿系統誤填第12期，編輯部改排第十期");
  assert.equal(r.word_url, "投稿的 docx");
  assert.deepEqual(r.keywords, ["羅馬書", "聖經接受史"]);
  assert.deepEqual(r.images, [{ url: "投稿附圖", name: "p1.jpg", order: 1 }]);
  // 編輯部這次的成果有寫進去
  assert.equal(r.parsed_html, "<p>編輯後 HTML</p>");
  assert.equal(r.article_summary, "編輯部摘要");
  assert.equal(r.article_id, "10-15某某");
  assert.equal(r.status, "converted");
});

test("mergeSubmissionRow 沒有舊筆時原樣回傳", () => {
  const row = buildSubmissionRow({ id: "9-3x", title: "t", category: "c" }, {});
  assert.deepEqual(mergeSubmissionRow(null, row), row);
});

// 端到端：dry-run 不碰網路，驗證 orchestration 把 6 個產物都組出來、submissions 一定存在
const e2e = await publishArticle(
  { id: "9-3父親的祈禱", title: "父親的祈禱", author: "龐亮軒", category: "封面故事",
    section: "主題介紹", content: "<figure><img src=\"[[圖片1]]\"></figure><p>內文</p>",
    images: [{ src: "/x/woodcut.jpg", seq: 1 }],
    newAuthor: { id: 44, name: "龐亮軒", bio: "龐君華牧師之子，藝術工作者。" },
    seo: { image: "x" }, is_published: false },
  { dryRun: true },
);
test("publishArticle dry-run 串起全流程", () => {
  assert.equal(e2e.images.length, 1);
  assert.deepEqual(e2e.linkedAuthorIds, [44]);              // 新作者自動連結
  assert.match(e2e.row.content, /\[\[圖片1\]\]/);            // 預設保留佔位符，換圖只改 media_assets
  assert.equal(e2e.mediaRows[0].sort_order, 1);             // 佔位符 N 對得上 sort_order
  assert.equal(e2e.mediaRows.length, 1);
  assert.equal(e2e.subRow.article_id, "9-3父親的祈禱");      // ★ 一定有投稿備份
  assert.equal(e2e.subRow.status, "converted");
});

// bakeImageUrls:true 才把真實 URL 寫死進 content（舊行為，需明確指定）
const e2eBaked = await publishArticle(
  { id: "9-3父親的祈禱", title: "父親的祈禱", author: "龐亮軒", category: "封面故事",
    section: "主題介紹", content: "<figure><img src=\"[[圖片1]]\"></figure><p>內文</p>",
    images: [{ src: "/x/woodcut.jpg", seq: 1 }], bakeImageUrls: true,
    seo: { image: "x" }, is_published: false },
  { dryRun: true },
);
test("bakeImageUrls:true 才寫死 URL", () => {
  assert.match(e2eBaked.row.content, /9-3-1\.jpg/);
  assert.doesNotMatch(e2eBaked.row.content, /\[\[圖片/);
});

test("buildAuthorRow does not null existing identity fields", () => {
  const legacy = buildAuthorRow(
    { id: 44, name: "Existing Author", bio: "Bio" }, {}, 9, "avatar-url",
  );
  assert.equal(Object.hasOwn(legacy, "real_name"), false);
  assert.equal(Object.hasOwn(legacy, "email"), false);

  const firstSubmission = buildAuthorRow(
    { id: 48, name: "New Author", bio: "Bio" },
    { submission: { real_name: "Real Name", email: "author@example.com" } },
    10,
    "avatar-url",
  );
  assert.equal(firstSubmission.real_name, "Real Name");
  assert.equal(firstSubmission.email, "author@example.com");
});

console.log(`\n全部 ${passed} 項測試通過 ✓`);
