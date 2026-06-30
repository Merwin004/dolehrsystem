<template>
  <div>
    <div class="page-hdr" style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div>
        <h1 class="page-title">For Publication</h1>
        <p class="page-sub">Positions queued for release, grouped by office.</p>
      </div>
      <Transition name="toast">
        <div v-if="msg" class="inline-toast" :class="msgType === 'ok' ? 'inline-toast-ok' : 'inline-toast-err'">
          <svg v-if="msgType === 'ok'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ msg }}
        </div>
      </Transition>
    </div>

    <!-- Floating action button — lower right -->
    <button class="fab-csc" @click="openCSCModal" :disabled="pubs.length === 0" title="Generate CSC Form No. 9">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:22px;height:22px;flex-shrink:0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
      <span>Generate CSC Form No. 9</span>
    </button>

    <div v-if="loading" class="loading-wrap"><div class="spinner"></div> Loading…</div>

    <div v-else class="fp-layout">
      <!-- Left: Department list -->
      <div class="dept-sidebar">
        <div
          v-for="dept in departments"
          :key="dept.key"
          class="dept-item"
          :class="{ active: activeDept === dept.key }"
          @click="activeDept = dept.key"
        >
          <span class="dept-label">{{ dept.label }}</span>
        </div>
      </div>

      <!-- Right: Position table -->
      <div class="dept-content">
        <div v-if="activePubs.length === 0" class="empty-state" style="padding:52px 24px">
          <div class="empty-icon">📋</div>
          <h3>No positions</h3>
          <p>No positions assigned to this office yet.</p>
        </div>

        <template v-else>
          <div class="content-header">
            <span class="content-dept-name">{{ activeDept }}</span>
            <span class="content-count">{{ activePubs.length }}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:48px">#</th>
                <th>Position Title</th>
                <th>Plantilla Item No.</th>
                <th>Status</th>
                <th>Days Not Published</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in activePubs" :key="p.id">
                <td>
                  <span class="row-num">{{ i + 1 }}</span>
                </td>
                <td>
                  <span class="pos-title" @click="openDetail(p)">{{ p.position }}</span>
                </td>
                <td>
                  <span class="plantilla-chip">{{ p.plantilla_item || '—' }}</span>
                </td>
                <td>
                  <span class="pub-status-badge" :class="`pst-${p.pub_status || 'draft'}`">
                    {{ pubStatusLabel(p.pub_status) }}
                  </span>
                </td>
                <td>
                  <span v-if="p.pub_status === 'active'" class="days-active">
                    <span class="active-dot"></span> Active
                  </span>
                  <span v-else class="days-badge">Day {{ daysSince(p.updated_at || p.created_at) }}</span>
                </td>
                <td>
                  <button
                    class="action-btn"
                    :class="{ 'action-btn-disabled': p.pub_status !== 'for_csc_approval' }"
                    :disabled="p.pub_status !== 'for_csc_approval'"
                    @click="publishPosition(p)"
                  >Publish</button>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="selected" class="modal-overlay" @click.self="selected = null">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ selected.position }}</h3>
          <button class="modal-close" @click="selected = null">✕</button>
        </div>
        <div class="modal-body"><DetailBlock :pub="selected" /></div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="changeStatus(selected, 'in_production'); selected = null">Start Production</button>
          <button class="btn btn-outline" @click="selected = null">Close</button>
        </div>
      </div>
    </div>

    <!-- ── CSC Form No. 9 Modal ── -->
    <div v-if="showCSCModal" class="modal-overlay csc-overlay" @click.self="showCSCModal = false">
      <div class="modal csc-modal">
        <div class="modal-header" style="border-bottom:1px solid var(--border)">
          <div>
            <h3 style="margin:0;font-size:17px">Generate CSC Form No. 9</h3>
            <p style="margin:2px 0 0;font-size:12px;color:var(--text-3)">Request for Publication of Vacant Positions · CS Form No. 9 Revised 2025</p>
          </div>
          <button class="modal-close" @click="showCSCModal = false">✕</button>
        </div>

        <div class="modal-body" style="padding:20px 24px;overflow-y:auto;max-height:calc(90vh - 140px)">
          <!-- Contact info fields -->
          <div class="csc-field-grid">
            <div class="form-group">
              <label class="form-label">Contact Name</label>
              <input v-model="cscForm.contactName" class="form-input" placeholder="e.g. BRENALYN A. PEJI" />
            </div>
            <div class="form-group">
              <label class="form-label">Position Title</label>
              <input v-model="cscForm.positionTitle" class="form-input" placeholder="e.g. DIRECTOR IV" />
            </div>
            <div class="form-group">
              <label class="form-label">Office Address</label>
              <input v-model="cscForm.officeAddress" class="form-input" placeholder="Office address" />
            </div>
            <div class="form-group">
              <label class="form-label">Contact Info</label>
              <input v-model="cscForm.contactInfo" class="form-input" placeholder="Phone / Email" />
            </div>
          </div>

          <!-- Position selection -->
          <div class="csc-pos-section">
            <div class="csc-pos-header">
              <span class="csc-section-label">SELECT POSITIONS</span>
              <div style="display:flex;gap:4px;align-items:center">
                <button class="link-btn" @click="toggleSelectAll(true)">Select All</button>
                <span style="color:var(--text-3);font-size:12px">|</span>
                <button class="link-btn" @click="toggleSelectAll(false)">Deselect All</button>
              </div>
            </div>

            <div class="csc-pos-list">
              <div v-for="p in cscPositions" :key="p.id" class="csc-pos-item" :class="{ 'csc-pos-checked': p.selected }">
                <div class="csc-pos-row">
                  <label class="csc-check-label">
                    <input type="checkbox" v-model="p.selected" class="csc-checkbox" />
                    <div>
                      <div class="csc-pos-name">{{ p.position }}</div>
                      <div class="csc-pos-info">
                        <span>PLANTILLA: {{ p.plantilla_item || '—' }}</span>
                        <span class="csc-pos-sg">SG-{{ p.salary_grade || '—' }}</span>
                        <span class="csc-pos-dept">{{ p.department }}</span>
                      </div>
                    </div>
                  </label>
                  <button class="edit-pos-btn" @click="openPosEdit(p.id)" title="Edit position details">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              </div>

              <div v-if="cscPositions.length === 0" class="empty-state" style="padding:24px">
                <p>No for-publication positions available.</p>
              </div>
            </div>

            <div class="csc-count">
              <span class="count-pill" :class="selectedCount > 0 ? 'count-pill-active' : ''">{{ selectedCount }}</span>
              position(s) selected
            </div>
          </div>
        </div>

        <div class="modal-footer" style="border-top:1px solid var(--border)">
          <button class="btn btn-outline" @click="showCSCModal = false">Cancel</button>
          <div style="margin-left:auto;display:flex;gap:8px">
            <button class="btn btn-outline" @click="previewCSCPdf" :disabled="selectedCount === 0" style="display:flex;align-items:center;gap:5px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View
            </button>
            <button class="btn btn-primary" @click="downloadCSCPdf" :disabled="selectedCount === 0 || cscSaving" style="display:flex;align-items:center;gap:5px">
              <svg v-if="!cscSaving" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <div v-else class="spinner" style="width:14px;height:14px;border-width:2px"></div>
              {{ cscSaving ? 'Generating…' : 'Download PDF' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── CSC PDF Preview Panel ── -->
  <Teleport to="body">
  <div v-if="showCSCPreview" class="modal-overlay csc-preview-overlay" @click.self="showCSCPreview = false">
    <div class="csc-preview-panel">
      <div class="csc-preview-header">
        <div style="display:flex;align-items:center;gap:10px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;flex-shrink:0;color:var(--primary)">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <div>
            <div style="font-size:15px;font-weight:700;color:var(--text-1)">CSC Form No. 9 — Preview</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:1px">Request for Publication of Vacant Positions</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <a
            :href="cscPreviewUrl"
            download="CSCForm9_Preview.pdf"
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
          <button class="modal-close" @click="showCSCPreview = false">✕</button>
        </div>
      </div>
      <div class="csc-preview-body">
        <iframe :key="cscPreviewUrl" :src="cscPreviewUrl" class="csc-preview-iframe" frameborder="0"></iframe>
      </div>
    </div>
  </div>
  </Teleport>

  <!-- ── Publish Confirmation Modal ── -->
  <Teleport to="body">
  <div v-if="showPublishModal" class="modal-overlay pub-confirm-overlay" @click.self="showPublishModal = false">
    <div class="modal pub-confirm-modal">
      <div class="modal-header">
        <h3 style="font-size:17px;font-weight:700;margin:0">Publish Position(s)</h3>
        <button class="modal-close" @click="showPublishModal = false">✕</button>
      </div>

      <div class="modal-body pub-confirm-body">
        <!-- CSC Form ID -->
        <div class="pc-field-label">CSC Form ID</div>
        <div class="pc-field-value">{{ publishingGroup[0]?.csc_form_id || '—' }}</div>

        <!-- Positions list -->
        <div class="pc-field-label" style="margin-top:18px">
          {{ publishingGroup.length }} POSITION{{ publishingGroup.length !== 1 ? 'S' : '' }} WILL BE PUBLISHED
        </div>
        <div class="pc-pos-list">
          <div v-for="p in publishingGroup" :key="p.id" class="pc-pos-card">
            <div class="pc-pos-name">{{ p.position }}</div>
            <div class="pc-pos-meta">
              Plantilla: {{ p.plantilla_item || '—' }}
              <span class="pc-divider">|</span>
              SG-{{ p.salary_grade || '—' }}
            </div>
          </div>
        </div>

        <!-- File attachment -->
        <div class="pc-field-label" style="margin-top:18px">
          ATTACH FILE <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-3)">(applies to all positions above)</span>
        </div>
        <label class="pc-file-drop" :class="{ 'pc-file-has': attachFile }">
          <input type="file" class="pc-file-input" @change="onFileChange" />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;flex-shrink:0">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          <span class="pc-file-label">{{ attachFile ? attachFile.name : 'CLICK TO ATTACH FILE…' }}</span>
          <button v-if="attachFile" class="pc-file-clear" @click.prevent="attachFile = null">✕</button>
        </label>
      </div>

      <div class="modal-footer" style="justify-content:flex-end;gap:10px">
        <button class="btn btn-outline" @click="showPublishModal = false">Cancel</button>
        <button class="btn pc-publish-btn" :disabled="publishing" @click="confirmPublish">
          <svg v-if="!publishing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px"><polyline points="20 6 9 17 4 12"/></svg>
          <div v-else class="spinner" style="width:14px;height:14px;border-width:2px"></div>
          {{ publishing ? 'Publishing…' : 'Yes, Publish' }}
        </button>
      </div>
    </div>
  </div>
  </Teleport>

  <!-- ── Position Edit Popup ── -->
  <Teleport to="body">
  <div v-if="showPosEditModal" class="modal-overlay pos-edit-overlay" @click.self="closePosEdit">
    <div class="modal pos-edit-modal">
      <div class="modal-header">
        <h3 style="font-size:16px;margin:0">Edit Position Details</h3>
        <button class="modal-close" @click="closePosEdit">✕</button>
      </div>
      <div class="modal-body pos-edit-body">

        <!-- Basic Info -->
        <div class="edit-section-title">Basic Information</div>
        <div class="form-group">
          <label class="form-label form-label-sm">Position Title</label>
          <input v-model="posEditForm.position" class="form-input" placeholder="Position title" />
        </div>
        <div class="edit-grid-2">
          <div class="form-group">
            <label class="form-label form-label-sm">Plantilla Item No.</label>
            <input v-model="posEditForm.plantilla_item" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label form-label-sm">Salary Grade</label>
            <input v-model="posEditForm.salary_grade" class="form-input" placeholder="e.g. 19" />
          </div>
          <div class="form-group">
            <label class="form-label form-label-sm">Monthly Salary</label>
            <input v-model="posEditForm.monthly_salary" class="form-input" placeholder="e.g. 35000" />
          </div>
          <div class="form-group">
            <label class="form-label form-label-sm">Office</label>
            <select v-model="posEditForm.department" class="form-select">
              <option v-for="d in departments" :key="d.key" :value="d.key">{{ d.label }}</option>
            </select>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label form-label-sm">Closing Date / Expiration</label>
            <input v-model="posEditForm.closing_date" type="date" class="form-input" />
          </div>
        </div>

        <!-- Qualification Standards -->
        <div class="edit-section-title" style="margin-top:20px">Qualification Standards</div>
        <div class="edit-grid-2">
          <div class="form-group">
            <label class="form-label form-label-sm">Education</label>
            <input v-model="posEditForm.education" class="form-input" placeholder="Required education" />
          </div>
          <div class="form-group">
            <label class="form-label form-label-sm">Training</label>
            <input v-model="posEditForm.training" class="form-input" placeholder="Required training" />
          </div>
          <div class="form-group">
            <label class="form-label form-label-sm">Experience</label>
            <input v-model="posEditForm.experience" class="form-input" placeholder="Required experience" />
          </div>
          <div class="form-group">
            <label class="form-label form-label-sm">Eligibility</label>
            <input v-model="posEditForm.eligibility" class="form-input" placeholder="Required eligibility" />
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label form-label-sm">Competency / Area of Specialization</label>
            <input v-model="posEditForm.competency" class="form-input" placeholder="Competency or specialization" />
          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" @click="closePosEdit">Cancel</button>
        <button class="btn btn-primary" @click="savePosEdit">Save Changes</button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../../api'
import DetailBlock from './components/DetailBlock.vue'

const departments = [
  { key: 'Administrative Service (AS)',               label: 'Administrative Service (AS)' },
  { key: 'Financial and Management Service (FMS)',    label: 'Financial and Management Service (FMS)' },
  { key: 'Internal Audit Service (IAS)',              label: 'Internal Audit Service (IAS)' },
  { key: 'Information and Publication Service (IPS)',  label: 'Information and Publication Service (IPS)' },
  { key: 'Human Resource Development Service (HRDS)', label: 'Human Resource Development Service (HRDS)' },
  { key: 'Planning Service (PS)',                     label: 'Planning Service (PS)' },
  { key: 'Legal Service (LS)',                        label: 'Legal Service (LS)' },
]

const pubs       = ref([])
const loading    = ref(true)
const selected   = ref(null)
const msg        = ref('')
const msgType    = ref('ok')
const activeDept = ref('Administrative Service (AS)')

// ── Department default contact info ───────────────────────────────────────────
const DEPT_DEFAULTS = {
  'Administrative Service (AS)': {
    contactName:   'INA LOU B. FLOIRENDO',
    positionTitle: 'Director IV',
    officeAddress: '2nd Floor, Muralla Wing, DOLE Building, Intramuros, Manila',
    contactInfo:   '8527-3000 loc. 201 and 202; as@dole.gov.ph',
  },
  'Financial and Management Service (FMS)': {
    contactName:   'EDITHLIANE P. TADEO',
    positionTitle: 'OIC-Director',
    officeAddress: '4th Floor, General Luna Wing, DOLE Building, Intramuros, Manila',
    contactInfo:   '8527-3000 loc. 411, 412 / 8527-3495; fms@dole.gov.ph',
  },
  'Internal Audit Service (IAS)': {
    contactName:   'RODERICK D. ROLDAN',
    positionTitle: 'OIC, Director IV',
    officeAddress: '4th Floor, Muralla Wing, DOLE Building, Intramuros, Manila',
    contactInfo:   '8527-3000 loc. 455 / 8527-2115 / 8527-8119; ias@dole.gov.ph',
  },
  'Human Resource Development Service (HRDS)': {
    contactName:   'BRENALYN A. PEJI',
    positionTitle: 'Director IV',
    officeAddress: '5th Floor, Muralla Wing, DOLE Building, Intramuros, Manila',
    contactInfo:   '8527-3000 loc. 502; hrds@dole.gov.ph',
  },
  'Information and Publication Service (IPS)': {
    contactName:   'ROSALINDA P. PINEDA',
    positionTitle: 'Director IV',
    officeAddress: '5th Floor, General Luna Wing, DOLE Building, Intramuros, Manila',
    contactInfo:   '8527-3000 loc. 624 and 625; ips@dole.gov.ph',
  },
  'Planning Service (PS)': {
    contactName:   'NELIA M. MUNGCAL',
    positionTitle: 'OIC-Director Planning Service',
    officeAddress: '6th Floor DOLE Building, Intramuros, Manila',
    contactInfo:   '8527-3000 local 618; ps@dole.gov.ph',
  },
  'Legal Service (LS)': {
    contactName:   'ATTY. FLORENCE P. DAQUIOAG-BUAL',
    positionTitle: 'Director IV',
    officeAddress: '6th Floor, Muralla Wing, DOLE Building, Intramuros, Manila',
    contactInfo:   '8527-3000 loc. 610-611 / 5336-6660; ls@dole.gov.ph',
  },
}

// CSC Form state
const showCSCModal    = ref(false)
const cscForm         = ref({ contactName: '', positionTitle: '', officeAddress: '', contactInfo: '' })
const cscPositions    = ref([])
const posOverrides    = ref({})
const cscSaving       = ref(false)

// Position edit popup
const showPosEditModal = ref(false)
const editingPosId     = ref(null)
const posEditForm      = ref({})

// Publish modal
const showPublishModal = ref(false)
const publishingGroup  = ref([])   // all positions in the same CSC form batch
const attachFile       = ref(null)
const publishing       = ref(false)

// CSC PDF preview panel
const showCSCPreview = ref(false)
const cscPreviewUrl  = ref('')

const selectedCount = computed(() => cscPositions.value.filter(p => p.selected).length)

function byDept(key) {
  return pubs.value.filter(p => p.department === key)
}

const activePubs = computed(() => byDept(activeDept.value))

function daysSince(dateStr) {
  if (!dateStr) return 0
  const normalized = dateStr.includes('T') || dateStr.includes('+') ? dateStr : dateStr.replace(' ', 'T') + '+08:00'
  const diff = Date.now() - new Date(normalized).getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

onMounted(load)
async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/publications', { params: { status: 'for_publication' } })
    pubs.value = data
  } finally {
    loading.value = false
  }
}

