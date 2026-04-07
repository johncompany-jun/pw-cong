import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '../composables/useApi'

export type AuthUser = {
  id: number
  email: string
  name: string
  isAdmin: boolean
  createdAt: string
}

export const useAuthStore = defineStore('auth', () => {
  const api = useApi()
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<AuthUser | null>(null)
  const ready = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; user: AuthUser }>('/login', { email, password })
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
  }

  async function fetchMe() {
    if (!token.value) {
      ready.value = true
      return
    }
    try {
      user.value = await api.get<AuthUser>('/me')
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('401')) logout()
    } finally {
      ready.value = true
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return { token, user, ready, isLoggedIn, login, fetchMe, logout }
})
