import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLoadingStore = defineStore('loading', () => {
  const count = ref(0)
  const start = () => count.value++
  const stop  = () => { if (count.value > 0) count.value-- }
  return { count, start, stop }
})