async function changeStatus(p, status) {
  try {
    await api.patch(`/publications/${p.id}/status`, { status })
    flash(`Moved to "${status.replace('_', ' ')}".`, 'ok')
    load()
    if (selected.value?.id === p.id) selected.value = null
  } catch {
    flash('Failed to update status.', 'err')
  }
}

function openDetail(p) { selected.value = p }
function flash(t, type) { msg.value = t; msgType.value = type; setTimeout(() => msg.value = '', 3000) }

function pubStatusLabel(s) {
  return {
    draft:            'Vacant',
    for_csc_approval: 'For CSC Approval',
    active:           'In Process',
    expired:          'Expired',
    no_qualified:     'No Qualified',
  }[s] || 'Vacant'
}

function publishPosition(p) {
  // gather all positions in the same CSC form batch (same csc_form_id, for_csc_approval)
  const group = p.csc_form_id
    ? pubs.value.filter(x => x.csc_form_id === p.csc_form_id && x.pub_status === 'for_csc_approval')
    : [p]
  publishingGroup.value  = group
  attachFile.value       = null
  showPublishModal.value = true
}

function onFileChange(e) {
  attachFile.value = e.target.files[0] || null
}

async function confirmPublish() {
  publishing.value = true
  try {
    const fd = new FormData()
    fd.append('ids', JSON.stringify(publishingGroup.value.map(p => p.id)))
    if (attachFile.value) fd.append('attachment', attachFile.value)
    // Do NOT set Content-Type manually — browser must set it with the multipart boundary
    await api.post('/publications/publish-batch', fd)
    showPublishModal.value = false
    attachFile.value = null
    const n = publishingGroup.value.length
    flash(`${n} position${n > 1 ? 's' : ''} published successfully.`, 'ok')
    await load()
  } catch {
    flash('Failed to publish. Please try again.', 'err')
  } finally {
    publishing.value = false
  }
}

