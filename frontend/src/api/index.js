import axios from 'axios'
import { useLoadingStore } from '../stores/loading'
import { useToast } from 'vue-toastification'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  try { useLoadingStore().start() } catch {}
  return config
})

api.interceptors.response.use(
  (res) => {
    try { useLoadingStore().stop() } catch {}
    return res
  },
  (err) => {
    try { useLoadingStore().stop() } catch {}
    if (err.response?.status === 401) {
      localStorage.removeItem('user')
      window.location.href = '/68a8770eef'
      return Promise.reject(err)
    }
    if (err.response?.status === 429) {
      try { useToast().error(err.response.data?.message || 'Too many requests. Please wait.') } catch {}
    }
    if (err.response?.status >= 500) {
      try { useToast().error('Server error. Please try again.') } catch {}
    }
    return Promise.reject(err)
  }
)

export default api
