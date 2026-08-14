import { defineStore } from 'pinia'

interface AuthUser {
  id: string
  role: string
  nickname: string
}

/** 认证状态 — JWT 存 localStorage，请求带 Bearer */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('dev_token') ?? '',
    user: null as AuthUser | null,
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
  },
  actions: {
    async login(email: string, password: string) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) throw new Error('登录失败')
      const data = (await res.json()) as { accessToken: string; user: AuthUser }
      this.token = data.accessToken
      this.user = data.user
      localStorage.setItem('dev_token', this.token)
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('dev_token')
    },
  },
})
