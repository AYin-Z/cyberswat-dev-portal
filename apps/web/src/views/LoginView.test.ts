/**
 * LoginView.vue 交互测试
 * 覆盖：GitHub fragment token 读取与 hash 清理 / /me 成功→写入身份并跳首页 /
 *      /me 失败→错误提示 / 表单登录成功 / 表单登录失败
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import LoginView from './LoginView.vue'
import { useAuthStore } from '../stores/auth'

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', component: LoginView },
    ],
  })
}

function jsonOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('LoginView.vue', () => {
  let router: Router

  beforeEach(() => {
    setActivePinia(createPinia())
    router = makeRouter()
    window.location.hash = ''
  })

  it('GitHub 回调：#token fragment → setTokens + 拉 /me + 跳首页 + 清 hash', async () => {
    window.location.hash = '#token=gh-token-123'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonOk({ id: 'u9', role: 'member', nickname: 'GhUser' })),
    )

    await router.push('/login')
    await router.isReady()
    const w = mount(LoginView, { global: { plugins: [router] } })
    await flushPromises()

    const auth = useAuthStore()
    expect(auth.token).toBe('gh-token-123')
    expect(auth.user?.nickname).toBe('GhUser')
    expect(window.location.hash).toBe('')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('GitHub 回调：/me 失败 → 显示错误提示且不跳转', async () => {
    window.location.hash = '#token=gh-bad'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })))

    await router.push('/login')
    await router.isReady()
    const w = mount(LoginView, { global: { plugins: [router] } })
    await flushPromises()

    expect(w.text()).toContain('GitHub 登录成功但获取用户信息失败')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('表单登录：成功 → 跳转首页', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonOk({
          accessToken: 'acc-9',
          refreshToken: 'ref-9',
          user: { id: 'u1', role: 'member', nickname: 'Ayin' },
        }),
      ),
    )
    await router.push('/login')
    await router.isReady()
    const w = mount(LoginView, { global: { plugins: [router] } })

    await w.find('input[type="email"]').setValue('a@cyberswat.cn')
    await w.find('input[type="password"]').setValue('secret')
    await w.find('form').trigger('submit')
    await flushPromises()

    const auth = useAuthStore()
    expect(auth.token).toBe('acc-9')
    expect(auth.refreshToken).toBe('ref-9')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('🟡-1：携带 ?next=/tasks 登录成功 → 回跳 /tasks（深层页回跳）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonOk({
          accessToken: 'acc-9',
          refreshToken: 'ref-9',
          user: { id: 'u1', role: 'member', nickname: 'Ayin' },
        }),
      ),
    )
    await router.push('/login?next=/tasks')
    await router.isReady()
    const w = mount(LoginView, { global: { plugins: [router] } })

    await w.find('input[type="email"]').setValue('a@cyberswat.cn')
    await w.find('input[type="password"]').setValue('secret')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/tasks')
  })

  it('🟡-1 防 open redirect：?next=https://evil.example → 回落首页', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonOk({
          accessToken: 'acc-9',
          refreshToken: 'ref-9',
          user: { id: 'u1', role: 'member', nickname: 'Ayin' },
        }),
      ),
    )
    await router.push('/login?next=https%3A%2F%2Fevil.example%2Fphish')
    await router.isReady()
    const w = mount(LoginView, { global: { plugins: [router] } })

    await w.find('input[type="email"]').setValue('a@cyberswat.cn')
    await w.find('input[type="password"]').setValue('secret')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('表单登录：失败 → 显示「邮箱或密码错误」', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })))
    await router.push('/login')
    await router.isReady()
    const w = mount(LoginView, { global: { plugins: [router] } })

    await w.find('input[type="email"]').setValue('a@cyberswat.cn')
    await w.find('input[type="password"]').setValue('wrong')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(w.text()).toContain('邮箱或密码错误')
  })
})
