/**
 * lib/api.ts 单元测试 — 统一 API 客户端
 * 覆盖：成功请求 / skipAuth / 401→refresh 续期重放 / refresh 并发去重 /
 *      refresh 失败登出跳转 / 无 refreshToken / 错误消息提取 / 204
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { api, ApiError } from './api'
import { useAuthStore } from '../stores/auth'

/** 拦截 window.location.href 赋值（jsdom 不实现导航） */
function trapLocationHref() {
  let assigned = ''
  const fake = {
    ...window.location,
    pathname: '/some-protected-page',
    get href() {
      return assigned || 'http://localhost/some-protected-page'
    },
    set href(v: string) {
      assigned = v
    },
  }
  Object.defineProperty(window, 'location', { configurable: true, value: fake })
  return () => assigned
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('lib/api.ts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('成功请求：自动带 Authorization，返回解析后的 JSON', async () => {
    const auth = useAuthStore()
    auth.setTokens('access-1', 'refresh-1')
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ hello: 'world' }))
    vi.stubGlobal('fetch', fetchMock)

    const data = await api<{ hello: string }>('/api/tasks')

    expect(data.hello).toBe('world')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/tasks')
    expect((init!.headers as Headers).get('Authorization')).toBe('Bearer access-1')
  })

  it('skipAuth：不携带 Authorization', async () => {
    const auth = useAuthStore()
    auth.setTokens('access-1', 'refresh-1')
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await api('/api/members', { skipAuth: true })
    const [, init] = fetchMock.mock.calls[0]
    expect((init!.headers as Headers).has('Authorization')).toBe(false)
  })

  it('401 且 refresh 成功：自动续期并重放原请求', async () => {
    const auth = useAuthStore()
    auth.setTokens('old-access', 'old-refresh')
    let fooCalls = 0
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/auth/refresh')) {
        return jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' })
      }
      fooCalls += 1
      if (fooCalls === 1) return jsonResponse({ message: 'Unauthorized' }, 401)
      return jsonResponse({ data: 'retried' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await api<{ data: string }>('/api/foo')

    expect(result.data).toBe('retried')
    expect(auth.token).toBe('new-access')
    expect(auth.refreshToken).toBe('new-refresh')
    expect(localStorage.getItem('dev_token')).toBe('new-access')
  })

  it('并发 401：refresh 只触发一次（去重）', async () => {
    const auth = useAuthStore()
    auth.setTokens('old-access', 'old-refresh')
    let refreshCount = 0
    let fooCalls = 0
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/api/auth/refresh')) {
        refreshCount += 1
        await new Promise((r) => setTimeout(r, 20))
        return jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' })
      }
      fooCalls += 1
      if (fooCalls <= 2) return jsonResponse({ message: 'Unauthorized' }, 401)
      return jsonResponse({ data: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const [a, b] = await Promise.all([api<{ data: string }>('/api/foo'), api<{ data: string }>('/api/foo')])

    expect(refreshCount).toBe(1)
    expect(a.data).toBe('ok')
    expect(b.data).toBe('ok')
  })

  it('401 且 refresh 失败：登出并跳转 /login', async () => {
    const auth = useAuthStore()
    auth.setTokens('old-access', 'old-refresh')
    const getHref = trapLocationHref()
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/api/auth/refresh')) return jsonResponse({ message: 'invalid refresh' }, 401)
      return jsonResponse({ message: 'Unauthorized' }, 401)
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(api('/api/foo')).rejects.toThrow()

    expect(auth.token).toBe('')
    expect(auth.refreshToken).toBe('')
    expect(localStorage.getItem('dev_token')).toBeNull()
    expect(getHref()).toBe('/login')
  })

  // ✅ 🟡-4 修复：401 且 refreshToken 为空（如 GitHub 登录只拿到 access token）时，
  // 不尝试续期，直接登出并跳转 /login —— 用户不再滞留报错页。
  it('401 且无 refreshToken：登出并跳转 /login（🟡-4 修复）', async () => {
    const auth = useAuthStore()
    auth.setTokens('only-access', '') // GitHub 登录只拿到 access token
    const getHref = trapLocationHref()
    const fetchMock = vi.fn(async () => jsonResponse({ message: 'Unauthorized' }, 401))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api('/api/foo')).rejects.toThrow()

    expect(auth.token).toBe('')
    expect(auth.refreshToken).toBe('')
    expect(getHref()).toBe('/login')
  })

  it('错误提取：message 字符串 / message 数组取第一条 / fields 透传', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          { message: ['标题不能为空', '正文不能为空'], fields: { title: '必填' } },
          400,
        ),
      ),
    )

    const err = (await api('/api/announcements').catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(400)
    expect(err.message).toBe('标题不能为空')
    expect(err.fields).toEqual({ title: '必填' })
  })

  it('错误提取：非 JSON 响应回退为状态码文案', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, _init?: RequestInit) => new Response('Internal Server Error', { status: 500 })),
    )
    const err = (await api('/api/foo').catch((e) => e)) as ApiError
    expect(err.message).toBe('请求失败 (500)')
  })

  it('204 无内容：返回 undefined', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 })))
    const out = await api('/api/foo')
    expect(out).toBeUndefined()
  })
})
