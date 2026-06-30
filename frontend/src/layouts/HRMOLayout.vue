<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="logo-text" v-if="!sidebarCollapsed">
            <span class="logo-name">HR Tracking</span>
            <span class="logo-role">HRMO Portal</span>
          </div>
        </div>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <template v-for="section in navSections" :key="section.label">
          <div class="nav-section-label" v-if="!sidebarCollapsed">{{ section.label }}</div>
          <router-link
            v-for="item in section.items" :key="item.to"
            :to="item.to"
            class="nav-item"
            :class="{ active: $route.path === item.to }"
          >
            <span style="position:relative;display:inline-flex">
              <span class="nav-icon" v-html="item.icon"></span>
              <span v-if="item.to === '/hrmo/productions' && inProcessDot && sidebarCollapsed" class="nav-dot-icon"></span>
            </span>
            <span class="nav-label" v-if="!sidebarCollapsed">{{ item.label }}</span>
            <span v-if="item.to === '/hrmo/productions' && inProcessDot && !sidebarCollapsed" class="nav-dot-right"></span>
          </router-link>
        </template>
      </nav>

      <div class="sidebar-footer">
        <div class="user-card" v-if="!sidebarCollapsed">
          <div class="user-avatar">
            <img v-if="auth.user?.avatar" :src="auth.user.avatar" class="avatar-photo" alt="" />
            <span v-else>{{ initials }}</span>
          </div>
          <div class="user-info">
            <span class="user-name">{{ auth.user?.full_name || auth.user?.username }}</span>
            <span class="user-role">HRMO · {{ auth.user?.department || '' }}</span>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout" :title="sidebarCollapsed ? 'Logout' : ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span v-if="!sidebarCollapsed">Logout</span>
        </button>
      </div>
    </aside>

    <div class="main-area" :style="{ marginLeft: sidebarCollapsed ? '68px' : 'var(--sidebar-width)' }">
      <header class="topbar" :style="{ left: sidebarCollapsed ? '68px' : 'var(--sidebar-width)' }">
        <div class="topbar-breadcrumb">
          <span class="breadcrumb-root">HRMO</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;color:var(--text-3)">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span class="breadcrumb-current">{{ currentPageLabel }}</span>
        </div>
        <div class="topbar-right">
          <div class="topbar-date">{{ todayStr }}</div>

          <!-- Test switcher -->
          <button class="switcher-btn" @click="switchToRSPU">
            🔀 Switch to RSPU
          </button>

          <div class="topbar-avatar">
            <img v-if="auth.user?.avatar" :src="auth.user.avatar" class="avatar-photo" alt="" />
            <span v-else>{{ initials }}</span>
          </div>
        </div>
      </header>

      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotificationsStore } from '../stores/notifications'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const auth   = useAuthStore()
const route  = useRoute()
const router = useRouter()

const sidebarCollapsed = ref(false)

const navSections = [
  {
    label: 'Publications',
    items: [
      {
        to: '/hrmo/view-pub', label: 'View Publications',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`
      },
      {
        to: '/hrmo/productions', label: 'In Process',
        icon: `<img src="/data-processing.png" class="nav-img-icon" />`
      },
      {
        to: '/hrmo/completed', label: 'Completed Publications',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
      },
    ]
  },
  {
    label: 'Applicants',
    items: [
      {
        to: '/hrmo/applicants', label: 'View Applicants',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
      },
    ]
  },
  {
    label: 'Account',
    items: [
      {
        to: '/hrmo/settings', label: 'Account Settings',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`
      },
    ]
  },
]

const allNavItems = navSections.flatMap(s => s.items)

const notifStore = useNotificationsStore()
const { inProcessDot } = storeToRefs(notifStore)
let pollTimer = null
onMounted(() => { notifStore.refresh(); pollTimer = setInterval(notifStore.refresh, 60000) })
onUnmounted(() => clearInterval(pollTimer))

const currentPageLabel = computed(() => {
  const item = allNavItems.find(n => n.to === route.path)
  return item?.label || 'Dashboard'
})

const initials = computed(() => {
  const name = auth.user?.full_name || auth.user?.username || 'H'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
})

const todayStr = computed(() =>
  new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
)

async function handleLogout() {
  try { await api.post('/auth/logout') } catch {}
  auth.logout()
  router.push('/68a8770eef')
}

async function switchToRSPU() {
  try {
    const { data } = await api.post('/auth/login', { username: 'rspu', password: 'admin123' })
    auth.setAuth(data.user)
    router.push('/rspu/home')
  } catch {}
}
</script>

<style scoped>
/* ── Blue palette override for entire HRMO portal ── */
.app-shell {
  display: flex; min-height: 100vh;
  --primary:       #1d4ed8;
  --primary-dark:  #1e3a8a;
  --primary-light: #dbeafe;
  --primary-glow:  rgba(29,78,216,.13);
}

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-width);
  background: linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%);
  display: flex; flex-direction: column;
  transition: width .22s ease; flex-shrink: 0;
  position: fixed; top: 0; left: 0; height: 100vh; overflow-y: auto;
  box-shadow: 4px 0 24px rgba(0,0,0,.12);
  z-index: 20;
}
.sidebar.collapsed { width: 68px; }

