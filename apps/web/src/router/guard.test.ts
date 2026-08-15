/**
 * router/index.ts 路由守卫测试
 * 覆盖：未登录访问受保护页 → /login?next= / 已登录访问 /login → / /
 *      公开页放行 / 已登录访问受保护页放行
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { router } from './index'

/**
 * 使用真实 router 单例 + 真实守卫。
 * 每次导航前重置 localStorage 与全局 fetch（跳转目标页会发请求）。
 */
function stubFetchEmpty() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })),
  )
}

async function goto(path: string) {
  await router.push(path)
  await router.isReady()
  await new Promise((r) => setTimeout(r, 0))
}

describe('router 守卫', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    stubFetchEmpty()
  })

  it('未登录访问受保护页 → 重定向 /login 并携带 next', async () => {
    await goto('/profile')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.next).toBe('/profile')
  })

  it('未登录访问 /tasks → 重定向 /login', async () => {
    await goto('/tasks')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.next).toBe('/tasks')
  })

  it('未登录访问公开页 /login 与 /register → 放行', async () => {
    await goto('/login')
    expect(router.currentRoute.value.path).toBe('/login')
    await goto('/register')
    expect(router.currentRoute.value.path).toBe('/register')
  })

  it('已登录访问 /login → 重定向首页 /', async () => {
    localStorage.setItem('dev_token', 'acc-1')
    await goto('/login')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('已登录访问受保护页 → 放行', async () => {
    localStorage.setItem('dev_token', 'acc-1')
    await goto('/profile')
    expect(router.currentRoute.value.path).toBe('/profile')
  })

  it('未登录访问任意深层路径 → 重定向登录并保留完整路径', async () => {
    await goto('/posts/abc123')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.next).toBe('/posts/abc123')
  })
})
