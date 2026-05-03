<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "~/supabase";
import {
  buildSubmissionInfoHtml,
  buildEditorialInfoHtml,
} from "~/utils/metaTemplates";
import { loadPeriodWithBalance } from "~/utils/financeDb";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({ title: "期刊發布中心 - 無境界者雜誌" });

const issuesList = ref([]);
const loading = ref(false);
const showModal = ref(false);
const newIssueTitle = ref("");

const nextIssueId = computed(() => {
  if (issuesList.value.length === 0) return 1;
  return issuesList.value[0].id + 1;
});

const fetchIssues = async () => {
  loading.value = true;
  try {
    const { data: issuesData, error: issuesError } = await supabase
      .from("issues")
      .select("*")
      .order("id", { ascending: false });
    if (issuesError) throw issuesError;

    const { data: articlesData, error: articlesError } = await supabase
      .from("articles")
      .select("id, issue, is_published, author");
    if (articlesError) throw articlesError;

    const { data: authorsData, error: authorsError } = await supabase
      .from("authors")
      .select("name, aliases, is_published");
    if (authorsError) throw authorsError;

    issuesList.value = issuesData.map((issue) => {
      const relatedArticles = articlesData.filter((a) => a.issue === issue.id);
      const relatedAuthorNames = [
        ...new Set(relatedArticles.map((a) => a.author).filter(Boolean)),
      ];
      const relatedAuthorsInfo = authorsData.filter((a) =>
        relatedAuthorNames.some(
          (n) => n === a.name || (a.aliases || []).includes(n),
        ),
      );
      const hiddenAuthorsCount = relatedAuthorsInfo.filter(
        (a) => !a.is_published
      ).length;

      return {
        ...issue,
        totalArtCount: relatedArticles.length,
        publishedArtCount: relatedArticles.filter((a) => a.is_published).length,
        totalAuthorCount: relatedAuthorsInfo.length,
        hiddenAuthorCount: hiddenAuthorsCount,
        relatedAuthorNames: relatedAuthorsInfo.map((a) => a.name),
      };
    });
  } catch (err) {
    alert("讀取資料失敗：" + err.message);
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  newIssueTitle.value = "";
  showModal.value = true;
};

const confirmCreate = async () => {
  if (!newIssueTitle.value.trim()) {
    alert("請輸入期刊主題！");
    return;
  }
  loading.value = true;
  const newId = nextIssueId.value;
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;

  const issueRow = {
    id: newId,
    title: newIssueTitle.value,
    date: dateStr,
    is_published: false,
  };

  const { error } = await supabase.from("issues").insert([issueRow]);

  if (error) {
    alert("新增失敗：" + error.message);
    loading.value = false;
    return;
  }

  // 自動建立三篇 meta 文章：目次（toc）、投稿資訊（19）、編輯資訊（20）
  // sort_order 用 0/19/20 確保排序：目次最前、投稿倒數第二、編輯資訊最後
  // 序號之後可在 articles_manager 手動調整為實際的 18/19 等
  const submissionContent = buildSubmissionInfoHtml({
    id: newId,
    cfp_title: null,
    cfp_theme: null,
    cfp_deadline: null,
  });
  const editorialContent = buildEditorialInfoHtml(
    { id: newId, title: newIssueTitle.value, date: dateStr },
    await loadPeriodWithBalance(supabase, newId),
  );

  const metaRows = [
    {
      id: `${newId}-0目次`,
      issue: String(newId),
      title: "目次",
      section: "主題介紹",
      sort_order: 0,
      article_type: "toc",
      content: null,
      is_published: false,
    },
    {
      id: `${newId}-19投稿資訊`,
      issue: String(newId),
      title: "投稿資訊",
      section: "編輯資訊",
      sort_order: 19,
      article_type: "submission_info",
      content: submissionContent,
      is_published: false,
    },
    {
      id: `${newId}-20編輯資訊`,
      issue: String(newId),
      title: "編輯資訊",
      section: "編輯資訊",
      sort_order: 20,
      article_type: "editorial_info",
      content: editorialContent,
      is_published: false,
    },
  ];

  const { error: metaErr } = await supabase.from("articles").insert(metaRows);

  if (metaErr) {
    alert(
      `第 ${newId} 期已建立，但 meta 文章建立失敗：${metaErr.message}\n請至文章管理手動補建。`,
    );
  } else {
    alert(`第 ${newId} 期《${newIssueTitle.value}》已建立！\n已自動新增：目次、投稿資訊、編輯資訊。`);
  }
  showModal.value = false;
  fetchIssues();
  loading.value = false;
};

const handlePublish = async (issueItem) => {
  const confirmText = `確定要正式發布 第 ${issueItem.id} 期《${issueItem.title}》嗎？\n\n執行後將公開：\n1. 本期期刊主題\n2. 本期所有文章\n3. 本期相關作者 (${issueItem.hiddenAuthorCount} 位)`;
  if (!confirm(confirmText)) return;

  loading.value = true;
  try {
    const { error: issueErr } = await supabase
      .from("issues")
      .update({ is_published: true })
      .eq("id", issueItem.id);
    if (issueErr) throw issueErr;

    const { error: artErr } = await supabase
      .from("articles")
      .update({ is_published: true })
      .eq("issue", issueItem.id);
    if (artErr) throw artErr;

    if (
      issueItem.relatedAuthorNames &&
      issueItem.relatedAuthorNames.length > 0
    ) {
      const { error: authorErr } = await supabase
        .from("authors")
        .update({ is_published: true })
        .in("name", issueItem.relatedAuthorNames);
      if (authorErr) throw authorErr;
    }

    alert(`第 ${issueItem.id} 期發布成功！`);
    fetchIssues();
  } catch (err) {
    alert("發布失敗：" + err.message);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchIssues();
});
</script>

<template>
  <div class="publishing-center">
    <div class="issues-tabs">
      <NuxtLink to="/admin" exact-active-class="tab-active" class="tab-link">🚀 發布狀態</NuxtLink>
      <NuxtLink to="/admin/issues_manager" active-class="tab-active" class="tab-link">📋 主題設定</NuxtLink>
    </div>
    <div class="header-row">
      <div>
        <h2>🚀 期刊發布中心</h2>
        <p class="desc">
          這裡是總控中心。新增的期數預設為隱藏 (False)。<br />
          點擊「確認發布」後，該期的 <b>主題</b>、<b>文章</b>、<b>作者</b>
          將同步設為公開 (True)。
        </p>
      </div>
      <button @click="openCreateModal" class="btn-create">＋ 籌備新一期</button>
    </div>

    <div v-if="loading" class="loading">資料處理中...</div>

    <div class="issue-grid">
      <div
        v-for="item in issuesList"
        :key="item.id"
        class="issue-card"
        :class="{ 'draft-card': !item.is_published }"
      >
        <div class="card-header">
          <span class="vol">Vol.{{ item.id }}</span>
          <span
            class="status-badge"
            :class="item.is_published ? 'published' : 'draft'"
          >
            {{ item.is_published ? "已發布 (公開)" : "籌備中 (隱藏)" }}
          </span>
        </div>
        <h3>{{ item.title }}</h3>
        <p class="date">發刊日：{{ item.date }}</p>
        <div class="stats-box">
          <div class="stat-item">
            <span class="label">文章</span>
            <span class="value">{{ item.totalArtCount }} 篇</span>
            <span class="sub-value" v-if="!item.is_published"> (待公開) </span>
          </div>
          <div class="stat-item">
            <span class="label">作者</span>
            <span class="value">{{ item.totalAuthorCount }} 位</span>
            <span
              class="sub-value warning"
              v-if="!item.is_published && item.hiddenAuthorCount > 0"
            >
              ({{ item.hiddenAuthorCount }} 位新作者)
            </span>
          </div>
        </div>
        <div class="actions">
          <button
            v-if="!item.is_published"
            @click="handlePublish(item)"
            class="btn-publish"
          >
            🚀 確認發布 (一鍵上架)
          </button>
          <div v-else class="published-text">✅ 本期已全數上線</div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <h3>✨ 籌備新一期雜誌</h3>
        <div class="form-group">
          <label>期數 (自動產生)</label>
          <input
            type="text"
            :value="`第 ${nextIssueId} 期`"
            disabled
            class="disabled-input"
          />
        </div>
        <div class="form-group">
          <label>本期主題 (Title)</label>
          <input
            v-model="newIssueTitle"
            type="text"
            placeholder="例如：AI與信仰..."
            class="text-input"
            @keyup.enter="confirmCreate"
          />
        </div>
        <div class="modal-actions">
          <button @click="showModal = false" class="btn-cancel">取消</button>
          <button @click="confirmCreate" class="btn-confirm">確認新增</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.publishing-center {
  padding: 20px;
  max-width: 1100px;
  margin: 0 auto;
}
.issues-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 2px solid #ddd;
  padding-bottom: 0;
}
.tab-link {
  padding: 8px 20px;
  border-radius: 6px 6px 0 0;
  color: #666;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  border: 1px solid transparent;
  border-bottom: none;
  margin-bottom: -2px;
  transition: background 0.2s;
}
.tab-link:hover {
  background: #f0f0f0;
  color: #333;
}
.tab-active {
  background: white;
  color: #2c3e50 !important;
  border-color: #ddd;
  border-bottom-color: white !important;
  font-weight: bold;
}
.header-row {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
  min-height: 80px;
}
.header-row > div {
  text-align: center;
  max-width: 800px;
}
h2 {
  color: #2c3e50;
  margin-bottom: 5px;
}
.desc {
  color: #666;
  line-height: 1.6;
  margin-top: 5px;
}
.btn-create {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background-color: #2c3e50;
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 1.1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, background 0.2s;
  white-space: nowrap;
}
.btn-create:hover {
  background-color: #34495e;
  transform: translateY(-50%) translateY(-2px);
}
.loading {
  text-align: center;
  font-size: 1.2rem;
  color: #666;
  margin: 20px;
}
.issue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.issue-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
  transition: 0.3s;
}
.draft-card {
  border-left: 5px solid #ffc107;
  background: #fffdf5;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.vol {
  font-weight: bold;
  color: #888;
  font-size: 0.9rem;
}
.status-badge {
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: bold;
}
.status-badge.published {
  background: #d4edda;
  color: #155724;
}
.status-badge.draft {
  background: #fff3cd;
  color: #856404;
}
h3 {
  margin: 0 0 5px 0;
  font-size: 1.4rem;
  color: #333;
}
.date {
  font-size: 0.9rem;
  color: #999;
  margin-bottom: 15px;
}
.stats-box {
  background: rgba(0, 0, 0, 0.03);
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.stat-item {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
}
.stat-item .label {
  width: 50px;
  color: #666;
  font-weight: bold;
}
.stat-item .value {
  font-weight: bold;
  color: #333;
  margin-right: 8px;
}
.stat-item .sub-value {
  font-size: 0.85rem;
  color: #888;
}
.stat-item .sub-value.warning {
  color: #e67e22;
  font-weight: bold;
}
.actions {
  margin-top: auto;
}
.btn-publish {
  width: 100%;
  padding: 12px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  transition: 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.btn-publish:hover {
  background: #218838;
  transform: translateY(-2px);
}
.published-text {
  text-align: center;
  color: #155724;
  font-weight: bold;
  padding: 10px;
  background: #e9ecef;
  border-radius: 5px;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal {
  background: white;
  padding: 30px;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
.modal h3 {
  margin-top: 0;
  margin-bottom: 20px;
  text-align: center;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}
.disabled-input {
  width: 100%;
  padding: 10px;
  background: #eee;
  border: 1px solid #ccc;
  border-radius: 5px;
  color: #666;
}
.text-input {
  width: 100%;
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  transition: border 0.3s;
}
.text-input:focus {
  border-color: #2c3e50;
  outline: none;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 30px;
}
.btn-cancel {
  padding: 10px 20px;
  background: #ccc;
  color: #333;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.btn-confirm {
  padding: 10px 20px;
  background: #2c3e50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}
.btn-confirm:hover {
  background: #34495e;
}
@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    height: auto;
    gap: 15px;
  }
  .btn-create {
    position: static;
    transform: none;
    width: 100%;
  }
}
</style>
