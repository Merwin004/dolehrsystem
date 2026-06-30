<template>
  <div class="pub-page">

    <!-- Top nav -->
    <div class="top-nav">
      <div class="nav-inner">
        <div class="brand">
          <img :src="logoSrc" alt="" class="brand-logo" @error="(e) => e.target.style.display='none'" />
          <div>
            <div class="brand-name">HR System</div>
            <div class="brand-sub">Human Resource Management Portal</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Blue banner -->
    <div class="banner">
      <div class="banner-inner">
        <h1 class="banner-h1">Department of Labor and Employment</h1>
        <p class="banner-p">
          Browse open positions and submit your application.
          Click <strong>View</strong> to read the publication or
          <strong>Apply Position</strong> to apply.
        </p>
      </div>
    </div>

    <!-- Content -->
    <div class="content">

      <!-- Section header -->
      <div class="sec-hdr">
        <div class="sec-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" class="sec-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span class="sec-title">Published Vacancies</span>
        </div>
        <div class="sec-stats">
          <span class="stat"><b class="stat-n">{{ pubs.length }}</b> Total Vacancies</span>
          <span class="stat"><b class="stat-n">{{ pubs.length }}</b> Currently Open</span>
          <span class="stat"><b class="stat-n">{{ officeCount }}</b> Offices</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" width="15" height="15" style="flex-shrink:0">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" placeholder="Search position, plantilla no., office…" class="search-inp" />
        </div>
        <select v-model="deptFilter" class="dept-sel">
          <option value="">All Offices</option>
          <option v-for="d in offices" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>

      <!-- Table -->
      <div class="table-card">
        <div v-if="loading" class="empty-row">
          <span class="spin"></span> Loading vacancies…
        </div>
        <div v-else-if="rows.length === 0" class="empty-row">
          No open vacancies at this time.
        </div>
        <div v-else class="tbl-scroll">
          <table class="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Posting Date</th>
                <th>Position Title</th>
                <th>Plantilla Item No.</th>
                <th>Office</th>
                <th style="text-align:center">SG</th>
                <th>Qualifications</th>
                <th>Closing Date</th>
                <th>Publication</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in rows" :key="p.id">
                <td class="td-n">{{ i + 1 }}</td>
                <td class="td-d">{{ fmt(p.updated_at) }}</td>
                <td>
                  <div class="pos-title">{{ p.position }}</div>
                  <span class="badge-open">Open</span>
                </td>
                <td><span class="plt-chip">{{ p.plantilla_item || '—' }}</span></td>
                <td class="td-office">{{ p.department }}</td>
                <td style="text-align:center"><span class="sg-dot">{{ p.salary_grade || '—' }}</span></td>
                <td class="td-qual">{{ qual(p) }}</td>
                <td class="td-d">{{ p.closing_date ? fmt(p.closing_date) : '—' }}</td>
                <td>
                  <button v-if="p.attachment_name" class="btn-view" @click="openViewer(p)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    View
                  </button>
                  <span v-else class="td-dash">—</span>
                </td>
                <td>
                  <button class="btn-apply" @click="openApply(p)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    Apply
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PDF Viewer -->
    <Teleport to="body">
      <div v-if="viewer" class="overlay" @click.self="viewer = null">
        <div class="modal" style="max-width:920px;height:88vh">
          <div class="modal-top">
            <div>
              <div class="modal-pos">{{ viewer.position }}</div>
              <div class="modal-meta">{{ viewer.plantilla_item }} · {{ viewer.department }}</div>
            </div>
            <button class="close-btn" @click="viewer = null">✕</button>
          </div>
          <iframe :key="viewer.id" :src="viewer.attachment_name?.startsWith('http') ? viewer.attachment_name : `/uploads/${viewer.attachment_name}`" class="pdf-frame"></iframe>
        </div>
      </div>
    </Teleport>

    <!-- Data Privacy Modal -->
    <Teleport to="body">
      <div v-if="privacyPos" class="overlay" @click.self="privacyPos = null">
        <div class="modal" style="max-width:580px">
          <div class="modal-top">
            <div>
              <div class="modal-pos">Data Privacy Notice</div>
              <div class="modal-meta">Republic Act No. 10173 — Data Privacy Act of 2012</div>
            </div>
            <button class="close-btn" @click="privacyPos = null">✕</button>
          </div>
          <div class="modal-body privacy-body">
            <div class="privacy-seal">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="1.8" width="32" height="32"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h2 class="privacy-h2">Your Privacy Matters</h2>
            <p class="privacy-intro">
              The <strong>Department of Labor and Employment (DOLE)</strong> is committed to protecting and respecting your personal data in accordance with <strong>Republic Act No. 10173</strong>, otherwise known as the <em>Data Privacy Act of 2012</em>.
            </p>

            <div class="privacy-section">
              <div class="privacy-section-title">1. Information We Collect</div>
              <p class="privacy-text">We collect the following personal information for recruitment purposes:</p>
              <ul class="privacy-list">
                <li>Full name and email address</li>
                <li>Personal Data Sheet (PDS)</li>
                <li>Transcript of Records (TOR)</li>
                <li>Civil Service Eligibility documents</li>
                <li>Work Experience Sheet (WES)</li>
                <li>Letter of Intent</li>
              </ul>
            </div>

            <div class="privacy-section">
              <div class="privacy-section-title">2. Purpose of Data Collection</div>
              <p class="privacy-text">Your personal information is collected solely for the purpose of evaluating your application for employment with DOLE. It will be used to:</p>
              <ul class="privacy-list">
                <li>Verify your identity and qualifications</li>
                <li>Process and evaluate your application</li>
                <li>Contact you regarding the status of your application</li>
                <li>Comply with Civil Service Commission (CSC) requirements</li>
              </ul>
            </div>

            <div class="privacy-section">
              <div class="privacy-section-title">3. Data Sharing & Retention</div>
              <p class="privacy-text">Your data may be shared with the Civil Service Commission (CSC) and relevant DOLE offices strictly for the hiring process. Personal information will be retained for a period consistent with applicable laws and DOLE retention policies.</p>
            </div>

            <div class="privacy-section">
              <div class="privacy-section-title">4. Your Rights</div>
              <p class="privacy-text">Under RA 10173, you have the right to access, correct, and object to the processing of your personal data. For concerns, contact the DOLE Data Protection Officer at your nearest DOLE regional office.</p>
            </div>

            <label class="privacy-agree-row">
              <input type="checkbox" v-model="privacyChecked" class="privacy-chk" />
              <span class="privacy-agree-lbl">
                I have read, understood, and agree to the <strong>DOLE Data Privacy Notice</strong>. I consent to the collection and processing of my personal data for the purpose of this job application.
              </span>
            </label>

            <div class="privacy-actions">
              <button class="btn-cancel" @click="privacyPos = null">Decline</button>
              <button class="btn-apply" :disabled="!privacyChecked" @click="proceedToApply">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                I Agree, Proceed
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Apply Form -->
    <Teleport to="body">
      <div v-if="applyPos" class="overlay" @click.self="applyPos = null">
        <div class="modal" style="max-width:600px">
          <div class="modal-top">
            <div>
              <div class="modal-pos">Apply for Position</div>
              <div class="modal-meta">{{ applyPos.plantilla_item }} — {{ applyPos.position }}</div>
            </div>
            <button class="close-btn" @click="applyPos = null">✕</button>
          </div>
          <div class="modal-body">

            <!-- Success -->
            <div v-if="done" class="done-state">
              <div style="font-size:42px;margin-bottom:10px">✅</div>
              <div class="done-title">Application Submitted!</div>
              <div class="done-sub">We received your application for <strong>{{ applyPos.position }}</strong>. You will be contacted if you qualify.</div>
              <button class="btn-apply" style="margin-top:20px" @click="applyPos = null">Close</button>
            </div>

            <form v-else @submit.prevent="submit">
              <!-- Warning notice -->
              <div class="notice-box">
                <span class="notice-icon">⚠️</span>
                <div>
                  <div class="notice-title">One-Time Application Only</div>
                  <div class="notice-sub">Your full name and email address are verified against existing submissions. Duplicate applications for the same position will be automatically rejected.</div>
                </div>
              </div>

              <!-- Name + Email row -->
              <div class="fg-grid">
                <div class="fg">
                  <label class="flbl">FULL NAME <span class="req">*</span></label>
                  <input v-model="fm.full_name" class="finp" placeholder="e.g. Juan Dela Cruz" required :disabled="otpVerified" />
                </div>
                <div class="fg">
                  <label class="flbl">EMAIL ADDRESS <span class="req">*</span></label>
                  <div class="email-row">
                    <input v-model="fm.email" type="email" class="finp" placeholder="e.g. juan@gmail.com" required :disabled="otpVerified" style="flex:1" />
                    <button type="button" class="btn-otp" @click="sendOTP" :disabled="otpSending || otpVerified">
                      {{ otpVerified ? 'Verified ✓' : otpSending ? 'Sending…' : otpSent ? 'Resend' : 'Send OTP' }}
                    </button>
                  </div>

                  <!-- OTP input — tight, directly under email -->
                  <div v-if="otpSent && !otpVerified" class="otp-inline">
                    <div class="otp-inline-row">
                      <input v-model="fm.otp" class="finp otp-inp" placeholder="Enter 6-digit OTP" maxlength="6" />
                      <button type="button" class="btn-otp" @click="verifyOTP" :disabled="otpVerifying">
                        {{ otpVerifying ? '…' : 'Verify' }}
                      </button>
                    </div>
                    <div class="otp-hint">Check your inbox for the OTP code.</div>
                  </div>

                  <!-- Email verified -->
                  <div v-if="otpVerified" class="verified-inline">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="13" height="13"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Email verified
                  </div>

                  <!-- Duplicate error -->
                  <div v-if="dupErr" class="dup-err-box">
                    <span>⛔</span>
                    <div>
                      <div style="font-weight:700;margin-bottom:2px;">Already Applied</div>
                      <div>This email has already been used to apply for this position.</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Position (read-only) -->
              <div class="fg" style="margin-top:16px">
                <label class="flbl">APPLYING FOR POSITION</label>
                <div class="pos-readonly">{{ applyPos.plantilla_item }} — {{ applyPos.position }}</div>
              </div>

              <!-- Required Documents -->
              <div class="docs-header">
                <div class="docs-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  REQUIRED DOCUMENTS <span class="req">* (All required)</span>
                </div>
                <div class="docs-hint">PDF, JPG, or PNG · max 5 MB each</div>
              </div>
              <div class="docs-grid">
                <label v-for="doc in docSlots" :key="doc.field" class="doc-slot" :class="{ 'doc-filled': fm.docs[doc.field] }">
                  <input type="file" class="doc-file-inp" :name="doc.field" accept=".pdf,.jpg,.jpeg,.png" @change="onDocChange(doc.field, $event)" />
                  <span class="doc-icon">{{ doc.icon }}</span>
                  <div class="doc-info">
                    <div class="doc-name">{{ doc.label }}</div>
                    <div class="doc-hint">{{ shortName(fm.docs[doc.field]?.name) }}</div>
                  </div>
                  <span v-if="fm.docs[doc.field]" class="doc-check">✓</span>
                </label>
              </div>

              <div v-if="err" class="err-box">{{ err }}</div>

              <div class="form-footer">
                <div style="font-size:12px;color:#64748b">All fields marked <span class="req">*</span> are required.</div>
                <div style="display:flex;gap:10px">
                  <button type="button" class="btn-cancel" @click="applyPos = null">Cancel</button>
                  <button type="button" class="btn-apply" :disabled="busy || !otpVerified || !allDocsUploaded" @click="confirmOpen = true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    Submit Application
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Submit Modal -->
    <Teleport to="body">
      <div v-if="confirmOpen" class="overlay" @click.self="confirmOpen = false">
        <div class="confirm-modal">
          <!-- Header -->
          <div class="confirm-header">
            <div>
              <div class="confirm-title">Confirm Submission</div>
              <div class="confirm-subtitle">Please review before submitting.</div>
            </div>
            <button class="confirm-close" @click="confirmOpen = false">✕</button>
          </div>

          <div class="confirm-body">
            <!-- Warning -->
            <div class="confirm-warning">
              <span class="cw-icon">⚠️</span>
              <div>
                <div class="cw-title">This action is final.</div>
                <div class="cw-sub">Once submitted, you cannot re-apply for the same position using the same name or email address.</div>
              </div>
            </div>

            <!-- Summary card -->
            <div class="confirm-summary">
              <div class="cs-label">APPLICATION SUMMARY</div>
              <div class="cs-row">
                <span class="cs-key">Name</span>
                <span class="cs-val cs-bold">{{ fm.full_name }}</span>
              </div>
              <div class="cs-divider"></div>
              <div class="cs-row">
                <span class="cs-key">Email</span>
                <span class="cs-val">{{ fm.email }}</span>
              </div>
              <div class="cs-divider"></div>
              <div class="cs-row cs-row-col">
                <span class="cs-key">Position</span>
                <span class="cs-pos">{{ applyPos?.plantilla_item }} — {{ applyPos?.position }}</span>
              </div>
            </div>

            <div class="confirm-question">Are you sure you want to submit this application?</div>
          </div>

          <!-- Actions -->
          <div class="confirm-actions">
            <button class="btn-goback" @click="confirmOpen = false">Go Back</button>
            <button class="btn-yes" :disabled="busy" @click="confirmAndSubmit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
              {{ busy ? 'Submitting…' : 'Yes, Submit' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const logoSrc    = '/dole-logo.png'
const pubs       = ref([])
const loading    = ref(true)
const search     = ref('')
const deptFilter = ref('')
const viewer     = ref(null)
const applyPos   = ref(null)
const done       = ref(false)
const err        = ref('')
const busy       = ref(false)
const otpSent      = ref(false)
const otpSending   = ref(false)
const otpVerified  = ref(false)
const otpVerifying = ref(false)
const confirmOpen  = ref(false)
const dupErr       = ref(false)
const privacyPos   = ref(null)
const privacyChecked = ref(false)

const docSlots = [
  { field: 'doc_letter', label: 'Letter of Intent',      icon: '✉️' },
  { field: 'doc_pds',    label: 'Personal Data Sheet',   icon: '👤' },
  { field: 'doc_tor',    label: 'Transcript of Records', icon: '🎓' },
  { field: 'doc_cse',    label: 'Civil Service Eligibility', icon: '🛡️' },
  { field: 'doc_wes',    label: 'Work Experience Sheet', icon: '💼' },
]

const fm = ref({ full_name:'', email:'', otp:'', docs: {} })

const offices     = computed(() => [...new Set(pubs.value.map(p => p.department).filter(Boolean))].sort())
const officeCount = computed(() => offices.value.length)

const rows = computed(() => {
  let list = pubs.value
  if (deptFilter.value) list = list.filter(p => p.department === deptFilter.value)
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter(p =>
    (p.position||'').toLowerCase().includes(q) ||
    (p.plantilla_item||'').toLowerCase().includes(q) ||
    (p.department||'').toLowerCase().includes(q)
  )
  return list
})

onMounted(async () => {
  try {
    const r = await fetch('/api/publications/public')
    const d = await r.json()
    pubs.value = Array.isArray(d) ? d : []
  } catch { pubs.value = [] }
  finally  { loading.value = false }
})

function qual(p) {
  return [p.education, p.training, p.experience, p.eligibility, p.competency].filter(Boolean).join(' / ') || '—'
}
function fmt(d) {
  if (!d) return '—'
  let normalized
  if (d.includes('T') || d.includes('+')) normalized = d
  else if (d.includes(' ')) normalized = d.replace(' ', 'T') + '+08:00'
  else normalized = d + 'T00:00:00+08:00'
  return new Date(normalized).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' })
}
function openViewer(p) { viewer.value = p }
function openApply(p) {
  privacyPos.value     = p
  privacyChecked.value = false
}
function proceedToApply() {
  applyPos.value    = privacyPos.value
  privacyPos.value  = null
  done.value        = false
  err.value         = ''
  otpSent.value     = false
  otpVerified.value = false
  confirmOpen.value = false
  dupErr.value      = false
  fm.value          = { full_name:'', email:'', otp:'', docs:{} }
}
async function confirmAndSubmit() {
  confirmOpen.value = false
  await submit()
}
function shortName(name, max = 20) {
  if (!name) return 'Click to attach'
  if (name.length <= max) return name
  const ext = name.lastIndexOf('.')
  const e   = ext > -1 ? name.slice(ext) : ''
  return name.slice(0, max - e.length - 1) + '…' + e
}
function onDocChange(field, e) {
  const file = e.target.files[0]
  if (file) fm.value.docs[field] = file
}
async function sendOTP() {
  if (!fm.value.email) { err.value = 'Enter your email first.'; return }
  err.value = ''; dupErr.value = false; otpSending.value = true
  try {
    const r = await fetch('/api/applicants/send-otp', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: fm.value.email, publication_id: applyPos.value.id })
    })
    if (!r.ok) {
      const d = await r.json()
      if (r.status === 409) { dupErr.value = true; return }
      throw new Error(d.message)
    }
    otpSent.value = true
  } catch(e) { err.value = e.message || 'Failed to send OTP.' }
  finally    { otpSending.value = false }
}
async function verifyOTP() {
  if (!fm.value.otp) { err.value = 'Enter the OTP code.'; return }
  err.value = ''; otpVerifying.value = true
  try {
    const r = await fetch('/api/applicants/verify-otp', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: fm.value.email, publication_id: applyPos.value.id, otp: fm.value.otp })
    })
    if (!r.ok) { const d = await r.json(); throw new Error(d.message) }
    otpVerified.value = true
  } catch(e) { err.value = e.message || 'OTP verification failed.' }
  finally    { otpVerifying.value = false }
}
const allDocsUploaded = computed(() =>
  docSlots.every(d => fm.value.docs[d.field])
)

