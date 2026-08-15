/**
 * stores/auth.ts 单元测试 — 认证状态
 * 覆盖：login 双 token 持久化 / login 失败 / restore 拉取身份 /
 *      restore 失败登出 / 无 token 直接完成 / logout 清理
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'

const TOKEN_KEY = 'dev_token'
const REFRESH_KEY = 'dev_refresh'

function okJson(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('stores/auth.ts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('login 成功：access + refresh 双 token 持久化 + user 写入', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        okJson({
          accessToken: 'acc-1',
          refreshToken: 'ref-1',
          user: { id: 'u1', role: 'member', nickname: 'Ayin' },
        }),
      ),
    )

    const auth = useAuthStore()
    await auth.login('a@cyberswat.cn', 'secret')

    expect(auth.token).toBe('acc-1')
    expect(auth.refreshToken).toBe('ref-1')
    expect(auth.user?.nickname).toBe('Ayin')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('acc-1')
    expect(localStorage.getItem(REFRESH_KEY)).toBe('ref-1')
    expect(auth.isLoggedIn).toBe(true)
  })

  it('login 失败：抛出统一错误文案', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: 'bad' }), { status: 401 })),
    )
    const auth = useAuthStore()
    await expect(auth.login('a@cyberswat.cn', 'wrong')).rejects.toThrow('邮箱或密码错误')
    expect(auth.isLoggedIn).toBe(false)
  })

  it('restore：有 token 且 /me 成功 → 还原身份', async () => {
    localStorage.setItem(TOKEN_KEY, 'acc-1')
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => okJson({ id: 'u1', role: 'dept-leader', nickname: 'Leader' }))
    vi.stubGlobal('fetch', fetchMock)

    const auth = useAuthStore()
    await auth.restore()

    expect(auth.bootstrapped).toBe(true)
    expect(auth.user?.role).toBe('dept-leader')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/me')
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer acc-1')
  })

  it('restore：/me 返回 401 → 清空 token', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-acc')
    vi.stubGlobal('fetch', vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 401 })))

    const auth = useAuthStore()
    await auth.restore()

    expect(auth.bootstrapped).toBe(true)
    expect(auth.token).toBe('')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('restore：无 token → 直接完成不请求 /me', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const auth = useAuthStore()
    await auth.restore()

    expect(auth.bootstrapped).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('restore：已 bootstrap 过 → 幂等跳过', async () => {
    localStorage.setItem(TOKEN_KEY, 'acc-1')
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const auth = useAuthStore()
    auth.bootstrapped = true
    await auth.restore()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('logout：清空内存状态与 localStorage', async () => {
    localStorage.setItem(TOKEN_KEY, 'acc-1')
    localStorage.setItem(REFRESH_KEY, 'ref-1')
    const auth = useAuthStore()
    auth.setUser({ id: 'u1', role: 'member', nickname: 'N' })

    auth.logout()

    expect(auth.token).toBe('')
    expect(auth.refreshToken).toBe('')
    expect(auth.user).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull()
    expect(auth.isLoggedIn).toBe(false)
  })

  it('setTokens：写入双 token 并持久化', () => {
    const auth = useAuthStore()
    auth.setTokens('a2', 'r2')
    expect(auth.token).toBe('a2')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('a2')
    expect(localStorage.getItem(REFRESH_KEY)).toBe('r2')
  })
})
