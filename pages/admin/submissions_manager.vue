<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "~/supabase";

definePageMeta({ layout: "admin", middleware: "auth" });
useHead({ title: "投稿管理 - 無境界者後台" });

const submissions = ref([]);
const loading = ref(false);
const filterStatus = ref("all");
const selectedSubmission = ref(null);
const showModal = ref(false);
const updatingStatus = ref(false);

const statusOptions = [
  { value: "all", label: "全部" },
  { value: "submitted", label: "待審核" },
  { value: "reviewing", label: "審核中" },
  { value: "accepted", label: "已接受" },
  { value: "rejected", label: "已拒絕" },
  { value: "converted", label: "已轉文章" },
];

const statusLabel = {
  submitted: "待審核",
  reviewing: "審核中",
  accepted: "已接受",
  rejected: "已拒絕",
  converted: "已轉文章",
};
const statusColor = {
  submitted: "#e67e22",
  reviewing: "#2980b9",
  accepted: "#27ae60",
  rejected: "#c0392b",
  converted: "#8e44ad",
};

const filtered = computed(() => {
  if (filterStatus.value === "all") return submissions.value;
  return submissions.value.filter((s) => s.status === filterStatus.value);
});

const fetchSubmissions = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (!error) submissions.value = data || [];
  loading.value = false;
};

const openDetail = (s) => {
  selectedSubmission.value = { ...s };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedSubmission.value = null;
};

const updateStatus = async (id, newStatus) => {
  updatingStatus.value = true;
  const { error } = await supabase
    .from("submissions")
    .update({ status: newStatus })
    .eq("id", id);
  if (!error) {
    const idx = submissions.value.findIndex((s) => s.id === id);
    if (idx !== -1) submissions.value[idx].status = newStatus;
    if (selectedSubmission.value?.id === id) selectedSubmission.value.status = newStatus;
  }
  updatingStatus.value = false;
};

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

onMounted(fetchSubmissions);
</script>

