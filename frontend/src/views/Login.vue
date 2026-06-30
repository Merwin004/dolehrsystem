<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <div class="logo-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
      </div>
      <h1 class="login-title">HR Tracking System</h1>
      <p class="login-sub">Sign in to access your account</p>

      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="Enter your username"
            autocomplete="username"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <div style="position:relative">
            <input
              v-model="form.password"
              :type="showPw ? 'text' : 'password'"
              class="form-input"
              placeholder="Enter your password"
              autocomplete="current-password"
              required
              style="padding-right:40px"
            />
            <button type="button" class="pw-toggle" @click="showPw = !showPw">
              <svg v-if="!showPw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary login-btn" :disabled="loading">
          <span v-if="loading" class="spinner" style="width:16px;height:16px;border-width:2px"></span>
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>

    </div>

    <div class="login-footer">
      Human Resource Tracking System &copy; {{ new Date().getFullYear() }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth   = useAuthStore()

const form   = ref({ username: '', password: '' })
const loading = ref(false)
const error  = ref('')
const showPw = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await api.post('/auth/login', form.value)
    auth.setAuth(data.user)
    if (data.user.role === 'rspu') router.push('/rspu/home')
    else if (data.user.role === 'hrmo') router.push('/hrmo/view-pub')
    else router.push('/login')
  } catch (e) {
    error.value = e.response?.data?.message || 'Login failed. Please check your credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #EBF2FF 0%, #F4F6FB 50%, #E8F5F0 100%);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 24px;
}

.login-card {
  background: #fff; border-radius: 20px;
  box-shadow: 0 8px 32px rgba(79,134,247,.12);
  padding: 40px 40px 32px; width: 100%; max-width: 420px;
  text-align: center;
}

.login-logo { margin-bottom: 20px; }
.logo-circle {
  width: 64px; height: 64px; border-radius: 16px;
  background: linear-gradient(135deg, #4F86F7, #2563EB);
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(79,134,247,.35);
}
.logo-circle svg { width: 32px; height: 32px; color: #fff; }

.login-title { font-size: 22px; font-weight: 700; color: var(--text-1); margin-bottom: 4px; }
.login-sub   { font-size: 13px; color: var(--text-3); margin-bottom: 28px; }
.login-form  { text-align: left; }

.pw-toggle {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; padding: 4px; color: var(--text-3); cursor: pointer;
}
.pw-toggle svg { width: 17px; height: 17px; display: block; }
.pw-toggle:hover { color: var(--text-2); }

.login-btn { width: 100%; justify-content: center; padding: 11px; font-size: 14px; margin-top: 4px; }

.login-hint {
  margin-top: 24px; padding: 14px 16px;
  background: var(--bg); border-radius: 10px; text-align: left;
}
.hint-label { font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .4px; color: var(--text-3); display: block; margin-bottom: 6px; }
.hint-list  { display: flex; gap: 12px; flex-wrap: wrap; }
.hint-list span {
  font-size: 12px; font-family: monospace;
  background: #fff; border: 1px solid var(--border);
  padding: 3px 8px; border-radius: 5px; color: var(--text-2);
}

.login-footer { margin-top: 24px; font-size: 12px; color: var(--text-3); }
</style>