// ── CSC Modal ─────────────────────────────────────────────────────────────────
function openCSCModal() {
  cscPositions.value = pubs.value
    .filter(p => p.department === activeDept.value && (!p.pub_status || p.pub_status === 'draft' || p.pub_status === 'expired' || p.pub_status === 'no_qualified'))
    .map(p => ({ ...p, selected: true }))
  posOverrides.value = {}
  editingPosId.value = null
  const defaults = DEPT_DEFAULTS[activeDept.value] || {}
  cscForm.value = {
    contactName:   defaults.contactName   ?? '',
    positionTitle: defaults.positionTitle ?? '',
    officeAddress: defaults.officeAddress ?? '',
    contactInfo:   defaults.contactInfo   ?? '',
  }
  showCSCModal.value = true
}

function toggleSelectAll(val) {
  cscPositions.value.forEach(p => { p.selected = val })
}

function openPosEdit(id) {
  editingPosId.value = id
  const p  = cscPositions.value.find(x => x.id === id)
  const ov = posOverrides.value[id] || {}
  posEditForm.value = {
    position:            ov.position            ?? p.position            ?? '',
    plantilla_item:      ov.plantilla_item      ?? p.plantilla_item      ?? '',
    salary_grade:        ov.salary_grade        ?? p.salary_grade        ?? '',
    monthly_salary:      ov.monthly_salary      ?? p.monthly_salary      ?? '',
    department:          ov.department          ?? p.department          ?? '',
    closing_date:        ov.closing_date        ?? p.closing_date        ?? '',
    education:           ov.education           ?? p.education           ?? '',
    training:            ov.training            ?? p.training            ?? '',
    experience:          ov.experience          ?? p.experience           ?? '',
    eligibility:         ov.eligibility         ?? p.eligibility         ?? '',
    competency:          ov.competency          ?? p.competency          ?? '',
  }
  showPosEditModal.value = true
}

