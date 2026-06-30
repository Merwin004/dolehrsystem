<template>
  <div>
    <div class="page-hdr" style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div>
        <h1 class="page-title">In Process</h1>
        <p class="page-sub">Track the hiring workflow progress for each published position.</p>
      </div>
      <Transition name="toast">
        <div v-if="msg" class="inline-toast" :class="msgType === 'ok' ? 'inline-toast-ok' : 'inline-toast-err'">
          <svg v-if="msgType === 'ok'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ msg }}
        </div>
      </Transition>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="toolbar">
        <div class="search-bar" style="width:280px">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" class="form-input" placeholder="Search position or office…" />
        </div>
        <div class="spacer"></div>
        <span class="count-badge">{{ filtered.length }} position{{ filtered.length !== 1 ? 's' : '' }}</span>
      </div>

      <div v-if="loading" class="loading-wrap"><div class="spinner"></div> Loading…</div>
      <div v-else-if="filtered.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No positions in production</h3>
        <p>Positions appear here after they are published.</p>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Position Title</th>
              <th>Plantilla Item No.</th>
              <th>Production Status</th>
              <th>No. of Days</th>
              <th>Responsible</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in filtered" :key="p.id"
              :class="{ 'tr-mine': canAdvance(p), 'tr-urgent': prodDays(p) >= 75 && !canAdvance(p) }">
              <td style="color:var(--text-3);font-size:12px">{{ i + 1 }}</td>
              <td>
                <div class="pos-hover-target"
                  @mouseenter="showApplicants($event, p)"
                  @mouseleave="hideApplicants">
                  <div style="font-weight:600">{{ p.position }}</div>
                  <div style="font-size:12px;color:var(--text-3)">{{ p.department }}</div>
                </div>
              </td>
              <td><span class="plantilla-chip">{{ p.plantilla_item || '—' }}</span></td>
              <td>
                <span class="ps-pill" :class="`ps-${p.prod_status || 'pending'}`">
                  {{ statusLabel(p.prod_status) }}
                </span>
              </td>
              <td>
                <span class="days-badge" :class="daysClass(prodDays(p))">
                  Day {{ Math.min(prodDays(p), 90) }}
                  <span v-if="prodDays(p) >= 90" class="days-max"> MAX</span>
                </span>
              </td>
              <td>
                <!-- Complete — moved to Completed Publications -->
                <span v-if="p.prod_status === 'complete'" class="complete-tag">✓ Completed</span>

                <!-- YOUR TURN: show advance button (serves as status tag + action) -->
                <div v-else-if="canAdvance(p)" style="display:flex;flex-direction:column;gap:6px;align-items:flex-start">
                  <button class="btn-stage" :class="`stage-${STATUS_TRANSITIONS[p.prod_status]?.next}`"
                    @click="advance(p)" :disabled="busy === p.id">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:11px;height:11px;flex-shrink:0">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    {{ busy === p.id ? 'Processing…' : STATUS_TRANSITIONS[p.prod_status]?.nextLabel }}
                  </button>
                  <!-- Set schedule button for rse/exam/inter positions missing a schedule -->
                  <button v-if="p.prod_status === 'rse' && !p.rse_schedule" class="btn-set-sched" @click="openSetSched(p, 'rse')">
                    📅 Set RSE Schedule
                  </button>
                  <button v-if="p.prod_status === 'exam' && !p.exam_schedule" class="btn-set-sched" @click="openSetSched(p, 'exam')">
                    📅 Set Exam Schedule
                  </button>
                  <button v-if="p.prod_status === 'inter' && !p.inter_schedule" class="btn-set-sched" @click="openSetSched(p, 'inter')">
                    📅 Set Interview Schedule
                  </button>
                  <button v-if="canRepublish(p)" class="btn-repub" @click="republish(p)" :disabled="busy === p.id">
                    ↩ Republish
                  </button>
                </div>

                <!-- NOT YOUR TURN: show profile pic of who is responsible -->
                <div v-else class="avatar-wrap"
                  @mouseenter="showTooltip($event, responsibleUser(p)?.full_name || roleLabel(responsibleRole(p)))"
                  @mouseleave="hideTooltip">
                  <div class="resp-avatar" :class="`waiting role-${responsibleRole(p)}`">
                    <img v-if="responsibleUser(p)?.avatar" :src="responsibleUser(p).avatar" class="resp-photo" />
                    <span v-else>{{ userInitials(responsibleUser(p)) }}</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Republish FAB — RSPU only -->
    <button v-if="myRole === 'rspu'" class="fab-repub" @click="openRepubModal">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;flex-shrink:0">
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-3.87"/>
      </svg>
      Republish Position
    </button>
  </div>

  <!-- Republish modal -->
  <Teleport to="body">
    <div v-if="repubModal" class="rm-overlay" @click.self="closeRepubModal">
      <div class="rm-box">
        <div class="rm-header">
          <div>
            <h2 class="rm-title">Republish Position</h2>
            <p class="rm-sub">Select a position to return to <em>For Publication</em> with <strong>No Qualified</strong> status. Applicants will be cleared for a fresh cycle.</p>
          </div>
          <button class="rm-close" @click="closeRepubModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="rm-list">
          <div v-if="filtered.length === 0" class="rm-empty">No positions currently in process.</div>
          <div v-for="p in filtered" :key="p.id"
            class="rm-card" :class="{ 'rm-card-sel': repubSelected?.id === p.id }"
            @click="repubSelected = p">
            <div class="rm-radio" :class="{ 'rm-radio-on': repubSelected?.id === p.id }"></div>
            <div class="rm-card-body">
              <div class="rm-pos">{{ p.position }}</div>
              <div class="rm-dept">{{ p.department }}</div>
            </div>
            <span class="ps-pill" :class="`ps-${p.prod_status || 'pending'}`">
              {{ statusLabel(p.prod_status) }}
            </span>
          </div>
        </div>

        <div class="rm-footer">
          <button class="rm-cancel-btn" @click="closeRepubModal">Cancel</button>
          <button class="rm-confirm-btn" :disabled="!repubSelected || repubBusy" @click="confirmRepublish">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.87"/>
            </svg>
            {{ repubBusy ? 'Processing…' : 'Republish as No Qualified' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Confirm advance modal -->
  <Teleport to="body">
    <div v-if="confirmModal.show" class="sched-overlay" @click.self="confirmModal.show = false">
      <div class="sched-box confirm-box">
        <div class="sched-header">
          <div>
            <div class="sched-title">Advance Status?</div>
            <div class="sched-sub">{{ confirmModal.position }}</div>
          </div>
          <button class="sched-close" @click="confirmModal.show = false">✕</button>
        </div>
        <div class="sched-body">
          <p class="confirm-msg">
            Are you sure you want to advance this position to <strong>{{ confirmModal.label }}</strong>?
          </p>
          <p v-if="confirmModal.isRepub" class="confirm-warn">This will reset the closing date and clear all applicants.</p>
        </div>
        <div class="sched-footer">
          <button class="btn btn-outline" @click="confirmModal.show = false">Cancel</button>
          <button class="btn btn-primary" @click="handleConfirmAdvance">Confirm</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Schedule picker modal -->
  <Teleport to="body">
    <div v-if="schedModal.show" class="sched-overlay" @click.self="schedModal.show = false">
      <div class="sched-box">
        <div class="sched-header">
          <div>
            <div class="sched-title">Set {{ schedModal.label }} Schedule</div>
            <div class="sched-sub">{{ schedModal.position }}</div>
          </div>
          <button class="sched-close" @click="schedModal.show = false">✕</button>
        </div>
        <div class="sched-body">
          <label class="sched-label">Date &amp; Time</label>
          <input v-model="schedModal.datetime" type="datetime-local" class="form-input sched-input" />
        </div>
        <div class="sched-footer">
          <button class="btn btn-outline" @click="schedModal.show = false">Cancel</button>
          <button class="btn btn-primary" :disabled="!schedModal.datetime || schedBusy" @click="confirmAdvance">
            {{ schedBusy ? 'Saving…' : 'Confirm &amp; Advance' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Applicants hover popover -->
  <Teleport to="body">
    <div v-if="apop.show" class="apop-fixed" :style="apop.style">
      <div class="apop-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;flex-shrink:0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        Applicants
        <span class="apop-count">{{ apop.list.length }}</span>
      </div>
      <div v-if="(apop.rseSchedule || apop.examSchedule || apop.interSchedule) && !['delib','ree','rprep','appt','assume','complete'].includes(apop.prodStatus)" class="apop-schedule">
        <div v-if="apop.rseSchedule" class="apop-sched-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>RSE: {{ fmtSchedule(apop.rseSchedule) }}</span>
        </div>
        <div v-if="apop.examSchedule" class="apop-sched-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Exam: {{ fmtSchedule(apop.examSchedule) }}</span>
        </div>
        <div v-if="apop.interSchedule" class="apop-sched-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Interview: {{ fmtSchedule(apop.interSchedule) }}</span>
        </div>
      </div>
      <div v-if="apop.loading" class="apop-loading">Loading…</div>
      <div v-else-if="apop.list.length === 0" class="apop-empty">No applicants yet</div>
      <ul v-else class="apop-list">
        <li v-for="a in apop.list.slice(0, 6)" :key="a.id" class="apop-item">
          <span class="apop-name">{{ a.full_name || (a.first_name + ' ' + a.last_name).trim() }}</span>
          <span class="apop-status" :class="`apop-ps-${apop.prodStatus}`">
            {{ APPLICANT_STATUS_LABELS[apop.prodStatus] || 'Waiting' }}
          </span>
        </li>
        <li v-if="apop.list.length > 6" class="apop-more">+{{ apop.list.length - 6 }} more</li>
      </ul>
    </div>
  </Teleport>

  <!-- Fixed tooltip — renders at body level to escape table overflow clipping -->
  <Teleport to="body">
    <div v-if="ttip.show" class="avatar-tt-fixed" :style="ttip.style">{{ ttip.text }}</div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api'
import { useAuthStore } from '../../stores/auth'
import { useNotificationsStore } from '../../stores/notifications'

const auth    = useAuthStore()
const myRole  = computed(() => auth.user?.role || '')

const pubs      = ref([])
const users     = ref([])
const loading   = ref(true)
const search    = ref('')
const msg       = ref('')
const msgType   = ref('ok')
const busy      = ref(null)
const ttip      = ref({ show: false, text: '', style: {} })
const apop      = ref({ show: false, loading: false, list: [], style: {} })
const apopCache = {}
const schedModal   = ref({ show: false, pub: null, label: '', position: '', datetime: '' })
const schedBusy    = ref(false)
const confirmModal = ref({ show: false, pub: null, label: '', position: '', isRepub: false, onConfirm: null })

const APPLICANT_STATUS_LABELS = {
  pending:  'Pending',
  eval:     'Evaluation',
  rse:      'RSE',
  exam:     'Examination',
  inter:    'Interview',
  delib:    'Deliberation',
  ree:      'Resolution (E&E)',
  rprep:    'Resolution (Prep)',
  appt:     'Appointment',
  assume:   'Assumption',
  complete: 'Complete',
  repub:    'Republication',
}

async function showApplicants(e, p) {
  const rect  = e.currentTarget.getBoundingClientRect()
  const above = rect.top > window.innerHeight / 2
  apop.value = {
    show: true, loading: true, list: [],
    prodStatus: p.prod_status || 'pending',
    rseSchedule: p.rse_schedule || null,
    examSchedule: p.exam_schedule || null,
    interSchedule: p.inter_schedule || null,
    style: {
      left: Math.min(rect.left + 60, window.innerWidth - 260) + 'px',
      ...(above
        ? { bottom: (window.innerHeight - rect.top + 6) + 'px', top: 'auto' }
        : { top: (rect.bottom + 6) + 'px', bottom: 'auto' })
    }
  }
  // Fetch fresh pub data to get latest exam/inter schedule (other role may have updated it)
  api.get(`/publications/${p.id}`).then(r => {
    const fresh = r.data
    apop.value.rseSchedule   = fresh.rse_schedule   || null
    apop.value.examSchedule  = fresh.exam_schedule  || null
    apop.value.interSchedule = fresh.inter_schedule || null
    // Sync local pubs array too so next hover is already up-to-date
    const idx = pubs.value.findIndex(pub => pub.id === p.id)
    if (idx !== -1) {
      pubs.value[idx].rse_schedule   = fresh.rse_schedule   || null
      pubs.value[idx].exam_schedule  = fresh.exam_schedule  || null
      pubs.value[idx].inter_schedule = fresh.inter_schedule || null
    }
  }).catch(() => {})
  if (apopCache[p.id]) {
    apop.value.list = apopCache[p.id]; apop.value.loading = false; return
  }
  try {
    const { data } = await api.get(`/applicants?publication_id=${p.id}`)
    const shortlisted = data.filter(a => a.status === 'shortlisted')
    apopCache[p.id] = shortlisted
    apop.value.list = shortlisted
  } catch { apop.value.list = [] }
  apop.value.loading = false
}
function hideApplicants() { apop.value.show = false }

const STATUS_TRANSITIONS = {
  pending:{ next: 'eval',     roles: ['hrmo'],          nextLabel: 'Evaluation' },
  eval:   { next: 'rse',     roles: ['rspu'],          nextLabel: 'RSE' },
  rse:    { next: 'exam',    roles: ['hrmo'],           nextLabel: 'Examination' },
  exam:   { next: 'inter',   roles: ['hrmo'],           nextLabel: 'Interview' },
  inter:  { next: 'delib',   roles: ['hrmo'],           nextLabel: 'Deliberation' },
  delib:  { next: 'ree',     roles: ['rspu'],           nextLabel: 'Resolution (E&E)' },
  ree:    { next: 'rprep',   roles: ['hrmo'],           nextLabel: 'Resolution (Prep)' },
  rprep:  { next: 'appt',    roles: ['rspu'],           nextLabel: 'Appointment' },
  appt:   { next: 'assume',  roles: ['hrmo'],           nextLabel: 'Assumption' },
  assume: { next: 'complete',roles: ['rspu'],           nextLabel: 'Complete' },
  repub:  { next: 'eval',    roles: ['hrmo', 'rspu'],   nextLabel: 'Re-evaluate' },
}

const STATUS_LABELS = {
  pending:  'Pending',
  eval:     'Evaluation',
  rse:      'RSE',
  exam:     'Examination',
  inter:    'Interview',
  delib:    'Deliberation',
  ree:      'Resolution (E&E)',
  rprep:    'Resolution (Prep)',
  appt:     'Appointment',
  assume:   'Assumption',
  complete: 'Complete',
  repub:    'Republication',
}

const myDept     = computed(() => auth.user?.department || '')
const myDeptName = computed(() => auth.user?.full_name  || '')

const filtered = computed(() => {
  let list = pubs.value.filter(p =>
    p.prod_status !== 'complete' &&
    (p.pub_status === 'active' || (p.pub_status === 'expired' && p.applicant_count > 0))
  )
  // HRMO accounts only see positions belonging to their own office
  if (myRole.value === 'hrmo') {
    list = list.filter(p => {
      const dept = (p.department || '').toLowerCase()
      return dept.includes(myDept.value.toLowerCase()) ||
             dept.includes(myDeptName.value.toLowerCase())
    })
  }
  const q = search.value.toLowerCase()
  if (q) list = list.filter(p =>
    p.position.toLowerCase().includes(q) ||
    p.department.toLowerCase().includes(q) ||
    (p.plantilla_item || '').toLowerCase().includes(q)
  )
  return list
})

onMounted(load)
async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/publications', { params: { status: 'in_production' } })
    pubs.value = data
  } finally { loading.value = false }
  // Load users separately — failures here don't block the table
  api.get('/auth/users').then(r => { users.value = r.data }).catch(() => {})
}

// Find the specific user responsible for the next action on a publication
function responsibleUser(p) {
  const tx = STATUS_TRANSITIONS[p.prod_status || 'pending']
  if (!tx) return null
  const role = tx.roles[0]
  if (role === 'rspu') {
    return users.value.find(u => u.role === 'rspu') || null
  }
  // HRMO — match by office
  return users.value.find(u => {
    if (u.role !== 'hrmo') return false
    const dept = (p.department || '').toLowerCase()
    return dept.includes((u.department || '').toLowerCase()) ||
           dept.includes((u.full_name  || '').toLowerCase())
  }) || null
}

function statusLabel(s)     { return STATUS_LABELS[s] || 'Pending' }
function responsibleRole(p) { return STATUS_TRANSITIONS[p.prod_status || 'pending']?.roles[0] || 'hrmo' }
function roleLabel(role)    { return role === 'rspu' ? 'RSPU Admin' : 'HRMO Admin' }

function officeMatch(p) {
  const dept = (p.department || '').toLowerCase()
  return dept.includes(myDept.value.toLowerCase()) || dept.includes(myDeptName.value.toLowerCase())
}

function canAdvance(p) {
  const tx = STATUS_TRANSITIONS[p.prod_status || 'pending']
  if (!tx || !tx.roles.includes(myRole.value)) return false
  if (myRole.value === 'hrmo') return officeMatch(p)
  return true
}

function canRepublish(p) {
  const tx = STATUS_TRANSITIONS[p.prod_status || 'pending']
  if (!tx?.canRepublish) return false
  if (myRole.value === 'rspu') return true
  if (myRole.value === 'hrmo') return officeMatch(p)
  return false
}

function userInitials(user) {
  if (!user) return '?'
  if (user.role === 'rspu') return 'RS'
  if (user.department) return user.department.slice(0, 2).toUpperCase()
  return (user.username || '?').slice(0, 2).toUpperCase()
}


function prodDays(p) {
  const since = p.prod_since || p.prod_start
  if (!since) return 0
  const normalized = since.includes('T') || since.includes('+') ? since : since.replace(' ', 'T') + '+08:00'
  return Math.max(0, Math.floor((Date.now() - new Date(normalized).getTime()) / 86400000))
}

function formatDays(days) {
  return `${Math.min(days, 90)}d`
}

function daysClass(days) {
  if (days >= 90) return 'days-critical'
  if (days >= 75) return 'days-danger'
  if (days >= 60) return 'days-warning'
  return 'days-ok'
}

async function republish(p) {
  if (!confirm(`Mark "${p.position}" as Republication?\n\nThis means no qualified applicants were found. The position will be re-posted.`)) return
  busy.value = p.id
  try {
    await api.patch(`/publications/${p.id}/prod-republish`)
    const idx = pubs.value.findIndex(pub => pub.id === p.id)
    if (idx !== -1) {
      pubs.value[idx] = { ...pubs.value[idx], prod_status: 'repub' }
    }
    flash('Marked as Republication.', 'ok')
  } catch (e) {
    flash(e.response?.data?.message || 'Failed.', 'err')
  } finally { busy.value = null }
}

async function advance(p) {
  const tx = STATUS_TRANSITIONS[p.prod_status || 'pending']
  if (!tx) return

  // RSE, Exam, Interview open the schedule modal (it already acts as confirmation)
  if (tx.next === 'rse' || tx.next === 'exam' || tx.next === 'inter') {
    schedModal.value = {
      show: true,
      pub: p,
      label: tx.next === 'rse' ? 'RSE' : tx.next === 'exam' ? 'Examination' : 'Interview',
      position: p.position,
      datetime: ''
    }
    return
  }

  // All other statuses: show confirmation modal
  confirmModal.value = {
    show: true,
    pub: p,
    label: tx.nextLabel,
    position: p.position,
    isRepub: p.prod_status === 'repub',
    onConfirm: () => doAdvance(p, null)
  }
}

function handleConfirmAdvance() {
  const fn = confirmModal.value.onConfirm
  confirmModal.value.show = false
  if (fn) fn()
}

function openSetSched(p, type) {
  schedModal.value = {
    show: true, pub: p,
    label: type === 'rse' ? 'RSE' : type === 'exam' ? 'Examination' : 'Interview',
    position: p.position,
    datetime: '',
    schedOnly: true, schedType: type,
  }
}

async function confirmAdvance() {
  const p  = schedModal.value.pub
  const dt = schedModal.value.datetime
  if (!p || !dt) return
  schedBusy.value = true
  if (schedModal.value.schedOnly) {
    try {
      const col = schedModal.value.schedType === 'rse' ? 'rse_schedule' : schedModal.value.schedType === 'exam' ? 'exam_schedule' : 'inter_schedule'
      await api.patch(`/publications/${p.id}/set-schedule`, { col, schedule: dt })
      const idx = pubs.value.findIndex(pub => pub.id === p.id)
      if (idx !== -1) pubs.value[idx][col] = dt
    } catch {}
  } else {
    await doAdvance(p, dt)
  }
  schedBusy.value = false
  schedModal.value.show = false
}

async function doAdvance(p, schedule) {
  const tx = STATUS_TRANSITIONS[p.prod_status || 'pending']
  busy.value = p.id
  try {
    const { data } = await api.patch(`/publications/${p.id}/prod-status`, schedule ? { schedule } : {})
    const idx = pubs.value.findIndex(pub => pub.id === p.id)
    if (idx !== -1) {
      pubs.value[idx] = {
        ...pubs.value[idx],
        prod_status: data.prod_status,
        ...(data.pub_status  && { pub_status:     data.pub_status }),
        ...(data.status      && { status:         data.status }),
        ...(tx.next === 'rse'   && schedule && { rse_schedule:   schedule }),
        ...(tx.next === 'exam'  && schedule && { exam_schedule:  schedule }),
        ...(tx.next === 'inter' && schedule && { inter_schedule: schedule }),
      }
    }
    delete apopCache[p.id]
    flash(`Status advanced to ${tx.nextLabel}.`, 'ok')
    useNotificationsStore().refresh()
  } catch (e) {
    flash(e.response?.data?.message || 'Failed to advance.', 'err')
  } finally { busy.value = null }
}

function fmtSchedule(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

function flash(t, type) { msg.value = t; msgType.value = type; setTimeout(() => msg.value = '', 3500) }

function showTooltip(e, text) {
  const rect  = e.currentTarget.getBoundingClientRect()
  const above = rect.top > window.innerHeight / 2
  ttip.value = {
    show: true,
    text,
    style: {
      left:   (rect.left + rect.width / 2) + 'px',
      ...(above
        ? { bottom: (window.innerHeight - rect.top + 8) + 'px', top: 'auto' }
        : { top: (rect.bottom + 8) + 'px', bottom: 'auto' }
      )
    }
  }
}

function hideTooltip() { ttip.value.show = false }

// ── Republish modal (RSPU only) ──
const repubModal    = ref(false)
const repubSelected = ref(null)
const repubBusy     = ref(false)

function openRepubModal()  { repubModal.value = true; repubSelected.value = null }
function closeRepubModal() { repubModal.value = false; repubSelected.value = null }

async function confirmRepublish() {
  if (!repubSelected.value) return
  const p = repubSelected.value
  repubBusy.value = true
  try {
    await api.patch(`/publications/${p.id}/no-qualified`)
    const idx = pubs.value.findIndex(x => x.id === p.id)
    if (idx !== -1) {
      pubs.value[idx] = {
        ...pubs.value[idx],
        pub_status:      'no_qualified',
        status:          'for_publication',
        prod_status:     null,
        applicant_count: 0,
      }
    }
    closeRepubModal()
    flash(`"${p.position}" returned to For Publication as No Qualified.`, 'ok')
  } catch (e) {
    flash(e.response?.data?.message || 'Failed.', 'err')
  } finally { repubBusy.value = false }
}

</script>

<style scoped>
.table-wrap { max-height: calc(100vh - 300px); overflow-y: auto; }
th { position: sticky; top: 0; z-index: 2; background: #fff; }

.plantilla-chip { display:inline-block; padding:3px 10px; border-radius:20px; background:var(--primary-light); color:var(--primary); font-size:12px; font-weight:500; }

.pos-hover-target { display:inline-block; cursor:default; padding:4px 6px; border-radius:8px; margin:-4px -6px; transition:background .13s; }
.pos-hover-target:hover { background:var(--primary-light); }

/* Production status pills */
.ps-pill     { display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; white-space:nowrap; }
.ps-pending  { background:#f1f5f9; color:#475569; }
.ps-eval     { background:#eff6ff; color:#1d4ed8; }
.ps-rse      { background:#f5f3ff; color:#6d28d9; }
.ps-exam     { background:#eef2ff; color:#4338ca; }
.ps-inter    { background:#ecfeff; color:#0e7490; }
.ps-delib    { background:#fff7ed; color:#c2410c; }
.ps-ree      { background:#fefce8; color:#a16207; }
.ps-rprep    { background:#f7fee7; color:#4d7c0f; }
.ps-appt     { background:#f0fdf4; color:#15803d; }
.ps-assume   { background:#dcfce7; color:#166534; }
.ps-complete { background:#166534; color:#fff; }
.ps-repub    { background:#fee2e2; color:#991b1b; font-weight:700; }

/* Days */
.days-num { font-size:16px; font-weight:700; color:var(--text-1); }

/* Responsible profile avatar */
.avatar-wrap  { position:relative; display:inline-block; }
.resp-avatar  {
  width:38px; height:38px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:13px; font-weight:800; flex-shrink:0; cursor:default;
  transition:transform .14s, box-shadow .14s;
}
.avatar-wrap:hover .resp-avatar { transform:scale(1.12); box-shadow:0 4px 12px rgba(0,0,0,.15); }
.resp-avatar.mine    { background:#dbeafe; color:#1d4ed8; border:2px solid #2563eb; cursor:pointer; }
.resp-avatar.waiting { background:#f1f5f9; color:#64748b; border:2px solid #cbd5e1; }
.role-hrmo { background:#fef3c7 !important; color:#b45309 !important; border-color:#f59e0b !important; }
.role-rspu { background:#ede9fe !important; color:#6d28d9 !important; border-color:#7c3aed !important; }
.resp-photo { width:100%; height:100%; object-fit:cover; display:block; border-radius:50%; }


/* Tooltip */

.complete-tag { font-size:12px; font-weight:700; color:#166534; background:#dcfce7; padding:4px 12px; border-radius:20px; }

/* Stage advance button — also acts as a status tag */
.btn-stage { display:inline-flex; align-items:center; gap:6px; border:none; border-radius:20px; padding:6px 14px; font-size:12px; font-weight:700; cursor:pointer; transition:all .15s; white-space:nowrap; letter-spacing:.2px; }
.btn-stage:disabled { opacity:.55; cursor:not-allowed; }

/* Colors per next stage */
.stage-rse    { background:#f5f3ff; color:#6d28d9; border:2px solid #a78bfa; }
.stage-rse:hover { background:#ede9fe; }
.stage-exam   { background:#eef2ff; color:#4338ca; border:2px solid #818cf8; }
.stage-exam:hover { background:#e0e7ff; }
.stage-inter  { background:#ecfeff; color:#0e7490; border:2px solid #67e8f9; }
.stage-inter:hover { background:#cffafe; }
.stage-delib  { background:#fff7ed; color:#c2410c; border:2px solid #fb923c; }
.stage-delib:hover { background:#ffedd5; }
.stage-ree    { background:#fefce8; color:#a16207; border:2px solid #fcd34d; }
.stage-ree:hover { background:#fef9c3; }
.stage-rprep  { background:#f7fee7; color:#4d7c0f; border:2px solid #a3e635; }
.stage-rprep:hover { background:#ecfccb; }
.stage-appt   { background:#f0fdf4; color:#15803d; border:2px solid #4ade80; }
.stage-appt:hover { background:#dcfce7; }
.stage-assume { background:#dcfce7; color:#166534; border:2px solid #22c55e; }
.stage-assume:hover { background:#bbf7d0; }
.stage-complete { background:#166534; color:#fff; border:2px solid #15803d; }
.stage-complete:hover { background:#14532d; }
.stage-pending { background:#f8fafc; color:#475569; border:2px solid #cbd5e1; }
.stage-pending:hover { background:#f1f5f9; }
.stage-eval   { background:#eff6ff; color:#1d4ed8; border:2px solid #60a5fa; }
.stage-eval:hover { background:#dbeafe; }

.btn-repub { background:#fff; color:#991b1b; border:1.5px solid #fca5a5; border-radius:20px; padding:5px 12px; font-size:11px; font-weight:600; cursor:pointer; transition:all .14s; white-space:nowrap; }
.btn-repub:hover    { background:#fee2e2; border-color:#ef4444; }
.btn-repub:disabled { opacity:.5; cursor:not-allowed; }

/* Highlight rows the current user can act on */
.tr-mine   { background:#f0f7ff !important; }
.tr-urgent { background:#fff8f0 !important; }

/* Days badge */
.days-badge { display:inline-flex; align-items:center; justify-content:center; gap:3px; font-size:12px; font-weight:700; padding:4px 12px; border-radius:20px; }
.days-ok       { background:#fef3c7; color:#92400e; }
.days-warning  { background:#fefce8; color:#a16207; }
.days-danger   { background:#fff7ed; color:#c2410c; }
.days-critical { background:#fef2f2; color:#b91c1c; }
.days-max      { font-size:10px; font-weight:800; letter-spacing:.5px; }

.count-badge { font-size:12px; color:var(--text-3); background:var(--bg); padding:5px 12px; border-radius:20px; border:1px solid var(--border); }

/* ── Republish FAB ── */
.fab-repub {
  position: fixed; bottom: 32px; right: 36px; z-index: 900;
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--primary); color: #fff;
  border: none; border-radius: 50px;
  padding: 13px 22px; font-size: 14px; font-weight: 700;
  cursor: pointer; box-shadow: 0 4px 18px rgba(0,0,0,.22);
  transition: all .17s;
}
.fab-repub:hover { filter: brightness(1.12); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.26); }

/* ── Republish Modal ── */
.rm-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(15,23,42,.45); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.rm-box {
  background: #fff; border-radius: 18px;
  width: 100%; max-width: 560px;
  box-shadow: 0 24px 60px rgba(0,0,0,.22);
  display: flex; flex-direction: column; overflow: hidden;
  max-height: 85vh;
}
.rm-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 24px 28px 18px;
  border-bottom: 1px solid #f1f5f9;
}
.rm-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 5px; }
.rm-sub   { font-size: 13px; color: #64748b; margin: 0; line-height: 1.5; }
.rm-sub strong { color: #9a3412; }
.rm-close {
  background: none; border: none; cursor: pointer; color: #94a3b8;
  border-radius: 8px; padding: 4px; transition: all .14s; flex-shrink: 0;
}
.rm-close:hover { background: #f1f5f9; color: #334155; }

.rm-list {
  flex: 1; overflow-y: auto; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 8px;
}
.rm-empty { font-size: 13px; color: #94a3b8; text-align: center; padding: 32px 0; font-style: italic; }
.rm-card {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 16px; border-radius: 12px;
  border: 1.5px solid #e2e8f0; cursor: pointer;
  transition: all .14s;
}
.rm-card:hover { border-color: var(--primary); background: var(--primary-light); }
.rm-card-sel   { border-color: var(--primary) !important; background: var(--primary-light) !important; }

.rm-radio {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid #cbd5e1; transition: all .14s;
}
.rm-radio-on { border-color: var(--primary); background: var(--primary); box-shadow: inset 0 0 0 3px #fff; }

.rm-card-body { flex: 1; min-width: 0; }
.rm-pos  { font-size: 14px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rm-dept { font-size: 12px; color: #64748b; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.rm-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  padding: 16px 24px; border-top: 1px solid #f1f5f9;
}
.rm-cancel-btn {
  background: none; border: 1.5px solid #e2e8f0; border-radius: 10px;
  padding: 9px 20px; font-size: 14px; font-weight: 600; color: #64748b;
  cursor: pointer; transition: all .14s;
}
.rm-cancel-btn:hover { border-color: #94a3b8; color: #334155; }
.rm-confirm-btn {
  display: inline-flex; align-items: center; gap: 7px;
  background: #9a3412; color: #fff; border: none; border-radius: 10px;
  padding: 9px 20px; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: all .14s;
}
.rm-confirm-btn:hover:not(:disabled) { background: #7c2d12; }
.rm-confirm-btn:disabled { opacity: .5; cursor: not-allowed; }
</style>

<!-- non-scoped so Teleported elements get styled -->
<style>
.avatar-tt-fixed {
  position: fixed;
  transform: translateX(-50%);
  background: #fff;
  color: #1e293b;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  z-index: 9999;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0,0,0,.15);
  border: 2px solid #cbd5e1;
}
.apop-fixed {
  position: fixed; z-index: 9998; pointer-events: none;
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
.apop-name  { font-weight: 600; color: #1e293b; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.apop-status { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 10px; flex-shrink: 0; letter-spacing: .3px; }
.apop-ps-pending  { background: #f1f5f9; color: #475569; }
.apop-ps-eval     { background: #eff6ff; color: #1d4ed8; }
.apop-ps-rse      { background: #f5f3ff; color: #6d28d9; }
.apop-ps-exam     { background: #eef2ff; color: #4338ca; }
.apop-ps-inter    { background: #ecfeff; color: #0e7490; }
.apop-ps-delib    { background: #fff7ed; color: #c2410c; }
.apop-ps-ree      { background: #fefce8; color: #a16207; }
.apop-ps-rprep    { background: #f7fee7; color: #4d7c0f; }
.apop-ps-appt     { background: #f0fdf4; color: #15803d; }
.apop-ps-assume   { background: #dcfce7; color: #166534; }
.apop-ps-complete { background: #166534; color: #fff; }
.apop-ps-repub       { background: #fdf2f8; color: #9d174d; }
.apop-ps-shortlisted { background: #fef9c3; color: #854d0e; }
.apop-more { font-size: 11px; color: #94a3b8; padding: 5px 12px; font-style: italic; }
.btn-set-sched { font-size: 11px; padding: 3px 8px; border-radius: 8px; border: 1px dashed #818cf8; background: #eef2ff; color: #4338ca; cursor: pointer; }
.btn-set-sched:hover { background: #e0e7ff; }
.apop-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.apop-date-badge { font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 8px; background: #ede9fe; color: #5b21b6; white-space: nowrap; }
.apop-date-inter { background: #fef3c7; color: #92400e; }

/* ── Inline toast (upper-right of page header) ── */
.inline-toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  align-self: center;
}
.inline-toast-ok  { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.inline-toast-err { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

.toast-enter-active { transition: opacity .18s ease, transform .18s ease; }
.toast-leave-active { transition: opacity .2s ease, transform .2s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(8px); }
.toast-leave-to     { opacity: 0; transform: translateX(8px); }

/* ── Schedule popover row ── */
.apop-schedule {
  padding: 7px 12px 4px;
  border-bottom: 1px solid #f1f5f9;
  display: flex; flex-direction: column; gap: 4px;
}
.apop-sched-row {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: #4338ca; font-weight: 600;
}

/* ── Schedule picker modal ── */
.sched-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 9998; padding: 24px;
}
.sched-box {
  background: #fff; border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
  width: 100%; max-width: 420px;
  display: flex; flex-direction: column; overflow: hidden;
}
.sched-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border);
}
.sched-title { font-size: 16px; font-weight: 700; color: var(--text-1); }
.sched-sub   { font-size: 12px; color: var(--text-3); margin-top: 3px; }
.sched-close {
  width: 28px; height: 28px; border: none; background: var(--border-light);
  border-radius: 8px; cursor: pointer; font-size: 14px; color: var(--text-2);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: background .15s;
}
.sched-close:hover { background: var(--red-light); color: var(--red); }
.sched-body  { padding: 20px 22px; }
.sched-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-2); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 8px; }
.sched-input { font-size: 14px; }
.sched-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 22px 20px;
  border-top: 1px solid var(--border);
}
.confirm-box  { max-width: 380px; }
.confirm-msg  { font-size: 14px; color: var(--text-1); line-height: 1.6; margin: 0; }
.confirm-warn { font-size: 12px; color: var(--red, #ef4444); font-weight: 600; margin: 10px 0 0; }
</style>
