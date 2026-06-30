<template>
  <div>
    <div class="page-hdr" style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div>
        <h1 class="page-title">View Publications</h1>
        <p class="page-sub">Positions that have been published and are currently active.</p>
      </div>
      <Transition name="toast">
        <div v-if="msg" class="inline-toast" :class="msgType === 'ok' ? 'inline-toast-ok' : 'inline-toast-err'">
          <svg v-if="msgType === 'ok'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ msg }}
        </div>
      </Transition>
    </div>

    <div class="card">
      <!-- Card header -->
      <div class="card-top">
        <div class="toolbar" style="border-bottom:none;padding-bottom:0">
          <div class="search-bar" style="width:260px">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input v-model="search" class="form-input" placeholder="Search position…" />
          </div>
          <select v-model="deptFilter" class="form-select" style="width:200px">
            <option value="">All Offices</option>
            <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="pv-header">
          <span class="pv-title">Posted Vacancies</span>
          <span class="pv-count">{{ filtered.length }}</span>
        </div>
      </div>

      <div v-if="loading" class="loading-wrap"><div class="spinner"></div> Loading…</div>
      <div v-else-if="filtered.length === 0" class="empty-state">
        <div class="empty-icon">🗂️</div>
        <h3>No posted vacancies</h3>
        <p>Positions appear here after they are published in the For Publications tab.</p>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:40px">#</th>
              <th>Posting Date</th>
              <th>Position Title</th>
              <th>Plantilla Item No.</th>
              <th>Office</th>
              <th>SG</th>
              <th>Closing Date</th>
              <th>File</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in filtered" :key="p.id">
              <td class="td-num">{{ i + 1 }}</td>
              <td class="td-date">{{ fmtDate(p.updated_at) }}</td>
              <td>
                <div class="pos-cell">
                  <div class="pos-hover-target"
                    @mouseenter="showApplicants($event, p)"
                    @mouseleave="hideApplicants">
                    <div class="pos-name">{{ p.position }}</div>
                  </div>
                  <span class="status-badge" :class="statusBadgeClass(p)">
                    {{ statusBadgeLabel(p) }}
                  </span>
                </div>
              </td>
              <td><span class="plantilla-chip">{{ p.plantilla_item || '—' }}</span></td>
              <td class="td-office">{{ p.department }}</td>
              <td class="td-sg">{{ p.salary_grade || '—' }}</td>
              <td class="td-date">{{ p.closing_date ? fmtDate(p.closing_date) : '—' }}</td>
              <td>
                <button
                  v-if="p.attachment_name"
                  class="btn-view"
                  @click="openViewer(p)"
                >View</button>
                <span v-else class="no-file-label">—</span>
              </td>
              <td>
                <button class="btn-edit" @click="openEdit(p)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Applicants Hover Popover ── -->
    <Teleport to="body">
      <div v-if="apop.show" class="apop-fixed" :style="apop.style">
        <div class="apop-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;flex-shrink:0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          Applicants
          <span class="apop-count">{{ apop.list.length }}</span>
        </div>
        <div v-if="apop.loading" class="apop-loading">Loading…</div>
        <div v-else-if="apop.list.length === 0" class="apop-empty">No applicants yet</div>
        <ul v-else class="apop-list">
          <li v-for="a in apop.list.slice(0, 6)" :key="a.id" class="apop-item">
            <span class="apop-name">{{ a.full_name || (a.first_name + ' ' + a.last_name).trim() }}</span>
            <span class="apop-status" :class="`astat-${a.status}`">{{ a.status }}</span>
          </li>
          <li v-if="apop.list.length > 6" class="apop-more">+{{ apop.list.length - 6 }} more</li>
        </ul>
      </div>
    </Teleport>

    <!-- ── File Viewer Modal ── -->
    <Teleport to="body">
      <div v-if="viewerPub" class="viewer-overlay" @click.self="closeViewer">
        <div class="viewer-panel">
          <div class="viewer-header">
            <div class="viewer-title-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;flex-shrink:0;color:var(--primary)">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div>
                <div class="viewer-pos-name">{{ viewerPub.position }}</div>
                <div class="viewer-pos-meta">{{ viewerPub.plantilla_item }} · {{ viewerPub.department }}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <a
                :href="attachUrl(viewerPub.attachment_name)"
                :download="viewerPub.attachment_original || viewerPub.attachment_name"
                class="btn btn-sm btn-outline"
                style="display:inline-flex;align-items:center;gap:5px;text-decoration:none"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </a>
              <button class="modal-close" @click="closeViewer">✕</button>
            </div>
          </div>
          <div class="viewer-body">
            <iframe
              :key="viewerPub.attachment_name"
              :src="attachUrl(viewerPub.attachment_name)"
              class="viewer-iframe"
              frameborder="0"
              @error="iframeError = true"
            ></iframe>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Edit Position Modal ── -->
    <Teleport to="body">
      <div v-if="showEditModal" class="edit-overlay" @click.self="closeEdit">
        <div class="edit-panel">
          <div class="modal-header">
            <h3 style="font-size:16px;margin:0">Edit Position Details</h3>
            <button class="modal-close" @click="closeEdit">✕</button>
          </div>

          <div class="edit-body">
            <div class="edit-section-title">Basic Information</div>
            <div class="form-group">
              <label class="form-label form-label-sm">Position Title</label>
              <input v-model="editForm.position" class="form-input" placeholder="Position title" />
            </div>
            <div class="edit-grid-2">
              <div class="form-group">
                <label class="form-label form-label-sm">Plantilla Item No.</label>
                <input v-model="editForm.plantilla_item" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label form-label-sm">Salary Grade</label>
                <input v-model="editForm.salary_grade" class="form-input" placeholder="e.g. 19" />
              </div>
              <div class="form-group">
                <label class="form-label form-label-sm">Monthly Salary</label>
                <input v-model="editForm.monthly_salary" class="form-input" placeholder="e.g. 35000" />
              </div>
              <div class="form-group">
                <label class="form-label form-label-sm">Office</label>
                <select v-model="editForm.department" class="form-select">
                  <option v-for="d in deptOptions" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label class="form-label form-label-sm">Closing Date / Expiration</label>
                <input v-model="editForm.closing_date" type="date" class="form-input" />
              </div>
            </div>

            <div class="edit-section-title" style="margin-top:20px">Qualification Standards</div>
            <div class="edit-grid-2">
              <div class="form-group">
                <label class="form-label form-label-sm">Education</label>
                <input v-model="editForm.education" class="form-input" placeholder="Required education" />
              </div>
              <div class="form-group">
                <label class="form-label form-label-sm">Training</label>
                <input v-model="editForm.training" class="form-input" placeholder="Required training" />
              </div>
              <div class="form-group">
                <label class="form-label form-label-sm">Experience</label>
                <input v-model="editForm.experience" class="form-input" placeholder="Required experience" />
              </div>
              <div class="form-group">
                <label class="form-label form-label-sm">Eligibility</label>
                <input v-model="editForm.eligibility" class="form-input" placeholder="Required eligibility" />
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label class="form-label form-label-sm">Competency / Area of Specialization</label>
                <input v-model="editForm.competency" class="form-input" placeholder="Competency or specialization" />
              </div>
            </div>

            <div class="edit-section-title" style="margin-top:20px">Attached File</div>
            <div v-if="editingPub?.attachment_name && !editNewFile" class="current-file-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;color:var(--primary);flex-shrink:0">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span class="current-file-name">{{ editingPub.attachment_original || editingPub.attachment_name }}</span>
              <span class="current-file-tag">Current</span>
            </div>
            <label class="edit-file-drop" :class="{ 'edit-file-has': editNewFile }">
              <input type="file" class="edit-file-input" @change="onEditFileChange" />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              <span class="edit-file-label">
                {{ editNewFile ? editNewFile.name : (editingPub?.attachment_name ? 'CLICK TO REPLACE FILE…' : 'CLICK TO ATTACH FILE…') }}
              </span>
              <button v-if="editNewFile" class="edit-file-clear" @click.prevent="editNewFile = null">✕</button>
            </label>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline" @click="closeEdit">Cancel</button>
            <button class="btn btn-primary" :disabled="editSaving" @click="saveEdit" style="display:inline-flex;align-items:center;gap:6px">
              <div v-if="editSaving" class="spinner" style="width:13px;height:13px;border-width:2px"></div>
              {{ editSaving ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '../../api'

const deptOptions = [
  'Administrative Service (AS)',
  'Financial and Management Service (FMS)',
  'Internal Audit Service (IAS)',
  'Information and Publication Service (IPS)',
  'Human Resource Development Service (HRDS)',
  'Planning Service (PS)',
  'Legal Service (LS)',
]

const pubs        = ref([])
const loading     = ref(true)
const search      = ref('')
const deptFilter  = ref('')
const msg         = ref('')
const msgType     = ref('ok')
const viewerPub   = ref(null)
const showEditModal = ref(false)
const editingPub    = ref(null)
const editForm      = ref({})
const editNewFile   = ref(null)
const editSaving    = ref(false)

const apop  = ref({ show: false, loading: false, list: [], style: {} })
const apopCache = {}

async function showApplicants(e, p) {
  const rect  = e.currentTarget.getBoundingClientRect()
  const above = rect.top > window.innerHeight / 2
  apop.value = {
    show: true, loading: true, list: [],
    style: {
      left: Math.min(rect.left + 60, window.innerWidth - 260) + 'px',
      ...(above
        ? { bottom: (window.innerHeight - rect.top + 6) + 'px', top: 'auto' }
        : { top: (rect.bottom + 6) + 'px', bottom: 'auto' })
    }
  }
  if (apopCache[p.id]) {
    apop.value.list = apopCache[p.id]; apop.value.loading = false; return
  }
  try {
    const { data } = await api.get(`/applicants?publication_id=${p.id}`)
    apopCache[p.id] = data
    apop.value.list = data
  } catch { apop.value.list = [] }
  apop.value.loading = false
}
function hideApplicants() { apop.value.show = false }

// Reactive clock — ticks every minute so expired items vanish instantly
const nowTick = ref(Date.now())
let clockTimer = null

const departments = computed(() => [...new Set(pubs.value.map(p => p.department))].sort())

const filtered = computed(() => {
  void nowTick.value // subscribe to clock
  let list = pubs.value.filter(p => daysLeft(p) >= 0)
  if (deptFilter.value) list = list.filter(p => p.department === deptFilter.value)
  const q = search.value.toLowerCase()
  if (q) list = list.filter(p =>
    p.position.toLowerCase().includes(q) ||
    (p.plantilla_item || '').toLowerCase().includes(q) ||
    p.department.toLowerCase().includes(q)
  )
  return list
})

let pollTimer = null
onMounted(() => {
  load()
  pollTimer  = setInterval(silentLoad, 60000)
  clockTimer = setInterval(() => { nowTick.value = Date.now() }, 60000)
})
onUnmounted(() => { clearInterval(pollTimer); clearInterval(clockTimer) })

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/publications')
    pubs.value = data.filter(p => p.pub_status === 'active')
  } finally {
    loading.value = false
  }
}
async function silentLoad() {
  try {
    const { data } = await api.get('/publications')
    pubs.value = data.filter(p => p.pub_status === 'active' && daysLeft(p) >= 0)
  } catch {}
}