function closePosEdit() {
  showPosEditModal.value = false
  editingPosId.value = null
}

async function savePosEdit() {
  posOverrides.value[editingPosId.value] = { ...posEditForm.value }
  // Persist all edits (including qualifications) to DB
  try {
    const p = cscPositions.value.find(x => x.id === editingPosId.value)
    await api.put(`/publications/${editingPosId.value}`, {
      position:            posEditForm.value.position,
      plantilla_item:      posEditForm.value.plantilla_item,
      salary_grade:        posEditForm.value.salary_grade,
      monthly_salary:      posEditForm.value.monthly_salary,
      department:          posEditForm.value.department,
      place_of_assignment: p?.place_of_assignment || null,
      education:           posEditForm.value.education  || null,
      training:            posEditForm.value.training   || null,
      experience:          posEditForm.value.experience || null,
      eligibility:         posEditForm.value.eligibility || null,
      competency:          posEditForm.value.competency || null,
      status:              p?.status || 'for_publication',
    })
    await api.patch(`/publications/${editingPosId.value}/closing-date`, {
      closing_date: posEditForm.value.closing_date || null,
    })
  } catch { /* non-critical — posOverrides still work for PDF */ }
  closePosEdit()
}

function getPos(p) {
  const ov = posOverrides.value[p.id]
  return ov ? { ...p, ...ov } : p
}

