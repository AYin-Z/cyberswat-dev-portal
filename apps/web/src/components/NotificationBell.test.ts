/**
 * NotificationBell.vue 交互测试 — 通知闭环
 * 覆盖：socket 连接与认证 / unread 计数 / notification:new 未读+1 且置顶 /
 *      toggle 时 emit fetch / markAll 全部已读 / 点击带 link 的通知跳转
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { io, type Socket } from 'socket.io-client'
import NotificationBell from './NotificationBell.vue'
import { useAuthStore } from '../stores/auth'

vi.mock('socket.io-client', () => ({ io: vi.fn() }))

type Handler = (...args: any[]) => void

describe('NotificationBell.vue', () => {
  let router: Router
  let socket: { on: ReturnType<typeof vi.fn>; emit: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }
  let handlers: Record<string, Handler>

  beforeEach(() => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.setTokens('acc-1', 'ref-1')

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/tasks', component: { template: '<div />' } },
      ],
    })

    handlers = {}
    socket = {
      on: vi.fn((evt: string, cb: Handler) => {
        handlers[evt] = cb
      }),
      emit: vi.fn(),
      disconnect: vi.fn(),
    }
    ;(io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(socket)

    vi.stubGlobal('fetch', vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 })))
  })

  function mountBell() {
    return mount(NotificationBell, { global: { plugins: [router] } })
  }

  it('挂载时用 access token 建立 socket 连接', () => {
    mountBell()
    expect(io).toHaveBeenCalledWith('/', { path: '/socket.io', auth: { token: 'acc-1' } })
  })

  it('notification:unread 事件 → 更新未读数角标', async () => {
    const w = mountBell()
    handlers['notification:unread']({ count: 3 })
    await flushPromises()
    expect(w.find('.count').text()).toBe('3')
  })

  it('notification:new 事件 → 未读 +1 且新通知置顶', async () => {
    const w = mountBell()
    handlers['notification:new']({ id: 'n1', type: 'task', title: '新任务指派给你', content: '看看', link: '/tasks', read: false, createdAt: '2026-08-15T10:00:00.000Z' })
    await flushPromises()
    expect(w.find('.count').text()).toBe('1')
    // 展开面板查看列表
    await w.find('.bell').trigger('click')
    const items = w.findAll('.item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('新任务指派给你')
  })

  it('toggle 打开面板 → emit notification:fetch 拉取列表', async () => {
    const w = mountBell()
    await w.find('.bell').trigger('click')
    expect(socket.emit).toHaveBeenCalledWith('notification:fetch')
  })

  it('notification:list 事件 → 整体替换列表', async () => {
    const w = mountBell()
    handlers['notification:list']([
      { id: 'n9', type: 'announcement', title: '已有通知', content: null, link: null, read: true, createdAt: '2026-08-14T08:00:00.000Z' },
    ])
    await flushPromises()
    await w.find('.bell').trigger('click')
    expect(w.findAll('.item')).toHaveLength(1)
    expect(w.text()).toContain('已有通知')
  })

  it('markAll：POST /api/notifications/read 并清空未读、标记列表已读', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const w = mountBell()
    handlers['notification:new']({ id: 'n1', type: 'task', title: 'T1', content: null, link: null, read: false, createdAt: '2026-08-15T10:00:00.000Z' })
    handlers['notification:unread']({ count: 5 })
    await flushPromises()
    await w.find('.bell').trigger('click')
    await w.find('.clear').trigger('click')
    await flushPromises()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/notifications/read')
    expect((init as RequestInit).method).toBe('POST')
    // 🔴-4：统一走 api()，headers 为 Headers 实例
    expect((init!.headers as Headers).get('Authorization')).toBe('Bearer acc-1')
    expect(w.find('.count').exists()).toBe(false) // unread = 0 → 角标隐藏
    expect(w.find('.item.unread').exists()).toBe(false)
  })

  it('点击带 link 的通知 → 路由跳转', async () => {
    const w = mountBell()
    handlers['notification:new']({ id: 'n2', type: 'task', title: '去任务', content: null, link: '/tasks', read: false, createdAt: '2026-08-15T10:00:00.000Z' })
    await flushPromises()
    await w.find('.bell').trigger('click')
    await w.find('.item').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/tasks')
  })

  it('未读 > 99 显示 99+', async () => {
    const w = mountBell()
    handlers['notification:unread']({ count: 120 })
    await flushPromises()
    expect(w.find('.count').text()).toBe('99+')
  })

  it('卸载时断开 socket', () => {
    const w = mountBell()
    w.unmount()
    expect(socket.disconnect).toHaveBeenCalled()
  })
})