async function submit() {
  err.value = ''
  if (!allDocsUploaded.value) {
    err.value = 'Please upload all required documents before submitting.'
    return
  }
  busy.value = true
  try {
    const fd = new FormData()
    fd.append('publication_id', applyPos.value.id)
    fd.append('full_name',      fm.value.full_name)
    fd.append('email',          fm.value.email)
    Object.entries(fm.value.docs).forEach(([k, v]) => fd.append(k, v))
    const r = await fetch('/api/applicants', { method:'POST', body: fd })
    if (!r.ok) { const d = await r.json(); throw new Error(d.message) }
    done.value = true
  } catch(e) { err.value = e.message || 'Failed to submit. Please try again.' }
  finally    { busy.value = false }
}
</script>

<style scoped>
/* ── Base ── */
*, *::before, *::after { box-sizing: border-box; }
.pub-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(145deg, #eef2ff 0%, #f0f7ff 40%, #e8f0fe 70%, #f5f3ff 100%);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: #1e293b;
  position: relative;
}
/* ambient blobs — absolute so they scroll with content, not fixed */
.pub-page::before {
  content: '';
  position: absolute;
  top: -180px; left: -150px;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(99,102,241,.1) 0%, transparent 68%);
  pointer-events: none; border-radius: 50%;
}
.pub-page::after {
  content: '';
  position: absolute;
  bottom: -120px; right: -100px;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(59,130,246,.08) 0%, transparent 68%);
  pointer-events: none; border-radius: 50%;
}