// ── PDF generation ────────────────────────────────────────────────────────────
function buildCSCDoc() {
  const agencyName  = 'Department of Labor and Employment'
  const contactName = cscForm.value.contactName.trim()   || '(Name)'
  const posTitleVal = cscForm.value.positionTitle.trim() || '(Position Title)'
  const officeAddr  = cscForm.value.officeAddress.trim() || '(Office Address)'
  const contactInfo = cscForm.value.contactInfo.trim()   || 'mail@agency.gov.ph'
  const selected    = cscPositions.value.filter(p => p.selected).map(getPos)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [215.9, 330.2] })
  const W = 330, mL = 15, mR = 15, cW = W - mL - mR
  const sf = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size) }
  const mid = mL + cW / 2

  // Top-left label
  sf('normal', 6.5); doc.setTextColor(60, 60, 60)
  doc.text('CS Form No. 9', mL, 13)
  doc.text('Revised 2025',  mL, 16)

  // Top-right box
  doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.3)
  doc.rect(W - mR - 62, 10, 62, 8)
  sf('normal', 5.5); doc.setTextColor(40, 40, 40)
  doc.text('Electronic copy to be submitted to the CSC FO must\nbe in MS Excel format', W - mR - 31, 13, { align: 'center', maxWidth: 58 })

  // Center header
  doc.setTextColor(0, 0, 0)
  sf('normal', 7);      doc.text('Republic of the Philippines',                mid, 15, { align: 'center' })
  sf('bolditalic', 8);  doc.text(agencyName,                                   mid, 19, { align: 'center', maxWidth: cW })
  sf('bold', 7);        doc.text('Request for Publication of Vacant Positions', mid, 23, { align: 'center' })

  // To line + body text
  sf('normal', 7.5); doc.setTextColor(0, 0, 0)
  doc.text('To: CIVIL SERVICE COMMISSION (CSC)', mL, 30)
  sf('normal', 7)
  doc.text(`     We hereby request the publication in the CSC Job Portal of the following vacant positions, which are authorized to be filled at the ${agencyName.toUpperCase()}:`, mL, 35, { maxWidth: cW })

  // Signature block (right)
  const sigX = 210, sigEndX = W - mR, sigMid = (sigX + sigEndX) / 2
  doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.4)
  sf('bold', 7);   doc.text(contactName.toUpperCase(), sigMid, 42, { align: 'center' })
  doc.line(sigX, 43.5, sigEndX, 43.5)
  sf('normal', 7); doc.text(posTitleVal, sigMid, 47, { align: 'center' })
  doc.text('Date:', sigX, 55)
  doc.line(sigX + 12, 55, sigEndX, 55)

  // Table
  const rows = selected.map((p, i) => [
    i + 1,
    p.position || '',
    p.plantilla_item || '',
    p.salary_grade   || '',
    p.monthly_salary ? String(p.monthly_salary).replace(/[₱,]/g, '').trim() : '',
    p.education           || '',
    p.training            || '',
    p.experience          || '',
    p.eligibility         || '',
    p.competency || '',
    `DOLE-CENTRAL OFFICE\n${p.department || ''}`,
  ])

  autoTable(doc, {
    startY: 58,
    head: [
      [
        { content: 'No.',                                              rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Position Title\n(Parenthetical Title,\nif applicable)', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Plantilla Item\nNo.',                              rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Salary/\nJob/\nPay\nGrade',                       rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Monthly\nSalary',                                  rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Qualification Standards',                          colSpan: 5, styles: { halign: 'center' } },
        { content: 'Place of\nAssignment',                             rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      ],
      [
        { content: 'Education',              styles: { halign: 'center' } },
        { content: 'Training',               styles: { halign: 'center' } },
        { content: 'Experience',             styles: { halign: 'center' } },
        { content: 'Eligibility',            styles: { halign: 'center' } },
        { content: 'Competency / Area of\nSpecialization/\nResidency Requirement\n(if applicable)', styles: { halign: 'center' } },
      ],
    ],
    body: rows,
    theme: 'grid',
    styles:     { fontSize: 7, cellPadding: 1.2, valign: 'middle', lineColor: [0,0,0], lineWidth: 0.25, textColor: [0,0,0], overflow: 'linebreak' },
    headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontSize: 7, fontStyle: 'bold', lineColor: [0,0,0], lineWidth: 0.25 },
    bodyStyles: { minCellHeight: 7.5 },
    columnStyles: {
      0:  { cellWidth: 8,  halign: 'center' },
      1:  { cellWidth: 40 },
      2:  { cellWidth: 23, halign: 'center' },
      3:  { cellWidth: 15, halign: 'center' },
      4:  { cellWidth: 20, halign: 'right'  },
      5:  { cellWidth: 28 },
      6:  { cellWidth: 28 },
      7:  { cellWidth: 28 },
      8:  { cellWidth: 23 },
      9:  { cellWidth: 32 },
      10: { cellWidth: 55 },
    },
    margin: { left: mL, right: mR },
  })

  // Footer
  let y = doc.lastAutoTable.finalY + 8
  sf('normal', 7); doc.setTextColor(0, 0, 0)

  const introLine1 = 'Interested and qualified applicants should signify their interest in writing through an application letter addressed to the head of office.'
  const introLine2 = 'Applicants must attach the following documents to the application letter and send these to the address below not later than'
  const intro1Lines = doc.splitTextToSize(introLine1, cW)
  const intro2Lines = doc.splitTextToSize(introLine2, 210)
  doc.text(intro1Lines, mL, y)
  y += intro1Lines.length * 3.5
  doc.text(intro2Lines, mL, y)
  doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5)
  const _lastLine2  = intro2Lines[intro2Lines.length - 1]
  const _dateLineY  = y + (intro2Lines.length - 1) * 3.5
  const _dateLineX  = mL + doc.getTextWidth(_lastLine2) + 20
  doc.line(_dateLineX, _dateLineY, _dateLineX + 28, _dateLineY)
  y += intro2Lines.length * 3.5 + 3

  const item1a = '1. Fully accomplished Personal Data Sheet (PDS) with Work Experience Sheet and recent passport-sized or unfiltered digital picture (CS Form No. 212, Revised 2025); digitally signed or electronically signed;'
  sf('normal', 7)
  doc.text(item1a, mL + 4, y, { maxWidth: cW - 4 })
  y += doc.splitTextToSize(item1a, cW - 4).length * 3.5
  sf('bold', 7)
  doc.text('(PDS, WES, & Notarization shall be dated within the period of publication);', mL + 4, y, { maxWidth: cW - 4 })
  y += 5

  sf('normal', 7)
  doc.text('2. Hard copy or electronic copy of Performance rating in the last rating period (if applicable);', mL + 4, y, { maxWidth: cW - 4 }); y += 4
  doc.text('3. Hard copy or electronic copy of proof of eligibility/rating/license; and', mL + 4, y, { maxWidth: cW - 4 }); y += 4
  doc.text('4. Hard copy or electronic copy of Transcript of Records.', mL + 4, y, { maxWidth: cW - 4 }); y += 5

  sf('italic', 7)
  const pwd1 = 'This Office highly encourages all interested and qualified applicants to apply, which include persons with disability (PWD) and members of the indigenous\ncommunities, irrespective of sexual orientation and gender identities and/or expression, civil status, religion, and political affiliation.'
  doc.text(pwd1, mL, y, { maxWidth: cW })
  y += doc.splitTextToSize(pwd1, cW).length * 3.5 + 1.5
  const pwd2 = 'This Office does not discriminate in the selection of employees based on the aforementioned pursuant to Equal Opportunities for Employment Principle (EOP).'
  doc.text(pwd2, mL, y, { maxWidth: cW })
  y += doc.splitTextToSize(pwd2, cW).length * 3.5 + 4

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
  doc.text('QUALIFIED APPLICANTS', mL, y)
  const qaW = doc.getTextWidth('QUALIFIED APPLICANTS')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
  doc.text(' are advised to hand in or send through courier/email their application to the head of office/ human resource management office/records office, as the case may be:', mL + qaW, y, { maxWidth: cW - qaW })
  y += doc.splitTextToSize('are advised to hand in or send through courier/email their application to the head of office/ human resource management office/records office, as the case may be:', cW - qaW).length * 3.5 + 5

  // Address block
  const bx = mL + 4, bw = 130
  doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.4)
  sf('bold', 7.5);   doc.text(contactName.toUpperCase(), bx + bw / 2, y, { align: 'center', maxWidth: bw }); doc.line(bx, y + 1, bx + bw, y + 1); y += 6
  sf('normal', 8);   doc.text(posTitleVal,  bx + bw / 2, y, { align: 'center', maxWidth: bw }); doc.line(bx, y + 1, bx + bw, y + 1); y += 6
  doc.text(officeAddr,  bx + bw / 2, y, { align: 'center', maxWidth: bw }); doc.line(bx, y + 1, bx + bw, y + 1); y += 6
  doc.setTextColor(0, 0, 200); doc.text(contactInfo, bx + bw / 2, y, { align: 'center', maxWidth: bw }); doc.line(bx, y + 1, bx + bw, y + 1)

  y += 6; doc.setTextColor(0, 0, 0)
  sf('normal', 8); doc.text('APPLICATIONS WITH INCOMPLETE DOCUMENTS SHALL NOT BE ENTERTAINED.', mL, y)

  return doc
}

