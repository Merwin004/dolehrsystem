<template>
  <div>
    <div class="page-hdr">
      <h1 class="page-title">Add Plantilla Position</h1>
      <p class="page-sub">Fill in the vacancy announcement details below.</p>
    </div>

    <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>
    <div v-if="errorMsg"   class="alert alert-error">{{ errorMsg }}</div>

    <!-- Quick Fill -->
    <div class="card" style="margin-bottom:16px">
      <div class="qf-label">Quick Fill — Search Position</div>
      <div class="qf-wrap" ref="qfWrap">
        <input
          v-model="qfSearch"
          class="form-input"
          placeholder="Type a position name (e.g. Clerk, Administrative Officer…)"
          autocomplete="off"
          @focus="showDropdown = true"
          @input="showDropdown = true"
        />
        <ul v-if="showDropdown && qfResults.length" class="qf-dropdown">
          <li
            v-for="t in qfResults"
            :key="t.position"
            class="qf-item"
            @mousedown.prevent="applyTemplate(t)"
          >
            <span class="qf-pos">{{ t.position }}</span>
            <span class="qf-meta">SG-{{ t.sg }} · ₱{{ t.salary.toLocaleString() }}</span>
          </li>
        </ul>
        <div v-else-if="showDropdown && qfSearch.length >= 2 && !qfResults.length" class="qf-empty">
          No match found.
        </div>
      </div>
    </div>

    <div class="card">
      <form @submit.prevent novalidate>

        <!-- Row 1: Position Title | Plantilla Item No. -->
        <div class="form-grid">
          <div class="form-group">
            <label class="flabel">Position Title <span class="req">*</span></label>
            <input v-model="form.position" class="form-input" />
          </div>
          <div class="form-group">
            <label class="flabel">Plantilla Item No. <span class="req">*</span></label>
            <input v-model="form.plantilla_item" class="form-input" />
          </div>
        </div>

        <!-- Row 2: Salary Grade | Monthly Salary -->
        <div class="form-grid">
          <div class="form-group">
            <label class="flabel">Salary Grade</label>
            <select v-model="form.salary_grade" class="form-select">
              <option value="">Select SG</option>
              <option v-for="n in 33" :key="n" :value="n">SG-{{ n }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="flabel">Monthly Salary</label>
            <input v-model="form.monthly_salary" class="form-input" />
          </div>
        </div>

        <!-- Row 3: Office -->
        <div class="form-group">
          <label class="flabel">Office <span class="req">*</span></label>
          <select v-model="form.department" class="form-select">
            <option value="">Select Office</option>
            <option>Administrative Service (AS)</option>
            <option>Financial and Management Service (FMS)</option>
            <option>Internal Audit Service (IAS)</option>
            <option>Information and Publication Service (IPS)</option>
            <option>Human Resource Development Service (HRDS)</option>
            <option>Legal Service (LS)</option>
            <option>Planning Service (PS)</option>
          </select>
        </div>

        <!-- Qualifications -->
        <div class="form-group">
          <label class="flabel">Education</label>
          <textarea v-model="form.education" class="form-textarea" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label class="flabel">Training</label>
          <textarea v-model="form.training" class="form-textarea" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label class="flabel">Experience</label>
          <textarea v-model="form.experience" class="form-textarea" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label class="flabel">Eligibility</label>
          <textarea v-model="form.eligibility" class="form-textarea" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label class="flabel">Competency</label>
          <textarea v-model="form.competency" class="form-textarea" rows="2"></textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" @click="resetForm">Clear Form</button>
          <button type="button" class="btn btn-primary" @click="confirmSave">
            Save Position
          </button>
        </div>

      </form>
    </div>

    <!-- Confirm Modal -->
    <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <h3>Confirm Publication</h3>
          <button class="modal-close" @click="showConfirm = false">✕</button>
        </div>
        <div class="modal-body" style="text-align:center;padding:32px 24px">
          <div class="confirm-icon">📋</div>
          <p class="confirm-title">Save this publication?</p>
          <p class="confirm-sub">
            This will add <strong>{{ form.position || 'this position' }}</strong>
            to the For Publications list under
            <strong>{{ form.department || 'the selected office' }}</strong>.
          </p>
        </div>
        <div class="modal-footer" style="justify-content:center;gap:12px">
          <button class="btn btn-primary" :disabled="saving" @click="handleSubmit">
            <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
            Yes, Save It
          </button>
          <button class="btn btn-outline" @click="showConfirm = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import api from '../../api'

// ── Salary grade → monthly salary (SSL V / 2024 schedule, Step 1) ─────────
const SG_SALARY = {
  1:13012, 2:13740, 3:14514, 4:15339, 5:16218,
  6:17159, 7:18139, 8:19179, 9:20278, 10:21441,
  11:22700, 12:24007, 13:25439, 14:26959, 15:28559,
  16:30867, 17:33470, 18:36619, 19:40208, 20:44573,
  21:49835, 22:55901, 23:62449, 24:70016, 25:78455,
  26:87932, 27:98507, 28:110399, 29:123628, 30:138461,
  31:155100, 32:173811, 33:194684,
}

// ── Position templates (A–Z) ─────────────────────────────────────────────
const POSITIONS = [
  { position: 'Accountant I',                                     sg: 14 },
  { position: 'Accountant II',                                    sg: 16 },
  { position: 'Accountant III',                                   sg: 19 },
  { position: 'Accountant IV',                                    sg: 22 },
  { position: 'Administrative Aide I',                            sg: 1  },
  { position: 'Administrative Aide II',                           sg: 2  },
  { position: 'Administrative Aide III',                          sg: 3  },
  { position: 'Administrative Aide IV',                           sg: 4  },
  { position: 'Administrative Aide V',                            sg: 5  },
  { position: 'Administrative Aide VI',                           sg: 6  },
  { position: 'Administrative Assistant I',                       sg: 7  },
  { position: 'Administrative Assistant II',                      sg: 8  },
  { position: 'Administrative Assistant III',                     sg: 9  },
  { position: 'Administrative Officer I',                         sg: 11 },
  { position: 'Administrative Officer II',                        sg: 15 },
  { position: 'Administrative Officer III',                       sg: 18 },
  { position: 'Administrative Officer IV',                        sg: 22 },
  { position: 'Administrative Officer V',                         sg: 24 },
  { position: 'Attorney I',                                       sg: 16 },
  { position: 'Attorney II',                                      sg: 19 },
  { position: 'Attorney III',                                     sg: 21 },
  { position: 'Attorney IV',                                      sg: 23 },
  { position: 'Attorney V',                                       sg: 25 },
  { position: 'Attorney VI',                                      sg: 27 },
  { position: 'Audit Examiner I',                                 sg: 11 },
  { position: 'Audit Examiner II',                                sg: 15 },
  { position: 'Audit Examiner III',                               sg: 18 },
  { position: 'Bookbinder I',                                     sg: 3  },
  { position: 'Bookbinder II',                                    sg: 6  },
  { position: 'Budget Officer I',                                 sg: 11 },
  { position: 'Budget Officer II',                                sg: 15 },
  { position: 'Budget Officer III',                               sg: 18 },
  { position: 'Budget Officer IV',                                sg: 22 },
  { position: 'Carpenter I',                                      sg: 4  },
  { position: 'Carpenter II',                                     sg: 6  },
  { position: 'Cashier I',                                        sg: 8  },
  { position: 'Cashier II',                                       sg: 11 },
  { position: 'Cashier III',                                      sg: 14 },
  { position: 'Chief Administrative Officer',                     sg: 24 },
  { position: 'Chief Labor and Employment Officer',               sg: 24 },
  { position: 'Clerk I',                                          sg: 3  },
  { position: 'Clerk II',                                         sg: 5  },
  { position: 'Clerk III',                                        sg: 6  },
  { position: 'Clerk IV',                                         sg: 8  },
  { position: 'Communication Equipment Operator I',               sg: 4  },
  { position: 'Communication Equipment Operator II',              sg: 6  },
  { position: 'Computer Maintenance Technologist I',              sg: 8  },
  { position: 'Computer Maintenance Technologist II',             sg: 11 },
  { position: 'Computer Operator I',                              sg: 7  },
  { position: 'Computer Operator II',                             sg: 9  },
  { position: 'Computer Operator III',                            sg: 11 },
  { position: 'Data Controller I',                                sg: 7  },
  { position: 'Data Controller II',                               sg: 9  },
  { position: 'Data Entry Machine Operator I',                    sg: 5  },
  { position: 'Data Entry Machine Operator II',                   sg: 7  },
  { position: 'Dentist I',                                        sg: 16 },
  { position: 'Dentist II',                                       sg: 19 },
  { position: 'Deputy Director',                                  sg: 26 },
  { position: 'Director II',                                      sg: 25 },
  { position: 'Director III',                                     sg: 27 },
  { position: 'Director IV',                                      sg: 28 },
  { position: 'Driver I',                                         sg: 3  },
  { position: 'Driver II',                                        sg: 5  },
  { position: 'Economic Development Specialist I',                sg: 11 },
  { position: 'Economic Development Specialist II',               sg: 15 },
  { position: 'Economic Development Specialist III',              sg: 18 },
  { position: 'Economist I',                                      sg: 12 },
  { position: 'Economist II',                                     sg: 16 },
  { position: 'Economist III',                                    sg: 19 },
  { position: 'Education Program Specialist I',                   sg: 11 },
  { position: 'Education Program Specialist II',                  sg: 15 },
  { position: 'Electrician I',                                    sg: 4  },
  { position: 'Electrician II',                                   sg: 6  },
  { position: 'Employment Service Specialist I',                  sg: 11 },
  { position: 'Employment Service Specialist II',                 sg: 15 },
  { position: 'Engineer I',                                       sg: 12 },
  { position: 'Engineer II',                                      sg: 16 },
  { position: 'Engineer III',                                     sg: 19 },
  { position: 'Executive Assistant I',                            sg: 8  },
  { position: 'Executive Assistant II',                           sg: 11 },
  { position: 'Executive Assistant III',                          sg: 14 },
  { position: 'Finance Officer I',                                sg: 11 },
  { position: 'Finance Officer II',                               sg: 15 },
  { position: 'Finance Officer III',                              sg: 18 },
  { position: 'General Services Officer',                         sg: 18 },
  { position: 'Graphic Artist I',                                 sg: 8  },
  { position: 'Graphic Artist II',                                sg: 11 },
  { position: 'Guidance Counselor I',                             sg: 12 },
  { position: 'Guidance Counselor II',                            sg: 16 },
  { position: 'Human Resource Management Officer I',              sg: 11 },
  { position: 'Human Resource Management Officer II',             sg: 15 },
  { position: 'Human Resource Management Officer III',            sg: 18 },
  { position: 'Human Resource Management Officer IV',             sg: 22 },
  { position: 'Information Officer I',                            sg: 11 },
  { position: 'Information Officer II',                           sg: 15 },
  { position: 'Information Officer III',                          sg: 18 },
  { position: 'Information Officer IV',                           sg: 22 },
  { position: 'Information Systems Analyst I',                    sg: 11 },
  { position: 'Information Systems Analyst II',                   sg: 15 },
  { position: 'Information Systems Analyst III',                  sg: 19 },
  { position: 'Information Technology Officer I',                 sg: 11 },
  { position: 'Information Technology Officer II',                sg: 19 },
  { position: 'Internal Auditor I',                               sg: 11 },
  { position: 'Internal Auditor II',                              sg: 15 },
  { position: 'Internal Auditor III',                             sg: 18 },
  { position: 'Internal Auditor IV',                              sg: 22 },
  { position: 'Janitor',                                          sg: 1  },
  { position: 'Labor and Employment Officer I',                   sg: 11 },
  { position: 'Labor and Employment Officer II',                  sg: 15 },
  { position: 'Labor and Employment Officer III',                 sg: 18 },
  { position: 'Labor and Employment Officer IV',                  sg: 22 },
  { position: 'Labor Arbiter',                                    sg: 25 },
  { position: 'Legal Officer I',                                  sg: 11 },
  { position: 'Legal Officer II',                                 sg: 15 },
  { position: 'Legal Officer III',                                sg: 18 },
  { position: 'Legal Officer IV',                                 sg: 22 },
  { position: 'Librarian I',                                      sg: 12 },
  { position: 'Librarian II',                                     sg: 16 },
  { position: 'Librarian III',                                    sg: 19 },
  { position: 'Machinist I',                                      sg: 4  },
  { position: 'Machinist II',                                     sg: 6  },
  { position: 'Mechanic I',                                       sg: 4  },
  { position: 'Mechanic II',                                      sg: 6  },
  { position: 'Medical Officer I',                                sg: 16 },
  { position: 'Medical Officer II',                               sg: 19 },
  { position: 'Medical Officer III',                              sg: 22 },
  { position: 'Medical Technologist I',                           sg: 12 },
  { position: 'Medical Technologist II',                          sg: 15 },
  { position: 'Messenger',                                        sg: 3  },
  { position: 'Nurse I',                                          sg: 11 },
  { position: 'Nurse II',                                         sg: 15 },
  { position: 'Nutritionist-Dietitian I',                         sg: 11 },
  { position: 'Nutritionist-Dietitian II',                        sg: 15 },
  { position: 'Occupational Safety and Health Officer I',         sg: 11 },
  { position: 'Occupational Safety and Health Officer II',        sg: 15 },
  { position: 'Painter',                                          sg: 4  },
  { position: 'Personnel Officer I',                              sg: 11 },
  { position: 'Personnel Officer II',                             sg: 15 },
  { position: 'Personnel Officer III',                            sg: 18 },
  { position: 'Physical Therapist I',                             sg: 12 },
  { position: 'Planner I',                                        sg: 11 },
  { position: 'Planner II',                                       sg: 15 },
  { position: 'Planner III',                                      sg: 18 },
  { position: 'Planning Officer I',                               sg: 11 },
  { position: 'Planning Officer II',                              sg: 15 },
  { position: 'Planning Officer III',                             sg: 18 },
  { position: 'Printing Machine Operator I',                      sg: 4  },
  { position: 'Printing Machine Operator II',                     sg: 6  },
  { position: 'Procurement Management Officer I',                 sg: 11 },
  { position: 'Procurement Management Officer II',                sg: 15 },
  { position: 'Procurement Management Officer III',               sg: 18 },
  { position: 'Programmer I',                                     sg: 11 },
  { position: 'Programmer II',                                    sg: 15 },
  { position: 'Programmer III',                                   sg: 19 },
  { position: 'Project Development Officer I',                    sg: 11 },
  { position: 'Project Development Officer II',                   sg: 15 },
  { position: 'Project Development Officer III',                  sg: 18 },
  { position: 'Public Information Officer I',                     sg: 11 },
  { position: 'Public Information Officer II',                    sg: 15 },
  { position: 'Records Management Analyst I',                     sg: 8  },
  { position: 'Records Management Analyst II',                    sg: 11 },
  { position: 'Records Officer I',                                sg: 8  },
  { position: 'Records Officer II',                               sg: 11 },
  { position: 'Records Officer III',                              sg: 15 },
  { position: 'Regional Director',                                sg: 28 },
  { position: 'Research Analyst I',                               sg: 8  },
  { position: 'Research Analyst II',                              sg: 11 },
  { position: 'Research Analyst III',                             sg: 15 },
  { position: 'Research Specialist I',                            sg: 11 },
  { position: 'Research Specialist II',                           sg: 15 },
  { position: 'Security Guard I',                                 sg: 4  },
  { position: 'Security Guard II',                                sg: 6  },
  { position: 'Senior Administrative Assistant',                  sg: 10 },
  { position: 'Senior Labor and Employment Officer',              sg: 22 },
  { position: 'Social Welfare Officer I',                         sg: 11 },
  { position: 'Social Welfare Officer II',                        sg: 15 },
  { position: 'Social Worker I',                                  sg: 11 },
  { position: 'Social Worker II',                                 sg: 15 },
  { position: 'Statistician I',                                   sg: 11 },
  { position: 'Statistician II',                                  sg: 15 },
  { position: 'Statistician III',                                 sg: 18 },
  { position: 'Stenographer I',                                   sg: 6  },
  { position: 'Stenographer II',                                  sg: 8  },
  { position: 'Stenographer III',                                 sg: 10 },
  { position: 'Supply Officer I',                                 sg: 8  },
  { position: 'Supply Officer II',                                sg: 11 },
  { position: 'Supply Officer III',                               sg: 14 },
  { position: 'Systems Analyst I',                                sg: 11 },
  { position: 'Systems Analyst II',                               sg: 15 },
  { position: 'Systems Analyst III',                              sg: 19 },
  { position: 'Technical Assistant I',                            sg: 8  },
  { position: 'Technical Assistant II',                           sg: 11 },
  { position: 'Telecommunications Control Operator I',            sg: 6  },
  { position: 'Telecommunications Control Operator II',           sg: 8  },
  { position: 'Translator I',                                     sg: 10 },
  { position: 'Translator II',                                    sg: 14 },
  { position: 'Typist I',                                         sg: 4  },
  { position: 'Typist II',                                        sg: 6  },
  { position: 'Utility II',                                       sg: 2  },
  { position: 'Utility Worker I',                                 sg: 1  },
  { position: 'Utility Worker II',                                sg: 2  },
  { position: 'Veterinarian I',                                   sg: 12 },
  { position: 'Veterinarian II',                                  sg: 16 },
  { position: 'Vocational Instruction Supervisor I',              sg: 15 },
  { position: 'Vocational Instruction Supervisor II',             sg: 18 },
  { position: 'Welder I',                                         sg: 4  },
  { position: 'Welder II',                                        sg: 6  },
].map(t => ({ ...t, salary: SG_SALARY[t.sg] || 0 }))

// ── Quick Fill state ──────────────────────────────────────────────────────
const qfSearch        = ref('')
const showDropdown    = ref(false)
const qfWrap          = ref(null)
const existingItems   = ref([])   // plantilla_item values already in DB

const qfResults = computed(() => {
  const q = qfSearch.value.trim().toLowerCase()
  if (q.length < 1) return []
  return POSITIONS.filter(t => t.position.toLowerCase().includes(q)).slice(0, 10)
})

function generatePlantillaNo(position) {
  const prefix = position.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
  const pattern = new RegExp(`^${prefix}-DOLE-(\\d{3})$`, 'i')
  const used = existingItems.value
    .map(item => { const m = item?.match(pattern); return m ? parseInt(m[1], 10) : null })
    .filter(n => n !== null)
  let next = 1
  while (used.includes(next)) next++
  return `${prefix}-DOLE-${String(next).padStart(3, '0')}`
}

function applyTemplate(t) {
  form.value.position       = t.position
  form.value.salary_grade   = t.sg
  form.value.monthly_salary = `₱${t.salary.toLocaleString()}`
  form.value.plantilla_item = generatePlantillaNo(t.position)
  qfSearch.value     = ''
  showDropdown.value = false
}

function handleOutsideClick(e) {
  if (qfWrap.value && !qfWrap.value.contains(e.target)) showDropdown.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
  api.get('/publications').then(r => {
    existingItems.value = r.data.map(p => p.plantilla_item).filter(Boolean)
  }).catch(() => {})
})
onBeforeUnmount(() => document.removeEventListener('mousedown', handleOutsideClick))

