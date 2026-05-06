<script setup>
import { ref, computed, onMounted } from "vue";

definePageMeta({
  layout: "admin",
  middleware: "auth",
});

useHead({
  title: "作者管理 - 無境界者後台",
});

const authors = ref([]);
const articles = ref([]);
const expanded = ref(new Set());
const loading = ref(false);
const saving = ref(false);
const supabase = useSupabaseClient();

const showModal = ref(false);
const isEditing = ref(false);
const currentAuthor = ref({
  id: null,
  name: "",
  bio: "",
  author_image: "",
  years_str: "2025",
  aliases_str: "",
  is_published: false,
});

const getArticleOrder = (id) => {
  const m = (id || "").match(/-(\d+)/);
  return m ? parseInt(m[1]) : 0;
};

const sortArticles = (list) =>
  [...list].sort((a, b) => {
    const ia = Number(a.issue) || 0;
    const ib = Number(b.issue) || 0;
    if (ia !== ib) return ib - ia;
    return getArticleOrder(a.id) - getArticleOrder(b.id);
  });

// 比對：linked_author_ids 包含此 author.id
const articlesByAuthor = computed(() => {
  const map = {};
  for (const a of authors.value) {
    map[a.id] = sortArticles(
      articles.value.filter(
        (art) =>
          Array.isArray(art.linked_author_ids) &&
          art.linked_author_ids.includes(a.id),
      ),
    );
  }
  return map;
});

