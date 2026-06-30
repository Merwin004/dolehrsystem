<template>
  <div>
    <div class="page-hdr">
      <h1 class="page-title">Completed Publications</h1>
      <p class="page-sub">Finalized vacancy announcements that have been published.</p>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="search-bar" style="width:280px">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" class="form-input" placeholder="Search position, plantilla, service…" />
        </div>
        <div class="spacer"></div>
        <span class="count-badge">{{ filtered.length }} completed</span>
      </div>

      <div v-if="loading" class="loading-wrap"><div class="spinner"></div></div>
      <div v-else-if="filtered.length === 0" class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>No completed publications yet</h3>
        <p>Publications marked as completed will appear here.</p>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Position</th>
              <th>Plantilla Item No.</th>
              <th>Service</th>
              <th>Days Completed</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in filtered" :key="p.id">
              <td class="td-num">{{ i + 1 }}</td>
              <td>
                <div class="pos-hover-target"
                  @mouseenter="showApplicants($event, p)"
                  @mouseleave="hideApplicants">
                  <div class="pos-title">{{ p.position }}</div>
                </div>
              </td>
              <td><span class="plantilla-chip">{{ p.plantilla_item || '—' }}</span></td>
              <td class="td-dept">{{ p.department }}</td>
              <td>
                <span class="days-chip">{{ formatDuration(p) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Applicants hover popover -->
    <Teleport to="body">
      <div v-if="apop.show" class="apop" :style="apop.style" @mouseenter="apop.show=true" @mouseleave="hideApplicants">
        <div class="apop-hdr">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;flex-shrink:0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Applicants
        </div>
        <div v-if="apop.loading" class="apop-loading">Loading…</div>
        <div v-else-if="apop.list.length === 0" class="apop-empty">No applicants</div>
        <ul v-else class="apop-list">
          <template v-if="apop.list.some(a => a.status === 'shortlisted')">
            <li v-for="a in apop.list.filter(a => a.status === 'shortlisted').slice(0, 6)" :key="a.id" class="apop-item">
              <span class="apop-name">{{ a.full_name || (a.first_name + ' ' + a.last_name).trim() }}</span>
              <span class="apop-status apop-complete">Complete</span>
            </li>
            <li v-if="apop.list.filter(a => a.status === 'shortlisted').length > 6" class="apop-more">
              +{{ apop.list.filter(a => a.status === 'shortlisted').length - 6 }} more
            </li>
          </template>
          <template v-else>
            <li v-for="a in apop.list.slice(0, 6)" :key="a.id" class="apop-item">
              <span class="apop-name">{{ a.full_name || (a.first_name + ' ' + a.last_name).trim() }}</span>
              <span class="apop-status apop-complete">Complete</span>
            </li>
            <li v-if="apop.list.length > 6" class="apop-more">+{{ apop.list.length - 6 }} more</li>
          </template>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import api from '../../api'

const pubs    = ref([])
const loading = ref(true)
const search  = ref('')

const apop      = reactive({ show: false, loading: false, list: [], style: {} })
const apopCache = {}

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return pubs.value.filter(p =>
    p.position.toLowerCase().includes(q) ||
    (p.plantilla_item || '').toLowerCase().includes(q) ||
    (p.department || '').toLowerCase().includes(q)
  )
})

import { onMounted } from 'vue'
onMounted(async () => {
  loading.value = true
  try {
    const { data } = await api.get('/publications', { params: { status: 'completed' } })
    pubs.value = data
  } finally {
    loading.value = false
  }
})

function formatDuration(p) {
  const start = p.prod_start || p.prod_since
  const end   = p.updated_at
  if (!start || !end) return '—'
  const days = Math.max(0, Math.floor(
    (new Date(end.replace(' ', 'T')) - new Date(start.replace(' ', 'T'))) / 86400000
  ))
  return `${days}d`
}

async function showApplicants(e, p) {
  const rect  = e.currentTarget.getBoundingClientRect()
  const above = rect.top > window.innerHeight / 2
  apop.show    = true
  apop.loading = true
  apop.list    = []
  apop.style   = {
    left: Math.min(rect.left + 60, window.innerWidth - 260) + 'px',
    ...(above
      ? { bottom: (window.innerHeight - rect.top + 6) + 'px', top: 'auto' }
      : { top: (rect.bottom + 6) + 'px', bottom: 'auto' })
  }
  if (apopCache[p.id]) {
    apop.list = apopCache[p.id]; apop.loading = false; return
  }
  try {
    const { data } = await api.get(`/applicants?publication_id=${p.id}`)
    apopCache[p.id] = data
    apop.list = data
  } catch { apop.list = [] }
  apop.loading = false
}
function hideApplicants() { apop.show = false }
</script>

<style scoped>
.table-wrap { max-height: calc(100vh - 280px); overflow-y: auto; }
th { position: sticky; top: 0; z-index: 2; background: var(--bg); }

.count-badge { font-size:12px; color:var(--text-3); background:var(--bg); padding:5px 12px; border-radius:20px; border:1px solid var(--border); }

.td-num  { color:var(--text-3); font-size:12px; font-weight:600; }
.td-dept { font-size:13px; color:#334155; }

.pos-hover-target { display:inline-block; cursor:default; padding:4px 6px; border-radius:8px; margin:-4px -6px; transition:background .13s; }
.pos-hover-target:hover { background:var(--primary-light); }
.pos-title { font-size:14px; font-weight:600; color:#0f172a; }

.plantilla-chip { display:inline-block; padding:3px 10px; border-radius:20px; background:var(--primary-light); color:var(--primary); font-size:12px; font-weight:500; }

.days-chip { display:inline-block; padding:4px 12px; border-radius:20px; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; font-size:12.5px; font-weight:700; }

/* ── Applicants popover ── */
.apop {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 8px 28px rgba(0,0,0,.13);
  min-width: 230px;
  max-width: 300px;
  overflow: hidden;
}
.apop-hdr { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.5px; padding:10px 14px 8px; border-bottom:1px solid #f1f5f9; background:#f8fafc; }
.apop-loading { padding:14px; font-size:13px; color:#94a3b8; text-align:center; }
.apop-empty   { padding:14px; font-size:13px; color:#94a3b8; text-align:center; }
.apop-list    { list-style:none; margin:0; padding:6px 0; }
.apop-item    { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:7px 14px; }
.apop-item:hover { background:#f8fafc; }
.apop-name    { font-weight:600; color:#1e293b; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:13px; }
.apop-status  { font-size:10px; font-weight:700; text-transform:uppercase; padding:2px 8px; border-radius:10px; flex-shrink:0; letter-spacing:.3px; }
.apop-complete { background:#166534; color:#fff; }
.apop-more    { font-size:11px; color:#94a3b8; padding:5px 12px; font-style:italic; }
</style>