function openViewer(p) { viewerPub.value = p }
function closeViewer() { viewerPub.value = null }

function openEdit(p) {
  editingPub.value  = p
  editNewFile.value = null
  editForm.value = {
    position:       p.position       || '',
    plantilla_item: p.plantilla_item || '',
    salary_grade:   p.salary_grade   || '',
    monthly_salary: p.monthly_salary || '',
    department:     p.department     || '',
    closing_date:   p.closing_date   || '',
    education:      p.education      || '',
    training:       p.training       || '',
    experience:     p.experience     || '',
    eligibility:    p.eligibility    || '',
    competency:     p.competency     || '',
  }
  showEditModal.value = true
}
function closeEdit() { showEditModal.value = false; editingPub.value = null; editNewFile.value = null }
function onEditFileChange(e) { editNewFile.value = e.target.files[0] || null }

async function saveEdit() {
  editSaving.value = true
  try {
    const fd = new FormData()
    Object.entries(editForm.value).forEach(([k, v]) => fd.append(k, v ?? ''))
    if (editNewFile.value) fd.append('attachment', editNewFile.value)
    const { data } = await api.post(`/publications/${editingPub.value.id}/update`, fd)
    const idx = pubs.value.findIndex(p => p.id === editingPub.value.id)
    if (idx !== -1) pubs.value[idx] = { ...pubs.value[idx], ...data }
    flash('Position updated successfully.', 'ok')
    closeEdit()
  } catch (err) {
    flash(err.response?.data?.message || 'Failed to save changes.', 'err')
  } finally {
    editSaving.value = false
  }
}

