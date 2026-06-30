<template>
  <div>
    <div class="page-hdr">
      <h1 class="page-title">Welcome back, {{ auth.user?.full_name?.split(' ')[0] || 'RSPU' }}!</h1>
      <p class="page-sub">Here's an overview of all published vacancy announcements.</p>
    </div>

    <div class="card">
      <!-- Card header -->
      <div class="pv-card-header">
        <div class="pv-title-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" style="width:20px;height:20px;flex-shrink:0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span class="pv-title">Published Vacancies</span>
        </div>
        <div class="pv-stats">
          <div class="pv-stat">
            <span class="pv-stat-num">{{ pubs.length }}</span>
            <span class="pv-stat-label">Total Vacancies</span>
          </div>
          <div class="pv-stat">
            <span class="pv-stat-num">{{ openCount }}</span>
            <span class="pv-stat-label">Currently Open</span>
          </div>
          <div class="pv-stat">
            <span class="pv-stat-num">{{ officeCount }}</span>
            <span class="pv-stat-label">Offices</span>
          </div>
        </div>
      </div>

      <!-- Search & filter -->
      <div class="pv-toolbar">
        <div class="search-bar" style="flex:1">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" class="form-input" placeholder="Search position, plantilla no., office…" />
        </div>
        <select v-model="deptFilter" class="form-select" style="width:200px">
          <option value="">All Offices</option>
          <option v-for="d in offices" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>

      <!-- Table -->
      <div v-if="loading" class="loading-wrap"><div class="spinner"></div> Loading…</div>
      <div v-else-if="filtered.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No published vacancies</h3>
        <p>Positions appear here once they are published.</p>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:36px">#</th>
              <th>Posting Date</th>
              <th>Position Title</th>
              <th>Plantilla Item No.</th>
              <th>Office</th>
              <th style="text-align:center">SG</th>
              <th>Qualifications</th>
              <th>Closing Date</th>
              <th>Publication</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in filtered" :key="p.id">
              <td class="td-num">{{ i + 1 }}</td>
              <td class="td-date">{{ fmtDate(p.updated_at) }}</td>
              <td>
                <div class="pos-name">{{ p.position }}</div>
                <span class="open-badge">Open</span>
              </td>
              <td><span class="plantilla-chip">{{ p.plantilla_item || '—' }}</span></td>
              <td class="td-office">{{ p.department }}</td>
              <td style="text-align:center">
                <span class="sg-badge">{{ p.salary_grade || '—' }}</span>
              </td>
              <td class="td-qual">{{ qualText(p) }}</td>
              <td class="td-date">{{ p.closing_date ? fmtDate(p.closing_date) : '—' }}</td>
              <td>
                <button v-if="p.attachment_name" class="btn-view-pub" @click="openViewer(p)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  View
                </button>
                <span v-else class="td-dash">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- File Viewer Panel -->
    <Teleport to="body">
      <div v-if="viewerPub" class="viewer-overlay" @click.self="closeViewer">
        <div class="viewer-panel">
          <div class="viewer-header">
            <div class="viewer-title-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;flex-shrink:0;color:#2563eb">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div>
                <div class="viewer-pos-name">{{ viewerPub.position }}</div>
                <div class="viewer-pos-meta">{{ viewerPub.plantilla_item }} · {{ viewerPub.department }}</div>
              </div>
            </div>
            <button class="modal-close" @click="closeViewer">✕</button>
          </div>
          <div class="viewer-body">
            <iframe
              :key="viewerPub.attachment_name"
              :src="`/uploads/${viewerPub.attachment_name}?t=${encodeURIComponent(viewerPub.updated_at || '')}`"
              class="viewer-iframe"
              frameborder="0"
            ></iframe>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api'
import { useAuthStore } from '../../stores/auth'

const auth    = useAuthStore()
const pubs    = ref([])
const loading = ref(true)
const search  = ref('')
const deptFilter = ref('')
const viewerPub  = ref(null)

const offices   = computed(() => [...new Set(pubs.value.map(p => p.department))].sort())
const openCount = computed(() => pubs.value.filter(p => p.pub_status === 'active').length)
const officeCount = computed(() => new Set(pubs.value.map(p => p.department)).size)

