import { defineStore } from 'pinia'

export interface AuthUser {
  id: string
  role: string
  nickname: string
}

const TOKEN_KEY = 'dev_token'
const REFRESH_KEY = 'dev_refresh'

/**
 * 认证状态（🔴-8 修复）：
 * - access + refresh 双 token 持久化
 * - 启动时从 localStorage 恢复并拉 /me 还原身份
 * - setTokens / logout 统一管理
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) ?? '',
    refreshToken: localStorage.getItem(REFRESH_KEY) ?? '',
    user: null as AuthUser | null,
    bootstrapped: false,
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
  },
  actions: {
    setTokens(access: string, refresh: string) {
      this.token = access
      this.refreshToken = refresh
      localStorage.setItem(TOKEN_KEY, access)
      localStorage.setItem(REFRESH_KEY, refresh)
    },
    setUser(user: AuthUser) {
      this.user = user
    },
    async login(email: string, password: string) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) throw new Error('邮箱或密码错误')
      const data = (await res.json()) as { accessToken: string; refreshToken: string; user: AuthUser }
      this.setTokens(data.accessToken, data.refreshToken)
      this.user = data.user
    },
    async restore() {
      // 启动恢复：有 token 则拉 /me 还原身份（失败则清空）
      if (this.bootstrapped) return
      if (!this.token) {
        this.bootstrapped = true
        return
      }
      try {
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${this.token}` } })
        if (res.ok) {
          this.user = (await res.json()) as AuthUser
        } else {
          this.logout()
        }
      } catch {
        this.logout()
      } finally {
        this.bootstrapped = true
      }
    },
    logout() {
      this.token = ''
      this.refreshToken = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_KEY)
    },
  },
})
