/**
 * 统一 API 客户端（🔴-8 修复）：
 * - 自动带 Authorization
 * - 401 → refresh 续期 → 重放；refresh 失败 → 登出跳登录
 * - 非 2xx 抛出带 message 的 Error（调用方统一 try/catch）
 */
import { useAuthStore } from '../stores/auth'

let refreshing: Promise<boolean> | null = null

async function refreshToken(): Promise<boolean> {
  const auth = useAuthStore()
  if (!auth.refreshToken) return false
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: auth.refreshToken }),
        })
        if (!res.ok) return false
        const data = (await res.json()) as { accessToken: string; refreshToken: string }
        auth.setTokens(data.accessToken, data.refreshToken)
        return true
      } catch {
        return false
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

export class ApiError extends Error {
  status: number
  fields?: Record<string, string>
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const auth = useAuthStore()
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (!options.skipAuth && auth.token) {
    headers.set('Authorization', `Bearer ${auth.token}`)
  }

  let res = await fetch(path, { ...options, headers })

  // 401 → 有 refreshToken 则续期一次并重放；无 refreshToken 或续期失败 → 登出跳登录
  // （🟡-4 修复：refreshToken 判断移到分支内部，401 一律进入登出流程，不再滞留报错页）
  if (res.status === 401 && !options.skipAuth) {
    const ok = auth.refreshToken ? await refreshToken() : false
    if (ok) {
      headers.set('Authorization', `Bearer ${auth.token}`)
      res = await fetch(path, { ...options, headers })
    } else {
      auth.logout()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
  }

  if (!res.ok) {
    let message = `请求失败 (${res.status})`
    let fields: Record<string, string> | undefined
    try {
      const body = (await res.json()) as { message?: string | string[]; fields?: Record<string, string> }
      if (Array.isArray(body.message)) message = body.message[0] ?? message
      else if (body.message) message = body.message
      fields = body.fields
    } catch {
      /* 非 JSON 响应 */
    }
    throw new ApiError(res.status, message, fields)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
