<template>
  <div>
    <div class="page-hdr" style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div>
        <h1 class="page-title">View Applicants</h1>
        <p class="page-sub">Manage applicants across all vacancy announcements.</p>
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
      <div class="toolbar">
        <div class="search-bar" style="width:260px">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" class="form-input" placeholder="Search name, email, position…" />
        </div>
        <select v-model="statusFilter" class="form-select" style="width:190px">
          <option value="">All Statuses</option>
          <option value="eval">Evaluation</option>
          <option value="rse">RSE</option>
          <option value="exam">Examination</option>
          <option value="inter">Interview</option>
          <option value="delib">Deliberation</option>
          <option value="ree">Resolution (E&E)</option>
          <option value="rprep">Resolution (Prep)</option>
          <option value="appt">Appointment</option>
          <option value="assume">Assumption</option>
          <option value="complete">Complete</option>
          <option value="repub">Republication</option>
          <option v-if="isHRMO" value="shortlisted">Shortlisted</option>
        </select>
        <div class="spacer"></div>
        <span class="count-tag">{{ filtered.length }} applicant{{ filtered.length !== 1 ? 's' : '' }}</span>
      </div>

      <div v-if="loading" class="loading-wrap"><div class="spinner"></div> Loading…</div>
      <div v-else-if="filtered.length === 0" class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>No applicants found</h3>
        <p>Applicants will appear here once submitted.</p>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:44px">#</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Plantilla Item No.</th>
              <th>Position Title</th>
              <th>Application Status</th>
              <th>Date Applied</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(a, i) in filtered" :key="a.id">
              <td class="td-num">{{ i + 1 }}</td>
              <td class="td-name">{{ displayName(a) }}</td>
              <td class="td-email">{{ a.email || '—' }}</td>
              <td>
                <span class="plantilla-chip">{{ pubOf(a)?.plantilla_item || '—' }}</span>
              </td>
              <td class="td-position">{{ a.pub_position || '—' }}</td>
              <td>
                <span class="prod-badge" :class="`ps-${pubOf(a)?.prod_status || 'pending'}`">
                  {{ prodStatusLabel(pubOf(a)?.prod_status) }}
                </span>
              </td>
              <td class="td-date">{{ fmtDate(a.submitted_at) }}</td>
              <td>
                <div style="display:flex;gap:6px;align-items:center">
                  <button class="btn-details" @click="openDetail(a)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                    Details
                  </button>
                  <button v-if="isHRMO"
                    class="btn-shortlist"
                    :class="{ 'btn-shortlisted': a.status === 'shortlisted' }"
                    @click="toggleShortlist(a)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    {{ a.status === 'shortlisted' ? 'Shortlisted' : 'Shortlist' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Details Modal ── -->
    <Teleport to="body">
      <div v-if="detail" class="detail-overlay" @click.self="detail = null">
        <div class="detail-panel">

          <!-- Header -->
          <div class="detail-header">
            <h3 class="detail-title">Applicant Details</h3>
            <button class="detail-close" @click="detail = null">×</button>
          </div>

          <div class="detail-body">
            <!-- Top info row -->
            <div class="info-row">
              <div class="info-field">
                <span class="info-label">Full Name</span>
                <span class="info-value">{{ displayName(detail) }}</span>
              </div>
              <div class="info-field">
                <span class="info-label">Email Address</span>
                <span class="info-value muted">{{ detail.email || '—' }}</span>
              </div>
            </div>

            <div class="info-field" style="margin-top:16px">
              <span class="info-label">Position Applied</span>
              <span class="info-value fw">{{ pubOf(detail)?.plantilla_item ? pubOf(detail).plantilla_item + ' — ' : '' }}{{ detail.pub_position || '—' }}</span>
            </div>

            <div class="info-field" style="margin-top:16px">
              <span class="info-label">Date Applied</span>
              <span class="info-value">{{ fmtDate(detail.submitted_at) }}</span>
            </div>

            <hr class="detail-divider" />

            <!-- Documents -->
            <div class="info-label" style="margin-bottom:14px">Submitted Documents</div>
            <div v-if="!detail.doc_letter && !detail.doc_pds && !detail.doc_tor && !detail.doc_cse && !detail.doc_wes && !detail.doc_training"
                 style="font-size:13px;color:var(--text-3);font-style:italic">No documents submitted.</div>
            <div v-else class="doc-grid">
              <div v-if="detail.doc_letter" class="doc-card">
                <div class="doc-info">
                  <span class="doc-name">Letter of Intent</span>
                  <span class="doc-file">{{ detail.doc_letter }}</span>
                </div>
                <button class="doc-view-btn" @click="openPdf(detail.doc_letter, 'Letter of Intent')">View</button>
              </div>
              <div v-if="detail.doc_pds" class="doc-card">
                <div class="doc-info">
                  <span class="doc-name">Personal Data Sheet</span>
                  <span class="doc-file">{{ detail.doc_pds }}</span>
                </div>
                <button class="doc-view-btn" @click="openPdf(detail.doc_pds, 'Personal Data Sheet')">View</button>
              </div>
              <div v-if="detail.doc_tor" class="doc-card">
                <div class="doc-info">
                  <span class="doc-name">Transcript of Records</span>
                  <span class="doc-file">{{ detail.doc_tor }}</span>
                </div>
                <button class="doc-view-btn" @click="openPdf(detail.doc_tor, 'Transcript of Records')">View</button>
              </div>
              <div v-if="detail.doc_cse" class="doc-card">
                <div class="doc-info">
                  <span class="doc-name">Civil Service Eligibility</span>
                  <span class="doc-file">{{ detail.doc_cse }}</span>
                </div>
                <button class="doc-view-btn" @click="openPdf(detail.doc_cse, 'Civil Service Eligibility')">View</button>
              </div>
              <div v-if="detail.doc_wes" class="doc-card">
                <div class="doc-info">
                  <span class="doc-name">Work Experience Sheet</span>
                  <span class="doc-file">{{ detail.doc_wes }}</span>
                </div>
                <button class="doc-view-btn" @click="openPdf(detail.doc_wes, 'Work Experience Sheet')">View</button>
              </div>
              <div v-if="detail.doc_training" class="doc-card">
                <div class="doc-info">
                  <span class="doc-name">Training Certificates</span>
                  <span class="doc-file">{{ detail.doc_training }}</span>
                </div>
                <button class="doc-view-btn" @click="openPdf(detail.doc_training, 'Training Certificates')">View</button>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="detail-footer">
            <button class="btn btn-outline" @click="detail = null">Close</button>
            <button v-if="isHRMO"
              class="btn-shortlist"
              :class="{ 'btn-shortlisted': detail.status === 'shortlisted' }"
              @click="toggleShortlist(detail)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {{ detail.status === 'shortlisted' ? '★ Shortlisted' : 'Shortlist Applicant' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- PDF Viewer Modal -->
    <Teleport to="body">
      <div v-if="pdfViewer.show" class="pdf-overlay" @click.self="pdfViewer.show = false">
        <div class="pdf-panel">
          <div class="pdf-header">
            <div style="display:flex;align-items:center;gap:10px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;flex-shrink:0;color:var(--primary)">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div>
                <div style="font-size:15px;font-weight:700;color:var(--text-1)">{{ pdfViewer.label }}</div>
                <div style="font-size:12px;color:var(--text-3);margin-top:1px">{{ pdfViewer.filename }}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <a :href="pdfViewer.url" :download="pdfViewer.filename" class="btn btn-sm btn-outline" style="display:inline-flex;align-items:center;gap:5px;text-decoration:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </a>
              <button class="modal-close" @click="pdfViewer.show = false">✕</button>
            </div>
          </div>
          <div class="pdf-body">
            <div v-if="pdfViewer.missing" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:#94a3b8;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:#cbd5e1">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="15" y2="11"/>
              </svg>
              <div style="font-size:14px;font-weight:600;color:#64748b">File no longer available</div>
              <div style="font-size:12px;color:#94a3b8;text-align:center;max-width:280px">This document was uploaded before cloud storage was enabled and could not be recovered.</div>
            </div>
            <iframe v-else :src="pdfViewer.url" class="pdf-iframe" frameborder="0" @load="checkIframeLoad" @error="pdfViewer.missing = true"></iframe>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import api from '../../api'

