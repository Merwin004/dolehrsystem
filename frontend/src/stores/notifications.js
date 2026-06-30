import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api/index'

export const useNotificationsStore = defineStore('notifications', () => {
  const inProcessDot = ref(false)

  async function refresh() {
    try {
      const { data } = await api.get('/publications/stats')
      inProcessDot.value = (data.my_turn || 0) > 0
    } catch {}
  }

  return { inProcessDot, refresh }
})