/* ── Nav ── */
.top-nav {
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(99,102,241,0.12);
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
}
/* push content below fixed nav */
.banner { margin-top: 68px; flex-shrink: 0; }
.nav-inner {
  max-width: 1600px;
  margin: 0 auto;
  padding: 12px 36px;
}
.brand       { display: flex; align-items: center; gap: 14px; }
.brand-logo  { width: 42px; height: 42px; object-fit: contain; }
.brand-name  { font-size: 15px; font-weight: 700; color: #1e293b; letter-spacing: -.2px; }
.brand-sub   { font-size: 11px; color: #64748b; margin-top: 1px; }

/* ── Banner ── */
.banner {
  background: linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #2563eb 100%);
  position: relative;
  overflow: hidden;
}
.banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 15% 60%, rgba(255,255,255,.1) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 20%, rgba(147,197,253,.15) 0%, transparent 50%);
  pointer-events: none;
}
.banner-inner {
  max-width: 1600px;
  margin: 0 auto;
  padding: 52px 36px 48px;
  position: relative;
}
.banner-h1 {
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 10px;
  letter-spacing: -.5px;
  line-height: 1.2;
}
.banner-p {
  font-size: 14.5px;
  color: rgba(255,255,255,.78);
  margin: 0;
  max-width: 560px;
  line-height: 1.68;
}
.banner-p strong { color: #fff; }

/* ── Content ── */
.content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 36px 24px;
}