function previewCSCPdf() {
  if (selectedCount.value === 0) { flash('Please select at least one position.', 'err'); return }
  const doc = buildCSCDoc()
  // revoke previous blob to free memory
  if (cscPreviewUrl.value) URL.revokeObjectURL(cscPreviewUrl.value)
  cscPreviewUrl.value  = doc.output('bloburl')
  showCSCPreview.value = true
}

async function downloadCSCPdf() {
  if (selectedCount.value === 0) { flash('Please select at least one position.', 'err'); return }
  cscSaving.value = true
  try {
    const cscFormId = 'CSC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase()
    const ids = cscPositions.value.filter(p => p.selected).map(p => p.id)
    await api.post('/publications/csc-form', { ids, csc_form_id: cscFormId })
    const doc = buildCSCDoc()
    doc.save(`CSCForm9_${cscFormId}.pdf`)
    showCSCModal.value = false
    flash(`CSC Form generated (${cscFormId})`, 'ok')
    await load()
  } catch {
    flash('Failed to generate form. Please try again.', 'err')
  } finally {
    cscSaving.value = false
  }
}
</script>

<style scoped>
/* ── Floating action button ── */
.fab-csc {
  position: fixed;
  bottom: 32px;
  right: 36px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 22px;
  background: linear-gradient(135deg, #166534, #15803d);
  color: #fff;
  border: none;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 24px rgba(22,101,52,.45);
  transition: all .2s;
  white-space: nowrap;
}
.fab-csc:hover {
  background: linear-gradient(135deg, #14532d, #166534);
  box-shadow: 0 10px 32px rgba(22,101,52,.55);
  transform: translateY(-2px);
}
.fab-csc:active { transform: translateY(0); box-shadow: 0 4px 16px rgba(22,101,52,.4); }
.fab-csc:disabled {
  background: #d1d5db;
  color: #9ca3af;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

/* ── Page layout ── */
.fp-layout {
  display: flex;
  gap: 0;
  background: var(--white);
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,.07);
  overflow: hidden;
  min-height: 520px;
  border: 1px solid var(--border);
}

/* ── Left sidebar ── */
.dept-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  padding: 12px 8px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dept-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all .16s;
}
.dept-item:hover { background: #f0fdf4; }
.dept-item:hover .dept-label { color: #166534; }

.dept-item.active {
  background: #166534;
  box-shadow: 0 4px 14px rgba(22,101,52,.25);
}
.dept-item.active .dept-label { color: #fff; font-weight: 700; }
.dept-item.active .dept-badge { background: rgba(255,255,255,.22); color: #fff; }

.dept-label {
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.4;
  transition: color .14s;
}

.dept-badge {
  min-width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.badge-has   { background: #16a34a; color: #fff; }
.badge-empty { background: var(--border); color: var(--text-3); }

/* ── Right content ── */
.dept-content { flex: 1; overflow-x: auto; min-width: 0; }

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px 14px;
  border-bottom: 1px solid var(--border);
  background: #fff;
}
.content-dept-name {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-1);
  letter-spacing: -.2px;
}
.content-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 10px;
  border-radius: 20px;
  background: #166534;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

table { width: 100%; border-collapse: collapse; }
thead tr { background: #f8fafc; }
th {
  padding: 12px 20px; text-align: left;
  font-size: 11px; font-weight: 700; letter-spacing: .6px;
  color: #94a3b8; text-transform: uppercase;
  border-bottom: 1.5px solid var(--border);
}
td {
  padding: 14px 20px; font-size: 13.5px;
  border-bottom: 1px solid #f1f5f9;
  color: var(--text-1); vertical-align: middle;
}
tr:last-child td { border-bottom: none; }
tbody tr { transition: background .12s; }
tbody tr:hover td { background: #f0fdf4; }

.row-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 8px;
  font-size: 12px; font-weight: 700; color: var(--text-3);
  background: #f1f5f9;
}

.pos-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-1);
  cursor: pointer;
  transition: color .14s;
}
.pos-title:hover { color: #166534; }

.plantilla-chip {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 600;
}

.pub-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.pst-draft            { background: #f1f5f9; color: #64748b; }
.pst-for_csc_approval { background: #fef9c3; color: #854d0e; border: 1px solid #fde68a; }
.pst-active           { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
.pst-expired          { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.pst-no_qualified     { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }

.days-active {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #15803d;
}
.active-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #16a34a;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(22,163,74,.2);
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 3px rgba(22,163,74,.2); }
  50%       { box-shadow: 0 0 0 6px rgba(22,163,74,.08); }
}

.days-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 20px;
  background: #fef3c7;
  color: #92400e;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid #fde68a;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 18px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #166534, #15803d);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(22,101,52,.25);
}
.action-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #14532d, #166534);
  box-shadow: 0 4px 14px rgba(22,101,52,.35);
  transform: translateY(-1px);
}
.action-btn:active:not(:disabled) { transform: translateY(0); }
.action-btn:disabled,
.action-btn-disabled {
  background: #e2e8f0 !important;
  color: #94a3b8 !important;
  box-shadow: none !important;
  cursor: not-allowed;
  transform: none !important;
}

/* ── CSC Form Modal ── */
.csc-overlay { align-items: center; }

.csc-modal {
  width: 680px;
  max-width: calc(100vw - 32px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.csc-field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  margin-bottom: 20px;
}

.csc-pos-section { }

.csc-pos-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.csc-section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .6px;
  color: var(--text-2);
  text-transform: uppercase;
}

.link-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}
.link-btn:hover { text-decoration: underline; }

.csc-pos-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  max-height: 340px;
  overflow-y: auto;
}

.csc-pos-item {
  border-bottom: 1px solid var(--border-light);
}
.csc-pos-item:last-child { border-bottom: none; }
.csc-pos-item.csc-pos-checked { background: #F0F7FF; }

.csc-pos-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  gap: 8px;
}

.csc-check-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.csc-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 2px;
}

.csc-pos-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
  line-height: 1.3;
}

.csc-pos-info {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 2px;
  flex-wrap: wrap;
}
.csc-pos-info span { font-size: 11px; color: var(--text-3); }
.csc-pos-sg  { background: var(--primary-light); color: var(--primary) !important; padding: 1px 8px; border-radius: 10px; font-weight: 600 !important; }
.csc-pos-dept { background: var(--border); color: var(--text-2) !important; padding: 1px 8px; border-radius: 10px; }

.edit-pos-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 7px;
  cursor: pointer;
  color: var(--text-2);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: all .14s;
}
.edit-pos-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }


.form-label-sm {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-2);
  display: block;
  margin-bottom: 3px;
}

.form-input-sm {
  padding: 6px 10px;
  font-size: 12px;
}

.csc-count {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  background: var(--border);
  color: var(--text-2);
}
.count-pill-active {
  background: var(--primary);
  color: #fff;
}

/* ── CSC PDF Preview Panel ── */
.csc-preview-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 9997 !important;
  padding: 24px;
}
.csc-preview-panel {
  background: var(--white);
  border-radius: 14px;
  box-shadow: 0 24px 64px rgba(0,0,0,.25);
  width: 100%; max-width: 1100px;
  height: 90vh;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.csc-preview-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 12px;
}
.csc-preview-body { flex: 1; overflow: hidden; }
.csc-preview-iframe { width: 100%; height: 100%; border: none; display: block; }

/* ── Publish Confirm Modal ── */
.pub-confirm-overlay { z-index: 9998 !important; }
.pub-confirm-modal   { width: 480px; max-width: calc(100vw - 32px); }

.pub-confirm-body { padding: 24px; display: flex; flex-direction: column; gap: 0; }

.pc-field-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .6px; color: var(--text-3); margin-bottom: 6px;
}
.pc-field-value {
  font-size: 14px; font-weight: 500; color: var(--text-1);
  background: var(--bg); border-radius: 8px;
  padding: 10px 14px; border: 1px solid var(--border);
}
.pc-pos-list {
  display: flex; flex-direction: column; gap: 8px;
}
.pc-pos-card {
  border: 1.5px solid var(--border); border-radius: 10px;
  padding: 14px 16px; background: var(--white);
}
.pc-pos-name { font-size: 15px; font-weight: 700; color: var(--text-1); margin-bottom: 4px; }
.pc-pos-meta { font-size: 13px; color: var(--text-3); }
.pc-divider  { margin: 0 8px; }