const route  = useRoute()
const auth   = useAuthStore()
const isHRMO = computed(() => auth.user?.role === 'hrmo')

const applicants   = ref([])
const pubList      = ref([])
const loading      = ref(true)
const search       = ref('')
const statusFilter = ref('')
const detail       = ref(null)
const msg          = ref('')
const pdfViewer    = ref({ show: false, url: '', filename: '', label: '', missing: false })

function openPdf(filename, label) {
  const url = filename?.startsWith('http') ? filename : `/uploads/applicants/${filename}`
  pdfViewer.value = { show: true, url, filename, label, missing: false }
}
const msgType      = ref('ok')

const PROD_LABELS = {
  eval:  'Evaluation',
  rse:   'RSE',
  exam:  'Examination',
  inter: 'Interview',
  delib: 'Deliberation',
  ree:   'Resolution (E&E)',
  rprep: 'Resolution (Prep)',
  appt:  'Appointment',
  assume:'Assumption',
  complete: 'Complete',
  repub: 'Republication',
  shortlisted: 'Shortlisted',
}

function prodStatusLabel(s) { return PROD_LABELS[s] || 'Pending' }

function pubOf(a) {
  return pubList.value.find(p => p.id === (a.publication_id || a.pub_id)) || null
}

function displayName(a) {
  if (a.full_name) return a.full_name
  return [a.last_name, a.first_name, a.middle_name].filter(Boolean).join(' ')
}