// ── Form ─────────────────────────────────────────────────────────────────
const defaultForm = () => ({
  position: '', plantilla_item: '', salary_grade: '', monthly_salary: '',
  department: '',
  education: '', training: '', experience: '', eligibility: '', competency: ''
})

const form        = ref(defaultForm())
const saving      = ref(false)
const successMsg  = ref('')
const errorMsg    = ref('')
const showConfirm = ref(false)

function confirmSave() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!form.value.position.trim()) {
    errorMsg.value = 'Position Title is required.'; return
  }
  if (!form.value.plantilla_item.trim()) {
    errorMsg.value = 'Plantilla Item No. is required.'; return
  }
  if (!form.value.department) {
    errorMsg.value = 'Office is required.'; return
  }

  showConfirm.value = true
}

async function handleSubmit() {
  saving.value = true
  try {
    const saved = form.value.plantilla_item
    await api.post('/publications', { ...form.value, status: 'for_publication' })
    if (saved) existingItems.value.push(saved)
    showConfirm.value = false
    successMsg.value = 'Publication saved successfully.'
    resetForm()
  } catch (e) {
    errorMsg.value = e.response?.data?.message || 'Failed to save. Make sure the backend server is running.'
  } finally {
    saving.value = false
  }
}

function resetForm() { form.value = defaultForm() }
</script>

<style scoped>
/* ── Quick Fill ── */
.qf-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 8px;
}

.qf-wrap { position: relative; }

.qf-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  background: var(--white);
  border: 1.5px solid var(--primary);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  z-index: 200;
  max-height: 280px;
  overflow-y: auto;
  list-style: none;
  padding: 4px 0;
}

.qf-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  transition: background .12s;
  gap: 12px;
}
.qf-item:hover { background: var(--primary-light); }

.qf-pos  { font-size: 13px; font-weight: 600; color: var(--text-1); }
.qf-meta { font-size: 12px; color: var(--text-3); white-space: nowrap; }

.qf-empty {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--text-3);
}

/* ── Form ── */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.flabel {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 5px;
}

.req { color: #e53e3e; }

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.confirm-icon  { font-size: 48px; margin-bottom: 12px; }
.confirm-title { font-size: 17px; font-weight: 700; color: var(--text-1); margin-bottom: 8px; }
.confirm-sub   { font-size: 13px; color: var(--text-2); line-height: 1.6; }
</style>