.pc-file-drop {
  display: flex; align-items: center; gap: 10px;
  border: 2px dashed var(--border); border-radius: 10px;
  padding: 16px 18px; cursor: pointer; position: relative;
  transition: border-color .15s, background .15s;
}
.pc-file-drop:hover    { border-color: var(--primary); background: var(--primary-light); }
.pc-file-has           { border-color: #16a34a; background: #f0fdf4; }
.pc-file-input         { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
.pc-file-label         { font-size: 13px; font-weight: 600; color: var(--text-2); flex: 1; }
.pc-file-has .pc-file-label { color: #15803d; }
.pc-file-clear {
  position: relative; z-index: 2; background: none; border: none;
  color: var(--text-3); font-size: 14px; cursor: pointer; padding: 2px 6px;
  border-radius: 4px; flex-shrink: 0;
}
.pc-file-clear:hover { background: #fee2e2; color: #dc2626; }

.pc-publish-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: #16a34a; color: #fff; border: none;
  padding: 9px 22px; border-radius: 8px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: background .15s;
}
.pc-publish-btn:hover:not(:disabled) { background: #15803d; }
.pc-publish-btn:disabled { background: #94a3b8; cursor: not-allowed; }

/* ── Position Edit Popup ── */
.pos-edit-overlay { z-index: 9999 !important; }

.pos-edit-modal {
  width: 520px;
  max-width: calc(100vw - 32px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.pos-edit-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.edit-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--text-3);
  border-bottom: 1px solid var(--border);
  padding-bottom: 6px;
  margin-bottom: 14px;
}

.edit-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

/* ── Inline toast ── */
.inline-toast { display:inline-flex; align-items:center; gap:8px; padding:9px 18px; border-radius:10px; font-size:13px; font-weight:600; white-space:nowrap; align-self:center; }
.inline-toast-ok  { background:#dcfce7; color:#166534; border:1px solid #86efac; }
.inline-toast-err { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
.toast-enter-active { transition:opacity .18s ease, transform .18s ease; }
.toast-leave-active { transition:opacity .2s ease, transform .2s ease; }
.toast-enter-from   { opacity:0; transform:translateX(8px); }
.toast-leave-to     { opacity:0; transform:translateX(8px); }
</style>