const filtered = computed(() => {
  let list = applicants.value

  // HRMO: restrict to applicants under their own office only
  if (isHRMO.value && auth.user?.department) {
    const myDept = auth.user.department.toLowerCase()
    list = list.filter(a => {
      const pub = pubOf(a)
      return pub && (pub.department || '').toLowerCase().includes(myDept)
    })
  }

  if (statusFilter.value) {
    list = list.filter(a => (pubOf(a)?.prod_status || 'pending') === statusFilter.value)
  }
  const q = search.value.toLowerCase()
  if (q) list = list.filter(a =>
    displayName(a).toLowerCase().includes(q) ||
    (a.email || '').toLowerCase().includes(q) ||
    (a.pub_position || '').toLowerCase().includes(q) ||
    (pubOf(a)?.plantilla_item || '').toLowerCase().includes(q)
  )
  return list
})

onMounted(async () => {
  loading.value = true
  try {
    const [ap, pb] = await Promise.all([api.get('/applicants'), api.get('/publications')])
    applicants.value = ap.data
    pubList.value    = pb.data
  } finally {
    loading.value = false
  }
})

function openDetail(a) { detail.value = { ...a } }

async function updateStatus(a) {
  try {
    await api.patch(`/applicants/${a.id}/status`, { status: a.status })
    const idx = applicants.value.findIndex(x => x.id === a.id)
    if (idx !== -1) applicants.value[idx].status = a.status
    flash('Status updated.', 'ok')
  } catch { flash('Failed to update.', 'err') }
}

async function toggleShortlist(a) {
  const newStatus = a.status === 'shortlisted' ? 'pending' : 'shortlisted'
  try {
    await api.patch(`/applicants/${a.id}/status`, { status: newStatus })
    const idx = applicants.value.findIndex(x => x.id === a.id)
    if (idx !== -1) applicants.value[idx].status = newStatus
    if (detail.value?.id === a.id) detail.value.status = newStatus
    flash(newStatus === 'shortlisted' ? 'Applicant shortlisted.' : 'Shortlist removed.', 'ok')
  } catch { flash('Failed to update.', 'err') }
}

async function deleteApplicant(a) {
  if (!confirm(`Delete applicant ${displayName(a)}?`)) return
  try {
    await api.delete(`/applicants/${a.id}`)
    applicants.value = applicants.value.filter(x => x.id !== a.id)
    detail.value = null
    flash('Applicant removed.', 'ok')
  } catch { flash('Failed to delete.', 'err') }
}

