import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const LOGIN_PATH = '/68a8770eef'

const routes = [
  {
    path: '/',
    name: 'PublicVacancies',
    component: () => import('../views/PublicVacancies.vue'),
    meta: { public: true }
  },
  {
    path: '/vacancies',
    redirect: '/'
  },
  {
    path: LOGIN_PATH,
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/rspu',
    component: () => import('../layouts/RSPULayout.vue'),
    meta: { requiresAuth: true, role: 'rspu' },
    children: [
      { path: '',              redirect: '/rspu/home' },
      { path: 'home',          name: 'RSPUHome',      component: () => import('../views/rspu/HomePage.vue') },
      { path: 'add',           name: 'AddPub',        component: () => import('../views/rspu/AddPublication.vue') },
      { path: 'for-pub',       name: 'ForPub',        component: () => import('../views/rspu/ForPublications.vue') },
      { path: 'view-pub',      name: 'ViewPub',       component: () => import('../views/rspu/ViewPublications.vue') },
      { path: 'productions',   name: 'Productions',   component: () => import('../views/rspu/Productions.vue') },
      { path: 'completed',     name: 'Completed',     component: () => import('../views/rspu/CompletedPublications.vue') },
      { path: 'applicants',    name: 'Applicants',    component: () => import('../views/rspu/ViewApplicants.vue') },
      { path: 'settings',      name: 'Settings',      component: () => import('../views/rspu/AccountSettings.vue') },
    ]
  },
  {
    path: '/hrmo',
    component: () => import('../layouts/HRMOLayout.vue'),
    meta: { requiresAuth: true, role: 'hrmo' },
    children: [
      { path: '',             redirect: '/hrmo/view-pub' },
      { path: 'view-pub',    name: 'HRMOViewPub',     component: () => import('../views/rspu/ViewPublications.vue') },
      { path: 'productions',  name: 'HRMOProductions',  component: () => import('../views/rspu/Productions.vue') },
      { path: 'completed',    name: 'HRMOCompleted',    component: () => import('../views/rspu/CompletedPublications.vue') },
      { path: 'applicants',   name: 'HRMOApplicants',   component: () => import('../views/rspu/ViewApplicants.vue') },
      { path: 'settings',     name: 'HRMOSettings',     component: () => import('../views/rspu/AccountSettings.vue') },
    ]
  }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  if (to.meta.public) return true
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) return LOGIN_PATH
  if (to.meta.requiresAuth && to.meta.role && auth.user?.role !== to.meta.role) return LOGIN_PATH
  if (to.meta.guest && auth.isLoggedIn) {
    if (auth.user?.role === 'rspu') return '/rspu/home'
    if (auth.user?.role === 'hrmo') return '/hrmo/view-pub'
    return LOGIN_PATH
  }
})

export default router