const filtered = computed(() => {
  let list = pubs.value
  if (deptFilter.value) list = list.filter(p => p.department === deptFilter.value)
  const q = search.value.toLowerCase()
  if (q) list = list.filter(p =>
    p.position.toLowerCase().includes(q) ||
    (p.plantilla_item || '').toLowerCase().includes(q) ||
    p.department.toLowerCase().includes(q)
  )
  return list
})

onMounted(async () => {
  try {
    const { data } = await api.get('/publications')
    pubs.value = data.filter(p => p.pub_status === 'active')
  } finally {
    loading.value = false
  }
})

function qualText(p) {
  return [p.education, p.training, p.experience, p.eligibility, p.competency]
    .filter(Boolean)
    .join(' / ') || '—'
}

function openViewer(p) { viewerPub.value = p }
function closeViewer()  { viewerPub.value = null }

function applyPosition(p) {
  // placeholder — wire to applicant form later
  alert(`Apply for: ${p.position}`)
}

function fmtDate(d) {
  if (!d) return '—'
  let normalized
  if (d.includes('T') || d.includes('+')) normalized = d
  else if (d.includes(' ')) normalized = d.replace(' ', 'T') + '+08:00'
  else normalized = d + 'T00:00:00+08:00'
  return new Date(normalized).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<style scoped>
/* Card header */
.pv-card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 12px; border-bottom: 1px solid var(--border);
  flex-wrap: wrap; gap: 12px;
}
.pv-title-row {
  display: flex; align-items: center; gap: 10px;
}
.pv-title {
  font-size: 17px; font-weight: 800; color: var(--text-1);
}
.pv-stats {
  display: flex; align-items: center; gap: 28px;
}
.pv-stat {
  display: flex; align-items: center; gap: 7px;
}
.pv-stat-num {
  font-size: 15px; font-weight: 800; color: #2563eb;
}
.pv-stat-label {
  font-size: 13px; color: var(--text-2); font-weight: 500;
}

/* Toolbar */
.pv-toolbar {
  display: flex; gap: 12px; align-items: center;
  padding: 14px 20px; border-bottom: 1px solid var(--border);
}

/* Table cells */
.td-num   { color: var(--text-3); font-size: 13px; width: 36px; }
.td-date  { font-size: 13px; color: var(--text-2); white-space: nowrap; }
.td-office { font-size: 13px; }
.td-dash  { color: var(--text-3); }
.td-qual  {
  font-size: 12px; color: var(--text-2);
  max-width: 280px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Position name */
.pos-name { font-size: 14px; font-weight: 700; color: var(--text-1); margin-bottom: 4px; }

/* Open badge */
.open-badge {
  display: inline-block; padding: 2px 10px; border-radius: 20px;
  background: #dcfce7; color: #15803d;
  font-size: 11px; font-weight: 600;
}

/* Plantilla chip */
.plantilla-chip {
  display: inline-block; padding: 3px 10px; border-radius: 8px;
  background: #eff6ff; color: #2563eb;
  font-size: 12px; font-weight: 500; text-align: center;
}

/* SG badge */
.sg-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 28px; height: 28px; border-radius: 50%;
  background: #eff6ff; color: #2563eb;
  font-size: 13px; font-weight: 700;
}

/* View button */
.btn-view-pub {
  display: inline-flex; align-items: center; gap: 6px;
  background: #2563eb; color: #fff;
  border: none; border-radius: 8px;
  padding: 6px 16px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background .14s; white-space: nowrap;
}
.btn-view-pub:hover { background: #1d4ed8; }

/* Apply button */
.btn-apply {
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff; border: none; border-radius: 8px;
  padding: 6px 14px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: opacity .14s; white-space: nowrap;
}
.btn-apply:hover { opacity: .88; }

/* File viewer */
.viewer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 9998; padding: 24px;
}
.viewer-panel {
  background: var(--white); border-radius: 14px;
  box-shadow: 0 24px 64px rgba(0,0,0,.25);
  width: 100%; max-width: 960px; height: 90vh;
  display: flex; flex-direction: column; overflow: hidden;
}
.viewer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--border);
  flex-shrink: 0; gap: 12px;
}
.viewer-title-wrap { display: flex; align-items: center; gap: 12px; min-width: 0; }
.viewer-pos-name   { font-size: 15px; font-weight: 700; color: var(--text-1); }
.viewer-pos-meta   { font-size: 12px; color: var(--text-3); margin-top: 1px; }
.viewer-body       { flex: 1; overflow: hidden; }
.viewer-iframe     { width: 100%; height: 100%; border: none; display: block; }
</style>
