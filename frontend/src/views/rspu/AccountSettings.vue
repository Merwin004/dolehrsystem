<template>
  <div>
    <div class="page-hdr">
      <h1 class="page-title">Account Settings</h1>
      <p class="page-sub">Manage your profile information and photo.</p>
    </div>

    <div class="settings-grid">
      <!-- Profile picture -->
      <div class="card">
        <div class="section-title" style="margin-bottom:20px">Profile Photo</div>

        <div class="avatar-center">
          <div class="avatar-ring" @click="triggerPick">
            <img v-if="previewUrl" :src="previewUrl" class="avatar-img" alt="Profile photo" />
            <div v-else-if="auth.user?.avatar" class="avatar-img-wrap">
              <img :src="auth.user.avatar" class="avatar-img" alt="Profile photo" />
            </div>
            <div v-else class="avatar-initials-lg">{{ initials }}</div>
            <div class="avatar-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>Change Photo</span>
            </div>
          </div>
          <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFilePick" />

          <div class="avatar-name">{{ auth.user?.full_name || auth.user?.username }}</div>
          <div class="avatar-role-tag">{{ roleLabel }}</div>
        </div>

        <div v-if="avatarMsg" class="alert mt-12" :class="avatarOk ? 'alert-success' : 'alert-error'">{{ avatarMsg }}</div>

        <div v-if="pickedFile" class="pick-actions">
          <button class="btn btn-primary" @click="uploadAvatar" :disabled="uploadingAvatar">
            <span v-if="uploadingAvatar" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
            Save Photo
          </button>
          <button class="btn btn-outline" @click="cancelPick">Cancel</button>
        </div>

        <p class="avatar-hint">JPG, PNG or GIF · Max 2 MB</p>
      </div>

      <!-- Profile info -->
      <div class="card">
        <div class="section-title" style="margin-bottom:20px">Profile Information</div>

        <div v-if="profileMsg" class="alert" :class="profileOk ? 'alert-success' : 'alert-error'" style="margin-bottom:16px">{{ profileMsg }}</div>

        <form @submit.prevent="updateProfile">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input :value="auth.user?.username" class="form-input" disabled style="background:var(--bg);color:var(--text-3)" />
          </div>
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input v-model="profileForm.full_name" class="form-input" placeholder="Your full name" />
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input v-model="profileForm.email" class="form-input" type="email" placeholder="your@email.com" />
          </div>
          <button type="submit" class="btn btn-primary" :disabled="savingProfile">
            <span v-if="savingProfile" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
            Save Changes
          </button>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../../api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const profileForm = ref({
  full_name: auth.user?.full_name || '',
  email:     auth.user?.email     || ''
})

const fileInput      = ref(null)
const pickedFile     = ref(null)
const previewUrl     = ref('')
const uploadingAvatar = ref(false)
const avatarMsg      = ref('')
const avatarOk       = ref(true)

const savingProfile = ref(false)
const profileMsg    = ref('')
const profileOk     = ref(true)

const initials = computed(() => {
  const name = auth.user?.full_name || auth.user?.username || 'U'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
})

const roleLabel = computed(() => {
  if (auth.user?.role === 'rspu') return 'RSPU Administrator'
  if (auth.user?.role === 'hrmo') return `HRMO · ${auth.user?.department || ''}`
  return auth.user?.role?.toUpperCase() || ''
})


function triggerPick() { fileInput.value?.click() }

function onFilePick(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    avatarMsg.value = 'File too large. Maximum is 2 MB.'; avatarOk.value = false; return
  }
  pickedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  avatarMsg.value  = ''
}

function cancelPick() {
  pickedFile.value = null
  previewUrl.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function uploadAvatar() {
  if (!pickedFile.value) return
  uploadingAvatar.value = true
  avatarMsg.value = ''
  try {
    const fd = new FormData()
    fd.append('avatar', pickedFile.value)
    const { data } = await api.post('/auth/avatar', fd)
    auth.user.avatar = data.avatar
    localStorage.setItem('user', JSON.stringify(auth.user))
    cancelPick()
    avatarMsg.value = 'Profile photo updated.'
    avatarOk.value  = true
  } catch (e) {
    avatarMsg.value = e.response?.data?.message || 'Upload failed.'
    avatarOk.value  = false
  } finally { uploadingAvatar.value = false }
}

async function updateProfile() {
  savingProfile.value = true
  profileMsg.value = ''
  try {
    await api.put('/auth/profile', profileForm.value)
    auth.user.full_name = profileForm.value.full_name
    auth.user.email     = profileForm.value.email
    localStorage.setItem('user', JSON.stringify(auth.user))
    profileMsg.value = 'Profile updated successfully.'
    profileOk.value  = true
  } catch (e) {
    profileMsg.value = e.response?.data?.message || 'Failed to update profile.'
    profileOk.value  = false
  } finally { savingProfile.value = false }
}
</script>

<style scoped>
.settings-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px;
}

/* Avatar card */
.avatar-center { display:flex; flex-direction:column; align-items:center; gap:12px; padding:8px 0 4px; }

.avatar-ring {
  position:relative; width:110px; height:110px; border-radius:50%;
  cursor:pointer; overflow:hidden;
  border:3px solid var(--border); transition:border-color .15s;
}
.avatar-ring:hover { border-color:var(--primary); }

.avatar-img { width:100%; height:100%; object-fit:cover; display:block; }
.avatar-img-wrap { width:100%; height:100%; }

.avatar-initials-lg {
  width:100%; height:100%;
  background:linear-gradient(135deg,#4F86F7,#8B5CF6);
  display:flex; align-items:center; justify-content:center;
  font-size:32px; font-weight:800; color:#fff;
}

.avatar-overlay {
  position:absolute; inset:0; background:rgba(0,0,0,.45);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:4px; color:#fff; font-size:11px; font-weight:600;
  opacity:0; transition:opacity .15s;
}
.avatar-ring:hover .avatar-overlay { opacity:1; }

.avatar-name    { font-size:16px; font-weight:700; color:var(--text-1); text-align:center; }
.avatar-role-tag{ font-size:12px; color:var(--text-3); }
.avatar-hint    { font-size:11px; color:var(--text-3); text-align:center; margin-top:8px; }

.pick-actions { display:flex; gap:8px; justify-content:center; margin-top:12px; }

.mt-12 { margin-top:12px; }

</style>