<template>
  <div class="submissions-manager">
    <div class="page-header">
      <div>
        <h2>📥 投稿管理</h2>
        <p class="desc">查看、審核作者投稿。接受後可在「文章管理」中一鍵轉換為文章。</p>
      </div>
      <button class="btn-refresh" @click="fetchSubmissions">重新整理</button>
    </div>

    <!-- 篩選列 -->
    <div class="filter-bar">
      <button
        v-for="opt in statusOptions"
        :key="opt.value"
        :class="['filter-btn', { active: filterStatus === opt.value }]"
        @click="filterStatus = opt.value"
      >
        {{ opt.label }}
        <span class="count">
          {{ opt.value === 'all'
            ? submissions.length
            : submissions.filter(s => s.status === opt.value).length }}
        </span>
      </button>
    </div>

    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="filtered.length === 0" class="empty">目前沒有符合條件的投稿。</div>

    <!-- 投稿列表 -->
    <div v-else class="table-wrapper">
      <table class="submissions-table">
        <thead>
          <tr>
            <th>投稿時間</th>
            <th>標題</th>
            <th>作者</th>
            <th>類型</th>
            <th>期數</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filtered" :key="s.id">
            <td class="td-date">{{ formatDate(s.created_at) }}</td>
            <td class="td-title">{{ s.title }}</td>
            <td>{{ s.display_name || s.real_name }}</td>
            <td><span class="tag-category">{{ s.category }}</span></td>
            <td>{{ s.issue_number ? `Vol.${s.issue_number}` : '—' }}</td>
            <td>
              <span class="status-badge" :style="{ background: statusColor[s.status] }">
                {{ statusLabel[s.status] || s.status }}
              </span>
            </td>
            <td>
              <button class="btn-detail" @click="openDetail(s)">查看詳情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── 詳情 Modal ──────────────────────────────────────────────── -->
    <div v-if="showModal && selectedSubmission" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <button class="modal-close" @click="closeModal">✕</button>

        <div class="modal-header">
          <h3>{{ selectedSubmission.title }}</h3>
          <span class="status-badge lg" :style="{ background: statusColor[selectedSubmission.status] }">
            {{ statusLabel[selectedSubmission.status] }}
          </span>
        </div>

        <!-- 狀態操作 -->
        <div class="status-actions" v-if="selectedSubmission.status !== 'converted'">
          <span class="label">變更狀態：</span>
          <button
            v-for="s in ['submitted','reviewing','accepted','rejected']"
            :key="s"
            class="btn-status"
            :class="{ current: selectedSubmission.status === s }"
            :style="selectedSubmission.status === s ? { background: statusColor[s], color:'white' } : {}"
            :disabled="updatingStatus || selectedSubmission.status === s"
            @click="updateStatus(selectedSubmission.id, s)"
          >{{ statusLabel[s] }}</button>
        </div>
        <div v-else class="converted-note">
          此投稿已轉換為文章：
          <NuxtLink :to="`/admin/articles/${selectedSubmission.article_id}`" target="_blank">
            {{ selectedSubmission.article_id }}
          </NuxtLink>
        </div>

        <div class="modal-body">
          <div class="info-grid">
            <!-- 作者資訊 -->
            <div class="info-section">
              <h4>作者資訊</h4>
              <div class="info-row"><span>真實姓名</span><span>{{ selectedSubmission.real_name }}</span></div>
              <div class="info-row"><span>發表名稱</span><span>{{ selectedSubmission.display_name || '（使用本名）' }}</span></div>
              <div class="info-row"><span>作者身分</span><span>{{ selectedSubmission.author_bio }}</span></div>
              <div class="info-row"><span>Email</span><a :href="`mailto:${selectedSubmission.email}`">{{ selectedSubmission.email }}</a></div>
              <div class="info-row"><span>初次投稿</span><span>{{ selectedSubmission.is_first_submission ? '是' : '否' }}</span></div>
              <div v-if="selectedSubmission.author_intro" class="info-row column">
                <span>作者自介</span>
                <p class="info-text">{{ selectedSubmission.author_intro }}</p>
              </div>
              <div v-if="selectedSubmission.avatar_url" class="info-row">
                <span>大頭貼</span>
                <a :href="selectedSubmission.avatar_url" target="_blank">
                  <img :src="selectedSubmission.avatar_url" class="avatar-thumb" />
                </a>
              </div>
            </div>

            <!-- 文章資訊 -->
            <div class="info-section">
              <h4>文章資訊</h4>
              <div class="info-row"><span>期數</span><span>{{ selectedSubmission.issue_number ? `Vol.${selectedSubmission.issue_number}` : '—' }}</span></div>
              <div class="info-row"><span>類型</span><span>{{ selectedSubmission.category }}</span></div>
              <div v-if="selectedSubmission.keywords?.length" class="info-row">
                <span>關鍵字</span>
                <span>{{ selectedSubmission.keywords.join('、') }}</span>
              </div>
              <div v-if="selectedSubmission.article_summary" class="info-row column">
                <span>文章簡介</span>
                <p class="info-text">{{ selectedSubmission.article_summary }}</p>
              </div>
              <div v-if="selectedSubmission.notes" class="info-row column">
                <span>備註</span>
                <p class="info-text">{{ selectedSubmission.notes }}</p>
              </div>
            </div>
          </div>

          <!-- 檔案下載 -->
          <div class="files-section">
            <h4>投稿檔案</h4>
            <div class="file-links">
              <a v-if="selectedSubmission.word_url" :href="selectedSubmission.word_url" target="_blank" class="file-link word">
                📄 下載 Word 檔
              </a>
              <a v-if="selectedSubmission.pdf_url" :href="selectedSubmission.pdf_url" target="_blank" class="file-link pdf">
                📑 下載 PDF 檔
              </a>
              <span v-if="!selectedSubmission.word_url && !selectedSubmission.pdf_url" class="no-file">（未上傳檔案）</span>
            </div>

            <!-- 附圖 -->
            <div v-if="selectedSubmission.images?.length" class="images-section">
              <h5>附圖（{{ selectedSubmission.images.length }} 張，依作者排序）</h5>
              <div class="images-grid">
                <div v-for="(img, i) in selectedSubmission.images" :key="i" class="img-item">
                  <a :href="img.url" target="_blank">
                    <img :src="img.url" :alt="img.name" />
                  </a>
                  <span class="img-label">{{ i+1 }}. {{ img.name }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 投稿時間 -->
          <div class="submit-time">投稿時間：{{ formatDate(selectedSubmission.created_at) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.submissions-manager { padding: 20px; max-width: 1200px; margin: 0 auto; }
.page-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 24px;
}
.page-header h2 { margin: 0 0 6px; color: #2c3e50; }
.desc { color: #666; margin: 0; font-size: 0.95rem; }
.btn-refresh {
  padding: 8px 16px; background: #2c3e50; color: white;
  border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;
}
.btn-refresh:hover { background: #34495e; }

/* 篩選 */
.filter-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.filter-btn {
  padding: 6px 14px; border: 1px solid #ddd; border-radius: 20px;
  background: #fff; cursor: pointer; font-size: 0.9rem; color: #555;
  transition: all 0.2s;
}
.filter-btn:hover { border-color: #2c3e50; color: #2c3e50; }
.filter-btn.active { background: #2c3e50; color: white; border-color: #2c3e50; }
.count { background: rgba(255,255,255,0.25); border-radius: 10px; padding: 1px 6px; font-size: 0.8rem; margin-left: 4px; }
.filter-btn:not(.active) .count { background: #eee; color: #888; }

.loading, .empty { text-align: center; padding: 40px; color: #999; }

/* 表格 */
.table-wrapper { overflow-x: auto; }
.submissions-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.submissions-table th { background: #2c3e50; color: white; padding: 10px 12px; text-align: left; white-space: nowrap; }
.submissions-table td { padding: 10px 12px; border-bottom: 1px solid #eee; vertical-align: middle; }
.submissions-table tr:hover td { background: #f9f9f9; }
.td-date { white-space: nowrap; color: #777; font-size: 0.85rem; }
.td-title { max-width: 200px; font-weight: 600; color: #2c3e50; }
.tag-category {
  background: #e8f0fe; color: #2c5aa0; padding: 2px 8px;
  border-radius: 12px; font-size: 0.8rem; white-space: nowrap;
}
.status-badge {
  display: inline-block; padding: 3px 10px; border-radius: 12px;
  color: white; font-size: 0.82rem; font-weight: 600;
}
.status-badge.lg { font-size: 0.9rem; padding: 4px 14px; }
.btn-detail {
  padding: 5px 12px; background: #fff; border: 1px solid #2c3e50;
  color: #2c3e50; border-radius: 5px; cursor: pointer; font-size: 0.85rem;
}
.btn-detail:hover { background: #2c3e50; color: white; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 40px 20px; z-index: 1000; overflow-y: auto;
}
.modal {
  background: white; border-radius: 12px; width: 100%; max-width: 800px;
  padding: 32px; position: relative; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
}
.modal-close {
  position: absolute; top: 16px; right: 16px;
  background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #aaa;
}
.modal-close:hover { color: #333; }
.modal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.modal-header h3 { margin: 0; color: #2c3e50; font-size: 1.2rem; flex: 1; }

/* 狀態操作 */
.status-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; padding: 12px; background: #f8f8f8; border-radius: 8px; }
.status-actions .label { font-size: 0.9rem; color: #555; }
.btn-status {
  padding: 5px 12px; border: 1px solid #ddd; border-radius: 5px;
  cursor: pointer; background: #fff; font-size: 0.85rem;
  transition: all 0.2s;
}
.btn-status:hover:not(:disabled) { border-color: #2c3e50; }
.btn-status:disabled { opacity: 0.5; cursor: default; }
.converted-note { padding: 10px 14px; background: #f3e8ff; border-radius: 8px; font-size: 0.9rem; color: #6a1b9a; margin-bottom: 20px; }

/* 資訊格 */
.modal-body { margin-top: 8px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
@media (max-width: 600px) { .info-grid { grid-template-columns: 1fr; } }
.info-section h4 { font-size: 1rem; color: #2c3e50; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
.info-row { display: flex; gap: 8px; font-size: 0.9rem; padding: 5px 0; border-bottom: 1px solid #f5f5f5; }
.info-row.column { flex-direction: column; }
.info-row > span:first-child { color: #888; min-width: 70px; flex-shrink: 0; }
.info-text { margin: 4px 0 0; color: #444; line-height: 1.6; white-space: pre-wrap; }
.avatar-thumb { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }

/* 檔案區 */
.files-section { margin-bottom: 16px; }
.files-section h4 { font-size: 1rem; color: #2c3e50; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
.file-links { display: flex; gap: 12px; flex-wrap: wrap; }
.file-link {
  padding: 8px 18px; border-radius: 6px; text-decoration: none;
  font-size: 0.9rem; font-weight: 600;
}
.file-link.word { background: #e8f4fd; color: #1a6fa8; }
.file-link.word:hover { background: #d0e8f9; }
.file-link.pdf { background: #fdecea; color: #c0392b; }
.file-link.pdf:hover { background: #fad7d4; }
.no-file { color: #aaa; font-size: 0.9rem; }

/* 附圖 */
.images-section { margin-top: 16px; }
.images-section h5 { font-size: 0.9rem; color: #555; margin: 0 0 10px; }
.images-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.img-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.img-item a img { width: 90px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid #eee; }
.img-label { font-size: 0.75rem; color: #888; max-width: 90px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.submit-time { font-size: 0.82rem; color: #aaa; text-align: right; }
</style>