/* ── Section header ── */
.sec-hdr  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 14px; flex-shrink: 0; }
.sec-left { display: flex; align-items: center; gap: 10px; }
.sec-icon { width: 20px; height: 20px; flex-shrink: 0; }
.sec-title { font-size: 18px; font-weight: 800; color: #1e293b; letter-spacing: -.3px; }
.sec-stats { display: flex; gap: 6px; flex-wrap: wrap; }
.stat {
  font-size: 12.5px;
  color: #475569;
  background: rgba(255,255,255,.75);
  border: 1px solid rgba(99,102,241,.15);
  border-radius: 20px;
  padding: 5px 14px;
  display: flex;
  align-items: center;
  gap: 5px;
  backdrop-filter: blur(8px);
  box-shadow: 0 1px 4px rgba(99,102,241,.08);
}
.stat-n { font-size: 14px; font-weight: 800; color: #4f46e5; }

/* ── Filters ── */
.filters     { display: flex; gap: 10px; margin-bottom: 12px; flex-shrink: 0; }
.search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,.8);
  border: 1.5px solid rgba(99,102,241,.15);
  border-radius: 14px;
  padding: 10px 16px;
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 4px rgba(99,102,241,.06);
  transition: border-color .15s, box-shadow .15s;
}
.search-wrap:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99,102,241,.1);
}
.search-inp {
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  width: 100%;
  color: #1e293b;
}
.search-inp::placeholder { color: #94a3b8; }
.dept-sel {
  border: 1.5px solid rgba(99,102,241,.15);
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 14px;
  background: rgba(255,255,255,.8);
  backdrop-filter: blur(12px);
  outline: none;
  width: 220px;
  color: #1e293b;
  cursor: pointer;
  transition: border-color .15s;
  box-shadow: 0 1px 4px rgba(99,102,241,.06);
}
.dept-sel option { background: #fff; color: #1e293b; }
.dept-sel:focus { border-color: #6366f1; }

/* ── Table card ── */
.table-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgba(255,255,255,.75);
  border: 1px solid rgba(99,102,241,.12);
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(99,102,241,.1), inset 0 1px 0 rgba(255,255,255,.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: hidden;
}
.tbl-scroll { flex: 1; overflow-x: auto; overflow-y: auto; min-height: 0; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl thead tr {
  border-bottom: 2px solid rgba(99,102,241,.15);
}
.tbl th {
  padding: 14px 16px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: #6366f1;
  text-align: left;
  white-space: nowrap;
  position: sticky; top: 0; z-index: 2;
  background: #f4f6ff;
  box-shadow: 0 1px 0 rgba(99,102,241,.15);
}
.tbl tbody tr {
  border-bottom: 1px solid rgba(99,102,241,.06);
  transition: background .14s;
}
.tbl tbody tr:last-child { border-bottom: none; }
.tbl tbody tr:hover { background: rgba(99,102,241,.04); }
.tbl td { padding: 15px 16px; vertical-align: top; white-space: normal; word-break: break-word; }

.td-n      { color: #cbd5e1; font-size: 12px; font-weight: 600; }
.td-d      { font-size: 12.5px; color: #64748b; white-space: nowrap; }
.td-office { font-size: 13px; color: #334155; white-space: normal; word-break: break-word; }
.td-qual   { font-size: 12.5px; color: #475569; max-width: 360px; white-space: normal; word-break: break-word; line-height: 1.55; }
.td-dash   { color: #cbd5e1; font-size: 18px; }

.pos-title  {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 5px;
  line-height: 1.3;
}
.badge-open {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 20px;
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .3px;
}
.badge-open::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  flex-shrink: 0;
}
.plt-chip {
  display: inline-block;
  padding: 4px 11px;
  border-radius: 8px;
  background: #eff6ff;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #c7d2fe;
}
.sg-dot {
  font-size: 13px;
  font-weight: 700;
  color: #4f46e5;
}

/* ── Action buttons ── */
.btn-view {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255,255,255,.9);
  color: #4f46e5;
  border: 1.5px solid #c7d2fe;
  border-radius: 9px;
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s;
}
.btn-view:hover {
  background: #eff6ff;
  border-color: #818cf8;
  box-shadow: 0 2px 10px rgba(99,102,241,.15);
}

.btn-apply {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  border: none;
  border-radius: 9px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s;
  box-shadow: 0 2px 10px rgba(99,102,241,.3);
}
.btn-apply:hover {
  background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
  box-shadow: 0 4px 18px rgba(99,102,241,.4);
  transform: translateY(-1px);
}
.btn-apply:active { transform: translateY(0); }
.btn-apply:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }

/* ── Empty / loading ── */
.empty-row {
  padding: 64px 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.spin {
  display: inline-block;
  width: 22px;
  height: 22px;
  border: 2.5px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: sp .7s linear infinite;
}
@keyframes sp { to { transform: rotate(360deg); } }

/* ── Overlay & modal ── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(30,41,59,.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
}
.modal {
  background: rgba(255,255,255,.92);
  border: 1px solid rgba(99,102,241,.15);
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(30,41,59,.2), inset 0 1px 0 #fff;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 90vh;
  backdrop-filter: blur(24px);
}
.modal-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px;
  border-bottom: 1px solid rgba(99,102,241,.1);
  flex-shrink: 0;
  background: rgba(238,242,255,.8);
}
.modal-pos  { font-size: 15px; font-weight: 700; color: #1e293b; }
.modal-meta { font-size: 12px; color: #64748b; margin-top: 3px; }
.close-btn  {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 15px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .13s;
  flex-shrink: 0;
}
.close-btn:hover { background: #e2e8f0; color: #334155; }
.pdf-frame  { width: 100%; flex: 1; border: none; }
.modal-body { padding: 22px 26px; overflow-y: auto; }

/* ── Apply form ── */
.fg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.fg      { display: flex; flex-direction: column; gap: 5px; }
.flbl    { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .5px; }
.finp    {
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  outline: none;
  transition: border-color .14s, box-shadow .14s;
  color: #0f172a;
  background: #fff;
}
.finp::placeholder { color: #94a3b8; }
.finp:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
.finp:disabled { background: #f8fafc; color: #94a3b8; }
.req  { color: #ef4444; }
.err-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 11px 15px;
  font-size: 13px;
  color: #dc2626;
  margin-top: 14px;
}
.btn-cancel {
  padding: 9px 18px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #64748b;
  transition: all .13s;
}
.btn-cancel:hover { background: #f8fafc; border-color: #cbd5e1; }

.done-state { text-align: center; padding: 28px 0; }
.done-title { font-size: 17px; font-weight: 700; color: #15803d; margin-bottom: 6px; }
.done-sub   { font-size: 13.5px; color: #166534; line-height: 1.6; }

/* ── Notice ── */
.notice-box {
  display: flex;
  gap: 12px;
  background: #fffbeb;
  border: 1.5px solid #fde68a;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 20px;
}
.notice-icon  { font-size: 18px; flex-shrink: 0; line-height: 1.3; }
.notice-title { font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 3px; }
.notice-sub   { font-size: 12.5px; color: #a16207; line-height: 1.55; }

/* ── OTP / email row ── */
.email-row { display: flex; gap: 8px; align-items: stretch; }
.btn-otp {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all .13s;
  height: 42px;
  box-shadow: 0 2px 8px rgba(99,102,241,.25);
}
.btn-otp:hover    { background: linear-gradient(135deg, #818cf8, #6366f1); box-shadow: 0 4px 14px rgba(99,102,241,.35); }
.btn-otp:disabled { background: #c7d2fe; cursor: not-allowed; box-shadow: none; }

.otp-inline     { margin-top: 8px; }
.otp-inline-row { display: flex; gap: 7px; align-items: center; }
.otp-inp        { letter-spacing: 4px; font-size: 16px !important; text-align: center; }
.otp-hint       { font-size: 11.5px; color: #94a3b8; margin-top: 4px; }

.verified-inline {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  color: #16a34a;
  margin-top: 6px;
}
.dup-err-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #fef2f2;
  border: 1.5px solid #fca5a5;
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 8px;
  font-size: 12.5px;
  color: #b91c1c;
  line-height: 1.55;
}

/* ── Position read-only ── */
.pos-readonly {
  background: #eff6ff;
  border: 1.5px solid #c7d2fe;
  border-radius: 10px;
  padding: 11px 15px;
  font-size: 14px;
  font-weight: 600;
  color: #4f46e5;
}

/* ── Documents ── */
.docs-header { display: flex; align-items: center; justify-content: space-between; margin: 22px 0 10px; }
.docs-title  { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #475569; }
.docs-hint   { font-size: 12px; color: #94a3b8; }
.docs-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.doc-slot {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1.5px dashed #cbd5e1;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all .14s;
  overflow: hidden;
  min-width: 0;
  background: #fafbff;
}
.doc-slot:hover   { border-color: #6366f1; background: #f0f1ff; }
.doc-filled       { border-color: #16a34a !important; background: #f0fdf4 !important; border-style: solid !important; }
.doc-file-inp     { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
.doc-icon         { font-size: 20px; flex-shrink: 0; }
.doc-info         { flex: 1; min-width: 0; }
.doc-name         { font-size: 13px; font-weight: 600; color: #0f172a; }
.doc-hint         { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.doc-filled .doc-hint { color: #15803d; }
.doc-check        { font-size: 16px; color: #16a34a; flex-shrink: 0; }

/* ── Form footer ── */
.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  flex-wrap: wrap;
  gap: 12px;
}

/* ── Confirm modal ── */
@keyframes popIn { from { opacity:0; transform:scale(.96) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }

.confirm-modal {
  background: rgba(255,255,255,.92);
  border: 1px solid rgba(99,102,241,.15);
  border-radius: 22px;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 24px 60px rgba(30,41,59,.18), inset 0 1px 0 #fff;
  animation: popIn .2s ease;
  overflow: hidden;
  backdrop-filter: blur(24px);
}
.confirm-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 22px 24px 18px;
  border-bottom: 1px solid rgba(99,102,241,.1);
  background: rgba(238,242,255,.8);
}
.confirm-title    { font-size: 17px; font-weight: 800; color: #1e293b; margin-bottom: 3px; }
.confirm-subtitle { font-size: 12.5px; color: #64748b; }
.confirm-close {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all .13s;
}
.confirm-close:hover { background: #e2e8f0; color: #334155; }
.confirm-body     { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }

.confirm-warning {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: #fffbeb;
  border: 1.5px solid #fde68a;
  border-radius: 12px;
  padding: 14px 16px;
}
.cw-icon  { font-size: 18px; flex-shrink: 0; line-height: 1.3; }
.cw-title { font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 3px; }
.cw-sub   { font-size: 12px; color: #a16207; line-height: 1.55; }

.confirm-summary { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
.cs-label   { font-size: 10px; font-weight: 700; letter-spacing: .7px; text-transform: uppercase; color: #94a3b8; padding: 10px 16px 8px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
.cs-row     { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; }
.cs-row-col { flex-direction: column; align-items: flex-start; gap: 4px; }
.cs-divider { height: 1px; background: #f8fafc; margin: 0 16px; }
.cs-key     { font-size: 13px; color: #94a3b8; }
.cs-val     { font-size: 13px; color: #0f172a; }
.cs-bold    { font-weight: 700; }
.cs-pos     { font-size: 13px; font-weight: 600; color: #4f46e5; }

.confirm-question { font-size: 13px; color: #64748b; text-align: center; }

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  background: rgba(238,242,255,.6);
}
.btn-goback {
  background: #fff;
  border: 1.5px solid #e2e8f0;
  color: #475569;
  border-radius: 10px;
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .13s;
}
.btn-goback:hover { background: #f8fafc; border-color: #cbd5e1; }
.btn-yes {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 9px 22px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all .14s;
  box-shadow: 0 2px 10px rgba(99,102,241,.28);
}
.btn-yes:hover    { background: linear-gradient(135deg, #818cf8, #6366f1); box-shadow: 0 4px 18px rgba(99,102,241,.4); }
.btn-yes:disabled { background: #c7d2fe; cursor: not-allowed; box-shadow: none; }

/* ── Privacy Modal ── */
.privacy-body    { padding: 24px 28px; overflow-y: auto; max-height: calc(90vh - 70px); }
.privacy-seal    { text-align: center; margin-bottom: 10px; }
.privacy-h2      { text-align: center; font-size: 17px; font-weight: 800; color: #1e293b; margin: 0 0 10px; }
.privacy-intro   { font-size: 13px; color: #475569; line-height: 1.7; margin: 0 0 18px; text-align: center; }
.privacy-section { margin-bottom: 16px; }
.privacy-section-title {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: #4f46e5;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.privacy-section-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 13px;
  background: #6366f1;
  border-radius: 2px;
  flex-shrink: 0;
}
.privacy-text    { font-size: 13px; color: #475569; line-height: 1.65; margin: 0 0 6px; }
.privacy-list    { margin: 0; padding-left: 20px; }
.privacy-list li { font-size: 12.5px; color: #475569; line-height: 1.7; }

.privacy-agree-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #eff6ff;
  border: 1.5px solid #bfdbfe;
  border-radius: 12px;
  padding: 14px 16px;
  margin: 20px 0 0;
  cursor: pointer;
}
.privacy-chk     { width: 16px; height: 16px; accent-color: #4f46e5; flex-shrink: 0; margin-top: 2px; cursor: pointer; }
.privacy-agree-lbl { font-size: 12.5px; color: #1e40af; line-height: 1.6; }

.privacy-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}
</style>