function daysLeft(p) {
  if (!p.closing_date) return null
  const todayPH = new Date(new Date(nowTick.value).toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
  todayPH.setHours(0, 0, 0, 0)
  const closingPH = new Date(p.closing_date + 'T00:00:00+08:00')
  closingPH.setHours(0, 0, 0, 0)
  return Math.floor((closingPH - todayPH) / (1000 * 60 * 60 * 24))
}

function statusBadgeClass(p) {
  const d = daysLeft(p)
  if (p.pub_status === 'expired' || (d !== null && d < 0)) return 'badge-expired'
  if (d === null || d > 7) return 'badge-active'
  if (d === 0)             return 'badge-today'
  if (d <= 3)              return 'badge-urgent'
  return 'badge-warn'
}

function statusBadgeLabel(p) {
  const d = daysLeft(p)
  if (p.pub_status === 'expired' || (d !== null && d < 0)) return 'Expired'
  if (d === null || d > 7) return 'Active'
  if (d === 0)             return 'Closing today'
  if (d <= 3)              return 'Closing soon'
  return `${d} days left`
}

function fmtDate(d) {
  if (!d) return '—'
  let normalized
  if (d.includes('T') || d.includes('+')) normalized = d
  else if (d.includes(' ')) normalized = d.replace(' ', 'T') + '+08:00'
  else normalized = d + 'T00:00:00+08:00'
  return new Date(normalized).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function attachUrl(name) {
  if (!name) return ''
  return name.startsWith('http') ? name : `/uploads/${name}`
}
function flash(text, type) { msg.value = text; msgType.value = type; setTimeout(() => msg.value = '', 3500) }
</script>

<style scoped>
/* Scrollable table with sticky header */
.table-wrap { max-height: calc(100vh - 280px); overflow-y: auto; }
th { position: sticky; top: 0; z-index: 2; background: var(--bg); }

/* Card top */
.card-top {
  padding: 16px 20px 0;
}
.pv-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 0 12px;
  border-bottom: 1px solid var(--border);
}
.pv-title {
  font-size: 16px; font-weight: 700; color: var(--text-1);
}
.pv-count {
  min-width: 28px; height: 28px; padding: 0 8px;
  border-radius: 50%; background: #16a34a; color: #fff;
  font-size: 13px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
}

/* Table */
.td-num   { color: var(--text-3); font-size: 13px; width: 40px; }
.td-date  { font-size: 13px; color: var(--text-2); white-space: nowrap; }
.td-sg    { font-size: 13px; font-weight: 600; text-align: center; }
.td-office { font-size: 13px; }

.pos-hover-target { display:inline-block; cursor:default; padding:3px 6px; border-radius:8px; margin:-3px -6px; transition:background .13s; }
.pos-hover-target:hover { background:var(--primary-light); }
.pos-cell { display: flex; align-items: center; gap: 8px; }
.pos-name {
  font-size: 14px; font-weight: 700; color: var(--text-1);
  margin-bottom: 4px;
}

/* Status badge under position title */
.status-badge {
  display: inline-block; padding: 2px 10px;
  border-radius: 20px; font-size: 11px; font-weight: 600;
}
.badge-active  { background: #dcfce7; color: #15803d; }
.badge-warn    { background: #fef9c3; color: #854d0e; }
.badge-urgent  { background: #ffedd5; color: #9a3412; }
.badge-today   { background: #fee2e2; color: #991b1b; }
.badge-expired { background: #fee2e2; color: #991b1b; }

/* Plantilla chip */
.plantilla-chip {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  background: #eff6ff; color: #2563eb;
  font-size: 12px; font-weight: 500;
}

/* View button */
.btn-view {
  background: #2563eb; color: #fff;
  border: none; border-radius: 6px;
  padding: 5px 16px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background .14s;
  white-space: nowrap;
}
.btn-view:hover { background: #1d4ed8; }

/* Edit button */
.btn-edit {
  display: inline-flex; align-items: center; gap: 5px;
  background: #f0fdf4; color: #15803d;
  border: 1.5px solid #bbf7d0; border-radius: 6px;
  padding: 5px 14px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all .14s;
  white-space: nowrap;
}
.btn-edit:hover { background: #dcfce7; border-color: #86efac; }

.no-file-label { color: var(--text-3); font-size: 13px; }

/* ── File Viewer ── */
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
.viewer-title-wrap  { display: flex; align-items: center; gap: 12px; min-width: 0; }
.viewer-pos-name    { font-size: 15px; font-weight: 700; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.viewer-pos-meta    { font-size: 12px; color: var(--text-3); margin-top: 1px; }
.viewer-body        { flex: 1; overflow: hidden; }
.viewer-iframe      { width: 100%; height: 100%; border: none; display: block; }

/* ── Edit Modal ── */
.edit-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; padding: 24px;
}
.edit-panel {
  background: var(--white); border-radius: 14px;
  box-shadow: 0 24px 64px rgba(0,0,0,.25);
  width: 100%; max-width: 540px;
  max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
}
.edit-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
.edit-section-title {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .6px; color: var(--text-3);
  border-bottom: 1px solid var(--border);
  padding-bottom: 6px; margin-bottom: 14px;
}
.edit-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
.form-label-sm { font-size: 11px; font-weight: 500; color: var(--text-2); display: block; margin-bottom: 3px; }

.current-file-row {
  display: flex; align-items: center; gap: 8px;
  background: var(--primary-light); border: 1px solid var(--primary);
  border-radius: 8px; padding: 9px 12px; margin-bottom: 8px;
}
.current-file-name { font-size: 13px; font-weight: 500; color: var(--primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.current-file-tag  { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; background: var(--primary); color: #fff; padding: 2px 7px; border-radius: 10px; flex-shrink: 0; }

.edit-file-drop {
  display: flex; align-items: center; gap: 10px;
  border: 2px dashed var(--border); border-radius: 10px;
  padding: 14px 16px; cursor: pointer; position: relative;
  transition: border-color .15s, background .15s;
}
.edit-file-drop:hover   { border-color: var(--primary); background: var(--primary-light); }
.edit-file-has          { border-color: #16a34a !important; background: #f0fdf4 !important; }
.edit-file-input        { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
.edit-file-label        { font-size: 13px; font-weight: 600; color: var(--text-3); flex: 1; }
.edit-file-has .edit-file-label { color: #15803d; }
.edit-file-clear {
  position: relative; z-index: 2; background: none; border: none;
  color: var(--text-3); font-size: 14px; cursor: pointer;
  padding: 2px 6px; border-radius: 4px; flex-shrink: 0;
}
.edit-file-clear:hover { background: #fee2e2; color: #dc2626; }
</style>

<style>
.apop-fixed {
  position: fixed; z-index: 9999; pointer-events: none;
  background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,.14); min-width: 220px; max-width: 280px;
  padding: 10px 0; font-family: inherit;
}
.apop-header {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: #64748b;
  padding: 0 12px 8px; border-bottom: 1px solid #f1f5f9;
}
.apop-count {
  margin-left: auto; background: #166534; color: #fff;
  font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 10px;
}
.apop-loading { font-size: 12px; color: #94a3b8; padding: 10px 12px; }
.apop-empty   { font-size: 12px; color: #94a3b8; padding: 10px 12px; font-style: italic; }
.apop-list    { list-style: none; margin: 0; padding: 4px 0 0; }
.apop-item    {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 12px; font-size: 12px;
}
.apop-item:hover { background: #f8fafc; }
.apop-name  { font-weight: 600; color: #1e293b; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.apop-status { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 10px; flex-shrink: 0; }
.astat-pending  { background: #f1f5f9; color: #64748b; }
.astat-accepted { background: #dcfce7; color: #166534; }
.astat-rejected { background: #fee2e2; color: #991b1b; }
.apop-more { font-size: 11px; color: #94a3b8; padding: 5px 12px; font-style: italic; }

/* ── Inline toast ── */
.inline-toast { display:inline-flex; align-items:center; gap:8px; padding:9px 18px; border-radius:10px; font-size:13px; font-weight:600; white-space:nowrap; align-self:center; }
.inline-toast-ok  { background:#dcfce7; color:#166534; border:1px solid #86efac; }
.inline-toast-err { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
.toast-enter-active { transition:opacity .18s ease, transform .18s ease; }
.toast-leave-active { transition:opacity .2s ease, transform .2s ease; }
.toast-enter-from   { opacity:0; transform:translateX(8px); }
.toast-leave-to     { opacity:0; transform:translateX(8px); }
</style>