const toggleExpand = (id) => {
  const s = new Set(expanded.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  expanded.value = s;
};

const fetchAuthors = async () => {
  loading.value = true;
  const [authorsRes, articlesRes] = await Promise.all([
    supabase.from("authors").select("*").order("id", { ascending: true }),
    supabase
      .from("articles")
      .select(
        "id, title, issue, author, author_display, is_published, linked_author_ids, issues(is_published)",
      ),
  ]);

  if (authorsRes.error) {
    alert("讀取作者失敗：" + authorsRes.error.message);
  } else {
    authors.value = authorsRes.data;
  }
  if (articlesRes.error) {
    alert("讀取文章失敗：" + articlesRes.error.message);
  } else {
    articles.value = articlesRes.data;
  }
  loading.value = false;
};

// ── 編輯文章歸屬 modal ──────────────────────────────────────────
const showLinkModal = ref(false);
const linkAuthor = ref(null);
const linkSelectedIds = ref(new Set());
const linkFilterIssue = ref("all");
const linkSaving = ref(false);

const openLinkModal = (author) => {
  linkAuthor.value = author;
  linkSelectedIds.value = new Set(
    articles.value
      .filter(
        (a) =>
          Array.isArray(a.linked_author_ids) &&
          a.linked_author_ids.includes(author.id),
      )
      .map((a) => a.id),
  );
  linkFilterIssue.value = "all";
  showLinkModal.value = true;
};

const toggleArticleLink = (articleId) => {
  const s = new Set(linkSelectedIds.value);
  if (s.has(articleId)) s.delete(articleId);
  else s.add(articleId);
  linkSelectedIds.value = s;
};

const linkAvailableIssues = computed(() => {
  const set = new Set(articles.value.map((a) => Number(a.issue) || 0));
  return Array.from(set).sort((a, b) => b - a);
});

const linkArticlesGrouped = computed(() => {
  const target = Number(linkFilterIssue.value);
  const filtered =
    linkFilterIssue.value === "all"
      ? articles.value
      : articles.value.filter((a) => Number(a.issue) === target);
  const sorted = sortArticles(filtered);
  const map = new Map();
  for (const art of sorted) {
    const k = Number(art.issue) || 0;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(art);
  }
  return Array.from(map.entries());
});

const saveArticleLinks = async () => {
  if (!linkAuthor.value) return;
  linkSaving.value = true;
  try {
    const authorId = linkAuthor.value.id;
    const wanted = linkSelectedIds.value;
    const updates = [];
    for (const art of articles.value) {
      const current = Array.isArray(art.linked_author_ids)
        ? art.linked_author_ids
        : [];
      const has = current.includes(authorId);
      const want = wanted.has(art.id);
      if (has === want) continue;
      const next = want
        ? [...current, authorId].sort((a, b) => a - b)
        : current.filter((id) => id !== authorId);
      updates.push({ id: art.id, linked_author_ids: next });
    }

    if (updates.length === 0) {
      showLinkModal.value = false;
      return;
    }

    for (const u of updates) {
      const { data, error } = await supabase
        .from("articles")
        .update({ linked_author_ids: u.linked_author_ids })
        .eq("id", u.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(`未更新 ${u.id}（可能登入已過期或權限不足）`);
      }
    }

    alert(`已更新 ${updates.length} 篇文章的歸屬`);
    showLinkModal.value = false;
    await fetchAuthors();
  } catch (e) {
    alert("儲存失敗：" + e.message);
  } finally {
    linkSaving.value = false;
  }
};

const openAddModal = () => {
  isEditing.value = false;
  currentAuthor.value = {
    id: null,
    name: "",
    bio: "",
    author_image: "",
    years_str: "2025",
    aliases_str: "",
    is_published: false,
  };
  showModal.value = true;
};

const openEditModal = (author) => {
  isEditing.value = true;
  const temp = JSON.parse(JSON.stringify(author));
  if (Array.isArray(temp.years)) {
    temp.years_str = temp.years.join(", ");
  } else {
    temp.years_str = "";
  }
  if (Array.isArray(temp.aliases)) {
    temp.aliases_str = temp.aliases.join(", ");
  } else {
    temp.aliases_str = "";
  }
  currentAuthor.value = temp;
  showModal.value = true;
};

const saveAuthor = async () => {
  if (!currentAuthor.value.name) {
    alert("請輸入作者姓名！");
    return;
  }
  saving.value = true;
  try {
    let yearsArray = [];
    if (currentAuthor.value.years_str) {
      yearsArray = currentAuthor.value.years_str
        .split(/[、,,，]/)
        .map((y) => parseInt(y.trim()))
        .filter((y) => !isNaN(y));
    }

    let aliasesArray = [];
    if (currentAuthor.value.aliases_str) {
      aliasesArray = currentAuthor.value.aliases_str
        .split(/[、,,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const payload = {
      name: currentAuthor.value.name,
      bio: currentAuthor.value.bio,
      author_image: currentAuthor.value.author_image,
      years: yearsArray,
      aliases: aliasesArray,
      is_published: currentAuthor.value.is_published,
    };

    let error = null;
    if (isEditing.value) {
      const { data: updatedRows, error: updateErr } = await supabase
        .from("authors")
        .update(payload)
        .eq("id", currentAuthor.value.id)
        .select("id");
      error =
        updateErr ||
        (!updatedRows || updatedRows.length === 0
          ? new Error("未更新任何資料（可能登入已過期或權限不足）")
          : null);
    } else {
      const { data: insertedRows, error: insertErr } = await supabase
        .from("authors")
        .insert([payload])
        .select("id");
      error =
        insertErr ||
        (!insertedRows || insertedRows.length === 0
          ? new Error("未寫入任何資料（可能登入已過期或權限不足）")
          : null);
    }

    if (error) throw error;

    alert(isEditing.value ? "更新成功！" : "新增成功！(目前為隱藏狀態)");
    showModal.value = false;
    fetchAuthors();
  } catch (err) {
    alert("儲存失敗：" + err.message);
  } finally {
    saving.value = false;
  }
};

const deleteAuthor = async (id, name) => {
  if (!confirm(`確定要刪除作者「${name}」嗎？\n此動作無法復原！`)) return;
  const { error } = await supabase.from("authors").delete().eq("id", id).select("id");
  if (error) {
    alert("刪除失敗：" + error.message);
  } else {
    alert("已刪除！");
    fetchAuthors();
  }
};

onMounted(() => {
  fetchAuthors();
});
</script>

<template>
  <div class="authors-manager">
    <div class="header-row">
      <div>
        <h2>🧑‍🏫 作者管理</h2>
        <p class="desc">管理專欄作者的資料、簡介與頭像。</p>
      </div>
      <button class="btn-add" @click="openAddModal">＋ 新增作者</button>
    </div>

    <div v-if="loading" class="loading">載入中...</div>

    <div class="table-container" v-else>
      <table>
        <thead>
          <tr>
            <th width="60">ID</th>
            <th width="80">頭像</th>
            <th width="120">姓名</th>
            <th>簡介 (Bio)</th>
            <th width="100">所屬年份</th>
            <th width="100">文章</th>
            <th width="80">狀態</th>
            <th width="140">操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="author in authors" :key="author.id">
            <tr>
              <td class="text-center">{{ author.id }}</td>
              <td class="text-center">
                <div
                  class="avatar-thumb"
                  :style="{
                    backgroundImage: author.author_image
                      ? `url(${author.author_image})`
                      : 'none',
                  }"
                >
                  <span v-if="!author.author_image">無</span>
                </div>
              </td>
              <td style="font-weight: bold">{{ author.name }}</td>
              <td class="bio-cell">{{ author.bio }}</td>
              <td class="text-center">
                <span v-if="author.years && author.years.length">
                  {{ author.years.join(", ") }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <button
                  class="btn-expand"
                  @click="toggleExpand(author.id)"
                >
                  {{ articlesByAuthor[author.id]?.length || 0 }} 篇
                  {{ expanded.has(author.id) ? "▲" : "▼" }}
                </button>
              </td>
              <td class="text-center">
                <span
                  :class="['badge', author.is_published ? 'published' : 'draft']"
                >
                  {{ author.is_published ? "公開" : "隱藏" }}
                </span>
              </td>
              <td class="text-center actions">
                <button class="btn-edit" @click="openEditModal(author)">
                  編輯
                </button>
                <button
                  class="btn-delete"
                  @click="deleteAuthor(author.id, author.name)"
                >
                  刪除
                </button>
              </td>
            </tr>
            <tr
              v-if="expanded.has(author.id)"
              class="article-detail-row"
            >
              <td colspan="8">
                <div class="article-list-wrap">
                  <div class="article-list-header">
                    <div class="article-list-title">
                      {{ author.name }} 名下文章
                      <span class="article-list-hint">
                        （依 articles.linked_author_ids 比對 author.id={{ author.id }}）
                      </span>
                    </div>
                    <button class="btn-link-edit" @click="openLinkModal(author)">
                      ✏️ 編輯文章歸屬
                    </button>
                  </div>
                  <p
                    v-if="!articlesByAuthor[author.id]?.length"
                    class="text-muted"
                    style="margin: 6px 0 0"
                  >
                    目前沒有手動綁定文章。點「編輯文章歸屬」加入。
                  </p>
                  <ul v-else class="article-list-ul">
                    <li
                      v-for="art in articlesByAuthor[author.id]"
                      :key="art.id"
                      class="article-li"
                    >
                      <span class="art-issue">Vol. {{ art.issue || "?" }}</span>
                      <NuxtLink
                        :to="`/admin/editor/${art.id}`"
                        class="art-title"
                        target="_blank"
                      >
                        {{ art.title }}
                      </NuxtLink>
                      <span
                        v-if="art.is_published && art.issues?.is_published"
                        class="badge published mini"
                      >已發刊</span>
                      <span v-else class="badge draft mini">
                        {{ art.issues?.is_published === false ? "本期未發刊" : "草稿" }}
                      </span>
                    </li>
                  </ul>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isEditing ? "編輯作者" : "新增作者" }}</h3>
          <button class="btn-close" @click="showModal = false">×</button>
        </div>

        <div class="modal-body">
          <div class="form-row">
            <div class="avatar-preview-section">
              <div
                class="avatar-preview-circle"
                :style="{
                  backgroundImage: currentAuthor.author_image
                    ? `url(${currentAuthor.author_image})`
                    : 'none',
                }"
              >
                <span v-if="!currentAuthor.author_image">預覽</span>
              </div>
              <p class="preview-label">頭像預覽</p>
            </div>

            <div class="form-section">
              <div class="form-group">
                <label>作者姓名 (Name)</label>
                <input
                  type="text"
                  v-model="currentAuthor.name"
                  class="input-text"
                  placeholder="輸入姓名"
                />
              </div>

              <div class="form-group">
                <label>所屬年份 (Years)</label>
                <input
                  type="text"
                  v-model="currentAuthor.years_str"
                  class="input-text"
                  placeholder="例如：2025, 2026"
                />
                <small class="hint"
                  >請輸入年份數字，若有多個年份請用逗號分隔。</small
                >
              </div>

              <div class="form-group">
                <label>比對別名 (Aliases)</label>
                <input
                  type="text"
                  v-model="currentAuthor.aliases_str"
                  class="input-text"
                  placeholder="例如：溫金柯"
                />
                <small class="hint"
                  >若文章 author 欄寫純名字（如「溫金柯」）、但此處姓名含稱謂（如「溫金柯老師」），請把純名字填到這裡，發布中心才能正確算進「本期作者」。多個別名以逗號分隔。</small
                >
              </div>

              <div class="form-group">
                <label>大頭貼連結 (Image URL)</label>
                <input
                  type="text"
                  v-model="currentAuthor.author_image"
                  class="input-text"
                  placeholder="https://..."
                />
              </div>

              <div class="form-group">
                <label>狀態</label>
                <div class="radio-group">
                  <label>
                    <input
                      type="radio"
                      :value="true"
                      v-model="currentAuthor.is_published"
                    />
                    公開
                  </label>
                  <label style="margin-left: 15px">
                    <input
                      type="radio"
                      :value="false"
                      v-model="currentAuthor.is_published"
                    />
                    隱藏
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>作者簡介 (Bio)</label>
            <textarea
              v-model="currentAuthor.bio"
              rows="5"
              class="input-area"
              placeholder="請輸入作者簡介..."
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="showModal = false">取消</button>
          <button class="btn-save" @click="saveAuthor" :disabled="saving">
            {{ saving ? "處理中..." : "確認儲存" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showLinkModal" class="modal-overlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>
            編輯文章歸屬
            <small class="muted">— {{ linkAuthor?.name }} (id={{ linkAuthor?.id }})</small>
          </h3>
          <button class="btn-close" @click="showLinkModal = false">×</button>
        </div>

        <div class="modal-body link-modal-body">
          <div class="link-toolbar">
            <label>
              篩選期數：
              <select v-model="linkFilterIssue" class="input-select">
                <option value="all">全部</option>
                <option v-for="n in linkAvailableIssues" :key="n" :value="String(n)">
                  Vol. {{ n || "?" }}
                </option>
              </select>
            </label>
            <span class="link-counter">
              已勾選 <b>{{ linkSelectedIds.size }}</b> 篇
            </span>
          </div>

          <div class="link-issue-list">
            <div
              v-for="[issueNum, list] in linkArticlesGrouped"
              :key="issueNum"
              class="link-issue-block"
            >
              <div class="link-issue-title">Vol. {{ issueNum || "?" }}</div>
              <ul class="link-article-ul">
                <li
                  v-for="art in list"
                  :key="art.id"
                  class="link-article-li"
                  :class="{ checked: linkSelectedIds.has(art.id) }"
                >
                  <label class="link-article-label">
                    <input
                      type="checkbox"
                      :checked="linkSelectedIds.has(art.id)"
                      @change="toggleArticleLink(art.id)"
                    />
                    <span class="link-art-id">{{ art.id }}</span>
                    <span class="link-art-title">{{ art.title }}</span>
                    <span v-if="art.author" class="link-art-author">
                      author: {{ art.author }}
                    </span>
                  </label>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="showLinkModal = false">取消</button>
          <button
            class="btn-save"
            @click="saveArticleLinks"
            :disabled="linkSaving"
          >
            {{ linkSaving ? "儲存中..." : "確認儲存" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS 完全保留 */
.authors-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-row {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
  min-height: 60px;
}

.header-row > div {
  text-align: center;
}

.header-row h2 {
  color: #2c3e50;
  margin-bottom: 5px;
  font-size: 1.8rem;
}

.desc {
  color: #666;
  margin: 0;
}

.btn-add {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background-color: #2c3e50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

.btn-add:hover {
  background-color: #34495e;
}

.btn-edit {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 5px;
}
.btn-edit:hover {
  background-color: #2980b9;
}

.btn-delete {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-delete:hover {
  background-color: #c0392b;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}
th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #444;
}
.text-center {
  text-align: center;
}
.bio-cell {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #666;
}

.avatar-thumb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #eee;
  background-size: cover;
  background-position: center;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: #999;
}

.badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}
.badge.mini {
  font-size: 0.72rem;
  padding: 2px 6px;
  margin-left: 8px;
}
.published {
  background: #d4edda;
  color: #155724;
}
.draft {
  background: #f8d7da;
  color: #721c24;
}

.btn-expand {
  background: #ecf0f1;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #2c3e50;
}
.btn-expand:hover {
  background: #dfe6e9;
}
.text-muted {
  color: #aaa;
  font-size: 0.85rem;
}

.article-detail-row td {
  background: #fafbfc;
  padding: 14px 24px;
  border-bottom: 2px solid #e1e8ed;
}
.article-list-wrap {
  font-size: 0.95rem;
}
.article-list-title {
  font-weight: bold;
  color: #555;
  margin-bottom: 8px;
  font-size: 0.9rem;
}
.article-list-ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.article-li {
  padding: 6px 0;
  border-bottom: 1px dashed #e1e8ed;
  display: flex;
  align-items: center;
  gap: 10px;
}
.article-li:last-child {
  border-bottom: none;
}
.art-issue {
  display: inline-block;
  min-width: 60px;
  color: #888;
  font-family: "Times New Roman", serif;
}
.art-title {
  color: #2980b9;
  text-decoration: none;
  flex: 1;
}
.art-title:hover {
  text-decoration: underline;
}

.article-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.article-list-hint {
  font-weight: normal;
  font-size: 0.8rem;
  color: #999;
  margin-left: 6px;
}
.btn-link-edit {
  background: #16a085;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-link-edit:hover {
  background: #138d75;
}

.modal-lg {
  max-width: 900px;
}
.muted {
  color: #888;
  font-weight: normal;
  font-size: 0.85rem;
  margin-left: 8px;
}
.link-modal-body {
  padding: 20px 30px;
}
.link-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}
.input-select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  margin-left: 6px;
}
.link-counter {
  color: #555;
}
.link-issue-list {
  max-height: 60vh;
  overflow-y: auto;
}
.link-issue-block {
  margin-bottom: 18px;
}
.link-issue-title {
  font-weight: bold;
  color: #2c3e50;
  background: #ecf0f1;
  padding: 6px 12px;
  border-radius: 4px;
  margin-bottom: 6px;
}
.link-article-ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.link-article-li {
  padding: 6px 12px;
  border-bottom: 1px dashed #eee;
}
.link-article-li.checked {
  background: #fff8e1;
}
.link-article-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: normal;
  margin: 0;
  flex-wrap: wrap;
}
.link-article-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.link-art-id {
  color: #999;
  font-family: "Times New Roman", serif;
  min-width: 80px;
}
.link-art-title {
  flex: 1;
  font-weight: 500;
  color: #2c3e50;
}
.link-art-author {
  color: #7f8c8d;
  font-size: 0.85rem;
  font-style: italic;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 20px;
}

.modal {
  background: white;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}
.btn-close {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 30px;
  overflow-y: auto;
  flex: 1;
}

.form-row {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
}
.avatar-preview-section {
  width: 120px;
  text-align: center;
  flex-shrink: 0;
}
.avatar-preview-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: #f0f0f0;
  border: 2px dashed #ccc;
  background-size: cover;
  background-position: center;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}
.form-section {
  flex: 1;
}

.form-group {
  margin-bottom: 15px;
}
label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
  color: #555;
}
.input-text,
.input-area {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.hint {
  color: #888;
  font-size: 0.85rem;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-cancel {
  padding: 10px 20px;
  background: #ccc;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-save {
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}
.btn-save:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    gap: 15px;
    height: auto;
  }
  .btn-add {
    position: static;
    transform: none;
    margin-top: 10px;
  }
  .form-row {
    flex-direction: column;
  }
  .avatar-preview-section {
    margin: 0 auto 20px auto;
  }
}
</style>