function flash(t, type) { msg.value = t; msgType.value = type; setTimeout(() => msg.value = '', 3000) }
function fmtDate(d) {
  if (!d) return '—'
  let normalized
  if (d.includes('T') || d.includes('+')) normalized = d
  else if (d.includes(' ')) normalized = d.replace(' ', 'T') + '+08:00'
  else normalized = d + 'T00:00:00+08:00'
  return new Date(normalized).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

async function checkIframeLoad(e) {
  try {
    const doc = e.target.contentDocument || e.target.contentWindow?.document
    if (doc && doc.title && doc.title.includes('Cannot GET')) pdfViewer.value.missing = true
    if (doc && doc.body?.innerText?.includes('Cannot GET')) pdfViewer.value.missing = true
  } catch {}
}
</script>

<style scoped>
.table-wrap { max-height: calc(100vh - 280px); overflow-y: auto; }
th { position: sticky; top: 0; z-index: 2; background: var(--bg); }

.td-num      { color: var(--text-3); font-size: 13px; width: 44px; }
.td-name     { font-weight: 700; font-size: 14px; }
.td-email    { font-size: 13px; color: var(--text-2); }
.td-position { font-size: 13px; font-weight: 500; }
.td-date     { font-size: 12px; color: var(--text-2); white-space: nowrap; }

.count-tag {
  font-size: 12px; color: var(--text-3);
  background: var(--bg); padding: 5px 12px;
  border-radius: 20px; border: 1px solid var(--border);
}

.plantilla-chip {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  background: var(--primary-light); color: var(--primary);
  font-size: 12px; font-weight: 600;
}

/* Production status pills */
.prod-badge  { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.ps-eval     { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.ps-rse      { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
.ps-exam     { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
.ps-inter    { background: #ecfeff; color: #0e7490; border: 1px solid #a5f3fc; }
.ps-delib    { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
.ps-ree      { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.ps-rprep    { background: #f7fee7; color: #4d7c0f; border: 1px solid #d9f99d; }
.ps-appt     { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.ps-assume   { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.ps-complete { background: #166534; color: #fff; border: 1px solid #15803d; }
.ps-repub    { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

.btn-details {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--primary); color: #fff;
  border: none; border-radius: 7px;
  padding: 6px 14px; font-size: 12.5px; font-weight: 600;
  cursor: pointer; transition: all .14s; white-space: nowrap;
}
.btn-details:hover { opacity: .88; transform: translateY(-1px); }

.btn-shortlist {
  display: inline-flex; align-items: center; gap: 5px;
  background: #fff; color: #64748b;
  border: 1.5px solid #e2e8f0; border-radius: 7px;
  padding: 5px 12px; font-size: 12.5px; font-weight: 600;
  cursor: pointer; transition: all .14s; white-space: nowrap;
}
.btn-shortlist:hover { border-color: #f59e0b; color: #b45309; background: #fffbeb; }
.btn-shortlisted {
  background: #fffbeb !important; color: #b45309 !important;
  border-color: #f59e0b !important;
}

/* Shortlisted badge in the prod-badge area */
.ps-shortlisted { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

/* Qualification standards grid */
.qual-grid { display: flex; flex-direction: column; gap: 8px; }
.qual-row  { display: flex; gap: 10px; align-items: flex-start; background: #f8fafc; border-radius: 8px; padding: 10px 12px; }
.qual-key  { font-size: 12px; font-weight: 700; color: #2563eb; width: 80px; flex-shrink: 0; padding-top: 1px; }
.qual-val  { font-size: 13px; color: #1e293b; flex: 1; line-height: 1.5; }

/* ── Details Modal ── */
.detail-overlay {
  position: fixed; inset: 0; background: rgba(15,23,42,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; backdrop-filter: blur(3px); padding: 20px;
}
.detail-panel {
  background: #fff; border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0,0,0,.18);
  width: 100%; max-width: 560px;
  max-height: 92vh; display: flex; flex-direction: column;
  overflow: hidden;
}
.detail-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 28px 18px;
  border-bottom: 1px solid #f1f5f9;
}
.detail-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
.detail-close {
  width: 32px; height: 32px; border: none; background: none;
  font-size: 22px; color: #94a3b8; cursor: pointer; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; line-height: 1;
  transition: background .14s, color .14s;
}
.detail-close:hover { background: #f1f5f9; color: #475569; }

.detail-body { padding: 24px 28px; overflow-y: auto; flex: 1; }
.detail-footer {
  padding: 16px 28px; border-top: 1px solid #f1f5f9;
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
}

.info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.info-field { display: flex; flex-direction: column; gap: 5px; }
.info-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .7px; color: #94a3b8;
}
.info-value { font-size: 15px; color: #0f172a; }
.info-value.muted { color: #64748b; }
.info-value.fw { font-weight: 700; }

.detail-divider { border: none; border-top: 1px solid #f1f5f9; margin: 22px 0; }

/* Document cards */
.doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.doc-card {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  border: 1.5px solid #d1fae5; border-radius: 10px;
  padding: 14px 14px; background: #f0fdf4;
}
.doc-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.doc-name { font-size: 13px; font-weight: 700; color: #0f172a; }
.doc-file {
  font-size: 11px; color: #94a3b8;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 140px;
}
.doc-view-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 7px 16px; border-radius: 8px;
  background: var(--primary); color: #fff;
  font-size: 13px; font-weight: 700; text-decoration: none;
  white-space: nowrap; flex-shrink: 0;
  transition: opacity .14s;
}
.doc-view-btn:hover { opacity: .85; }

/* ── Inline toast ── */
.inline-toast { display:inline-flex; align-items:center; gap:8px; padding:9px 18px; border-radius:10px; font-size:13px; font-weight:600; white-space:nowrap; align-self:center; }
.inline-toast-ok  { background:#dcfce7; color:#166534; border:1px solid #86efac; }
.inline-toast-err { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
.toast-enter-active { transition:opacity .18s ease, transform .18s ease; }
.toast-leave-active { transition:opacity .2s ease, transform .2s ease; }
.toast-enter-from   { opacity:0; transform:translateX(8px); }
.toast-leave-to     { opacity:0; transform:translateX(8px); }

/* PDF Viewer Modal */
.pdf-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  padding: 24px;
}
.pdf-panel {
  background: var(--white);
  border-radius: 14px;
  box-shadow: 0 24px 64px rgba(0,0,0,.25);
  width: 100%; max-width: 1100px;
  height: 90vh;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.pdf-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 12px;
}
.pdf-body { flex: 1; overflow: hidden; }
.pdf-iframe { width: 100%; height: 100%; border: none; display: block; }
.modal-close {
  width: 30px; height: 30px; border: none;
  background: var(--border-light); border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 16px; color: var(--text-2);
  transition: background .15s;
}
.modal-close:hover { background: var(--red-light); color: var(--red); }
</style>