.sidebar-header {
  padding: 20px 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,.1);
  display: flex; align-items: center; justify-content: space-between;
  min-height: 74px;
}
.sidebar-logo  { display: flex; align-items: center; gap: 12px; overflow: hidden; }
.logo-mark {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  background: rgba(255,255,255,.18);
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid rgba(255,255,255,.25);
}
.logo-mark svg { width: 22px; height: 22px; color: #fff; }
.logo-text  { overflow: hidden; }
.logo-name  { display: block; font-size: 15px; font-weight: 800; color: #fff; white-space: nowrap; letter-spacing: -.2px; }
.logo-role  { display: block; font-size: 11px; color: rgba(255,255,255,.6); white-space: nowrap; font-weight: 500; letter-spacing: .3px; }

.collapse-btn {
  width: 30px; height: 30px; border: none;
  background: rgba(255,255,255,.12);
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; color: rgba(255,255,255,.8);
  transition: background .15s;
}
.collapse-btn:hover { background: rgba(255,255,255,.22); }
.collapse-btn svg { width: 16px; height: 16px; }

/* ── Nav ── */
.sidebar-nav { flex: 1; padding: 14px 10px; display: flex; flex-direction: column; gap: 2px; }

.nav-section-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .8px; color: rgba(255,255,255,.45);
  padding: 14px 10px 5px;
}
.nav-section-label:first-child { padding-top: 4px; }

.nav-item {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 12px; border-radius: 10px; cursor: pointer;
  color: rgba(255,255,255,.72); transition: all .15s; position: relative;
  font-size: 14px; font-weight: 500; text-decoration: none;
}
.nav-item:hover { background: rgba(255,255,255,.1); color: #fff; }
.nav-item.active {
  background: rgba(255,255,255,.18);
  color: #fff; font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.2);
}
.nav-item.active .nav-icon { color: #93c5fd; }

.nav-icon { width: 20px; height: 20px; flex-shrink: 0; color: rgba(255,255,255,.6); }
.nav-icon :deep(svg) { width: 20px; height: 20px; display: block; }
.nav-label { white-space: nowrap; overflow: hidden; }

/* PNG nav icons */
.nav-icon :deep(.nav-img-icon) {
  width: 20px; height: 20px; object-fit: contain; display: block;
  filter: brightness(0) invert(1);
  opacity: .72;
  transition: filter .15s, opacity .15s;
}
.nav-item:hover .nav-icon :deep(.nav-img-icon) { opacity: 1; }
.nav-item.active .nav-icon :deep(.nav-img-icon) {
  filter: invert(79%) sepia(21%) saturate(1095%) hue-rotate(191deg) brightness(105%) contrast(93%);
  opacity: 1;
}
.nav-dot-icon {
  position: absolute; top: -3px; right: -3px;
  width: 9px; height: 9px; border-radius: 50%;
  background: #ef4444;
  border: 2px solid #1e3a5f;
  animation: dot-pulse 2s ease-in-out infinite;
}
.nav-dot-right {
  margin-left: auto;
  width: 9px; height: 9px; border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
  animation: dot-pulse 2s ease-in-out infinite;
}
@keyframes dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: .6; transform: scale(1.3); }
}

/* ── Sidebar footer ── */
.sidebar-footer {
  padding: 12px 10px 18px;
  border-top: 1px solid rgba(255,255,255,.1);
}
.user-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; margin-bottom: 4px;
  border-radius: 10px; background: rgba(255,255,255,.08);
}
.user-avatar {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; overflow: hidden;
  background: linear-gradient(135deg, #60a5fa, #1d4ed8);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: #fff;
  border: 1.5px solid rgba(255,255,255,.3);
}
.user-info { overflow: hidden; }
.user-name { display: block; font-size: 14px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { display: block; font-size: 11px; color: rgba(255,255,255,.55); font-weight: 500; }

.logout-btn {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 9px 12px; border: none;
  background: none; border-radius: 10px; cursor: pointer;
  font-size: 14px; font-weight: 500; color: rgba(255,255,255,.6);
  transition: all .15s;
}
.logout-btn:hover { background: rgba(239,68,68,.25); color: #fca5a5; }
.logout-btn svg { width: 17px; height: 17px; flex-shrink: 0; }

/* ── Main ── */
.main-area  { flex: 1; display: flex; flex-direction: column; min-width: 0; margin-left: var(--sidebar-width); transition: margin-left .22s ease; }

.topbar {
  height: 64px; background: var(--white);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32px; position: fixed; top: 0; right: 0; z-index: 10;
  transition: left .22s ease;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
}
.topbar-breadcrumb { display: flex; align-items: center; gap: 7px; }
.breadcrumb-root    { font-size: 14px; color: var(--text-3); font-weight: 500; }
.breadcrumb-current { font-size: 15px; font-weight: 700; color: var(--text-1); }

.topbar-right  { display: flex; align-items: center; gap: 16px; }
.switcher-btn { background: #eff6ff; border: 1.5px solid #93c5fd; color: #1d4ed8; border-radius: 8px; padding: 6px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.switcher-btn:hover { background: #dbeafe; }
.topbar-date   { font-size: 13px; color: var(--text-3); font-weight: 500; }
.topbar-avatar {
  width: 36px; height: 36px; border-radius: 10px; overflow: hidden;
  background: linear-gradient(135deg, #60a5fa, #1d4ed8);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: #fff; flex-shrink: 0;
}
.avatar-photo { width: 100%; height: 100%; object-fit: cover; display: block; }

.content { padding: 32px; flex: 1; padding-top: calc(64px + 32px); }
</style>
