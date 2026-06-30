<template>
  <div class="app-shell">
    <!-- Sidebar -->
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
            <span class="logo-role">RSPU Portal</span>
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
              <span v-if="item.to === '/rspu/productions' && inProcessDot && sidebarCollapsed" class="nav-dot-icon"></span>
            </span>
            <span class="nav-label" v-if="!sidebarCollapsed">{{ item.label }}</span>
            <span v-if="item.to === '/rspu/productions' && inProcessDot && !sidebarCollapsed" class="nav-dot-right"></span>
            <span v-if="item.badge && !sidebarCollapsed" class="nav-badge">{{ item.badge }}</span>
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
            <span class="user-role">RSPU</span>
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

    <!-- Main -->
    <div class="main-area" :style="{ marginLeft: sidebarCollapsed ? '68px' : 'var(--sidebar-width)' }">
      <header class="topbar" :style="{ left: sidebarCollapsed ? '68px' : 'var(--sidebar-width)' }">
        <div class="topbar-breadcrumb">
          <span class="breadcrumb-root">RSPU</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;color:var(--text-3)">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span class="breadcrumb-current">{{ currentPageLabel }}</span>
        </div>
        <div class="topbar-right">
          <div class="topbar-date">{{ todayStr }}</div>

          <!-- Test switcher -->
          <div class="switcher-wrap" style="position:relative">
            <button class="switcher-btn" @click="switcherOpen = !switcherOpen">
              🔀 Switch to HRMO
            </button>
            <div v-if="switcherOpen" class="switcher-dropdown">
              <div class="switcher-label">Switch Account (Testing)</div>
              <button v-for="acc in hrmoAccounts" :key="acc.u" class="switcher-item" @click="switchTo(acc.u)">
                {{ acc.label }}
              </button>
            </div>
          </div>

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
    label: 'Navigation',
    items: [
      {
        to: '/rspu/home', label: 'Home Page',
        icon: `<img src="/home.png" class="nav-img-icon" />`
      },
    ]
  },
  {
    label: 'Publications',
    items: [
      {
        to: '/rspu/add', label: 'Add Plantilla Position',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`
      },
      {
        to: '/rspu/for-pub', label: 'For Publication',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`
      },
      {
        to: '/rspu/view-pub', label: 'View Publications',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`
      },
      {
        to: '/rspu/productions', label: 'In Process',
        icon: `<img src="/data-processing.png" class="nav-img-icon" />`
      },
      {
        to: '/rspu/completed', label: 'Completed Publications',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
      },
    ]
  },
  {
    label: 'Applicants',
    items: [
      {
        to: '/rspu/applicants', label: 'View Applicants',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
      },
    ]
  },
  {
    label: 'Account',
    items: [
      {
        to: '/rspu/settings', label: 'Account Settings',
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
  const name = auth.user?.full_name || auth.user?.username || 'R'
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

const switcherOpen = ref(false)
const hrmoAccounts = [
  { u: 'hrmo_as',   label: 'Administrative Service' },
  { u: 'hrmo_fms',  label: 'Financial and Management Service' },
  { u: 'hrmo_ias',  label: 'Internal Audit Service' },
  { u: 'hrmo_ips',  label: 'Information and Publication Service' },
  { u: 'hrmo_ls',   label: 'Legal Service' },
  { u: 'hrmo_ps',   label: 'Planning Service' },
  { u: 'hrmo_hrds', label: 'Human Resource Development Service' },
]
async function switchTo(username) {
  switcherOpen.value = false
  try {
    const { data } = await api.post('/auth/login', { username, password: 'admin123' })
    auth.setAuth(data.user)
    router.push('/hrmo/view-pub')
  } catch {}
}
</script>

<style scoped>
/* ── Green palette override for entire RSPU portal ── */
.app-shell {
  display: flex; min-height: 100vh;
  --primary:       #166534;
  --primary-dark:  #14532d;
  --primary-light: #dcfce7;
  --primary-glow:  rgba(22,101,52,.14);
}

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-width);
  background: linear-gradient(180deg, #166534 0%, #14532d 100%);
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
.nav-item.active .nav-icon { color: #86efac; }

.nav-icon { width: 20px; height: 20px; flex-shrink: 0; color: rgba(255,255,255,.6); }
.nav-icon :deep(svg) { width: 20px; height: 20px; display: block; }

/* PNG nav icons */
.nav-icon :deep(.nav-img-icon) {
  width: 20px; height: 20px; object-fit: contain; display: block;
  filter: brightness(0) invert(1);
  opacity: .72;
  transition: filter .15s, opacity .15s;
}
.nav-item:hover .nav-icon :deep(.nav-img-icon) { opacity: 1; }
.nav-item.active .nav-icon :deep(.nav-img-icon) {
  filter: invert(88%) sepia(28%) saturate(600%) hue-rotate(98deg) brightness(104%) contrast(88%);
  opacity: 1;
}

.nav-label { white-space: nowrap; overflow: hidden; }
.nav-badge {
  margin-left: auto; background: #22c55e; color: #fff;
  font-size: 11px; font-weight: 700; padding: 2px 7px;
  border-radius: 10px; min-width: 22px; text-align: center;
}
.nav-dot-icon {
  position: absolute; top: -3px; right: -3px;
  width: 9px; height: 9px; border-radius: 50%;
  background: #ef4444;
  border: 2px solid #166534;
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
  background: linear-gradient(135deg, #22c55e, #16a34a);
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
.switcher-btn { background: #f0fdf4; border: 1.5px solid #86efac; color: #166534; border-radius: 8px; padding: 6px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.switcher-btn:hover { background: #dcfce7; }
.switcher-dropdown { position: absolute; top: calc(100% + 6px); right: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.12); min-width: 240px; z-index: 999; overflow: hidden; }
.switcher-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #94a3b8; padding: 10px 14px 6px; }
.switcher-item { display: block; width: 100%; text-align: left; padding: 9px 14px; font-size: 13px; font-weight: 500; color: #1e293b; background: none; border: none; cursor: pointer; }
.switcher-item:hover { background: #f1f5f9; }
.topbar-date   { font-size: 13px; color: var(--text-3); font-weight: 500; }
.topbar-avatar {
  width: 36px; height: 36px; border-radius: 10px; overflow: hidden;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: #fff; flex-shrink: 0;
}
.avatar-photo { width: 100%; height: 100%; object-fit: cover; display: block; }

.content { padding: 32px; flex: 1; padding-top: calc(64px + 32px); }
</style>
